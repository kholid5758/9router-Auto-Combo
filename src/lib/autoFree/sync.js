#!/usr/bin/env node

/**
 * Free Models Sync for 9router
 *
 * Automatically synchronizes free models across all registered providers,
 * pre-tests all candidates against 9router to drop expired/dead/paid models,
 * sorts them by coding capability specification, and injects valid models
 * into 9router combos (auto-free, auto-smart, auto-fast, cooldown + active provider combos).
 *
 * Modes:
 *   node sync.js              -> Full daily sync (scrape + live-test + inject)
 *   node sync.js --refresh    -> Intra-day watchdog: re-test existing combo models,
 *                                park quota-exhausted (429) in auto-cooldown
 *   node sync.js --dry-run    -> Simulate without writing
 *   node sync.js --setup-cron -> Install scheduler (systemd timer w/ Persistent=true, cron fallback)
 */

const fs = require('node:fs');
const path = require('node:path');

// Deep modules
const storage = require('./storage.js');
const scheduler = require('./scheduler.js');
const { PROVIDERS, PROVIDER_BY_KEY, providerByPrefix, discoverProvider, discoverAllProviders, getProviderCredentials, getActiveProviders, isProviderActive } = require('./providers.js');
const { BENCHMARKS_PATH, SMART_MIN_SCORE } = require('./update-benchmarks.js');

// Options
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isWebMode = args.includes('--web') || args.includes('-w') || args.includes('web');
const isRefreshMode = args.includes('--refresh') || args.includes('--watchdog');
const isCronSetup = args.includes('--setup-cron') || args.includes('--setup-scheduler');
const isLiveBenchmarks = args.includes('--live-benchmarks') || args.includes('--update-benchmarks');

// ponytail: single-user local tool, thresholds hardcoded; promote to config file when a second machine appears
const AGENTIC_MIN_CONTEXT = 100000;      // super-combo agentic floor (supports 128k/256k/1M models)
const QUOTA_RETRY_DELAY_MS = 1200;       // wait before re-testing a transient failure
const QUOTA_LATENCY_SENTINEL = 999998;   // latency marker that forces quota-exhausted models to the bottom
const CANDIDATES_STATE_PATH = path.join(__dirname, 'candidates-state.json'); // last full-sync candidate pool
const EXCLUSIONS_PATH = path.join(__dirname, 'exclusions.json');
const PRIORITIES_PATH = path.join(__dirname, 'priorities.json');
const TRANSIENT_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504, 529]);

const escapeRegExp = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PROVIDER_PREFIX_RE = new RegExp(
  `^(?:${PROVIDERS.flatMap(p => p.prefixes).sort((a, b) => b.length - a.length).map(escapeRegExp).join('|')})/`
);

// Managed combos registry
const {
  SUPER_COMBOS,
  isReasoningModel,
  isSmartTierModel,
  isCodingTierModel,
  isCodingSpecialistModel,
  getCodingScore,
  findBenchmarkMatch,
  getBenchmarksDatabase
} = require('./classifier.js');
module.exports.SUPER_COMBOS = SUPER_COMBOS;


// ----------------------------------------------------------------------------
// Exclusion Rules Configuration
// ----------------------------------------------------------------------------

function getExclusionConfig() {
  let excludedModels = [];
  let excludedProviders = [];

  try {
    if (fs.existsSync(EXCLUSIONS_PATH)) {
      const content = fs.readFileSync(EXCLUSIONS_PATH, 'utf8');
      const data = JSON.parse(content);
      if (Array.isArray(data)) {
        for (const item of data) {
          const str = String(item).trim().toLowerCase();
          if (str.startsWith('provider:')) {
            excludedProviders.push(str.replace(/^provider:/, '').trim());
          } else if (str) {
            excludedModels.push(str);
          }
        }
      } else if (typeof data === 'object' && data !== null) {
        if (Array.isArray(data.excludedModels)) {
          excludedModels = data.excludedModels.map(m => String(m).trim().toLowerCase()).filter(Boolean);
        }
        if (Array.isArray(data.excludedProviders)) {
          excludedProviders = data.excludedProviders.map(p => String(p).trim().toLowerCase()).filter(Boolean);
        }
      }
    }
  } catch (err) {
    console.warn(`[!] Warning: Could not read exclusions.json: ${err.message}`);
  }

  const cliExcludeArg = args.find(a => a.startsWith('--exclude-provider='));
  if (cliExcludeArg) {
    const raw = cliExcludeArg.split('=')[1] || '';
    const cliExcluded = raw.split(',').map(p => p.trim().toLowerCase()).filter(Boolean);
    excludedProviders = Array.from(new Set([...excludedProviders, ...cliExcluded]));
  }

  return { excludedModels, excludedProviders };
}

function getExclusionList() {
  return getExclusionConfig().excludedModels;
}

function getExcludedProviders() {
  return getExclusionConfig().excludedProviders;
}

function isProviderExcluded(providerName, excludedProviders = null) {
  const excluded = excludedProviders || getExcludedProviders();
  const name = String(providerName || '').trim().toLowerCase();
  if (!name) return false;
  return excluded.includes(name);
}

function isModelExcluded(modelIdentifier, exclusions) {
  if (!exclusions || exclusions.length === 0) return false;
  const str = String(modelIdentifier).toLowerCase();
  for (const item of exclusions) {
    if (!item) continue;
    if (str === item || str.includes(item)) {
      return item;
    }
  }
  return false;
}

// ----------------------------------------------------------------------------
// Signals: Benchmarks, Priorities, Usage Penalties
// ----------------------------------------------------------------------------

// Benchmark & scoring functions loaded from classifier.js

function getPrioritiesList() {
  try {
    if (fs.existsSync(PRIORITIES_PATH)) {
      const data = JSON.parse(fs.readFileSync(PRIORITIES_PATH, 'utf8'));
      if (Array.isArray(data)) {
        return data.map(item => String(item).trim().toLowerCase()).filter(Boolean);
      }
    }
  } catch (err) {
    console.warn(`[!] Warning: Could not read priorities.json: ${err.message}`);
  }
  return [];
}

function getModelPriorityRank(modelIdentifier, priorities) {
  if (!Array.isArray(priorities) || priorities.length === 0) return Infinity;
  const target = String(modelIdentifier).toLowerCase();
  for (let i = 0; i < priorities.length; i++) {
    const p = priorities[i];
    if (!p) continue;
    if (target.includes(p)) return i;
  }
  return Infinity;
}

function loadUsageFeedback(forceReload = false) {
  return storage.readUsageFeedback();
}

function getUsagePenalty(fullId, usageStats = null) {
  const stats = usageStats || loadUsageFeedback();
  if (!stats || stats.size === 0) return 0;

  const slashIdx = String(fullId).indexOf('/');
  if (slashIdx === -1) return 0;
  const prefix = String(fullId).slice(0, slashIdx).toLowerCase();
  const modelId = String(fullId).slice(slashIdx + 1).toLowerCase();

  const providerRec = providerByPrefix(prefix);
  const providerKey = providerRec?.usageName || prefix;

  const key = `${providerKey}|${modelId}`;
  const entry = stats.get(key);
  if (!entry) return 0;

  const total = entry.ok + entry.err;
  if (total < 5) return 0;

  const errorRate = entry.err / total;
  if (errorRate >= 0.8) return -800;
  if (errorRate >= 0.5) return -400;
  return 0;
}

function getModelFullId(m) {
  return typeof m === 'object' && m !== null ? (m.fullId || m.id) : String(m);
}

function classifyTestResult(result) {
  if (!result) return 'dead';
  const lat = typeof result.latencyMs === 'number' ? result.latencyMs : 0;
  if (result.quotaExhausted === true || isParkedLatency(lat)) return 'quota';
  if (result.valid === true || result.ok === true) return 'active';
  return 'dead';
}

function isParkedLatency(latencyMs) {
  return typeof latencyMs === 'number' && latencyMs >= QUOTA_LATENCY_SENTINEL;
}

// Model tier predicates loaded from classifier.js

function passesAgenticGate(meta) {
  if (!meta) return true;
  if (meta.toolsUnsupported === true) return false;
  if (meta.contextLength != null && meta.contextLength > 0 && meta.contextLength < AGENTIC_MIN_CONTEXT) return false;
  return true;
}

// ----------------------------------------------------------------------------
// Candidate Sorting & Assembly Pipeline (Candidate 3)
// ----------------------------------------------------------------------------

function sortModelsByCodingQuality(models, latencyMap = null, customPriorities = null, signals = null) {
  const priorities = (signals && signals.priorities) || customPriorities || getPrioritiesList();
  const benchmarks = (signals && signals.benchmarks) || getBenchmarksDatabase();
  const usageStats = (signals && signals.usageStats) || loadUsageFeedback();

  const getLatency = m => {
    if (typeof m === 'object' && m !== null && typeof m.latencyMs === 'number') return m.latencyMs;
    const fullId = getModelFullId(m);
    if (latencyMap && latencyMap.has(fullId)) return latencyMap.get(fullId);
    return 9999;
  };

  return [...models].sort((a, b) => {
    const idA = getModelFullId(a);
    const idB = getModelFullId(b);

    const latA = getLatency(a);
    const latB = getLatency(b);

    const quotaA = Boolean((typeof a === 'object' && a?.quotaExhausted) || isParkedLatency(latA));
    const quotaB = Boolean((typeof b === 'object' && b?.quotaExhausted) || isParkedLatency(latB));

    if (quotaA !== quotaB) return quotaA ? 1 : -1;

    const rankA = getModelPriorityRank(idA, priorities);
    const rankB = getModelPriorityRank(idB, priorities);

    if (rankA !== rankB) return rankA - rankB;

    const penaltyA = getUsagePenalty(idA, usageStats);
    const penaltyB = getUsagePenalty(idB, usageStats);

    const scoreA = getCodingScore(idA, benchmarks) + penaltyA;
    const scoreB = getCodingScore(idB, benchmarks) + penaltyB;

    if (scoreB !== scoreA) return scoreB - scoreA;

    return latA - latB;
  });
}

function sortModelsByFastLatency(models, latencyMap = null, signals = null) {
  const benchmarks = (signals && signals.benchmarks) || getBenchmarksDatabase();
  const usageStats = (signals && signals.usageStats) || loadUsageFeedback();

  const getLatency = m => {
    if (typeof m === 'object' && m !== null && typeof m.latencyMs === 'number') return m.latencyMs;
    const fullId = getModelFullId(m);
    if (latencyMap && latencyMap.has(fullId)) return latencyMap.get(fullId);
    return 9999;
  };

  return [...models].sort((a, b) => {
    const idA = getModelFullId(a);
    const idB = getModelFullId(b);

    const latA = getLatency(a);
    const latB = getLatency(b);

    const quotaA = Boolean((typeof a === 'object' && a?.quotaExhausted) || isParkedLatency(latA));
    const quotaB = Boolean((typeof b === 'object' && b?.quotaExhausted) || isParkedLatency(latB));

    if (quotaA !== quotaB) return quotaA ? 1 : -1;

    if (latA !== latB) return latA - latB;

    const penaltyA = getUsagePenalty(idA, usageStats);
    const penaltyB = getUsagePenalty(idB, usageStats);

    const scoreA = getCodingScore(idA, benchmarks) + penaltyA;
    const scoreB = getCodingScore(idB, benchmarks) + penaltyB;

    return scoreB - scoreA;
  });
}


function buildComboMap({ free = [], cooldown = [], fast = [], smart = [], code = [] }) {
  const MAX_PER_COMBO = 6;
  const pinned = storage.readPinnedModels ? storage.readPinnedModels() : {};

  const mergePinned = (comboName, list) => {
    const pins = (pinned[comboName] || []).filter(Boolean);
    if (pins.length === 0) return list.slice(0, MAX_PER_COMBO);
    const merged = [...new Set([...pins, ...list])];
    return merged.slice(0, MAX_PER_COMBO);
  };

  return new Map([
    ['auto-free', mergePinned('auto-free', free || [])],
    ['auto-smart', mergePinned('auto-smart', smart || [])],
    ['auto-code', mergePinned('auto-code', code || [])],
    ['auto-fast', mergePinned('auto-fast', fast || [])],
    ['cooldown', cooldown || []],
  ]);
}

/**
 * Deep ranking and assembly interface:
 * Consolidates agentic gating, quality ranking, and multi-tier partitioning into one pure call.
 */
function assembleCombos({ candidates, latencyMap = new Map(), metaMap = new Map(), signals = null }) {
  const allIds = Array.from(new Set(candidates.map(getModelFullId)));

  // Super-combo agentic readiness gate
  const gatedIds = allIds.filter(id => passesAgenticGate(metaMap.get(id)));
  const gatedActiveIds = gatedIds.filter(id => !isParkedLatency(latencyMap.get(id) ?? 0));
  const gatedQuotaIds = gatedIds.filter(id => !gatedActiveIds.includes(id));

  const benchmarks = (signals && signals.benchmarks) || getBenchmarksDatabase();
  const unifiedList = sortModelsByCodingQuality(gatedActiveIds, latencyMap, null, signals);
  const cooldownList = sortModelsByCodingQuality(gatedQuotaIds, latencyMap, null, signals);

  // auto-smart: reasoning models + high-benchmark models (score >= SMART_MIN_SCORE)
  const smartList = unifiedList.filter(id => isSmartTierModel(id, benchmarks));

  // auto-code: coding specialist models + high-benchmark coding models (score >= 75)
  const codeList = unifiedList.filter(id => isCodingTierModel(id, benchmarks));

  // auto-fast: responsive candidates (fast architecture OR latency < 1500ms) (sorted by latency asc, score desc)
  const fastCandidates = gatedActiveIds.filter(id => {
    const lat = latencyMap.get(id) ?? 9999;
    const rawId = String(id).toLowerCase();
    const isFastArch = /flash|mini|turbo|lite|haiku|instant|lightning|small|8b|14b/i.test(rawId);
    return isFastArch || (lat > 0 && lat < 1500);
  });
  const fastList = sortModelsByFastLatency(fastCandidates, latencyMap, signals);

  return {
    unified: unifiedList,
    cooldown: cooldownList,
    smart: smartList,
    code: codeList,
    fast: fastList,
    gatedOutCount: allIds.length - gatedIds.length
  };
}


// ----------------------------------------------------------------------------
// Pre-Testing Engine
// ----------------------------------------------------------------------------

async function testModelWith9router(fullModelId, token, attempt = 1, fetchImpl = null, options = {}) {
  if (!token) return { valid: true, ok: true, latencyMs: 9999, verdict: 'active', note: '9router token unavailable' };

  const doFetch = fetchImpl || fetch;
  const startTime = Date.now();
  const routerUrl = storage.resolveNineRouterUrl ? storage.resolveNineRouterUrl() : (process.env.NINEROUTER_URL || 'http://127.0.0.1:20128');
  try {
    const probeTools = options.probeTools ?? true;
    const res = await doFetch(`${routerUrl}/api/models/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': (token && token.startsWith('sk-')) ? ('Bearer ' + token) : ('Bearer ' + token), 'x-9r-cli-token': token
      },
      body: JSON.stringify({ model: fullModelId, kind: 'llm', probeTools }),
      signal: AbortSignal.timeout(25000)
    });

    const latencyMs = Date.now() - startTime;
    const data = await res.json().catch(() => ({}));

    if (data.ok) {
      return {
        valid: true,
        ok: true,
        latencyMs,
        verdict: 'active',
        note: data.note,
        supportsTools: data.supportsTools,
        toolsUnsupported: data.toolsUnsupported === true,
        toolProbeError: data.toolProbeError
      };
    }

    const status = Number(data.status || res.status);
    const fullReason = String(data.error || `HTTP ${data.status || res.status}`).replace(/\s+/g, ' ').trim();
    const reason = fullReason.slice(0, 75);
    const quotaish = status === 429 || /quota|rate.?limit|resource.?exhaust|capacity/i.test(fullReason.slice(0, 400));

    if (TRANSIENT_HTTP_STATUSES.has(status) && attempt < 2) {
      await new Promise(r => setTimeout(r, QUOTA_RETRY_DELAY_MS));
      return { ...(await testModelWith9router(fullModelId, token, attempt + 1, fetchImpl, options)), retried: true };
    }

    const result = { valid: false, ok: false, latencyMs, status, reason };
    if (quotaish) result.quotaExhausted = true;
    result.verdict = quotaish ? 'quota' : 'dead';
    return result;
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    if (attempt < 2) {
      await new Promise(r => setTimeout(r, QUOTA_RETRY_DELAY_MS));
      return { ...(await testModelWith9router(fullModelId, token, attempt + 1, fetchImpl, options)), retried: true };
    }
    const result = { valid: false, ok: false, latencyMs, reason: err.message.slice(0, 75), verdict: 'dead' };
    if (/timed?\s*out|abort/i.test(err.message)) result.timedOut = true;
    return result;
  }
}

function isModelDisabled(fullOrRawId, disabledMap) {
  if (!disabledMap || Object.keys(disabledMap).length === 0) return false;
  const target = String(fullOrRawId || '').trim();
  if (!target) return false;

  const targetLower = target.toLowerCase();
  let prefix = '';
  let rawId = targetLower;

  if (targetLower.includes('/')) {
    const slashIdx = targetLower.indexOf('/');
    prefix = targetLower.slice(0, slashIdx);
    rawId = targetLower.slice(slashIdx + 1);
  }

  // Check prefix list if prefix exists in disabledMap
  if (prefix && disabledMap[prefix]) {
    const list = disabledMap[prefix];
    if (Array.isArray(list)) {
      const match = list.some(d => {
        const s = String(d).trim().toLowerCase();
        return s === rawId || s === targetLower || targetLower.endsWith('/' + s);
      });
      if (match) return true;
    }
  }

  // Fallback: check across all providers if no prefix or if rawId matches
  if (!prefix) {
    for (const list of Object.values(disabledMap)) {
      if (!Array.isArray(list)) continue;
      if (list.some(d => String(d).trim().toLowerCase() === targetLower)) {
        return true;
      }
    }
  }

  return false;
}

async function validateCandidateModels(models, prefix) {
  const exclusions = getExclusionList();
  const disabledMap = storage.readDisabledModels ? storage.readDisabledModels() : {};
  const nonExcludedModels = [];

  for (const m of models) {
    const fullId = m.fullId || `${prefix}/${m.id}`;
    const rawId = m.id || m.rawId;

    // Check if model is disabled in 9router settings
    if (isModelDisabled(fullId, disabledMap) || isModelDisabled(rawId, disabledMap)) {
      console.log(`    [⊘ Disabled] ${fullId} -> Model is disabled in 9router settings`);
      continue;
    }

    const matchedRule = isModelExcluded(fullId, exclusions) || isModelExcluded(m.id, exclusions);
    if (matchedRule) {
      console.log(`    [⊘ Excluded] ${fullId} -> Matched rule "${matchedRule}"`);
    } else {
      nonExcludedModels.push(m);
    }
  }

  const token = storage.get9routerCliToken();
  if (!token) {
    console.log('[-] 9router CLI auth token not found or server offline, skipping live test.');
    return nonExcludedModels;
  }

  const activeModels = [];
  const quotaLimitedModels = [];
  const providerRecord = providerByPrefix(prefix);
  const concurrency = providerRecord?.solo ? 1 : 5;
  const queue = [...nonExcludedModels];

  console.log(`[*] Pre-testing ${nonExcludedModels.length} candidate models for [${prefix}]...`);
  let consecutiveFails = 0;
  let consecutiveQuota = 0;

  async function worker() {
    while (queue.length > 0) {
      if (consecutiveFails >= 3) {
        const skipped = queue.splice(0, queue.length);
        for (const sm of skipped) {
          const fid = sm.fullId || `${prefix}/${sm.id}`;
          console.log(`    [✗ Dropped] ${fid} -> Skipped (provider upstream offline or auth error)`);
        }
        break;
      }
      if (consecutiveQuota >= 3) {
        const skipped = queue.splice(0, queue.length);
        console.log(`    [⏳ Quota] Provider [${prefix}] kuota/kredit habis beruntun. Memarkir ${skipped.length} model tersisa ke cooldown.`);
        for (const sm of skipped) {
          quotaLimitedModels.push({ ...sm, latencyMs: QUOTA_LATENCY_SENTINEL, quotaExhausted: true });
        }
        break;
      }
      const m = queue.shift();
      if (!m) break;
      const fullId = m.fullId || `${prefix}/${m.id}`;

      if (providerRecord?.throttleMs) await new Promise(r => setTimeout(r, providerRecord.throttleMs));

      const result = await testModelWith9router(fullId, token);
      const verdict = classifyTestResult(result);

      if (verdict === 'active') {
        const msText = `${result.latencyMs}ms`;
        const toolsTag = result.toolsUnsupported ? ' [Tools: ✗ Unsupported]' : (result.supportsTools ? ' [Tools: ✓ Supported]' : '');
        console.log(`    [✓ Active] ${fullId} (${msText})${toolsTag} ${result.note ? '(' + result.note + ')' : ''}`);
        activeModels.push({
          ...m,
          latencyMs: result.latencyMs,
          toolsUnsupported: result.toolsUnsupported === true,
        });
        consecutiveFails = 0;
        consecutiveQuota = 0;
      } else if (verdict === 'quota') {
        console.log(`    [⏳ Quota] ${fullId} -> Kept at bottom (${result.reason})`);
        quotaLimitedModels.push({ ...m, latencyMs: QUOTA_LATENCY_SENTINEL, quotaExhausted: true });
        consecutiveFails = 0;
        consecutiveQuota++;
      } else {
        console.log(`    [✗ Dropped] ${fullId} -> ${result.reason}${result.retried ? ' (after retry)' : ''}`);
        if (result.status === 401 || result.status === 403 || result.timedOut || /timed?\s*out|abort|fetch failed|econnrefused/i.test(result.reason)) {
          consecutiveFails++;
        }
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, nonExcludedModels.length) }, () => worker());
  await Promise.all(workers);

  return [
    ...sortModelsByCodingQuality(activeModels),
    ...sortModelsByCodingQuality(quotaLimitedModels)
  ];
}

// ----------------------------------------------------------------------------
// Notifications & State Persistence
// ----------------------------------------------------------------------------

async function sendTextNotification(text) {
  const results = [];
  const tgToken = process.env.TELEGRAM_BOT_TOKEN;
  const tgChat = process.env.TELEGRAM_CHAT_ID;
  const discordUrl = process.env.DISCORD_WEBHOOK_URL;

  const post = async (label, url, body) => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000)
      });
      results.push(`${label}: HTTP ${res.status}`);
    } catch (err) {
      results.push(`${label}: ${err.message.slice(0, 60)}`);
    }
  };

  const jobs = [];
  if (tgToken && tgChat) jobs.push(post('telegram', `https://api.telegram.org/bot${tgToken}/sendMessage`, { chat_id: tgChat, text }));
  if (discordUrl) jobs.push(post('discord', discordUrl, { content: text }));

  if (jobs.length > 0) {
    await Promise.all(jobs);
    console.log(`[*] Notification results: ${results.join(', ')}`);
  }
}

function buildDeltaMessage({ mode, added, removed, total }) {
  const lines = [`9router free sync (${mode}) done.`];
  lines.push(`Total active models: ${total}`);
  if (added.length === 0 && removed.length === 0) {
    lines.push('No changes since last run.');
  } else {
    if (added.length > 0) lines.push(`+ Added (${added.length}): ${added.slice(0, 10).join(', ')}${added.length > 10 ? ', ...' : ''}`);
    if (removed.length > 0) lines.push(`- Removed (${removed.length}): ${removed.slice(0, 10).join(', ')}${removed.length > 10 ? ', ...' : ''}`);
  }
  return lines.join('\n');
}

function computeComboDelta(oldList, newList) {
  const oldSet = new Set((oldList || []).map(String));
  const newSet = new Set((newList || []).map(String));
  return {
    added: [...newSet].filter(id => !oldSet.has(id)),
    removed: [...oldSet].filter(id => !newSet.has(id))
  };
}

function getCooldownDelayMs(failCount) {
  if (failCount <= 1) return 15 * 60 * 1000;
  if (failCount <= 3) return 60 * 60 * 1000;
  return 6 * 60 * 60 * 1000;
}

function loadFullCandidateState() {
  try {
    if (!fs.existsSync(CANDIDATES_STATE_PATH)) return { providers: {}, cooldowns: {} };
    const data = JSON.parse(fs.readFileSync(CANDIDATES_STATE_PATH, 'utf8'));
    return {
      updatedAt: data.updatedAt,
      providers: data.providers || {},
      cooldowns: data.cooldowns || {}
    };
  } catch (err) {
    return { providers: {}, cooldowns: {} };
  }
}

function saveFullCandidateState(state) {
  try {
    fs.writeFileSync(CANDIDATES_STATE_PATH, JSON.stringify({
      updatedAt: new Date().toISOString(),
      providers: state.providers || {},
      cooldowns: state.cooldowns || {}
    }, null, 2));
  } catch (err) {
    console.warn(`[!] Warning: Could not save candidates-state.json: ${err.message}`);
  }
}

function saveCandidateState(defs, prefixedByProvider, cooldownUpdates = null) {
  try {
    const currentState = loadFullCandidateState();
    const providers = {};
    for (const [key, data] of defs) {
      const ids = prefixedByProvider[key];
      if (!Array.isArray(ids) || ids.length === 0) continue;
      providers[key] = { prefix: data.prefix, ids };
    }
    currentState.providers = providers;
    if (cooldownUpdates) {
      currentState.cooldowns = cooldownUpdates;
    }
    saveFullCandidateState(currentState);
  } catch (err) {
    console.warn(`[!] Warning: Could not save candidates-state.json: ${err.message}`);
  }
}

function loadCandidatePool() {
  try {
    const state = loadFullCandidateState();
    const pool = new Map();
    for (const entry of Object.values(state.providers || {})) {
      if (!entry || !entry.prefix) continue;
      const set = pool.get(entry.prefix) || new Set();
      for (const id of entry.ids || []) set.add(String(id));
      pool.set(entry.prefix, set);
    }
    return pool;
  } catch (err) {
    console.warn(`[!] Warning: Could not read candidates-state.json: ${err.message}`);
    return new Map();
  }
}

function cleanupLegacyCombos() {
  try {
    const Database = storage.getDbClass ? storage.getDbClass() : require('better-sqlite3');
    const dbPath = storage.resolveDbPath ? storage.resolveDbPath() : path.join(process.env.HOME || '/root', '.9router/db/data.sqlite');
    if (!fs.existsSync(dbPath)) return;
    const db = new Database(dbPath, { timeout: 10000 });
    try {
      db.pragma('journal_mode = WAL');
      db.pragma('busy_timeout = 10000');
    } catch {}
    const legacy = db.prepare("SELECT id, name FROM combos WHERE name LIKE 'my9model-%' OR name IN ('auto-cooldown', 'auto-all', 'auto-long') OR (name LIKE '%-free' AND name != 'auto-free')").all();
    if (legacy.length > 0) {
      db.transaction(() => {
        const deleteStmt = db.prepare("DELETE FROM combos WHERE id = ?");
        for (const row of legacy) {
          deleteStmt.run(row.id);
          console.log(`[*] Cleaned up legacy/provider combo '${row.name}' from 9router SQLite`);
        }
      })();
    }
    db.close();
  } catch (err) {
    console.warn(`[!] Warning: Could not clean up legacy combos: ${err.message}`);
  }
}

async function persistAndNotifyCombos(comboMap, mode = 'daily-sync') {
  cleanupLegacyCombos();
  const previousUnified = storage.readCurrentComboModels('auto-free');
  const delta = computeComboDelta(previousUnified, comboMap.get('auto-free') || []);

  await storage.persistCombos(comboMap);

  try {
    await sendTextNotification(buildDeltaMessage({
      mode,
      added: delta.added,
      removed: delta.removed,
      total: (comboMap.get('auto-free') || []).length
    }));
  } catch {}
}

// ----------------------------------------------------------------------------
// Core Orchestration: Full Sync & Watchdog Refresh
// ----------------------------------------------------------------------------

async function refreshCombos() {
  console.log('[*] Watchdog refresh: re-testing existing combo members (no discovery)...');
  const token = storage.get9routerCliToken();
  if (!token) {
    console.error('[X] 9router CLI auth token unavailable; live re-test impossible. Aborting without changes.');
    process.exit(1);
  }

  const current = new Map();
  for (const name of SUPER_COMBOS) {
    const models = storage.readCurrentComboModels(name);
    if (models.length > 0) current.set(name, models);
  }
  for (const legacy of ['my9model-free', 'my9model-smart', 'my9model-fast', 'my9model-cooldown']) {
    const models = storage.readCurrentComboModels(legacy);
    if (models.length > 0) current.set(legacy, models);
  }

  const previousMembers = new Set(SUPER_COMBOS.flatMap(n => current.get(n) || []));

  const candidatePool = loadCandidatePool();
  const poolIds = Array.from(new Set([...candidatePool.values()].flatMap(s => [...s])));
  if (poolIds.length > 0) {
    console.log(`[*] Candidate pool: ${poolIds.length} ids from last full sync (recovered models can rejoin).`);
  }

  const superIds = current.get('auto-free') || current.get('my9model-free') || [];
  const extraSuper = new Set([
    ...SUPER_COMBOS.flatMap(name => current.get(name) || []),
    ...(current.get('my9model-smart') || []),
    ...(current.get('my9model-fast') || []),
    ...(current.get('my9model-cooldown') || [])
  ]);

  const allIds = Array.from(new Set([
    ...superIds,
    ...extraSuper,
    ...poolIds
  ]));


  if (allIds.length === 0) {
    console.log('[!] No managed combos found to refresh. Run a full sync first.');
    return;
  }

  const fullState = loadFullCandidateState();
  const cooldowns = fullState.cooldowns || {};
  const now = Date.now();

  const activeSet = new Set();
  const quotaSet = new Set();
  const latencyRefresh = new Map();
  const queue = [];

  const exclusions = getExclusionList();
  const disabledMap = storage.readDisabledModels ? storage.readDisabledModels() : {};

  for (const id of allIds) {
    if (isModelDisabled(id, disabledMap)) {
      console.log(`    [⊘ Disabled] ${id} -> Model is disabled in 9router settings`);
      if (cooldowns[id]) delete cooldowns[id];
      continue;
    }

    const matchedRule = isModelExcluded(id, exclusions);
    if (matchedRule) {
      console.log(`    [⊘ Excluded] ${id} -> Matched rule "${matchedRule}"`);
      if (cooldowns[id]) delete cooldowns[id];
      continue;
    }

    const entry = cooldowns[id];
    if (entry && entry.nextRetryAt && now < new Date(entry.nextRetryAt).getTime()) {
      console.log(`    [⏳ Backoff] ${id} in cooldown until ${entry.nextRetryAt} (tier ${entry.failCount})`);
      quotaSet.add(id);
    } else {
      queue.push(id);
    }
  }

  const CONCURRENCY = 8;
  const metaMap = new Map();
  console.log(`[*] Re-testing ${queue.length} unique combo members (${quotaSet.size} in backoff)...`);

  async function worker() {
    while (queue.length > 0) {
      const fullId = queue.shift();
      const providerPrefix = String(fullId).split('/')[0].toLowerCase();
      const throttled = providerByPrefix(providerPrefix);
      if (throttled?.throttleMs) await new Promise(r => setTimeout(r, throttled.throttleMs));

      const result = await testModelWith9router(fullId, token);
      const verdict = classifyTestResult(result);
      if (verdict === 'active') {
        latencyRefresh.set(fullId, result.latencyMs);
        activeSet.add(fullId);
        metaMap.set(fullId, {
          toolsUnsupported: result.toolsUnsupported === true
        });
        if (cooldowns[fullId]) delete cooldowns[fullId];
      } else if (verdict === 'quota') {
        console.log(`    [⏳ Quota] ${fullId} demoted to bottom (${result.reason})`);
        quotaSet.add(fullId);
        const prevCount = cooldowns[fullId]?.failCount || 0;
        const newCount = prevCount + 1;
        const delayMs = getCooldownDelayMs(newCount);
        cooldowns[fullId] = {
          failCount: newCount,
          lastFailedAt: new Date().toISOString(),
          nextRetryAt: new Date(now + delayMs).toISOString(),
          reason: result.reason
        };
      } else {
        console.log(`    [✗ Removed] ${fullId} -> ${result.reason}${result.retried ? ' (after retry)' : ''}`);
        if (cooldowns[fullId]) delete cooldowns[fullId];
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker()));
  saveFullCandidateState({ ...fullState, cooldowns });

  const assembled = assembleCombos({
    candidates: Array.from(activeSet),
    latencyMap: latencyRefresh,
    metaMap
  });

  const rankedQuota = sortModelsByCodingQuality(Array.from(quotaSet), latencyRefresh);

  let recoveredCount = 0;
  for (const id of assembled.unified) {
    if (!previousMembers.has(id)) recoveredCount++;
  }

  const comboMap = buildComboMap({
    free: assembled.unified,
    smart: assembled.smart,
    code: assembled.code,
    fast: assembled.fast,
    cooldown: assembled.cooldown.length > 0 ? assembled.cooldown : rankedQuota
  });

  console.log(`\n[Σ] Refresh result: ${activeSet.size} active, ${quotaSet.size} parked in cooldown, ${allIds.length - activeSet.size - quotaSet.size} removed permanently, ${recoveredCount} recovered into provider combos.`);

  if (isDryRun) {
    console.log('\n[*] Dry run mode enabled. No changes written.');
    return;
  }

  // Safety Circuit Breaker: Do NOT overwrite combos with empty lists if re-testing returned 0 active models
  if (assembled.unified.length === 0 && previousMembers.size > 0) {
    console.warn('\n[⚠️ CIRCUIT BREAKER] Watchdog refresh detected 0 active models (likely network outage or upstream block). Preserving existing combos to prevent data wipe!');
    return;
  }

  await persistAndNotifyCombos(comboMap, 'watchdog-refresh');
  console.log('\n[🎉] Watchdog refresh completed successfully.');
}

async function injectInto9router(providers) {
  const p = providers || {};
  const allKeys = new Set([...PROVIDERS.map(r => r.key), ...Object.keys(p)]);
  const defs = Array.from(allKeys).map(key => {
    const rec = PROVIDERS.find(r => r.key === key);
    const data = p[key] || (rec ? { prefix: rec.prefixes[0], models: [], inactive: !isProviderActive(rec), label: rec.label, combo: rec.combo } : { prefix: key, models: [], excluded: true });
    const label = data.label || rec?.label || key;
    const combo = data.combo || rec?.combo || `${data.prefix || key}-free`;
    return [key, data, label, combo];
  });

  for (const [key, data] of defs) {
    if (data && !data.excluded && !data.inactive && Array.isArray(data.models)) {
      data.validated = await validateCandidateModels(data.models, data.prefix);
    } else {
      data.validated = [];
    }
  }

  const prefixedByProvider = {};
  const activeByProvider = {};
  const metaMap = new Map();
  const latencyMap = new Map();

  for (const [key, data] of defs) {
    const prefix = data.prefix;
    prefixedByProvider[key] = (data.validated || []).map(m => m.fullId || `${prefix}/${m.id}`);
    activeByProvider[key] = (data.validated || [])
      .filter(m => classifyTestResult({ valid: true, latencyMs: m.latencyMs }) === 'active')
      .map(m => m.fullId || `${prefix}/${m.id}`);
    for (const m of (data.validated || [])) {
      const fullId = m.fullId || `${prefix}/${m.id}`;
      const meta = {};
      if (m.contextLength != null) meta.contextLength = m.contextLength;
      if (m.toolsUnsupported != null) meta.toolsUnsupported = m.toolsUnsupported;
      if (Object.keys(meta).length > 0) metaMap.set(fullId, meta);
      if (m.latencyMs != null) latencyMap.set(fullId, m.latencyMs);
    }
  }

  for (const [key, data, label] of defs) {
    if (data.inactive) {
      continue;
    }
    if (data.excluded) {
      console.log(`\n[⊘] ${label}: Skipped (provider excluded)`);
      continue;
    }
    console.log(`\n[+] Validated ${label}: ${(data.validated || []).length} models:`);
    for (const m of (data.validated || [])) {
      const rawId = m.fullId || `${data.prefix}/${m.id}`;
      const latStr = m.latencyMs ? ` [${m.latencyMs}ms]` : '';
      const quotaStr = m.quotaExhausted ? ' [QUOTA-BOTTOM]' : '';
      console.log(`    - ${rawId} [Score: ${getCodingScore(m.id)}]${latStr}${quotaStr} (${m.name})`);
    }
  }

  const allCandidates = defs.flatMap(([key]) => prefixedByProvider[key]);
  const assembled = assembleCombos({
    candidates: allCandidates,
    latencyMap,
    metaMap
  });

  if (assembled.gatedOutCount > 0) {
    console.log(`\n[⚙] Agentic gate: ${assembled.gatedOutCount} model(s) excluded (no tools support or context < ${AGENTIC_MIN_CONTEXT}).`);
  }

  console.log(`\n[+] Super-combo auto-free: ${assembled.unified.length} models (all active)`);
  console.log(`[+] auto-smart: ${assembled.smart.length} models | auto-code: ${assembled.code.length} models | auto-fast: ${assembled.fast.length} models`);
  console.log(`[+] cooldown: ${assembled.cooldown.length} model(s) parked (quota-exhausted)`);

  if (isDryRun) {
    console.log('\n[*] Dry run mode enabled. No changes written.');
    return;
  }

  // Safety Circuit Breaker: Do NOT overwrite combos with empty lists if full sync returned 0 active models
  if (assembled.unified.length === 0) {
    console.warn('\n[⚠️ CIRCUIT BREAKER] Full sync detected 0 active models (likely network outage or upstream block). Preserving existing combos to prevent data wipe!');
    return;
  }

  await persistAndNotifyCombos(buildComboMap({
    free: assembled.unified,
    smart: assembled.smart,
    code: assembled.code,
    fast: assembled.fast,
    cooldown: assembled.cooldown
  }), 'daily-sync');

  saveCandidateState(defs, prefixedByProvider);
  console.log('\n[🎉] Synchronization completed successfully.');
}

async function main() {
  if (args.includes('--web') || args.includes('--ui') || args.includes('--dashboard')) {
    const { startServer } = require('./web.js');
    startServer();
    return;
  }

  const mode = isRefreshMode ? 'WATCHDOG REFRESH' : (isCronSetup ? 'SETUP SCHEDULER' : 'DAILY FULL SYNC');
  console.log('====================================================');
  console.log('  Free Models Sync -> 9router Combos               ');
  console.log('  Sources: OpenAgentic + Kilo + OpenRouter + Poolside + Gemini + Ollama + Airforce + Bazaarlink + B.ai');
  console.log('           + Groq + Cerebras + Mistral + Cloudflare AI + NVIDIA NIM + OC');
  console.log(`  Mode: ${mode}  `);
  console.log(`  Time: ${new Date().toISOString()}`);
  console.log(`  Database: ${storage.resolveDbPath()}`);
  console.log('====================================================\n');

  if (isWebMode) {
    require('./web.js');
    return;
  }

  if (isCronSetup) {
    scheduler.installScheduler();
    console.log('\n[*] Scheduler installed. Exiting (run `npm run sync` manually anytime).');
    return;
  }

  if (isLiveBenchmarks) {
    try {
      const { updateBenchmarks } = require('./update-benchmarks.js');
      await updateBenchmarks();
    } catch (err) {
      console.warn(`[!] Failed to update live benchmarks: ${err.message}`);
    }
  }

  if (isRefreshMode) {
    await refreshCombos();
    return;
  }

  const excludedProviders = getExcludedProviders();
  if (excludedProviders.length > 0) {
    console.log(`[⊘] Excluded providers via config (${excludedProviders.length}): ${excludedProviders.join(', ')}\n`);
  }

  const results = await discoverAllProviders({ excludedProviders });
  await injectInto9router(results);
}

if (require.main === module) {
  main().catch(err => {
    console.error('[!] Unhandled error:', err);
    process.exit(1);
  });
}

module.exports = {
  getCodingScore,
  sortModelsByCodingQuality,
  getPrioritiesList,
  getModelPriorityRank,
  getModelFullId,
  getBenchmarksDatabase,
  findBenchmarkMatch,
  getUsagePenalty,
  loadUsageFeedback,
  isSmartTierModel,
  isReasoningModel,
  isCodingTierModel,
  isCodingSpecialistModel,
  passesAgenticGate,
  AGENTIC_MIN_CONTEXT,
  QUOTA_LATENCY_SENTINEL,
  TRANSIENT_HTTP_STATUSES,
  classifyTestResult,
  isParkedLatency,
  buildComboMap,
  computeComboDelta,
  buildDeltaMessage,
  readCurrentComboModels: storage.readCurrentComboModels,
  SUPER_COMBOS,
  getExclusionConfig,
  getExclusionList,
  getExcludedProviders,
  isProviderExcluded,
  isModelExcluded,
  isModelDisabled,
  getProviderCredentials,
  discoverProvider,
  discoverAllProviders,
  testModelWith9router,
  validateCandidateModels,
  refreshCombos,
  injectInto9router,
  assembleCombos,
  saveCandidateState,
  loadCandidatePool,
  PROVIDERS,
  PROVIDER_BY_KEY,
  providerByPrefix
};


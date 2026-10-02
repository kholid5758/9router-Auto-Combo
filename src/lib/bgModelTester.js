/**
 * bgModelTester.js — Server-side Background "Test All Models"
 *
 * Menjalankan tes model secara asynchronous di process Node.js server.
 * Progress disimpan in-memory (global) dan persist ke JSON file
 * agar survive PM2 restart.
 *
 * Digunakan oleh /api/combo-generator route.js:
 *   - start_test_all   → startTestAll()
 *   - stop_test_all    → stopTest()
 *   - test_all_status  → getStatus()
 */

import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "@/lib/dataDir.js";

const STATE_FILE = path.join(DATA_DIR, "bg-test-results.json");

// Global state (survives hot-reload in dev, single-process in prod)
const g = (global.__bgModelTester ??= {
  running: false,
  stopRequested: false,
  progress: null, // { current, total, passed, failed, currentModel, startedAt, finishedAt, providerFilter, results: {} }
});

/**
 * Persist progress to disk (survive PM2 restart)
 */
function persistState() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(g.progress || {}, null, 2), "utf8");
  } catch (_) {}
}

/**
 * Load persisted state on first call (e.g. after PM2 restart)
 */
function loadPersistedState() {
  if (g.progress) return; // already loaded or running
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
      if (data && data.total > 0) {
        // If it was "running" when PM2 was killed, mark as interrupted
        if (data.running) {
          data.running = false;
          data.currentModel = "Pengujian terhenti (server restart).";
          data.finishedAt = data.finishedAt || new Date().toISOString();
        }
        g.progress = data;
      }
    }
  } catch (_) {}
}

/**
 * Fetch model list from 9router's internal /api/models endpoint
 */
async function fetchModelList(routerUrl, token) {
  const modelsMap = new Map();

  // 1. Fetch from 9router internal /api/models endpoint
  try {
    const res = await fetch(`${routerUrl}/api/models`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? (token.startsWith("sk-") ? { "Authorization": `Bearer ${token}` } : { "x-9r-cli-token": token, "Authorization": `Bearer ${token}` }) : {}),
      },
      signal: AbortSignal.timeout(60000),
    });
    const data = await res.json();
    const rawList = Array.isArray(data.data) ? data.data : (Array.isArray(data.models) ? data.models : []);
    rawList
      .filter((m) => m && m.id && m.owned_by !== "combo")
      .forEach((m) => {
        const parts = m.id.split("/");
        const provider = m.owned_by || parts[0];
        const model = parts.length > 1 ? parts.slice(1).join("/") : m.id;
        modelsMap.set(m.id, {
          id: m.id,
          fullModel: m.id,
          provider: provider,
          model: model,
        });
      });
  } catch (_) {}

  // 2. Also read customModels from SQLite DB to ensure all registered custom models are included (even if filtered out by 9router /api/models)
  try {
    const Database = require("better-sqlite3");
    const dbPath = process.env.DATA_DIR ? require("path").join(process.env.DATA_DIR, "db/data.sqlite") : require("path").join(process.env.HOME || "/root", ".9router/db/data.sqlite");
    if (require("fs").existsSync(dbPath)) {
      const db = new Database(dbPath, { readonly: true });
      const nodes = db.prepare("SELECT id, type, name, data FROM providerNodes").all();
      const customRows = db.prepare("SELECT key, value FROM kv WHERE scope = 'customModels'").all();
      db.close();

      const nodePrefixMap = {};
      for (const n of nodes) {
        try {
          const d = JSON.parse(n.data || "{}");
          if (d.prefix) {
            nodePrefixMap[n.id] = d.prefix;
            nodePrefixMap[n.id.toLowerCase()] = d.prefix;
          }
        } catch (_) {}
      }

      for (const row of customRows) {
        try {
          const parts = row.key.split("|");
          if (parts.length >= 2) {
            const nodeOrAlias = parts[0];
            const rawModel = parts[1];
            let val = {};
            try { val = JSON.parse(row.value); } catch(_) {}
            const modelId = val.id || rawModel;
            const prefix = nodePrefixMap[nodeOrAlias] || nodePrefixMap[nodeOrAlias.toLowerCase()] || val.providerAlias || nodeOrAlias;
            const fullModel = `${prefix}/${modelId}`;

            if (!modelsMap.has(fullModel)) {
              modelsMap.set(fullModel, {
                id: fullModel,
                fullModel: fullModel,
                provider: nodeOrAlias,
                model: modelId,
              });
            }
          }
        } catch (_) {}
      }
    }
  } catch (_) {}

  return Array.from(modelsMap.values());
}

/**
 * Fetch disabled models from 9router
 */
async function fetchDisabledModels(routerUrl, token) {
  try {
    const res = await fetch(`${routerUrl}/api/models/disabled`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? (token.startsWith("sk-") ? { "Authorization": `Bearer ${token}` } : { "x-9r-cli-token": token, "Authorization": `Bearer ${token}` }) : {}),
      },
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    return data.disabled || data.data || data.disabledModels || data.ids || {};
  } catch (_) {
    return {};
  }
}

/**
 * Test a single model via 9router /api/models/test
 */
async function testOneModel(modelId, routerUrl, token, timeoutMs = 15000) {
  const startTime = Date.now();
  try {
    const testRes = await fetch(`${routerUrl}/api/models/test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? (token.startsWith("sk-") ? { "Authorization": `Bearer ${token}` } : { "x-9r-cli-token": token, "Authorization": `Bearer ${token}` }) : {}),
      },
      body: JSON.stringify({
        model: modelId,
        kind: "llm",
        messages: [{ role: "user", content: "ping" }]
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const latencyMs = Date.now() - startTime;
    const data = await testRes.json().catch(() => ({}));

    if (data.ok || (testRes.ok && !data.error)) {
      return {
        ok: true,
        latencyMs,
        error: null,
        isTimeout: false,
      };
    }

    const errMsg = typeof data.error === "object" ? (data.error.message || JSON.stringify(data.error)) : (data.error || `HTTP ${testRes.status}`);
    const isTimeout = /timeout|timed out|abort/i.test(errMsg);

    return {
      ok: false,
      latencyMs,
      error: errMsg,
      isTimeout,
    };
  } catch (err) {
    const isTimeout = err.name === "TimeoutError" || /timeout|abort/i.test(err.message);
    return {
      ok: false,
      latencyMs: Date.now() - startTime,
      error: isTimeout ? "Request Timeout" : err.message,
      isTimeout,
    };
  }
}

/**
 * Auto-disable a failed model via 9router /api/models/disabled
 */
async function autoDisableModel(provider, rawModel, fullModel, routerUrl, token, providers) {
  try {
    const pKey = String(provider || "").trim();
    if (!pKey) return;

    const authHeaders = {
      "Content-Type": "application/json",
      ...(token ? (token.startsWith("sk-") ? { "Authorization": `Bearer ${token}` } : { "x-9r-cli-token": token, "Authorization": `Bearer ${token}` }) : {}),
    };

    // 1. Check if this is a custom model / custom node and delete it permanently
    const idToDelete = rawModel || fullModel;
    const isCustomNode = pKey.startsWith("openai-compatible-") || pKey.startsWith("anthropic-compatible-") ||
      (providers || []).some((p) => p.isCustom && (p.key === pKey || p.providerKey === pKey || p.defaultPrefix === pKey));

    if (isCustomNode || idToDelete) {
      // Try deleting custom model keys by alias and full model pattern
      const candidateKeys = [
        `${pKey}|${idToDelete}|llm`,
        `${pKey}|${rawModel}|llm`,
        idToDelete,
        rawModel,
      ].filter(Boolean);

      for (const k of candidateKeys) {
        try {
          await fetch(`${routerUrl}/api/models/custom/${encodeURIComponent(k)}`, {
            method: "DELETE",
            headers: authHeaders,
            signal: AbortSignal.timeout(5000),
          });
        } catch (_) {}
      }
    }

    // 2. Also register in disabledModels KV scope for complete routing blackout
    const res = await fetch(`${routerUrl}/api/models/disabled`, {
      headers: authHeaders,
      signal: AbortSignal.timeout(10000),
    });
    const currentMap = await res.json().catch(() => ({}));
    const existingList = Array.isArray(currentMap[pKey]) ? currentMap[pKey] : [];

    const idToAdd = rawModel || fullModel;
    if (idToAdd && !existingList.includes(idToAdd)) {
      const updatedList = [...existingList, idToAdd];
      await fetch(`${routerUrl}/api/models/disabled/${encodeURIComponent(pKey)}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ disabledModels: updatedList }),
        signal: AbortSignal.timeout(10000),
      });
    }
  } catch (_) {}
}

/**
 * Start background test-all job.
 * Returns immediately — the test loop runs asynchronously.
 */
export function startTestAll({ routerUrl, token, providerFilter, autoDisableFailed, providers }) {
  if (g.running) {
    return { started: false, reason: "already_running", progress: g.progress };
  }

  g.running = true;
  g.stopRequested = false;
  g.progress = {
    running: true,
    current: 0,
    total: 0,
    passed: 0,
    failed: 0,
    currentModel: "Mengambil daftar model...",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    providerFilter: providerFilter || null,
    autoDisableFailed: !!autoDisableFailed,
    results: {},
  };
  persistState();

  // Fire and forget — runs in background
  _runTestLoop({ routerUrl, token, providerFilter, autoDisableFailed, providers }).catch((err) => {
    console.error("[bgModelTester] Fatal error in test loop:", err);
    if (g.progress) {
      g.progress.running = false;
      g.progress.currentModel = `Error: ${err.message}`;
      g.progress.finishedAt = new Date().toISOString();
      g.running = false;
      persistState();
    }
  });

  return { started: true, progress: g.progress };
}

/**
 * Internal async loop
 */
async function _runTestLoop({ routerUrl, token, providerFilter, autoDisableFailed, providers }) {
  try {
    // 1. Fetch model list
    const allModels = await fetchModelList(routerUrl, token);
    const disabledMap = await fetchDisabledModels(routerUrl, token);

    const isIdDisabled = (fullModel, prov, rawModel) => {
      const provKeys = [prov, prov?.toLowerCase()].filter(Boolean);
      const matchedP = (providers || []).find(
        (p) =>
          String(p.key || "").toLowerCase() === String(prov || "").toLowerCase() ||
          String(p.providerKey || "").toLowerCase() === String(prov || "").toLowerCase() ||
          (p.prefixes && p.prefixes.some((pref) => String(pref).toLowerCase() === String(prov || "").toLowerCase()))
      );
      if (matchedP) {
        if (matchedP.key) provKeys.push(matchedP.key.toLowerCase());
        if (matchedP.providerKey) provKeys.push(matchedP.providerKey.toLowerCase());
        if (matchedP.defaultPrefix) provKeys.push(matchedP.defaultPrefix.toLowerCase());
        if (Array.isArray(matchedP.prefixes)) matchedP.prefixes.forEach((pr) => provKeys.push(pr.toLowerCase()));
      }
      for (const pk of provKeys) {
        if (!pk) continue;
        const list = disabledMap[pk] || disabledMap[pk.toLowerCase()];
        if (Array.isArray(list) && (list.includes(rawModel) || list.includes(fullModel))) {
          return true;
        }
      }
      return false;
    };

    // Filter by installed providers
    const installedKeys = new Set();
    (providers || [])
      .filter((p) => p.isInstalled)
      .forEach((p) => {
        if (p.key) installedKeys.add(String(p.key).toLowerCase());
        if (p.providerKey) installedKeys.add(String(p.providerKey).toLowerCase());
        if (p.defaultPrefix) installedKeys.add(String(p.defaultPrefix).toLowerCase());
        if (Array.isArray(p.prefixes)) p.prefixes.forEach((pref) => installedKeys.add(String(pref).toLowerCase()));
      });

    // If providers list is empty, build node mapping from SQLite DB
    const Database = require("better-sqlite3");
    const db = new Database(process.env.DATA_DIR ? require("path").join(process.env.DATA_DIR, "db/data.sqlite") : require("path").join(process.env.HOME || "/root", ".9router/db/data.sqlite"), { readonly: true });
    const dbNodes = db.prepare("SELECT id, type, name, data FROM providerNodes").all();
    db.close();

    const nodePrefixMap = {};
    for (const n of dbNodes) {
      try {
        const d = JSON.parse(n.data || "{}");
        if (d.prefix) nodePrefixMap[n.id.toLowerCase()] = d.prefix.toLowerCase();
      } catch (_) {}
    }

    const candidateModels = allModels.filter((m) => {
      const pKey = String(m.provider || "").toLowerCase();
      const rawFull = String(m.fullModel || m.id || "").toLowerCase();
      const prefixFromModel = rawFull.split("/")[0];

      if (providerFilter) {
        const specKey = String(providerFilter).toLowerCase();
        const nodePrefix = nodePrefixMap[specKey];

        const targetProv = (providers || []).find(
          (p) =>
            String(p.key || "").toLowerCase() === specKey ||
            String(p.providerKey || "").toLowerCase() === specKey ||
            (p.prefixes && p.prefixes.some((pr) => String(pr).toLowerCase() === specKey))
        );
        const allowed = new Set([specKey]);
        if (nodePrefix) allowed.add(nodePrefix);
        if (targetProv?.key) allowed.add(targetProv.key.toLowerCase());
        if (targetProv?.providerKey) allowed.add(targetProv.providerKey.toLowerCase());
        if (targetProv?.defaultPrefix) allowed.add(targetProv.defaultPrefix.toLowerCase());
        if (Array.isArray(targetProv?.prefixes)) {
          targetProv.prefixes.forEach((pr) => allowed.add(String(pr).toLowerCase()));
        }
        return allowed.has(pKey) || allowed.has(prefixFromModel);
      }
      if (installedKeys.size === 0) return true;
      return installedKeys.has(pKey) || installedKeys.has(prefixFromModel);
    });

    // Filter enabled models (if specific providerFilter selected, always test all its available models)
    const targetModels = providerFilter
      ? candidateModels
      : candidateModels.filter((m) => !isIdDisabled(m.fullModel, m.provider, m.model));

    const listToTest = targetModels;

    if (listToTest.length === 0) {
      g.progress.running = false;
      g.progress.currentModel = "Tidak ada model aktif untuk dites.";
      g.progress.finishedAt = new Date().toISOString();
      g.running = false;
      persistState();
      return;
    }

    g.progress.total = listToTest.length;
    g.progress.currentModel = "Memulai pengetesan...";
    persistState();

    // 2. Test loop (Pass 1: Standar timeout 15 detik)
    let passed = 0;
    let failed = 0;
    const timeoutQueue = [];

    for (let i = 0; i < listToTest.length; i++) {
      if (g.stopRequested) break;

      const m = listToTest[i];
      const modelId = m.fullModel || `${m.provider}/${m.model}`;

      g.progress.current = i + 1;
      g.progress.currentModel = modelId;
      g.progress.results[modelId] = { loading: true, latencyMs: 0, ok: false, error: null };

      if (i % 5 === 0) persistState();

      const result = await testOneModel(modelId, routerUrl, token, 15000);

      if (result.ok) {
        passed++;
        g.progress.results[modelId] = {
          loading: false,
          latencyMs: result.latencyMs,
          ok: true,
          error: null,
        };
      } else if (result.isTimeout) {
        // Jangan disable/delete saat timeout. Kumpulkan untuk retry di akhir!
        timeoutQueue.push({ modelItem: m, modelId });
        g.progress.results[modelId] = {
          loading: false,
          latencyMs: result.latencyMs,
          ok: false,
          error: "Timeout (Mengantri pengujian ulang di akhir...)",
          isPendingRetry: true,
        };
      } else {
        // Gagal definitif dari upstream (misal: Insufficient credit, not found, invalid API key)
        failed++;
        if (autoDisableFailed) {
          await autoDisableModel(m.provider, m.model, modelId, routerUrl, token, providers);
        }
        g.progress.results[modelId] = {
          loading: false,
          latencyMs: result.latencyMs,
          ok: false,
          error: result.error,
        };
      }

      g.progress.passed = passed;
      g.progress.failed = failed;
    }

    // 2b. Retry Loop untuk Model yang Timeout (Pass 2: Extended Timeout 35 detik di akhir)
    if (timeoutQueue.length > 0 && !g.stopRequested) {
      for (let j = 0; j < timeoutQueue.length; j++) {
        if (g.stopRequested) break;
        const { modelItem: m, modelId } = timeoutQueue[j];

        g.progress.currentModel = `[Retry Timeout ${j + 1}/${timeoutQueue.length}] ${modelId}`;
        g.progress.results[modelId] = { loading: true, latencyMs: 0, ok: false, error: "Retrying dengan timeout 35s..." };
        persistState();

        const retryResult = await testOneModel(modelId, routerUrl, token, 35000);

        if (retryResult.ok) {
          passed++;
          g.progress.results[modelId] = {
            loading: false,
            latencyMs: retryResult.latencyMs,
            ok: true,
            error: null,
          };
        } else {
          // Tetap gagal setelah retry 35 detik
          failed++;
          if (autoDisableFailed) {
            await autoDisableModel(m.provider, m.model, modelId, routerUrl, token, providers);
          }
          g.progress.results[modelId] = {
            loading: false,
            latencyMs: retryResult.latencyMs,
            ok: false,
            error: retryResult.error,
          };
        }

        g.progress.passed = passed;
        g.progress.failed = failed;
      }
    }

    // 3. Done
    g.progress.running = false;
    g.progress.currentModel = g.stopRequested ? "Pengujian dihentikan oleh pengguna." : "Pengujian selesai!";
    g.progress.finishedAt = new Date().toISOString();
    persistState();
  } finally {
    g.running = false;
    g.stopRequested = false;
  }
}

/**
 * Get current status / last run results
 */
export function getStatus() {
  loadPersistedState();
  return {
    running: g.running,
    progress: g.progress || {
      running: false,
      current: 0,
      total: 0,
      passed: 0,
      failed: 0,
      currentModel: "",
      startedAt: null,
      finishedAt: null,
      results: {},
    },
  };
}

/**
 * Request stop
 */
export function stopTest() {
  if (!g.running) return { stopped: false, reason: "not_running" };
  g.stopRequested = true;
  return { stopped: true };
}

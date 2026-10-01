import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs";
import {
  AI_PROVIDERS,
  OAUTH_PROVIDERS,
  FREE_PROVIDERS,
  FREE_TIER_PROVIDERS,
  APIKEY_PROVIDERS,
  getProviderAlias,
} from "@/shared/constants/providers";
import { startTestAll, stopTest, getStatus as getBgTestStatus } from "@/lib/bgModelTester.js";

export const dynamic = "force-dynamic";

const nodeRequire = typeof __non_webpack_require__ !== "undefined" ? __non_webpack_require__ : eval("require");

function getAutoFreeModules() {
  const candidates = [
    path.resolve(process.cwd(), "src/lib/autoFree"),
    path.resolve(process.cwd(), "../src/lib/autoFree"),
    path.resolve(process.cwd(), "../../src/lib/autoFree"),
    path.resolve(__dirname, "../../../lib/autoFree"),
    path.resolve(__dirname, "../../../../src/lib/autoFree"),
    "/root/9router-stack/9router-x/src/lib/autoFree",
    "/root/9router-auto-free",
  ];

  let dir = candidates.find((d) => {
    try {
      return fs.existsSync(path.join(d, "storage.js"));
    } catch (_) {
      return false;
    }
  });
  if (!dir) dir = "/root/9router-auto-free";

  const storage = nodeRequire(path.join(dir, "storage.js"));
  const scheduler = nodeRequire(path.join(dir, "scheduler.js"));
  let sync = null;
  try {
    sync = nodeRequire(path.join(dir, "sync.js"));
  } catch (_) {}

  return { storage, scheduler, sync, dir };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || searchParams.get("tab") || "dashboard";

    const { storage, scheduler, sync, dir } = getAutoFreeModules();

    // 1. Logs
    if (action === "logs") {
      let content = "Belum ada log sync.";
      const logPaths = [
        path.join(dir, "sync.log"),
        "/root/9router-auto-free/sync.log",
      ];
      for (const lp of logPaths) {
        if (fs.existsSync(lp)) {
          try {
            content = fs.readFileSync(lp, "utf8").slice(-50000);
            break;
          } catch (_) {}
        }
      }
      return NextResponse.json({ success: true, logs: content });
    }

    // 2. Combos
    if (action === "combos") {
      const combos = storage.readAllCombosDetailed();
      return NextResponse.json({ success: true, combos });
    }

    // 2b. Combo Detail (lazy-load, per-model score + cooldown metadata)
    if (action === "combo-detail") {
      const name = searchParams.get("name");
      if (!name) return NextResponse.json({ success: false, error: "name required" }, { status: 400 });
      const combos = storage.readAllCombosDetailed();
      const combo = combos.find((c) => c.name === name);
      if (!combo) return NextResponse.json({ success: false, error: "combo not found" }, { status: 404 });

      // Read cooldown metadata from candidates-state.json
      let cooldownMeta = {};
      try {
        const stateFile = path.join(dir, "candidates-state.json");
        if (fs.existsSync(stateFile)) {
          const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
          cooldownMeta = state.cooldowns || {};
        }
      } catch (_) {}

      const models = (combo.models || []).map((fullId, idx) => {
        const parts = String(fullId).split("/");
        const prefix = parts[0];
        const rawModelId = parts.slice(1).join("/");
        const score = sync?.getCodingScore ? sync.getCodingScore(rawModelId) : 0;
        const isSmart = sync?.isSmartTierModel ? sync.isSmartTierModel(rawModelId) : false;
        const isCode = sync?.isCodingTierModel ? sync.isCodingTierModel(rawModelId) : false;
        const isThinking = sync?.isReasoningModel ? sync.isReasoningModel(rawModelId) : false;
        const cd = cooldownMeta[fullId] || null;
        return {
          rank: idx + 1,
          fullId,
          prefix,
          rawModelId,
          score,
          tier: isThinking ? "think" : isCode ? "code" : isSmart ? "smart" : "free",
          isThinking,
          cooldown: cd ? {
            failCount: cd.failCount,
            lastFailedAt: cd.lastFailedAt,
            nextRetryAt: cd.nextRetryAt,
            reason: cd.reason || "quota-exhausted",
          } : null,
        };
      });

      return NextResponse.json({ success: true, name, models });
    }

    // 3. Exclusions
    if (action === "exclusions") {
      const exclusions = storage.readExclusionsFile();
      return NextResponse.json({ success: true, exclusions });
    }

    // 4. Priorities
    if (action === "priorities") {
      const priorities = storage.readPrioritiesFile();
      return NextResponse.json({ success: true, priorities });
    }

    // 5. Candidates
    if (action === "candidates") {
      const candidates = storage.readCandidatesStateFile();
      return NextResponse.json({ success: true, candidates });
    }

    // 6. Scheduler
    if (action === "scheduler") {
      const status = scheduler.getSchedulerStatus();
      return NextResponse.json({ success: true, status });
    }

    // Background Model Tester Status
    if (action === "test_all_status") {
      const status = getBgTestStatus();
      return NextResponse.json({ success: true, ...status });
    }

    // 7 & 8: Helper to assemble providers list and active stats directly mirroring /dashboard/providers
    const rawConnections = storage.readAllConnectionsRaw();
    const activeConnections = rawConnections.filter((c) => c.isActive);
    const customConfig = storage.readCustomProvidersFile ? storage.readCustomProvidersFile() : {};

    // 1. Read custom providerNodes (OpenAI-compatible and Anthropic-compatible) from SQLite
    let providerNodesList = [];
    try {
      const db = new (storage.getDbClass())(storage.DB_PATH);
      providerNodesList = db.prepare("SELECT id, type, name, data FROM providerNodes").all();
    } catch (_) {}

    const customNodesList = providerNodesList.map((n) => {
      let nodeData = {};
      try {
        nodeData = JSON.parse(n.data || "{}");
      } catch (_) {}

      const allConns = rawConnections.filter((c) => c.provider === n.id);
      const conns = allConns.filter((c) => c.isActive);
      const prefix = (nodeData.prefix || n.name.toLowerCase().replace(/[^a-z0-9_-]/g, "")).toLowerCase();
      const cfg = customConfig[n.id] || customConfig[prefix] || {};
      const isAnthropic = n.type === "anthropic-compatible";

      return {
        key: n.id,
        providerKey: n.id,
        label: n.name,
        category: isAnthropic ? "Custom Anthropic-Compatible" : "Custom OpenAI-Compatible",
        combo: `${prefix}-free`,
        prefixes: [prefix],
        defaultBaseUrl: nodeData.baseUrl || "",
        defaultPrefix: prefix,
        isCustom: true,
        needsAccountId: false,
        isInstalled: allConns.length > 0,
        isActive: conns.length > 0,
        autoSyncEnabled: cfg.enabled !== false,
        connectionId: conns[0]?.id || allConns[0]?.id || null,
        connectionName: n.name,
        accountsCount: conns.length,
        totalAccounts: allConns.length,
      };
    });

    const matchedConnIds = new Set();
    // Track custom node connections as matched
    for (const c of rawConnections) {
      if (
        String(c.provider || "").startsWith("openai-compatible-") ||
        String(c.provider || "").startsWith("anthropic-compatible-")
      ) {
        matchedConnIds.add(c.id);
      }
    }

    const matchConnsForProvider = (key, info) => {
      const pKey = String(key).toLowerCase();
      const alias = String(info.alias || key).toLowerCase();
      const pPrefixes = (info.prefixes || []).map((pr) => String(pr).toLowerCase());

      const conns = rawConnections.filter((c) => {
        if (matchedConnIds.has(c.id)) return false;
        const provName = String(c.provider || "").toLowerCase();
        if (provName === pKey || provName === alias) return true;
        if (pPrefixes.some((pref) => provName === pref || provName.startsWith(pref + "-"))) return true;
        const prefix = String(c.data?.providerSpecificData?.prefix || "").toLowerCase();
        if (prefix && pPrefixes.includes(prefix)) return true;
        return false;
      });

      conns.forEach((c) => matchedConnIds.add(c.id));
      return conns;
    };

    const mapCoreProvider = (key, info, categoryName) => {
      const allConns = matchConnsForProvider(key, info);
      const activeConns = allConns.filter((c) => c.isActive);
      const primaryConn = activeConns[0] || allConns[0];
      const alias = info.alias || key;
      const prefixes = Array.from(
        new Set([alias, key, ...(info.prefixes || [])].filter(Boolean))
      );
      const cfg = customConfig[primaryConn?.id] || customConfig[key] || customConfig[alias] || {};

      return {
        key,
        providerKey: key,
        label: info.name,
        category: categoryName,
        combo: `${alias}-free`,
        prefixes,
        defaultBaseUrl: info.defaultBaseUrl || "",
        defaultPrefix: alias,
        isCustom: false,
        needsAccountId: false,
        isInstalled: allConns.length > 0 || !!info.noAuth,
        isActive: activeConns.length > 0 || !!info.noAuth,
        autoSyncEnabled: cfg.enabled !== false,
        connectionId: primaryConn?.id || null,
        connectionName: primaryConn?.name || null,
        accountsCount: activeConns.length,
        totalAccounts: allConns.length,
      };
    };

    // 2. OAuth Providers (from 9router registry)
    const oauthList = Object.entries(OAUTH_PROVIDERS || {})
      .filter(([_, info]) => !info.hidden)
      .sort((a, b) => (a[1].priority ?? 999) - (b[1].priority ?? 999))
      .map(([k, info]) => mapCoreProvider(k, info, "OAuth Providers"));

    // 3. Free Tier Providers (from 9router registry)
    const freeList = [
      ...Object.entries(FREE_PROVIDERS || {}).filter(([_, info]) => !info.hidden),
      ...Object.entries(FREE_TIER_PROVIDERS || {}).filter(
        ([_, info]) => !info.hidden && (info.serviceKinds ?? ["llm"]).includes("llm")
      ),
    ]
      .sort((a, b) => (a[1].priority ?? 999) - (b[1].priority ?? 999))
      .map(([k, info]) => mapCoreProvider(k, info, "Free Tier Providers"));

    // 4. API Key Providers (from 9router registry)
    const apikeyList = Object.entries(APIKEY_PROVIDERS || {})
      .filter(
        ([_, info]) => !info.hidden && (info.serviceKinds ?? ["llm"]).includes("llm")
      )
      .sort((a, b) => (a[1].priority ?? 999) - (b[1].priority ?? 999))
      .map(([k, info]) => mapCoreProvider(k, info, "API Key Providers"));

    // 5. Leftover connections (if any)
    const remainingConns = rawConnections.filter((c) => !matchedConnIds.has(c.id));
    const extraProvidersMap = {};
    for (const c of remainingConns) {
      if (!extraProvidersMap[c.provider]) {
        extraProvidersMap[c.provider] = { allConns: [], activeConns: [] };
      }
      extraProvidersMap[c.provider].allConns.push(c);
      if (c.isActive) extraProvidersMap[c.provider].activeConns.push(c);
    }

    const extraProvidersList = Object.entries(extraProvidersMap).map(([provKey, data]) => {
      const primaryConn = data.activeConns[0] || data.allConns[0];
      const alias = getProviderAlias ? getProviderAlias(provKey) : provKey;
      let category = "API Key Providers";
      if (OAUTH_PROVIDERS && OAUTH_PROVIDERS[provKey]) category = "OAuth Providers";
      else if ((FREE_PROVIDERS && FREE_PROVIDERS[provKey]) || (FREE_TIER_PROVIDERS && FREE_TIER_PROVIDERS[provKey]))
        category = "Free Tier Providers";

      return {
        key: provKey,
        providerKey: provKey,
        label: AI_PROVIDERS?.[provKey]?.name || primaryConn?.name || provKey,
        category,
        combo: `${alias}-free`,
        prefixes: Array.from(new Set([alias, provKey].filter(Boolean))),
        defaultBaseUrl: "",
        defaultPrefix: alias,
        isCustom: false,
        needsAccountId: false,
        isInstalled: data.allConns.length > 0,
        isActive: data.activeConns.length > 0,
        autoSyncEnabled: (customConfig[primaryConn?.id] || customConfig[provKey] || {}).enabled !== false,
        connectionId: primaryConn?.id || null,
        connectionName: primaryConn?.name || provKey,
        accountsCount: data.activeConns.length,
        totalAccounts: data.allConns.length,
      };
    });

    const allCombinedProviders = [
      ...customNodesList,
      ...oauthList,
      ...freeList,
      ...apikeyList,
      ...extraProvidersList,
    ];

    // Canonical sorting:
    // 1. Installed providers first (active prioritized)
    // 2. Uninstalled organized by category order: Custom -> OAuth -> Free Tier -> API Key
    const CATEGORY_ORDER = {
      "Custom OpenAI-Compatible": 1,
      "Custom Anthropic-Compatible": 1,
      "Custom Providers (OpenAI/Anthropic Compatible)": 1,
      "OAuth Providers": 2,
      "Free Tier Providers": 3,
      "API Key Providers": 4,
    };

    allCombinedProviders.sort((a, b) => {
      if (a.isInstalled !== b.isInstalled) return a.isInstalled ? -1 : 1;
      if (a.isInstalled && b.isInstalled) {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      }
      const catA = CATEGORY_ORDER[a.category] || 99;
      const catB = CATEGORY_ORDER[b.category] || 99;
      if (catA !== catB) return catA - catB;
      return (a.label || "").localeCompare(b.label || "");
    });

    // Providers action endpoint
    if (action === "providers") {
      return NextResponse.json({ success: true, providers: allCombinedProviders });
    }

    // 8. Default: Full Dashboard Data
    const combos = storage.readAllCombosDetailed();
    const exclusions = storage.readExclusionsFile();
    const priorities = storage.readPrioritiesFile();
    const candidates = storage.readCandidatesStateFile();
    const schedulerStatus = scheduler.getSchedulerStatus();

    const freeCombo =
      combos.find((c) => c.name === "auto-free") ||
      combos.find((c) => c.name === "my9model-free");

    const smartCombo =
      combos.find((c) => c.name === "auto-smart") ||
      combos.find((c) => c.name === "my9model-smart");

    const fastCombo =
      combos.find((c) => c.name === "auto-fast") ||
      combos.find((c) => c.name === "my9model-fast");

    const codeCombo =
      combos.find((c) => c.name === "auto-code") ||
      combos.find((c) => c.name === "my9model-code");

    const cooldownCombo =
      combos.find((c) => c.name === "cooldown") ||
      combos.find((c) => c.name === "my9model-cooldown") ||
      combos.find((c) => c.name === "auto-cooldown");

    const freeModelsList = freeCombo?.models || [];
    const topModels = freeModelsList.slice(0, 5).map((fullId, idx) => {
      const parts = String(fullId).split("/");
      const prefix = parts[0];
      const rawModelId = parts.slice(1).join("/");
      const score = sync?.getCodingScore ? sync.getCodingScore(rawModelId) : 0;
      const isSmart = sync?.isSmartTierModel ? sync.isSmartTierModel(rawModelId) : false;
      const isThinking = sync?.isReasoningModel ? sync.isReasoningModel(rawModelId) : false;
      return {
        rank: idx + 1,
        fullId,
        prefix,
        rawModelId,
        score,
        tier: isSmart ? "smart" : "fast",
        isThinking,
      };
    });

    const providerStats = allCombinedProviders
      .filter((p) => p.isActive)
      .map((p) => {
        const pCombo = combos.find(
          (c) => c.name === p.combo || (p.prefixes && p.prefixes.some((pref) => c.name === `${pref}-free`))
        );
        const modelCount = pCombo?.models?.length || 0;
        return {
          label: p.label,
          key: p.key,
          category: p.category,
          modelCount,
          accountsCount: p.accountsCount || 1,
          autoSyncEnabled: p.autoSyncEnabled !== false,
        };
      });

    let totalCandidatesCount = 0;
    if (candidates && candidates.providers) {
      for (const p of Object.values(candidates.providers)) {
        if (p && Array.isArray(p.ids)) totalCandidatesCount += p.ids.length;
      }
    } else if (candidates && Array.isArray(candidates.candidates)) {
      totalCandidatesCount = candidates.candidates.length;
    } else {
      totalCandidatesCount = freeModelsList.length;
    }

    const lastSyncTime = candidates?.updatedAt || candidates?.timestamp || freeCombo?.updatedAt || null;

    return NextResponse.json({
      success: true,
      stats: {
        activeConnectionsCount: rawConnections.filter((c) => c.isActive).length,
        totalCombosCount: combos.length,
        candidatesCount: totalCandidatesCount,
        candidatesLastSync: lastSyncTime,
        exclusionsCount: Array.isArray(exclusions) ? exclusions.length : (exclusions?.excludedModels || []).length,
        prioritiesCount: Array.isArray(priorities) ? priorities.length : 0,
        schedulerActive: schedulerStatus.active,
        schedulerType: schedulerStatus.type,
        nineRouterDir: storage.NINE_ROUTER_DIR,
        dbPath: storage.DB_PATH,
        nineRouterUrl: storage.resolveNineRouterUrl ? storage.resolveNineRouterUrl() : "http://127.0.0.1:20128",
        apiKey: storage.get9routerCliToken ? storage.get9routerCliToken() : "",
      },
      distribution: {
        activeCount: freeModelsList.length,
        smartCount: smartCombo?.models?.length || 0,
        codeCount: codeCombo?.models?.length || 0,
        fastCount: fastCombo?.models?.length || 0,
        cooldownCount: cooldownCombo?.models?.length || 0,
      },
      topModels,
      activeProviders: providerStats,
      combos,
      providers: allCombinedProviders,
      exclusions,
      priorities,
      scheduler: schedulerStatus,
    });

  } catch (error) {
    console.error("[api/combo-generator] GET error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { storage, scheduler } = getAutoFreeModules();
    let body = {};
    try {
      body = await request.json();
    } catch (_) {}

    const { action } = body;

    // 1. Toggle Provider Auto-Sync
    if (action === "toggle_sync" || action === "toggle-sync") {
      const { id, providerKey, enabled } = body;
      const customConfig = storage.readCustomProvidersFile();
      const targetKey = id || providerKey;
      if (!targetKey) throw new Error("Provider ID or Key is required");
      if (!customConfig[targetKey]) customConfig[targetKey] = {};
      customConfig[targetKey].enabled = !!enabled;
      storage.writeCustomProvidersFile(customConfig);
      return NextResponse.json({
        success: true,
        message: `Auto-Sync status berhasil diubah (${enabled ? "Aktif" : "Non-Aktif"})`,
      });
    }

    // 2. Save Custom Provider Config
    if (action === "save_provider_config" || action === "config") {
      const { id, providerKey, prefix, freePattern, modelsEndpoint } = body;
      const customConfig = storage.readCustomProvidersFile();
      const targetKey = id || providerKey;
      if (!targetKey) throw new Error("Provider ID or Key is required");
      if (!customConfig[targetKey]) customConfig[targetKey] = {};
      if (prefix) customConfig[targetKey].prefix = prefix;
      if (freePattern !== undefined) customConfig[targetKey].freePattern = freePattern;
      if (modelsEndpoint !== undefined) customConfig[targetKey].modelsEndpoint = modelsEndpoint;
      storage.writeCustomProvidersFile(customConfig);
      return NextResponse.json({ success: true, message: "Konfigurasi provider berhasil disimpan" });
    }

    // 3. Add Provider Connection
    if (action === "add_provider") {
      const result = storage.addProviderConnection(body);
      return NextResponse.json({
        success: true,
        data: result,
        message: "Provider berhasil ditambahkan ke 9router!",
      });
    }

    // 4. Save Exclusions
    if (action === "save_exclusions") {
      storage.writeExclusionsFile(body.exclusions || body);
      return NextResponse.json({ success: true, message: "Exclusions berhasil disimpan" });
    }

    // 5. Save Priorities
    if (action === "save_priorities") {
      storage.writePrioritiesFile(body.priorities || body);
      return NextResponse.json({ success: true, message: "Priorities berhasil disimpan" });
    }

    // 6. Test Single Model via 9router
    if (action === "test_model" || action === "test-model") {
      const modelId = body.model || body.modelId;
      if (!modelId) {
        return NextResponse.json({ success: false, error: "Parameter model/modelId diperlukan." }, { status: 400 });
      }

      const token = storage.get9routerCliToken();
      const routerUrl = storage.resolveNineRouterUrl ? storage.resolveNineRouterUrl() : (process.env.NINEROUTER_URL || "http://127.0.0.1:20128");
      const startTime = Date.now();

      try {
        const testRes = await fetch(`${routerUrl}/api/models/test`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? (token.startsWith("sk-") ? { "Authorization": `Bearer ${token}` } : { "x-9r-cli-token": token, "Authorization": `Bearer ${token}` }) : {}),
          },
          body: JSON.stringify({ model: modelId, kind: "llm" }),
          signal: AbortSignal.timeout(20000),
        });

        const latencyMs = Date.now() - startTime;
        const data = await testRes.json().catch(() => ({}));

        return NextResponse.json({
          success: true,
          model: modelId,
          ok: Boolean(data.ok),
          status: testRes.status,
          latencyMs,
          response: data,
        });
      } catch (err) {
        return NextResponse.json({
          success: false,
          model: modelId,
          ok: false,
          latencyMs: Date.now() - startTime,
          error: err.message,
        });
      }
    }

    // 7. Background Model Testing Actions
    if (action === "start_test_all") {
      const token = storage.get9routerCliToken ? storage.get9routerCliToken() : null;
      const routerUrl = storage.resolveNineRouterUrl ? storage.resolveNineRouterUrl() : (process.env.NINEROUTER_URL || "http://127.0.0.1:20128");
      const { providerFilter, autoDisableFailed, providers } = body;

      const result = startTestAll({
        routerUrl,
        token,
        providerFilter,
        autoDisableFailed,
        providers: providers || [],
      });

      return NextResponse.json({ success: true, ...result });
    }

    if (action === "stop_test_all") {
      const result = stopTest();
      return NextResponse.json({ success: true, ...result });
    }

    // 8. Install/Update/Toggle Scheduler
    if (action === "install_scheduler" || action === "setup_scheduler") {
      scheduler.installScheduler();
      const status = scheduler.getSchedulerStatus();
      return NextResponse.json({ success: true, status, message: "Scheduler berhasil diaktifkan!" });
    }

    if (action === "uninstall_scheduler" || action === "disable_scheduler") {
      scheduler.uninstallScheduler();
      const status = scheduler.getSchedulerStatus();
      return NextResponse.json({ success: true, status, message: "Scheduler berhasil dinonaktifkan!" });
    }

    if (action === "update_endpoint") {
      const { routerUrl, apiKey } = body;
      if (routerUrl) {
        process.env.NINEROUTER_URL = routerUrl.trim().replace(new RegExp("/+$"), "");
      }
      return NextResponse.json({ success: true, message: "Endpoint & API Key berhasil diperbarui." });
    }

    if (action === "toggle_scheduler") {
      const current = scheduler.getSchedulerStatus();
      if (current.active) {
        scheduler.uninstallScheduler();
      } else {
        scheduler.installScheduler();
      }
      const status = scheduler.getSchedulerStatus();
      return NextResponse.json({ success: true, status, message: status.active ? "Scheduler aktif" : "Scheduler non-aktif" });
    }

    // 9. Pin Model to Combo
    if (action === "pin-model") {
      const { combo: comboName, modelId } = body;
      if (!comboName || !modelId) return NextResponse.json({ success: false, error: "combo and modelId required" }, { status: 400 });
      storage.pinModelToCombo(comboName, modelId);
      return NextResponse.json({ success: true, message: `Model ${modelId} di-pin ke ${comboName}` });
    }

    // 10. Unpin Model from Combo
    if (action === "unpin-model") {
      const { combo: comboName, modelId } = body;
      if (!comboName || !modelId) return NextResponse.json({ success: false, error: "combo and modelId required" }, { status: 400 });
      storage.unpinModelFromCombo(comboName, modelId);
      return NextResponse.json({ success: true, message: `Model ${modelId} di-unpin dari ${comboName}` });
    }

    // 11. Force Retry model from cooldown
    if (action === "force-retry") {
      const { modelId } = body;
      if (!modelId) return NextResponse.json({ success: false, error: "modelId required" }, { status: 400 });
      const token = storage.get9routerCliToken();
      const routerUrl = storage.resolveNineRouterUrl ? storage.resolveNineRouterUrl() : (process.env.NINEROUTER_URL || "http://127.0.0.1:20128");
      const startTime = Date.now();
      try {
        const testRes = await fetch(`${routerUrl}/api/models/test`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? (token.startsWith("sk-") ? { "Authorization": `Bearer ${token}` } : { "x-9r-cli-token": token, "Authorization": `Bearer ${token}` }) : {}) },
          body: JSON.stringify({ model: modelId, kind: "llm" }),
          signal: AbortSignal.timeout(20000),
        });
        const latencyMs = Date.now() - startTime;
        const data = await testRes.json().catch(() => ({}));
        const ok = Boolean(data.ok) && testRes.status === 200;
        if (ok) {
          try {
            const stateFile = path.join(dir, "candidates-state.json");
            if (fs.existsSync(stateFile)) {
              const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
              if (state.cooldowns && state.cooldowns[modelId]) {
                delete state.cooldowns[modelId];
                fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
              }
            }
          } catch (_) {}
        }
        return NextResponse.json({ success: true, model: modelId, ok, latencyMs, status: testRes.status });
      } catch (err) {
        return NextResponse.json({ success: false, model: modelId, ok: false, latencyMs: Date.now() - startTime, error: err.message });
      }
    }

    return NextResponse.json({ success: false, error: "Aksi tidak dikenali" }, { status: 400 });

  } catch (error) {
    console.error("[api/combo-generator] POST error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

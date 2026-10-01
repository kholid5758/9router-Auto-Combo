"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { getCurrentLocale, onLocaleChange } from "@/i18n/runtime";

function resolveLang(loc) {
  if (!loc) return "id";
  const l = loc.toLowerCase();
  if (l === "id" || l.startsWith("id-") || l === "in") return "id";
  return "en";
}

// Bilingual translations matching 9router-auto-free
const I18N = {
  id: {
    banner_title: "9router Auto-Free Active",
    banner_tag: "Auto-Free Engine",
    banner_desc:
      "Sistem otomatis mengumpulkan model AI gratis dari seluruh provider, memvalidasi via live pre-test, menyortir berdasarkan benchmark coding & latensi, lalu menginjeksinya ke combo 9router siap pakai di Cursor, Claude Code, dan IDE Anda.",
    system_connected: "Sistem Terhubung",
    sync_checking: "Sync: Memeriksa...",
    sync_none: "Sync: Belum ada",
    stat_super_combos: "Super Combos",
    stat_managed: "Managed",
    stat_connected_prov: "Connected Providers",
    stat_auto_sync_on: "Auto-Sync ON",
    stat_sqlite_connected: "Terkoneksi di SQLite 9router",
    stat_candidate_pool: "Candidate Pool",
    stat_models_validated: "Model gratis tervalidasi",
    stat_scheduler_title: "Automated Scheduler",
    stat_scheduler_sub: "Daily & Hourly watchdog",
    scheduler_active_sub: "Aktif (00:05 & :35)",
    scheduler_inactive_sub: "Non-Aktif",
    dist_title: "Distribusi Kesehatan Model",
    dist_sub: "(Status live pre-test terakhir)",
    top5_title: "Top 5 Free Coding Models",
    top5_view_all: "Lihat Semua →",
    top5_loading: "Memuat leaderboard model gratis...",
    top5_empty: "Belum ada model yang disinkronkan. Klik Full Sync di atas!",
    ide_title: "Gunakan di IDE Anda",
    copied: "✓ Disalin!",
    prov_pool_title: "Active Provider Pool",
    prov_pool_manage: "Kelola →",
    prov_pool_loading: "Memuat provider pool...",
    prov_pool_empty: "Belum ada provider yang terhubung di 9router.",
    cli_quick_title: "Aksi Cepat CLI",
    cli_quick_sub: "Jalankan langsung dengan live streaming log",
    action_sync_title: "Full Daily Sync",
    action_sync_desc: "Scrape, live pre-test & inject model ke semua combo 9router.",
    action_dry_title: "Dry Run Sync",
    action_dry_desc: "Simulasi live pre-test tanpa mengubah database SQLite.",
    action_refresh_title: "Watchdog Refresh",
    action_refresh_desc: "Cek ulang status kuota model (429) & parkir ke cooldown.",
    action_bench_title: "Update Benchmarks",
    action_bench_desc: "Perbarui database skor coding benchmark dari sumber live.",
    diag_dir: "9router Dir:",
    diag_db: "SQLite DB:",
    diag_api: "API:",
    combos_title: "Daftar Combos di 9router",
    combos_desc: "Combos yang dikelola oleh 9router-auto-free dan provider-specific combos.",
    combos_refresh: "Refresh Data",
    combos_loading: "Memuat data combos...",
    combos_empty: "Tidak ada model di combo ini.",
    prov_title: "Provider Catalog & Koneksi",
    prov_desc: "Daftar provider 9router yang didukung untuk scraping model AI gratis. Tambahkan koneksi baru dengan aman tanpa duplikasi.",
    prov_add_btn: "+ Tambah Provider Baru",
    prov_refresh_btn: "Refresh List",
    prov_th_logo: "Provider",
    prov_th_conn: "Prefix / Alias",
    prov_th_cat: "Kategori",
    prov_th_models: "Endpoint Base URL",
    prov_th_sync: "Auto-Sync Free",
    prov_th_actions: "Status",
    prov_status_active: "Terkoneksi",
    prov_status_inactive: "Belum Ada",
    prov_btn_connect: "+ Hubungkan",
    prov_toggle_on: "⚡ Aktif",
    prov_toggle_off: "⚪ Non-Aktif",
    prov_test_all_btn: "⚡ Test All Models",
    prov_stop_test_btn: "⏹ Hentikan Pengujian",
    prov_auto_disable_label: "Auto-disable model gagal",
    prov_test_running: "Pengujian Model Berjalan...",
    prov_test_finished: "Pengujian Selesai",
    excl_title: "Manajer Exclusions (exclusions.json)",
    excl_desc: "Kelola daftar hitam (blacklist) model non-coding atau provider yang ingin dilewati saat sinkronisasi.",
    excl_tags_title: "Visual Tag Manager",
    excl_json_title: "Raw JSON Editor",
    excl_add_ph: "Contoh: provider:kilo atau model: gpt-3.5",
    excl_add_btn: "+ Tambah",
    excl_save_btn: "Simpan Perubahan",
    prio_title: "Manajer Prioritas Model (priorities.json)",
    prio_desc: "Tentukan urutan model favorit Anda di combo. Model yang cocok ditempatkan paling atas.",
    prio_list_title: "Visual Priority List (Top-Down)",
    prio_json_title: "Raw JSON Editor",
    prio_add_ph: "Contoh: gemini/gemini-2.5-flash",
    prio_add_btn: "+ Tambah",
    prio_save_btn: "Simpan Perubahan",
    cli_title: "CLI Execution & Log Stream",
    cli_desc: "Output real-time stdout/stderr dari eksekusi sync, refresh, dan benchmarks.",
    cli_ready: "READY",
    cli_running: "RUNNING",
    cli_idle: "idle",
    cli_term_ph: "9router-auto-free console siap. Pilih aksi di atas untuk menjalankan.",
    cli_stop_btn: "⏹ Hentikan",
    modal_title: "Tambah Provider ke 9router",
    modal_select_label: "Pilih Provider",
    modal_conn_name_label: "Connection Name",
    modal_api_key_label: "API Key / Token",
    modal_api_key_ph: "Masukkan API key...",
    modal_base_url_label: "Base URL (Opsional / OpenAI Compatible)",
    modal_prefix_label: "Custom Prefix / Alias",
    modal_cancel_btn: "Batal",
    modal_submit_btn: "Simpan ke 9router",
  },
  en: {
    banner_title: "9router Auto-Free Active",
    banner_tag: "Auto-Free Engine",
    banner_desc:
      "Automated system that aggregates free AI models from all providers, validates them via live pre-tests, sorts them by real coding benchmarks & latency, and injects them into ready-to-use 9router combos for Cursor, Claude Code, and your IDEs.",
    system_connected: "System Connected",
    sync_checking: "Sync: Checking...",
    sync_none: "Sync: No sync yet",
    stat_super_combos: "Super Combos",
    stat_managed: "Managed",
    stat_connected_prov: "Connected Providers",
    stat_auto_sync_on: "Auto-Sync ON",
    stat_sqlite_connected: "Connected in 9router SQLite",
    stat_candidate_pool: "Candidate Pool",
    stat_models_validated: "Validated free models",
    stat_scheduler_title: "Automated Scheduler",
    stat_scheduler_sub: "Daily & Hourly watchdog",
    scheduler_active_sub: "Active (00:05 & :35)",
    scheduler_inactive_sub: "Inactive",
    dist_title: "Model Health Distribution",
    dist_sub: "(Latest live pre-test status)",
    top5_title: "Top 5 Free Coding Models",
    top5_view_all: "View All →",
    top5_loading: "Loading free models leaderboard...",
    top5_empty: "No models synced yet. Click Full Sync above!",
    ide_title: "Use in Your IDE",
    copied: "✓ Copied!",
    prov_pool_title: "Active Provider Pool",
    prov_pool_manage: "Manage →",
    prov_pool_loading: "Loading provider pool...",
    prov_pool_empty: "No active providers connected in 9router yet.",
    cli_quick_title: "Quick CLI Actions",
    cli_quick_sub: "Execute directly with real-time log streaming",
    action_sync_title: "Full Daily Sync",
    action_sync_desc: "Scrape, live pre-test & inject models to all 9router combos.",
    action_dry_title: "Dry Run Sync",
    action_dry_desc: "Simulate live pre-test without modifying the SQLite database.",
    action_refresh_title: "Watchdog Refresh",
    action_refresh_desc: "Re-check model quota status (429) & park to cooldown.",
    action_bench_title: "Update Benchmarks",
    action_bench_desc: "Update coding benchmark scores database from live sources.",
    diag_dir: "9router Dir:",
    diag_db: "SQLite DB:",
    diag_api: "API:",
    combos_title: "Combos in 9router",
    combos_desc: "Combos managed by 9router-auto-free and provider-specific combos.",
    combos_refresh: "Refresh Data",
    combos_loading: "Loading combos data...",
    combos_empty: "No models in this combo.",
    prov_title: "Provider Catalog & Connections",
    prov_desc: "Supported 9router providers for free AI scraping. Connect without duplicate risks.",
    prov_add_btn: "+ Add New Provider",
    prov_refresh_btn: "Refresh List",
    prov_th_logo: "Provider",
    prov_th_conn: "Prefix / Alias",
    prov_th_cat: "Category",
    prov_th_models: "Endpoint Base URL",
    prov_th_sync: "Auto-Sync Free",
    prov_th_actions: "Status",
    prov_status_active: "Connected",
    prov_status_inactive: "Not Added",
    prov_btn_connect: "+ Connect",
    prov_toggle_on: "⚡ Active",
    prov_toggle_off: "⚪ Inactive",
    prov_test_all_btn: "⚡ Test All Models",
    prov_stop_test_btn: "⏹ Stop Testing",
    prov_auto_disable_label: "Auto-disable failed models",
    prov_test_running: "Testing Models Running...",
    prov_test_finished: "Testing Finished",
    excl_title: "Exclusion Rules (exclusions.json)",
    excl_desc: "Manage blacklisted non-coding models or providers skipped during synchronization.",
    excl_tags_title: "Visual Tag Manager",
    excl_json_title: "Raw JSON Editor",
    excl_add_ph: "Example: provider:kilo or model: gpt-3.5",
    excl_add_btn: "+ Add",
    excl_save_btn: "Save Changes",
    prio_title: "Model Priorities (priorities.json)",
    prio_desc: "Define your favorite model order in combos. Matched models will be ranked on top.",
    prio_list_title: "Visual Priority List (Top-Down)",
    prio_json_title: "Raw JSON Editor",
    prio_add_ph: "Example: gemini/gemini-2.5-flash",
    prio_add_btn: "+ Add",
    prio_save_btn: "Save Changes",
    cli_title: "CLI Execution & Log Stream",
    cli_desc: "Real-time stdout/stderr stream from sync, refresh, and benchmark tasks.",
    cli_ready: "READY",
    cli_running: "RUNNING",
    cli_idle: "idle",
    cli_term_ph: "9router-auto-free console ready. Choose an action above to execute.",
    cli_stop_btn: "⏹ Stop",
    modal_title: "Add Provider to 9router",
    modal_select_label: "Select Provider",
    modal_conn_name_label: "Connection Name",
    modal_api_key_label: "API Key / Token",
    modal_api_key_ph: "Enter API key...",
    modal_base_url_label: "Base URL (Optional / OpenAI Compatible)",
    modal_prefix_label: "Custom Prefix / Alias",
    modal_cancel_btn: "Cancel",
    modal_submit_btn: "Save to 9router",
  },
};

export default function ComboGeneratorPage() {
  const [lang, setLang] = useState("id");
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard | combos | providers | rules | cli | docs

  // Dashboard state
  const [stats, setStats] = useState({
    activeConnectionsCount: 0,
    totalCombosCount: 0,
    candidatesCount: 0,
    candidatesLastSync: null,
    exclusionsCount: 0,
    prioritiesCount: 0,
    schedulerActive: false,
    schedulerType: "none",
    nineRouterDir: "~/.9router",
    dbPath: "~/.9router/db/data.sqlite",
    nineRouterUrl: "http://127.0.0.1:20128",
    apiKey: "",
  });
  const [customApiUrl, setCustomApiUrl] = useState("http://127.0.0.1:20128");
  const [customApiKey, setCustomApiKey] = useState("");
  const [endpointSaving, setEndpointSaving] = useState(false);
  const [showEndpointKey, setShowEndpointKey] = useState(false);
  const [distribution, setDistribution] = useState({
    activeCount: 0,
    smartCount: 0,
    codeCount: 0,
    fastCount: 0,
    cooldownCount: 0,
  });

  // Combo accordion & detail (lazy load)
  const [expandedCombo, setExpandedCombo] = useState(null); // combo name | null
  const [comboDetails, setComboDetails] = useState({}); // { [comboName]: { loading, models } }

  // Pin model modal
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinModalCombo, setPinModalCombo] = useState("");
  const [pinModelInput, setPinModelInput] = useState("");
  const [pinLoading, setPinLoading] = useState(false);

  // Force retry loading per model
  const [retryLoadingMap, setRetryLoadingMap] = useState({}); // { [modelId]: boolean }
  const [topModels, setTopModels] = useState([]);
  const [activeProviders, setActiveProviders] = useState([]);

  // Combos & Providers
  const [combos, setCombos] = useState([]);
  const [combosRefreshing, setCombosRefreshing] = useState(false);
  const [providers, setProviders] = useState([]);
  const [providerFilter, setProviderFilter] = useState("all"); // all | installed | available
  const [providerSearch, setProviderSearch] = useState("");

  // Exclusions & Priorities
  const [exclusions, setExclusions] = useState([]);
  const [exclusionsJson, setExclusionsJson] = useState("[]");
  const [newExclusionInput, setNewExclusionInput] = useState("");

  const [priorities, setPriorities] = useState([]);
  const [prioritiesJson, setPrioritiesJson] = useState("[]");
  const [newPriorityInput, setNewPriorityInput] = useState("");

  // Model Testing State
  const [modelTestStatus, setModelTestStatus] = useState({}); // modelId -> { loading, latencyMs, ok, error }
  const [testingAllModels, setTestingAllModels] = useState(false);
  const [testingProgress, setTestingProgress] = useState({ current: 0, total: 0, passed: 0, failed: 0, currentModel: "" });
  const [autoDisableFailed, setAutoDisableFailed] = useState(false);
  const autoDisableFailedRef = useRef(false);

  const handleToggleAutoDisable = (val) => {
    setAutoDisableFailed(val);
    autoDisableFailedRef.current = val;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("9router_autoDisableFailed", String(val));
      } catch (_) {}
    }
  };

  // CLI Stream
  const [cliAction, setCliAction] = useState("");
  const [cliRunning, setCliRunning] = useState(false);
  const [cliStatus, setCliStatus] = useState("READY"); // READY | RUNNING | SUCCESS | FAILED | ERROR
  const [terminalLogs, setTerminalLogs] = useState("");
  const [schedulerToggling, setSchedulerToggling] = useState(false);
  const terminalRef = useRef(null);
  const eventSourceRef = useRef(null);

  // Add Provider Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalProviderKey, setModalProviderKey] = useState("");
  const [modalConnName, setModalConnName] = useState("prod");
  const [modalApiKey, setModalApiKey] = useState("");
  const [modalBaseUrl, setModalBaseUrl] = useState("");
  const [modalCustomPrefix, setModalCustomPrefix] = useState("");
  const [modalAccountId, setModalAccountId] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  const t = (key) => I18N[lang]?.[key] || I18N.id[key] || key;

  // Synchronize language with 9router global locale
  useEffect(() => {
    const updateLocale = () => {
      const loc = getCurrentLocale();
      setLang(resolveLang(loc));
    };
    updateLocale();
    return onLocaleChange(updateLocale);
  }, []);

  // Support ?tab=... query param from other pages
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab) {
        if (tab === "exclusions" || tab === "priorities" || tab === "rules") {
          setActiveTab("rules");
        } else if (["dashboard", "combos", "providers", "cli", "docs"].includes(tab)) {
          setActiveTab(tab);
        }
      }
      try {
        const saved = localStorage.getItem("9router_autoDisableFailed");
        if (saved !== null) {
          const isTrue = saved === "true";
          setAutoDisableFailed(isTrue);
          autoDisableFailedRef.current = isTrue;
        }
      } catch (_) {}
    }
  }, []);

  // Fetch full status
  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await fetch("/api/combo-generator?tab=dashboard");
      const data = await res.json();
      if (!data.success) return;

      if (data.stats) {
        setStats((prev) => ({ ...prev, ...data.stats }));
        if (data.stats.nineRouterUrl) setCustomApiUrl(data.stats.nineRouterUrl);
        if (data.stats.apiKey) setCustomApiKey(data.stats.apiKey);
      }
      if (data.distribution) setDistribution(data.distribution);
      if (data.topModels) setTopModels(data.topModels);
      if (data.activeProviders) setActiveProviders(data.activeProviders);
      if (data.combos) setCombos(data.combos);
      if (data.providers) setProviders(data.providers);

      if (data.exclusions) {
        let normalizedExclusions = [];
        if (Array.isArray(data.exclusions)) {
          normalizedExclusions = data.exclusions;
        } else if (data.exclusions && typeof data.exclusions === "object") {
          const provs = Array.isArray(data.exclusions.excludedProviders)
            ? data.exclusions.excludedProviders.map((p) => `provider:${p}`)
            : [];
          const models = Array.isArray(data.exclusions.excludedModels) ? data.exclusions.excludedModels : [];
          normalizedExclusions = [...provs, ...models];
        }
        setExclusions(normalizedExclusions);
        setExclusionsJson(JSON.stringify(normalizedExclusions, null, 2));
      }

      if (data.priorities) {
        setPriorities(data.priorities);
        setPrioritiesJson(JSON.stringify(data.priorities, null, 2));
      }
    } catch (err) {
      console.error("Error fetching combo generator data:", err);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Scroll terminal to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  // Lazy-load combo model details (accordion)
  const fetchComboDetail = async (comboName) => {
    if (comboDetails[comboName]?.models) {
      // Already loaded, just toggle
      setExpandedCombo((prev) => (prev === comboName ? null : comboName));
      return;
    }
    setExpandedCombo(comboName);
    setComboDetails((prev) => ({ ...prev, [comboName]: { loading: true, models: [] } }));
    try {
      const res = await fetch(`/api/combo-generator?action=combo-detail&name=${encodeURIComponent(comboName)}`);
      const data = await res.json();
      setComboDetails((prev) => ({
        ...prev,
        [comboName]: { loading: false, models: data.models || [] },
      }));
    } catch (err) {
      setComboDetails((prev) => ({ ...prev, [comboName]: { loading: false, models: [], error: err.message } }));
    }
  };

  // Pin a model to a combo
  const handlePinModel = async (comboName, modelId) => {
    if (!modelId.trim()) return;
    setPinLoading(true);
    try {
      const res = await fetch("/api/combo-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pin-model", combo: comboName, modelId: modelId.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setPinModelInput("");
        setShowPinModal(false);
        // Reload combo detail
        setComboDetails((prev) => ({ ...prev, [comboName]: { loading: false, models: [] } }));
        fetchComboDetail(comboName);
      } else {
        alert(data.error || "Gagal pin model");
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setPinLoading(false);
    }
  };

  // Unpin a model from a combo
  const handleUnpinModel = async (comboName, modelId) => {
    try {
      const res = await fetch("/api/combo-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unpin-model", combo: comboName, modelId }),
      });
      const data = await res.json();
      if (data.success) {
        // Reload combo detail
        setComboDetails((prev) => ({ ...prev, [comboName]: { loading: false, models: [] } }));
        fetchComboDetail(comboName);
      } else {
        alert(data.error || "Gagal unpin model");
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // Force retry a model from cooldown
  const handleForceRetry = async (modelId) => {
    setRetryLoadingMap((prev) => ({ ...prev, [modelId]: true }));
    try {
      const res = await fetch("/api/combo-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "force-retry", modelId }),
      });
      const data = await res.json();
      if (data.ok) {
        alert(`✓ ${modelId} aktif kembali (${data.latencyMs}ms)`);
        // Reload cooldown detail
        setComboDetails((prev) => ({ ...prev, cooldown: { loading: false, models: [] } }));
        fetchComboDetail("cooldown");
      } else {
        alert(`Model ${modelId} masih gagal (${data.status || "error"})`);
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setRetryLoadingMap((prev) => ({ ...prev, [modelId]: false }));
    }
  };

  // Stop running CLI process

  const stopCliAction = async () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setCliRunning(false);
    setCliStatus("STOPPED");
    setTerminalLogs((prev) => prev + "\n[!] Menghentikan proses CLI...\n");
    try {
      const res = await fetch("/api/combo-generator/stream?action=stop");
      const data = await res.json();
      setTerminalLogs((prev) => prev + `[✓] ${data.message || "Proses berhasil dihentikan."}\n`);
    } catch (err) {
      setTerminalLogs((prev) => prev + `[X] Gagal menghentikan proses: ${err.message}\n`);
    }
  };

  // Toggle Background Scheduler (On/Off 24/7)
  const handleToggleScheduler = async () => {
    if (schedulerToggling) return;
    setSchedulerToggling(true);
    try {
      const res = await fetch("/api/combo-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_scheduler" }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchDashboardData();
      }
    } catch (err) {
      console.error("Failed to toggle scheduler:", err);
    } finally {
      setSchedulerToggling(false);
    }
  };

  // Trigger CLI Action via SSE
  const triggerCliAction = (action) => {
    setActiveTab("cli");

    if (cliRunning || eventSourceRef.current) {
      alert("Ada proses CLI lain yang sedang berjalan! Tunggu hingga selesai atau klik Hentikan.");
      return;
    }

    setCliAction(action);
    setCliRunning(true);
    setCliStatus("RUNNING");
    setTerminalLogs(`[*] Menjalankan aksi: ${action}\n------------------------------------------------------------\n`);

    const sse = new EventSource(`/api/combo-generator/stream?action=${action}`);
    eventSourceRef.current = sse;

    sse.addEventListener("start", (e) => {
      try {
        const d = JSON.parse(e.data);
        setTerminalLogs((prev) => prev + `[*] Perintah: ${d.command}\n`);
      } catch (_) {}
    });

    sse.addEventListener("log", (e) => {
      try {
        const d = JSON.parse(e.data);
        setTerminalLogs((prev) => prev + (d.text || ""));
      } catch (_) {}
    });

    sse.addEventListener("done", (e) => {
      try {
        const d = JSON.parse(e.data);
        setTerminalLogs((prev) => prev + `\n------------------------------------------------------------\n[✓] Selesai dengan kode status: ${d.code}\n`);
        setCliStatus(d.success ? "SUCCESS" : `FAILED (code ${d.code})`);
      } catch (_) {
        setCliStatus("SUCCESS");
      }
      sse.close();
      eventSourceRef.current = null;
      setCliRunning(false);
      fetchDashboardData();
    });

    sse.addEventListener("error", async (e) => {
      try {
        const checkRes = await fetch("/api/combo-generator/stream?action=check");
        const checkData = await checkRes.json();
        if (checkData.error) {
          setTerminalLogs((prev) => prev + `\n[X] ${checkData.error}\n`);
          setCliStatus("ERROR");
          sse.close();
          eventSourceRef.current = null;
          setCliRunning(false);
          return;
        }
      } catch (_) {}

      try {
        const d = JSON.parse(e.data);
        setTerminalLogs((prev) => prev + `\n[X] Error: ${d.error || "Connection error"}\n`);
      } catch (_) {
        setTerminalLogs((prev) => prev + "\n[X] Koneksi stream terputus atau proses selesai.\n");
      }
      setCliStatus("ERROR");
      sse.close();
      eventSourceRef.current = null;
      setCliRunning(false);
    });
  };

  const loadLatestLogs = async () => {
    setActiveTab("cli");
    try {
      const res = await fetch("/api/combo-generator?action=logs");
      const data = await res.json();
      setCliAction("sync.log");
      setTerminalLogs(data.logs || "Belum ada log sync.");
      setCliStatus("READY");
    } catch (err) {
      alert("Gagal memuat log: " + err.message);
    }
  };

  const clearConsole = () => {
    setTerminalLogs("");
    setCliStatus("READY");
    setCliAction("");
  };

  // Real-time helper to disable failed model for all corresponding aliases
  const disableModelInRealTime = async (prov, rawModel, fullModel) => {
    try {
      const pKey = String(prov || "").toLowerCase();
      const matchedP = providers.find(
        (p) =>
          String(p.key).toLowerCase() === pKey ||
          String(p.providerKey || "").toLowerCase() === pKey ||
          (p.prefixes && p.prefixes.some((pref) => String(pref).toLowerCase() === pKey))
      );

      const aliasesToDisable = new Set();
      if (prov) aliasesToDisable.add(prov);
      if (matchedP?.key) aliasesToDisable.add(matchedP.key);
      if (matchedP?.providerKey) aliasesToDisable.add(matchedP.providerKey);
      if (matchedP?.defaultPrefix) aliasesToDisable.add(matchedP.defaultPrefix);
      if (Array.isArray(matchedP?.prefixes)) {
        matchedP.prefixes.forEach((pref) => aliasesToDisable.add(pref));
      }

      const idsToDisable = [rawModel, fullModel].filter(Boolean);

      await Promise.all(
        Array.from(aliasesToDisable).map((alias) =>
          fetch("/api/models/disabled", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ providerAlias: alias, ids: idsToDisable }),
          }).catch((e) => console.error("Error disabling model for alias:", alias, e))
        )
      );
    } catch (err) {
      console.error("Failed to auto-disable model in real-time:", err);
    }
  };

  // Live Model Test
  const testSingleModel = async (modelId) => {
    setModelTestStatus((prev) => ({
      ...prev,
      [modelId]: { loading: true, latencyMs: 0, ok: false, error: null },
    }));

    try {
      const res = await fetch("/api/combo-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_model", model: modelId }),
      });
      const data = await res.json();
      const isOk = !!data.ok;

      if (!isOk && autoDisableFailedRef.current) {
        const parts = String(modelId).split("/");
        const prov = parts[0];
        const rawModel = parts.slice(1).join("/");
        disableModelInRealTime(prov, rawModel, modelId);
      }

      setModelTestStatus((prev) => ({
        ...prev,
        [modelId]: {
          loading: false,
          latencyMs: data.latencyMs || 0,
          ok: isOk,
          error: isOk ? null : data.response?.error || data.error || `HTTP ${data.status || "Err"}`,
        },
      }));
    } catch (err) {
      if (autoDisableFailedRef.current) {
        const parts = String(modelId).split("/");
        const prov = parts[0];
        const rawModel = parts.slice(1).join("/");
        disableModelInRealTime(prov, rawModel, modelId);
      }
      setModelTestStatus((prev) => ({
        ...prev,
        [modelId]: { loading: false, latencyMs: 0, ok: false, error: err.message },
      }));
    }
  };

  // Toggle Provider Auto-Sync
  const toggleProviderSync = async (providerItem) => {
    const nextState = !providerItem.autoSyncEnabled;
    try {
      const res = await fetch("/api/combo-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_sync",
          id: providerItem.connectionId,
          providerKey: providerItem.providerKey || providerItem.key,
          enabled: nextState,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProviders((prev) =>
          prev.map((p) => {
            const isMatch = (providerItem.connectionId && p.connectionId && p.connectionId === providerItem.connectionId) ||
                            (p.key === providerItem.key);
            return isMatch ? { ...p, autoSyncEnabled: nextState } : p;
          })
        );
      } else {
        alert(data.error || "Gagal mengubah status auto-sync");
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // Background Model Testing Poller
  const wasTestingRef = useRef(false);
  useEffect(() => {
    let timer = null;

    const pollStatus = async () => {
      try {
        const res = await fetch("/api/combo-generator?action=test_all_status");
        const data = await res.json();
        if (data.success && data.progress) {
          setTestingProgress(data.progress);
          if (data.progress.results && Object.keys(data.progress.results).length > 0) {
            setModelTestStatus((prev) => ({
              ...prev,
              ...data.progress.results,
            }));
          }

          if (data.running) {
            setTestingAllModels(true);
            wasTestingRef.current = true;
          } else {
            setTestingAllModels(false);
            if (wasTestingRef.current) {
              wasTestingRef.current = false;
              fetchDashboardData();
            }
          }
        }
      } catch (err) {
        console.error("Error polling test all status:", err);
      }
    };

    pollStatus();

    if (testingAllModels) {
      timer = setInterval(pollStatus, 1500);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [testingAllModels, fetchDashboardData]);

  const handleStopTestAllModels = async () => {
    try {
      setTestingProgress((prev) => ({
        ...prev,
        currentModel: "Mengirim sinyal stop ke server...",
      }));
      await fetch("/api/combo-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop_test_all" }),
      });
    } catch (err) {
      console.error("Error stopping background test:", err);
    }
  };

  // Start Background Test All Models across active providers (or a specific provider)
  const handleTestAllModels = async (specificProviderKey = null) => {
    if (testingAllModels) return;

    setTestingAllModels(true);
    wasTestingRef.current = true;
    setTestingProgress({
      current: 0,
      total: 0,
      passed: 0,
      failed: 0,
      currentModel: "Memulai pengujian di background server...",
    });

    try {
      const res = await fetch("/api/combo-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start_test_all",
          providerFilter: specificProviderKey,
          autoDisableFailed: autoDisableFailedRef.current,
          providers: providers,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert("Gagal memulai pengetesan: " + (data.error || "Unknown error"));
        setTestingAllModels(false);
        wasTestingRef.current = false;
      } else if (data.progress) {
        setTestingProgress(data.progress);
        if (data.progress.results) {
          setModelTestStatus((prev) => ({ ...prev, ...data.progress.results }));
        }
      }
    } catch (err) {
      console.error("Error starting test all models:", err);
      alert("Gagal menghubungi server: " + err.message);
      setTestingAllModels(false);
      wasTestingRef.current = false;
    }
  };

  // Exclusions management
  const addExclusionTag = () => {
    const val = newExclusionInput.trim();
    if (!val) return;

    let updated = Array.isArray(exclusions) ? [...exclusions] : [];
    if (!updated.includes(val)) {
      updated.push(val);
    }
    setExclusions(updated);
    setExclusionsJson(JSON.stringify(updated, null, 2));
    setNewExclusionInput("");
  };

  const removeExclusionTag = (idx) => {
    if (!Array.isArray(exclusions)) return;
    const updated = exclusions.filter((_, i) => i !== idx);
    setExclusions(updated);
    setExclusionsJson(JSON.stringify(updated, null, 2));
  };

  const saveExclusions = async () => {
    try {
      const dataToSend = Array.isArray(exclusions) ? exclusions : [];
      const res = await fetch("/api/combo-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_exclusions", exclusions: dataToSend }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Exclusions berhasil disimpan!");
        fetchDashboardData();
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      alert("Gagal menyimpan exclusions: " + err.message);
    }
  };

  // Priorities management
  const addPriorityTag = () => {
    const val = newPriorityInput.trim();
    if (!val) return;

    let updated = Array.isArray(priorities) ? [...priorities] : [];
    if (!updated.includes(val)) {
      updated.push(val);
    }
    setPriorities(updated);
    setPrioritiesJson(JSON.stringify(updated, null, 2));
    setNewPriorityInput("");
  };

  const movePriority = (idx, direction) => {
    const target = idx + direction;
    if (target < 0 || target >= priorities.length) return;
    const updated = [...priorities];
    const temp = updated[idx];
    updated[idx] = updated[target];
    updated[target] = temp;

    setPriorities(updated);
    setPrioritiesJson(JSON.stringify(updated, null, 2));
  };

  const removePriorityItem = (idx) => {
    const updated = priorities.filter((_, i) => i !== idx);
    setPriorities(updated);
    setPrioritiesJson(JSON.stringify(updated, null, 2));
  };

  const savePriorities = async () => {
    try {
      const dataToSend = Array.isArray(priorities) ? priorities : [];
      const res = await fetch("/api/combo-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_priorities", priorities: dataToSend }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Priorities berhasil disimpan!");
        fetchDashboardData();
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      alert("Gagal menyimpan priorities: " + err.message);
    }
  };

  // Add Provider Modal helpers
  const handleOpenAddModal = (presetKey = "") => {
    const target = providers.find((p) => p.key === presetKey) || providers.find((p) => !p.isInstalled) || providers[0];
    if (target) {
      setModalProviderKey(target.key);
      setModalBaseUrl(target.defaultBaseUrl || "");
      setModalCustomPrefix(target.defaultPrefix || target.prefixes?.[0] || target.key);
    }
    setModalConnName("prod");
    setModalApiKey("");
    setModalAccountId("");
    setModalError("");
    setShowAddModal(true);
  };

  const handleProviderSelectChange = (key) => {
    setModalProviderKey(key);
    const p = providers.find((x) => x.key === key);
    if (p) {
      setModalBaseUrl(p.defaultBaseUrl || "");
      setModalCustomPrefix(p.defaultPrefix || p.prefixes?.[0] || p.key);
    }
  };

  const handleAddProviderSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError("");

    try {
      const res = await fetch("/api/combo-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_provider",
          provider: modalProviderKey,
          name: modalConnName,
          apiKey: modalApiKey,
          baseUrl: modalBaseUrl || undefined,
          accountId: modalAccountId || undefined,
          customPrefix: modalCustomPrefix || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        fetchDashboardData();
        alert("Provider berhasil ditambahkan ke 9router!");
      } else {
        setModalError(data.error || "Gagal menambahkan provider");
      }
    } catch (err) {
      setModalError("Network error: " + err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const saveEndpointSettings = async (e) => {
    e?.preventDefault?.();
    setEndpointSaving(true);
    try {
      const res = await fetch("/api/combo-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_endpoint",
          routerUrl: customApiUrl,
          apiKey: customApiKey,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Pengaturan URL & API Key berhasil diperbarui!");
        fetchDashboardData();
      } else {
        alert("Gagal: " + data.error);
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setEndpointSaving(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  // Filtered providers
  const filteredProviders = providers.filter((p) => {
    if (providerFilter === "installed" && !p.isInstalled) return false;
    if (providerFilter === "available" && p.isInstalled) return false;
    if (providerSearch.trim()) {
      const q = providerSearch.toLowerCase();
      const matchLabel = p.label?.toLowerCase().includes(q);
      const matchKey = p.key?.toLowerCase().includes(q);
      const matchPrefix = p.prefixes?.some((pref) => pref.toLowerCase().includes(q));
      if (!matchLabel && !matchKey && !matchPrefix) return false;
    }
    return true;
  });

  // Calculate Health Bar percentages
  const totalHealth = distribution.smartCount + distribution.fastCount + distribution.cooldownCount || 1;
  const smartPercent = Math.round((distribution.smartCount / totalHealth) * 100);
  const fastPercent = Math.round((distribution.fastCount / totalHealth) * 100);
  const cooldownPercent = Math.round((distribution.cooldownCount / totalHealth) * 100);

  return (
    <div className="space-y-6 pb-12">
      {/* NAVIGATION TABS & QUICK ACTIONS */}
      <div className="card-soft border border-border p-3.5 mb-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="traffic-lights">
            <span className="traffic-light red"></span>
            <span className="traffic-light yellow"></span>
            <span className="traffic-light green"></span>
          </div>
          <div className="h-4 w-px bg-border"></div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-text-main">9router Auto-Combo</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-brand-500/15 text-brand-600 dark:text-brand-400 border border-brand-500/30">
              v1.2-stack
            </span>
          </div>
        </div>
        <div className="text-[11px] font-mono text-text-muted flex items-center space-x-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>SQLite: data.sqlite</span>
          <button
            onClick={async () => {
              await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
              window.location.href = "/login";
            }}
            title="Keluar / Logout"
            className="ml-2 px-2 py-0.5 rounded-lg bg-surface-2 hover:bg-rose-500/20 hover:text-rose-400 text-text-muted text-[10px] font-sans font-semibold border border-border transition cursor-pointer"
          >
            Logout
          </button>
        </div>
      </div>

      {/* NAVIGATION TABS & QUICK ACTIONS */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between border-b border-border pb-3 gap-3">
        <nav className="flex space-x-1 sm:space-x-2 bg-surface-2 p-1 rounded-xl border border-border text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-1.5 rounded-lg transition ${
              activeTab === "dashboard" ? "bg-surface text-text-main font-bold shadow-sm" : "text-text-muted hover:text-text-main"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("combos")}
            className={`px-4 py-1.5 rounded-lg transition ${
              activeTab === "combos" ? "bg-surface text-text-main font-bold shadow-sm" : "text-text-muted hover:text-text-main"
            }`}
          >
            Combos
          </button>
          <button
            onClick={() => setActiveTab("providers")}
            className={`px-4 py-1.5 rounded-lg transition ${
              activeTab === "providers" ? "bg-surface text-text-main font-bold shadow-sm" : "text-text-muted hover:text-text-main"
            }`}
          >
            Providers
          </button>
          <button
            onClick={() => setActiveTab("rules")}
            className={`px-4 py-1.5 rounded-lg transition ${
              (activeTab === "rules" || activeTab === "exclusions" || activeTab === "priorities")
                ? "bg-surface text-text-main font-bold shadow-sm"
                : "text-text-muted hover:text-text-main"
            }`}
          >
            Priority &amp; Exclusion
          </button>
          <button
            onClick={() => setActiveTab("cli")}
            className={`px-4 py-1.5 rounded-lg transition ${
              activeTab === "cli" ? "bg-surface text-text-main font-bold shadow-sm" : "text-text-muted hover:text-text-main"
            }`}
          >
            CLI Console
          </button>
          <button
            onClick={() => setActiveTab("docs")}
            className={`px-4 py-1.5 rounded-lg transition flex items-center space-x-1 ${
              activeTab === "docs" ? "bg-surface text-text-main font-bold shadow-sm" : "text-text-muted hover:text-text-main"
            }`}
          >
            <span>📖 Panduan</span>
          </button>
        </nav>

        <div className="flex items-center space-x-2 flex-wrap gap-2">
          {/* Scheduler status toggle button */}
          <button
            onClick={handleToggleScheduler}
            disabled={schedulerToggling}
            title={stats.schedulerActive ? "Klik untuk menonaktifkan scheduler background" : "Klik untuk mengaktifkan scheduler background otomatis 24/7"}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border hover:border-brand-500/40 text-xs text-text-muted hover:text-text-main transition cursor-pointer disabled:opacity-50"
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                stats.schedulerActive ? "bg-emerald-500 animate-pulse" : "bg-zinc-400 dark:bg-zinc-600"
              }`}
            ></span>
            <span>
              {schedulerToggling
                ? "Menyimpan..."
                : stats.schedulerActive
                ? "Scheduler Aktif"
                : "Scheduler Non-Aktif"}
            </span>
          </button>

          {/* Top Quick Actions */}
          <button
            onClick={() => triggerCliAction("dry-run")}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-text-main border border-border hover:border-brand-500/40 transition flex items-center space-x-1.5"
          >
            <svg className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>Dry Run</span>
          </button>
          <button
            onClick={() => triggerCliAction("sync")}
            className="text-xs font-semibold px-3.5 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white transition shadow-sm hover:shadow-[var(--shadow-warm)] flex items-center space-x-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Full Sync</span>
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
{/* 4 Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card-soft border border-border p-5 hover:border-border transition shadow-[var(--shadow-soft)]">
              <div className="flex items-center justify-between text-text-muted text-xs font-semibold">
                <span>{t("stat_super_combos")}</span>
                <span className="text-emerald-600 dark:text-emerald-400 text-sm">✨</span>
              </div>
              <div className="text-2xl font-bold text-text-main mt-2">{stats.totalCombosCount} Combos</div>
              <span className="text-xs text-text-muted mt-1 block">{t("stat_sqlite_connected")}</span>
            </div>

            <div className="card-soft border border-border p-5 hover:border-border transition shadow-[var(--shadow-soft)]">
              <div className="flex items-center justify-between text-text-muted text-xs font-semibold">
                <span>{t("stat_connected_prov")}</span>
                <span className="text-blue-600 dark:text-blue-400 text-sm">🔌</span>
              </div>
              <div className="text-2xl font-bold text-text-main mt-2">{stats.activeConnectionsCount} Aktif</div>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 block">
                {activeProviders.filter((p) => p.autoSyncEnabled).length} {t("stat_auto_sync_on")}
              </span>
            </div>

            <div className="card-soft border border-border p-5 hover:border-border transition shadow-[var(--shadow-soft)]">
              <div className="flex items-center justify-between text-text-muted text-xs font-semibold">
                <span>{t("stat_candidate_pool")}</span>
                <span className="text-purple-600 dark:text-purple-400 text-sm">🧪</span>
              </div>
              <div className="text-2xl font-bold text-text-main mt-2">{stats.candidatesCount} Models</div>
              <span className="text-xs text-text-muted mt-1 block">{t("stat_models_validated")}</span>
            </div>

            <div
              onClick={handleToggleScheduler}
              className="card-soft border border-border p-5 hover:border-border transition shadow-[var(--shadow-soft)] cursor-pointer group"
              title="Klik untuk Mengaktifkan / Menonaktifkan Scheduler Otomatis"
            >
              <div className="flex items-center justify-between text-text-muted text-xs font-semibold">
                <span>{t("stat_scheduler_title")}</span>
                <span
                  className={`relative flex h-2 w-2 ${
                    stats.schedulerActive ? "opacity-100" : "opacity-30"
                  }`}
                >
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <div className="text-2xl font-bold text-text-main mt-2 flex items-center justify-between">
                <span>{stats.schedulerActive ? "Aktif" : "Non-Aktif"}</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-surface-2/80 text-text-muted group-hover:text-text-main border border-border/80 transition">
                  {stats.schedulerActive ? "Klik Matikan" : "Klik Hidupkan"}
                </span>
              </div>
              <span className="text-xs text-text-muted mt-1 block">{t("stat_scheduler_sub")}</span>
            </div>
          </div>

          {/* Model Health Distribution */}
          <div className="card-soft border border-border p-5 space-y-3 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-text-main">{t("dist_title")}</span>
                <span className="text-text-subtle text-[11px]">{t("dist_sub")}</span>
              </div>
              <div className="flex items-center space-x-4 text-[11px] font-medium">
                <span className="flex items-center space-x-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                  <span className="text-text-main">Active: {distribution.activeCount}</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <span className="h-2 w-2 rounded-full bg-indigo-400"></span>
                  <span className="text-text-main">Smart: {distribution.smartCount}</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                  <span className="text-text-main">Fast: {distribution.fastCount}</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <span className="h-2 w-2 rounded-full bg-zinc-600"></span>
                  <span className="text-text-muted">Cooldown: {distribution.cooldownCount}</span>
                </span>
              </div>
            </div>

            <div className="w-full h-3 bg-surface-2 rounded-full overflow-hidden flex border border-border">
              <div
                className="bg-indigo-500 transition-all duration-500"
                style={{ width: `${smartPercent}%` }}
                title={`Smart Tier: ${distribution.smartCount}`}
              ></div>
              <div
                className="bg-amber-500 transition-all duration-500"
                style={{ width: `${fastPercent}%` }}
                title={`Fast Tier: ${distribution.fastCount}`}
              ></div>
              <div
                className="bg-zinc-400 dark:bg-zinc-600 transition-all duration-500"
                style={{ width: `${cooldownPercent}%` }}
                title={`Cooldown: ${distribution.cooldownCount}`}
              ></div>
            </div>
          </div>

          {/* 2-Column Section: Leaderboard + Quick Setup */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Top 5 Free Coding Models */}
            <div className="lg:col-span-7 card-soft border border-border p-5 space-y-4 shadow-[var(--shadow-soft)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-amber-600 dark:text-amber-400 text-base">🏆</span>
                  <h3 className="text-sm font-bold text-text-main">{t("top5_title")}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-surface-2 text-text-muted font-mono">
                    auto-free
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab("combos")}
                  className="text-xs text-brand-500 hover:text-brand-600 font-medium"
                >
                  {t("top5_view_all")}
                </button>
              </div>

              <div className="space-y-2.5">
                {topModels.length > 0 ? (
                  topModels.map((m) => {
                    let rankBadge = (
                      <span className="h-6 w-6 rounded-lg bg-surface-2 text-text-muted text-xs font-bold flex items-center justify-center font-mono">
                        #{m.rank}
                      </span>
                    );
                    if (m.rank === 1)
                      rankBadge = (
                        <span className="h-6 w-6 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center justify-center font-mono shadow-sm">
                          🥇
                        </span>
                      );
                    else if (m.rank === 2)
                      rankBadge = (
                        <span className="h-6 w-6 rounded-lg bg-surface-3 text-text-main border border-border text-xs font-bold flex items-center justify-center font-mono shadow-sm">
                          🥈
                        </span>
                      );
                    else if (m.rank === 3)
                      rankBadge = (
                        <span className="h-6 w-6 rounded-lg bg-amber-600/10 text-amber-800 dark:text-amber-600 dark:text-amber-400 border border-amber-600/30 text-xs font-bold flex items-center justify-center font-mono shadow-sm">
                          🥉
                        </span>
                      );

                    return (
                      <div
                        key={m.fullId}
                        className="flex items-center justify-between p-3 rounded-xl bg-surface-2 hover:bg-surface-3/80 border border-border transition group"
                      >
                        <div className="flex items-center space-x-3 truncate">
                          {rankBadge}
                          <div className="truncate">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-xs text-text-main font-mono truncate">
                                {m.fullId}
                              </span>
                              <button
                                onClick={() => copyToClipboard(m.fullId)}
                                title="Copy Model ID"
                                className="text-text-subtle hover:text-text-main transition text-xs opacity-0 group-hover:opacity-100 font-mono"
                              >
                                📋
                              </button>
                            </div>
                            <div className="text-[11px] text-text-muted font-mono truncate">
                              {m.rawModelId}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0 ml-3">
                          {m.score > 0 ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              Score: {m.score}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-text-subtle bg-surface-2">
                              Score: Standard
                            </span>
                          )}

                          {m.tier === "smart" ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 flex items-center space-x-1">
                              <span>🧠</span>
                              <span>Smart</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                              <span>⚡</span>
                              <span>Fast</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-text-subtle p-4 text-center">
                    {t("top5_empty")}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Active Providers */}
            <div className="lg:col-span-5 space-y-4">
              {/* Active Providers Pool Mini List */}
              <div className="card-soft border border-border p-5 space-y-3 shadow-[var(--shadow-soft)]">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-text-main flex items-center space-x-1.5">
                    <span>🔌</span>
                    <span>{t("prov_pool_title")}</span>
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setActiveTab("providers");
                        handleTestAllModels();
                      }}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition flex items-center space-x-1 shadow"
                      title="Buka tab Providers dan mulai test semua model"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>⚡ Test All Models</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("providers")}
                      className="text-xs text-brand-500 hover:text-brand-600 font-medium"
                    >
                      {t("prov_pool_manage")}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {activeProviders.length > 0 ? (
                    activeProviders.map((p) => (
                      <div
                        key={p.key}
                        className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-surface-2 border border-border text-xs"
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            p.autoSyncEnabled ? "bg-emerald-400" : "bg-zinc-500"
                          }`}
                        ></span>
                        <span className="font-bold text-text-main text-[11px]">{p.label}</span>
                        {p.modelCount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-2 text-text-main font-mono">
                            {p.modelCount}
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-text-subtle italic p-1">{t("prov_pool_empty")}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick CLI Actions Grid */}
          <div className="card-elev border border-border p-6 dot-grid-bg relative overflow-hidden shadow-[var(--shadow-warm)]">
            <h3 className="text-base font-bold text-text-main mb-4 flex items-center justify-between">
              <span>{t("cli_quick_title")}</span>
              <span className="text-xs font-normal text-text-muted">{t("cli_quick_sub")}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                onClick={() => triggerCliAction("sync")}
                className="p-4 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-left transition group"
              >
                <div className="font-bold text-sm text-text-main group-hover:text-emerald-600 dark:text-emerald-400 flex items-center space-x-1.5">
                  <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>{t("action_sync_title")}</span>
                </div>
                <div className="text-xs text-text-muted mt-1">{t("action_sync_desc")}</div>
              </button>

              <button
                onClick={() => triggerCliAction("dry-run")}
                className="p-4 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-left transition group"
              >
                <div className="font-bold text-sm text-text-main group-hover:text-amber-600 dark:text-amber-400 flex items-center space-x-1.5">
                  <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>{t("action_dry_title")}</span>
                </div>
                <div className="text-xs text-text-muted mt-1">{t("action_dry_desc")}</div>
              </button>

              <button
                onClick={() => triggerCliAction("refresh")}
                className="p-4 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-left transition group"
              >
                <div className="font-bold text-sm text-text-main group-hover:text-blue-600 dark:text-blue-400 flex items-center space-x-1.5">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{t("action_refresh_title")}</span>
                </div>
                <div className="text-xs text-text-muted mt-1">{t("action_refresh_desc")}</div>
              </button>

              <button
                onClick={() => triggerCliAction("benchmarks")}
                className="p-4 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-left transition group"
              >
                <div className="font-bold text-sm text-text-main group-hover:text-purple-600 dark:text-purple-400 flex items-center space-x-1.5">
                  <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span>{t("action_bench_title")}</span>
                </div>
                <div className="text-xs text-text-muted mt-1">{t("action_bench_desc")}</div>
              </button>
            </div>
          </div>

          {/* 9router Endpoint & API Key Connection Card */}
          <div className="card-soft border border-border p-5 space-y-4 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between border-b border-border pb-3 flex-wrap gap-2">
              <div className="flex items-center space-x-2">
                <span className="text-base">🔌</span>
                <div>
                  <h3 className="text-xs font-bold text-text-main uppercase tracking-wider">
                    9router Gateway Connection &amp; Authentication
                  </h3>
                  <p className="text-[11px] text-text-muted">
                    Konfigurasi Base URL 9router dan API Key yang digunakan untuk query model &amp; testing.
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3 text-xs font-mono text-text-muted">
                <div>
                  <span className="text-text-subtle mr-1">{t("diag_db")}</span>
                  <span className="text-text-main">{stats.dbPath}</span>
                </div>
              </div>
            </div>

            <form onSubmit={saveEndpointSettings} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-5 space-y-1">
                <label className="block text-xs font-semibold text-text-main">
                  9router Base URL
                </label>
                <input
                  type="text"
                  required
                  value={customApiUrl}
                  onChange={(e) => setCustomApiUrl(e.target.value)}
                  placeholder="http://127.0.0.1:20128"
                  className="w-full bg-surface-2 border border-border rounded-xl px-3.5 py-2 text-xs text-text-main placeholder:text-text-subtle focus:outline-none focus:border-brand-500 font-mono transition"
                />
              </div>

              <div className="md:col-span-5 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-text-main">
                    Bearer API Key
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowEndpointKey(!showEndpointKey)}
                    className="text-[10px] text-brand-500 hover:text-brand-600 font-medium"
                  >
                    {showEndpointKey ? "Sembunyikan" : "Tampilkan"}
                  </button>
                </div>
                <input
                  type={showEndpointKey ? "text" : "password"}
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-surface-2 border border-border rounded-xl px-3.5 py-2 text-xs text-text-main placeholder:text-text-subtle focus:outline-none focus:border-brand-500 font-mono transition"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={endpointSaving}
                  className="w-full py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs transition shadow-sm hover:shadow-[var(--shadow-warm)] disabled:opacity-50 cursor-pointer"
                >
                  {endpointSaving ? "Menyimpan..." : "Simpan Config"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: COMBOS */}
      {activeTab === "combos" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-text-main">{t("combos_title")}</h2>
              <p className="text-xs text-text-muted">{t("combos_desc")}</p>
            </div>
            <button
              onClick={async () => { setCombosRefreshing(true); await fetchDashboardData(); setCombosRefreshing(false); }}
              disabled={combosRefreshing}
              className="text-xs px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-text-main border border-border transition disabled:opacity-60 flex items-center gap-1.5"
            >
              {combosRefreshing ? (
                <>
                  <span className="inline-block animate-spin text-xs">⏳</span>
                  <span>{t("combos_loading")}</span>
                </>
              ) : (
                <>
                  <span>🔄</span>
                  <span>{t("combos_refresh")}</span>
                </>
              )}
            </button>
          </div>

          {combos.length === 0 && !combosRefreshing && (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="text-4xl">📭</div>
              <div>
                <p className="text-sm font-semibold text-text-main">{lang === "id" ? "Belum ada combo yang dibuat" : "No combos found"}</p>
                <p className="text-xs text-text-muted mt-1">{lang === "id" ? "Jalankan Full Sync untuk membuat combo otomatis, atau klik Refresh Data." : "Run a Full Sync to create combos, or click Refresh Data."}</p>
              </div>
              <button
                onClick={() => triggerCliAction("sync")}
                className="text-xs px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition"
              >
                🚀 {lang === "id" ? "Full Sync Sekarang" : "Full Sync Now"}
              </button>
            </div>
          )}
          <div className="space-y-3">
            {combos.map((c) => {
              const isSuper = c.name.startsWith("my9model-") || c.name.startsWith("auto-") || c.name === "cooldown";
              const isCooldown = c.name === "cooldown";
              const isExpanded = expandedCombo === c.name;
              const detail = comboDetails[c.name];

              const TIER_BADGES = {
                "auto-free": { label: "General", color: "emerald" },
                "auto-smart": { label: "Smart", color: "violet" },
                "auto-code": { label: "Coding", color: "blue" },
                "auto-fast": { label: "Fast", color: "sky" },
                cooldown: { label: "Cooldown", color: "rose" },
              };
              const badge = TIER_BADGES[c.name] || { label: "Custom", color: "zinc" };

              return (
                <div
                  key={c.name}
                  className={`bg-surface border ${
                    isSuper ? "border-emerald-500/30" : "border-border"
                  } rounded-2xl overflow-hidden transition`}
                >
                  {/* Accordion Header */}
                  <button
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-2 transition"
                    onClick={() => fetchComboDetail(c.name)}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="font-bold text-sm text-text-main font-mono">{c.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-semibold bg-${badge.color}-500/15 text-${badge.color}-500 border border-${badge.color}-500/30`}>
                        {badge.label}
                      </span>
                      {isSuper && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                          Super Combo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-surface-2 text-text-main font-mono">
                        {c.models?.length || 0} models
                      </span>
                      <span className="text-text-muted text-xs">{isExpanded ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  {/* Accordion Body (lazy-loaded) */}
                  {isExpanded && (
                    <div className="border-t border-border px-5 py-4 space-y-3">
                      {/* Pin Model Button */}
                      <div className="flex justify-end">
                        <button
                          onClick={() => { setPinModalCombo(c.name); setPinModelInput(""); setShowPinModal(true); }}
                          className="text-xs px-3 py-1.5 rounded-lg bg-surface-2 border border-border hover:border-emerald-500 hover:text-emerald-500 transition font-semibold"
                        >
                          📌 {lang === "id" ? "Pin Model" : "Pin Model"}
                        </button>
                      </div>

                      {detail?.loading ? (
                        <div className="flex items-center space-x-2 text-sm text-text-muted py-4 justify-center">
                          <span className="animate-spin">⏳</span>
                          <span>{lang === "id" ? "Memuat detail..." : "Loading detail..."}</span>
                        </div>
                      ) : detail?.models?.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-text-muted border-b border-border">
                                <th className="text-left py-1.5 pr-3 font-semibold w-6">#</th>
                                <th className="text-left py-1.5 pr-3 font-semibold">Model</th>
                                <th className="text-left py-1.5 pr-3 font-semibold">Provider</th>
                                <th className="text-left py-1.5 pr-3 font-semibold">Score</th>
                                <th className="text-left py-1.5 pr-3 font-semibold">Tier</th>
                                {isCooldown && <th className="text-left py-1.5 pr-3 font-semibold">Retry At</th>}
                                <th className="text-right py-1.5 font-semibold">Aksi</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detail.models.map((m) => {
                                const testState = modelTestStatus[m.fullId] || {};
                                const retrying = retryLoadingMap[m.fullId];
                                const nextRetry = m.cooldown?.nextRetryAt
                                  ? new Date(m.cooldown.nextRetryAt).toLocaleTimeString()
                                  : null;
                                return (
                                  <tr key={m.fullId} className="border-b border-border/50 hover:bg-surface-2/50 transition">
                                    <td className="py-2 pr-3 text-text-muted">{m.rank}</td>
                                    <td className="py-2 pr-3 font-mono text-text-main max-w-[200px]">
                                      <span className="truncate block" title={m.fullId}>{m.rawModelId}</span>
                                    </td>
                                    <td className="py-2 pr-3 text-text-muted">{m.prefix}</td>
                                    <td className="py-2 pr-3 text-text-main font-semibold">{m.score}</td>
                                    <td className="py-2 pr-3">
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                        m.isThinking ? "bg-violet-500/20 text-violet-400" :
                                        m.tier === "smart" ? "bg-violet-500/10 text-violet-400" :
                                        "bg-zinc-500/10 text-text-muted"
                                      }`}>
                                        {m.isThinking ? "think" : m.tier}
                                      </span>
                                    </td>
                                    {isCooldown && (
                                      <td className="py-2 pr-3 text-rose-400 text-[10px]">
                                        {nextRetry || "—"}
                                        {m.cooldown?.failCount ? ` (×${m.cooldown.failCount})` : ""}
                                      </td>
                                    )}
                                    <td className="py-2 text-right">
                                      <div className="flex items-center justify-end space-x-1.5">
                                        {isCooldown ? (
                                          <button
                                            onClick={() => handleForceRetry(m.fullId)}
                                            disabled={retrying}
                                            className="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 hover:text-white text-emerald-500 transition font-sans"
                                          >
                                            {retrying ? "⏳" : "⚡ Retry"}
                                          </button>
                                        ) : (
                                          <button
                                            onClick={() => testSingleModel(m.fullId)}
                                            disabled={testState.loading}
                                            className="text-[10px] px-2 py-0.5 rounded-lg bg-surface-2 hover:bg-emerald-600 hover:text-white text-text-main transition font-sans"
                                          >
                                            {testState.loading ? "⏳" : testState.ok ? `✓ ${testState.latencyMs}ms` : "⚡ Test"}
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleUnpinModel(c.name, m.fullId)}
                                          className="text-[10px] px-1.5 py-0.5 rounded-lg bg-surface-2 hover:bg-rose-600 hover:text-white text-text-muted transition font-sans"
                                          title="Unpin model ini"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-xs text-text-subtle italic py-3 text-center">{t("combos_empty")}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pin Model Modal */}
          {showPinModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="card-soft border border-border p-6 w-full max-w-md shadow-2xl space-y-4">
                <h3 className="font-bold text-text-main text-base">
                  📌 {lang === "id" ? `Pin Model ke` : `Pin Model to`} <span className="font-mono text-emerald-500">{pinModalCombo}</span>
                </h3>
                <input
                  type="text"
                  value={pinModelInput}
                  onChange={(e) => setPinModelInput(e.target.value)}
                  placeholder={lang === "id" ? "Contoh: gemini/gemini-2.5-flash" : "e.g. gemini/gemini-2.5-flash"}
                  className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-sm font-mono text-text-main placeholder:text-text-muted focus:outline-none focus:border-emerald-500"
                  onKeyDown={(e) => e.key === "Enter" && handlePinModel(pinModalCombo, pinModelInput)}
                />
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setShowPinModal(false)}
                    className="px-4 py-2 rounded-xl text-sm text-text-muted hover:text-text-main transition"
                  >
                    {lang === "id" ? "Batal" : "Cancel"}
                  </button>
                  <button
                    onClick={() => handlePinModel(pinModalCombo, pinModelInput)}
                    disabled={pinLoading || !pinModelInput.trim()}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition disabled:opacity-50"
                  >
                    {pinLoading ? "⏳..." : "📌 Pin"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}


      {/* TAB 3: PROVIDERS */}
      {activeTab === "providers" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-text-main">{t("prov_title")}</h2>
              <p className="text-xs text-text-muted">{t("prov_desc")}</p>
            </div>
            <div className="flex items-center flex-wrap gap-2.5">
              <label className="flex items-center space-x-2 text-xs text-text-main cursor-pointer select-none bg-surface-2 px-3 py-2 rounded-xl border border-border hover:border-border transition">
                <input
                  type="checkbox"
                  checked={autoDisableFailed}
                  onChange={(e) => handleToggleAutoDisable(e.target.checked)}
                  className="rounded border-border bg-surface-2 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900 h-3.5 w-3.5"
                />
                <span className="text-[11px] font-medium">{t("prov_auto_disable_label")}</span>
              </label>

              {testingAllModels ? (
                <button
                  onClick={handleStopTestAllModels}
                  className="text-xs font-bold px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition flex items-center space-x-1.5 shadow-lg shadow-rose-600/20"
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-ping mr-0.5" />
                  <span>{t("prov_stop_test_btn")}</span>
                </button>
              ) : (
                <button
                  onClick={() => handleTestAllModels()}
                  className="text-xs font-bold px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition flex items-center space-x-1.5 shadow-lg shadow-blue-600/20"
                  title="Test semua model yang aktif di seluruh provider terpasang"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>{t("prov_test_all_btn")}</span>
                </button>
              )}

              <button
                onClick={() => handleOpenAddModal()}
                className="text-xs font-semibold px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white transition flex items-center space-x-1.5 shadow-sm hover:shadow-[var(--shadow-warm)]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>{t("prov_add_btn")}</span>
              </button>
            </div>
          </div>

          {/* Progress / Status banner when testing */}
          {(testingAllModels || testingProgress.total > 0) && (
            <div className="card-soft border border-border p-3.5 space-y-2 text-xs shadow-[var(--shadow-soft)]">
              <div className="flex items-center justify-between flex-wrap gap-2 text-text-main">
                <div className="flex items-center space-x-2">
                  {testingAllModels ? (
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
                  ) : (
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  )}
                  <span className="font-semibold text-text-main">
                    {testingAllModels ? t("prov_test_running") : t("prov_test_finished")}
                  </span>
                  {testingAllModels && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-semibold border border-blue-500/20 whitespace-nowrap">
                      ⚡ Background (aman tutup tab)
                    </span>
                  )}
                  {testingProgress.currentModel && (
                    <span className="text-text-muted font-mono text-[11px] truncate max-w-[280px]">
                      ({testingProgress.currentModel})
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-3 text-[11px]">
                  <span>Total: <b className="text-text-main">{testingProgress.total}</b></span>
                  <span>Diuji: <b className="text-text-main">{testingProgress.current}</b></span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ {testingProgress.passed} Sukses</span>
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">✗ {testingProgress.failed} Gagal</span>
                </div>
              </div>
              <div className="w-full bg-surface-2 rounded-full h-2 overflow-hidden border border-border">
                <div
                  className={`h-full transition-all duration-300 ease-out ${testingAllModels ? "bg-blue-500" : "bg-emerald-500"}`}
                  style={{
                    width: `${Math.min(100, Math.round(((testingProgress.current || 0) / (testingProgress.total || 1)) * 100))}%`
                  }}
                />
              </div>
            </div>
          )}

          {/* Filters & Search */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center space-x-1.5 bg-surface-2 p-1 rounded-xl border border-border text-xs">
              <button
                onClick={() => setProviderFilter("all")}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  providerFilter === "all" ? "bg-surface text-text-main shadow-sm font-bold" : "text-text-muted hover:text-text-main"
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setProviderFilter("installed")}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  providerFilter === "installed" ? "bg-surface text-text-main shadow-sm font-bold" : "text-text-muted hover:text-text-main"
                }`}
              >
                Terpasang
              </button>
              <button
                onClick={() => setProviderFilter("available")}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  providerFilter === "available" ? "bg-surface text-text-main shadow-sm font-bold" : "text-text-muted hover:text-text-main"
                }`}
              >
                Belum Terpasang
              </button>
            </div>

            <div className="w-full sm:w-64">
              <input
                type="text"
                value={providerSearch}
                onChange={(e) => setProviderSearch(e.target.value)}
                placeholder="Cari provider / prefix..."
                className="w-full bg-surface-2 border border-border rounded-xl px-3 py-1.5 text-xs text-text-main placeholder:text-text-subtle focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Providers Table */}
          <div className="card-soft border border-border overflow-hidden shadow-[var(--shadow-soft)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-2/80 border-b border-border text-text-muted uppercase font-semibold">
                  <tr>
                    <th className="px-5 py-3">{t("prov_th_logo")}</th>
                    <th className="px-5 py-3">{t("prov_th_cat")}</th>
                    <th className="px-5 py-3">{t("prov_th_conn")}</th>
                    <th className="px-5 py-3">{t("prov_th_models")}</th>
                    <th className="px-5 py-3">{t("prov_th_actions")}</th>
                    <th className="px-5 py-3 text-center">{t("prov_th_sync")}</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-text-main font-mono">
                  {filteredProviders.map((p) => (
                    <tr key={p.key + (p.connectionId || "")} className="hover:bg-surface-2/40 transition">
                      <td className="px-5 py-3 font-bold text-text-main font-sans">{p.label}</td>
                      <td className="px-5 py-3 font-sans text-text-muted">{p.category}</td>
                      <td className="px-5 py-3 text-emerald-600 dark:text-emerald-400">
                        {p.defaultPrefix || p.prefixes?.join(", ") || "-"}
                      </td>
                      <td className="px-5 py-3 text-text-muted truncate max-w-[200px]" title={p.defaultBaseUrl}>
                        {p.defaultBaseUrl || "-"}
                      </td>
                      <td className="px-5 py-3 font-sans">
                        {p.isInstalled ? (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.isActive
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {p.isActive ? t("prov_status_active") : "Nonaktif"}{" "}
                            {p.totalAccounts ? `(${p.accountsCount}/${p.totalAccounts})` : ""}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-2 text-text-muted">
                            {t("prov_status_inactive")}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button
                          onClick={() => toggleProviderSync(p)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-sans transition ${
                            p.autoSyncEnabled
                              ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                              : "bg-surface-2 text-text-subtle hover:text-text-main"
                          }`}
                        >
                          {p.autoSyncEnabled ? t("prov_toggle_on") : t("prov_toggle_off")}
                        </button>
                      </td>
                      <td className="px-5 py-3 text-right font-sans">
                        p.isInstalled ? (
                          <div className="flex items-center justify-end">
                            <button
                              disabled={testingAllModels}
                              onClick={() => handleTestAllModels(p.providerKey || p.key)}
                              className="px-3 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-bold text-[11px] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                              title={`Test semua model untuk provider ${p.label}`}
                            >
                              <span>⚡ Test</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-text-subtle text-[11px] font-mono">-</span>
                        )
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PRIORITY & EXCLUSION (MERGED) */}
      {(activeTab === "rules" || activeTab === "exclusions" || activeTab === "priorities") && (
        <div className="space-y-8">
          {/* Main Tab Header */}
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-border">
            <div>
              <h2 className="text-lg font-bold text-text-main">
                {lang === "id" ? "Prioritas & Pengecualian Model" : "Model Priorities & Exclusions"}
              </h2>
              <p className="text-xs text-text-muted">
                {lang === "id"
                  ? "Atur urutan model favorit dan daftar hitam (blacklist) model/provider yang ingin dilewati saat sinkronisasi."
                  : "Manage preferred model order and blacklist models/providers to be skipped during synchronization."}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={async () => {
                  try {
                    const prioRes = await fetch("/api/combo-generator", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "save_priorities", priorities: Array.isArray(priorities) ? priorities : [] }),
                    });
                    const exclRes = await fetch("/api/combo-generator", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "save_exclusions", exclusions: Array.isArray(exclusions) ? exclusions : [] }),
                    });
                    const pData = await prioRes.json();
                    const eData = await exclRes.json();
                    if (pData.success && eData.success) {
                      alert(lang === "id" ? "Semua perubahan berhasil disimpan!" : "All changes saved successfully!");
                      fetchDashboardData();
                    } else {
                      alert("Error: " + (pData.error || eData.error));
                    }
                  } catch (err) {
                    alert("Error: " + err.message);
                  }
                }}
                className="text-xs font-semibold px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white transition shadow-sm hover:shadow-[var(--shadow-warm)] flex items-center space-x-1.5"
              >
                <span>💾 {lang === "id" ? "Simpan Perubahan" : "Save Changes"}</span>
              </button>
            </div>
          </div>

          {/* Section 1: PRIORITIES */}
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2">
                <span className="text-xl">⭐</span>
                <div>
                  <h3 className="text-sm font-bold text-text-main">{t("prio_title")}</h3>
                  <p className="text-xs text-text-muted">{t("prio_desc")}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Visual Priority List */}
              <div className="card-soft border border-border p-5 space-y-4 shadow-[var(--shadow-soft)]">
                <h4 className="text-xs font-bold text-text-main uppercase tracking-wider">{t("prio_list_title")}</h4>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPriorityInput}
                    onChange={(e) => setNewPriorityInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addPriorityTag()}
                    placeholder={t("prio_add_ph")}
                    className="flex-1 bg-surface-2 border border-border rounded-xl px-3 py-2 text-xs text-text-main placeholder:text-text-subtle focus:outline-none focus:border-brand-500"
                  />
                  <button
                    onClick={addPriorityTag}
                    className="px-3 py-2 bg-surface-2 hover:bg-surface-3 text-xs font-semibold rounded-xl text-text-main border border-border transition"
                  >
                    {t("prio_add_btn")}
                  </button>
                </div>

                <div className="space-y-1.5 max-h-[360px] overflow-y-auto p-3 rounded-xl bg-surface-2 border border-border">
                  {Array.isArray(priorities) && priorities.length > 0 ? (
                    priorities.map((item, idx) => (
                      <div
                        key={item + idx}
                        className="flex items-center justify-between p-2 rounded-xl bg-surface border border-border text-xs font-mono"
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <span className="text-emerald-700 dark:text-emerald-400 font-bold">#{idx + 1}</span>
                          <span className="text-text-main truncate">{item}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => movePriority(idx, -1)}
                            disabled={idx === 0}
                            className="px-2 py-0.5 rounded bg-surface-2 hover:bg-surface-3 text-text-main disabled:opacity-30"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => movePriority(idx, 1)}
                            disabled={idx === priorities.length - 1}
                            className="px-2 py-0.5 rounded bg-surface-2 hover:bg-surface-3 text-text-main disabled:opacity-30"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => removePriorityItem(idx)}
                            className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 ml-1"
                          >
                            &times;
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-text-subtle italic">Belum ada prioritas kustom.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: EXCLUSIONS */}
          <div className="space-y-4 pt-6 border-t border-border">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2">
                <span className="text-xl">🚫</span>
                <div>
                  <h3 className="text-sm font-bold text-text-main">{t("excl_title")}</h3>
                  <p className="text-xs text-text-muted">{t("excl_desc")}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Visual Tag Manager */}
              <div className="card-soft border border-border p-5 space-y-4 shadow-[var(--shadow-soft)]">
                <h4 className="text-xs font-bold text-text-main uppercase tracking-wider">{t("excl_tags_title")}</h4>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newExclusionInput}
                    onChange={(e) => setNewExclusionInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addExclusionTag()}
                    placeholder={t("excl_add_ph")}
                    className="flex-1 bg-surface-2 border border-border rounded-xl px-3 py-2 text-xs text-text-main placeholder:text-text-subtle focus:outline-none focus:border-brand-500"
                  />
                  <button
                    onClick={addExclusionTag}
                    className="px-3 py-2 bg-surface-2 hover:bg-surface-3 text-xs font-semibold rounded-xl text-text-main border border-border transition"
                  >
                    {t("excl_add_btn")}
                  </button>
                </div>

                <div className="text-[11px] text-text-muted">
                  Gunakan format <code className="text-emerald-700 dark:text-emerald-300 bg-surface-2 px-1 py-0.5 rounded font-mono font-semibold">provider:nama</code> untuk provider, atau kata kunci model non-coding.
                </div>

                <div className="flex flex-wrap gap-2 pt-2 max-h-[300px] overflow-y-auto p-3 rounded-xl bg-surface-2 border border-border">
                  {Array.isArray(exclusions) && exclusions.length > 0 ? (
                    exclusions.map((item, idx) => {
                      const isProv = String(item).startsWith("provider:");
                      return (
                        <div
                          key={item + idx}
                          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-mono ${
                            isProv
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                              : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20"
                          }`}
                        >
                          <span>{item}</span>
                          <button
                            onClick={() => removeExclusionTag(idx)}
                            className="hover:text-text-main font-bold ml-1"
                          >
                            &times;
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-xs text-text-subtle italic">Belum ada exclusion rules.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: CLI CONSOLE */}
      {activeTab === "cli" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-text-main">{t("cli_title")}</h2>
              <p className="text-xs text-text-muted">{t("cli_desc")}</p>
            </div>

            <div className="flex items-center space-x-2 flex-wrap gap-2">
              {cliRunning ? (
                <button
                  onClick={stopCliAction}
                  className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition shadow flex items-center space-x-1.5 animate-pulse"
                >
                  <span className="h-2 w-2 rounded-full bg-white"></span>
                  <span>{t("cli_stop_btn")}</span>
                </button>
              ) : (
                <button
                  onClick={stopCliAction}
                  title="Hentikan proses CLI background jika ada yang tersangkut"
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-rose-600 dark:text-rose-400 border border-border transition flex items-center space-x-1"
                >
                  <span>⏹ Stop</span>
                </button>
              )}
              <button
                onClick={() => triggerCliAction("dry-run")}
                disabled={cliRunning}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-text-main border border-border transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                <span>⚡ Dry Run</span>
              </button>
              <button
                onClick={() => triggerCliAction("sync")}
                disabled={cliRunning}
                className="text-xs font-semibold px-3.5 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white transition shadow-sm hover:shadow-[var(--shadow-warm)] flex items-center space-x-1.5 disabled:opacity-50"
              >
                <span>🚀 Full Sync</span>
              </button>
              <button
                onClick={() => triggerCliAction("refresh")}
                disabled={cliRunning}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-blue-600 dark:text-blue-400 border border-border transition disabled:opacity-50"
              >
                <span>🔄 Watchdog Refresh</span>
              </button>
              <button
                onClick={() => triggerCliAction("benchmarks")}
                disabled={cliRunning}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-purple-600 dark:text-purple-400 border border-border transition"
              >
                <span>📊 Update Benchmarks</span>
              </button>
              <button
                onClick={() => triggerCliAction("setup-cron")}
                disabled={cliRunning}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-text-main border border-border transition"
              >
                <span>⏰ Setup Scheduler</span>
              </button>
              <button
                onClick={loadLatestLogs}
                className="text-xs px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-text-main border border-border transition"
              >
                <span>📄 View sync.log</span>
              </button>
              <button
                onClick={clearConsole}
                className="text-xs px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-text-muted transition"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Terminal Window */}
          <div className="card-soft border border-border overflow-hidden shadow-[var(--shadow-soft)]">
            <div className="bg-surface-2 px-4 py-2.5 border-b border-border flex items-center justify-between text-xs font-mono text-text-muted">
              <div className="flex items-center space-x-2">
                <span className="h-3 w-3 rounded-full bg-rose-500/80"></span>
                <span className="h-3 w-3 rounded-full bg-amber-500/80"></span>
                <span className="h-3 w-3 rounded-full bg-emerald-500/80"></span>
                <span className="text-text-muted ml-2 font-bold">
                  {cliAction ? `Action: ${cliAction}` : "9router-auto-free terminal"}
                </span>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                  cliStatus === "RUNNING"
                    ? "bg-yellow-500/20 text-amber-600 dark:text-amber-400 animate-pulse border border-yellow-500/30"
                    : cliStatus === "SUCCESS"
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                    : cliStatus.startsWith("FAILED") || cliStatus === "ERROR"
                    ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                    : "bg-surface-2 text-text-muted"
                }`}
              >
                {cliStatus}
              </span>
            </div>

            <pre
              ref={terminalRef}
              className="p-5 text-xs font-mono text-emerald-400 bg-black/95 overflow-y-auto h-[480px] whitespace-pre-wrap leading-relaxed select-text"
            >
              {terminalLogs || t("cli_term_ph")}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 7: PANDUAN / DOCS */}
      {activeTab === "docs" && (
        <div className="space-y-6">
          <div className="card-soft border border-border p-6 shadow-[var(--shadow-soft)]">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">📖</span>
              <div>
                <h2 className="text-lg font-bold text-text-main">Panduan Lengkap 9router Auto-Free</h2>
                <p className="text-xs text-text-muted">
                  Dokumentasi teknis, arsitektur 6-tahap, rekomendasi combo, dan panduan tombol operasi.
                </p>
              </div>
            </div>
          </div>

          {/* 6 Tahap Otomatis */}
          <div className="card-soft border border-border p-6 space-y-4 shadow-[var(--shadow-soft)]">
            <h3 className="text-base font-bold text-text-main flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              <span>Bagaimana Cara Kerjanya? (6 Tahap Otomatis)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div className="p-4 rounded-xl bg-surface-2 border border-border space-y-1.5">
                <div className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">1. Scrape &amp; Kumpul Kandidat</div>
                <p className="text-text-muted">Mengambil daftar model gratis dari 15+ sumber provider terdaftar (OpenAgentic, Kilo, Gemini, OpenRouter, Groq, dll.).</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-2 border border-border space-y-1.5">
                <div className="font-bold text-amber-600 dark:text-amber-400 font-mono">2. Filter Exclusions</div>
                <p className="text-text-muted">Menyaring dan membuang model non-coding (TTS, embed, video, model terlalu kecil/nano) dan provider yang di-blacklist.</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-2 border border-border space-y-1.5">
                <div className="font-bold text-cyan-600 dark:text-cyan-400 font-mono">3. Live Pre-Test Paralel</div>
                <p className="text-text-muted">Setiap kandidat dites langsung melalui endpoint internal 9router untuk mengukur latensi dan status HTTP asli.</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-2 border border-border space-y-1.5">
                <div className="font-bold text-purple-600 dark:text-purple-400 font-mono">4. Vonis &amp; Auto-Cooldown</div>
                <p className="text-text-muted">Model 200 diterima; model kuota habis (429) diparkirkan di <code>cooldown</code>; model berbayar/mati dibuang.</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-2 border border-border space-y-1.5">
                <div className="font-bold text-rose-600 dark:text-rose-400 font-mono">5. Coding Quality Ranking</div>
                <p className="text-text-muted">Model diurutkan berdasarkan skor benchmark coding empiris (EvalPlus, SWE-bench), dikurangi penalti error-rate, dan latensi.</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-2 border border-border space-y-1.5">
                <div className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">6. Injeksi Database 9router</div>
                <p className="text-text-muted">Daftar model langsung ditulis ke database SQLite 9router. IDE Anda langsung otomatis menikmati daftar model terbaru.</p>
              </div>
            </div>
          </div>

          {/* Combos Description */}
          <div className="card-soft border border-border p-6 space-y-4 shadow-[var(--shadow-soft)]">
            <h3 className="text-base font-bold text-text-main flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              <span>Daftar Combos &amp; Rekomendasi Penggunaan</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-surface-2 border border-brand-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">auto-free</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px]">Super Combo Utama</span>
                </div>
                <p className="text-text-main">
                  Kombinasi seluruh model gratis aktif dari semua provider. Urutan teratas adalah model dengan kemampuan coding terbaik dan latensi tercepat.
                </p>
                <div className="text-text-subtle italic">👉 Pilihan terbaik untuk penggunaan umum harian di IDE.</div>
              </div>

              <div className="p-4 rounded-xl bg-surface-2 border border-indigo-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono text-sm">auto-smart</span>
                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-semibold text-[10px]">Penalaran Tinggi / Reasoning</span>
                </div>
                <p className="text-text-main">
                  Khusus model thinking/reasoning (misal Claude 3.7 Sonnet Thinking, Qwen Coder, DeepSeek R1) atau model dengan benchmark coding tertinggi.
                </p>
                <div className="text-text-subtle italic">👉 Cocok untuk tugas arsitektur rumit, refactor besar, dan debug bug sulit.</div>
              </div>

              <div className="p-4 rounded-xl bg-surface-2 border border-blue-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-600 dark:text-blue-400 font-mono text-sm">auto-code</span>
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-700 dark:text-blue-300 font-semibold text-[10px]">Coding Specialist</span>
                </div>
                <p className="text-text-main">
                  Model spesialis pemrograman (misal Codestral, Qwen Coder, DeepSeek Coder) dan model dengan skor benchmark coding tinggi.
                </p>
                <div className="text-text-subtle italic">👉 Pilihan utama untuk AI coding assistant di VS Code, Cursor, Cline, dan Zed.</div>
              </div>

              <div className="p-4 rounded-xl bg-surface-2/60 border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-600 dark:text-amber-400 font-mono text-sm">auto-fast</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold text-[10px]">Super Cepat / Low Latency</span>
                </div>
                <p className="text-text-main">
                  Model non-thinking berkecepatan kilat dengan latensi sangat rendah dari provider berkecepatan tinggi (Groq, Cerebras, Kilo, dll.).
                </p>
                <div className="text-text-subtle italic">👉 Cocok untuk inline code completion, autocomplete, atau respons instan.</div>
              </div>

              <div className="p-4 rounded-xl bg-surface-2/60 border border-rose-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-600 dark:text-rose-400 font-mono text-sm">cooldown</span>
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300 font-semibold text-[10px]">Parkiran Rate-Limit (429)</span>
                </div>
                <p className="text-text-main">
                  Tempat isolasi sementara bagi model yang kuota hariannya habis (HTTP 429). Watchdog intra-hari akan otomatis memindahkannya kembali ke combo utama begitu kuota reset.
                </p>
                <div className="text-text-subtle italic">👉 Mencegah IDE Anda error karena request terlempar ke model kuota-habis.</div>
              </div>
            </div>
          </div>

          {/* Panduan Tombol Operasi (Action Buttons Guide) */}
          <div className="card-soft border border-border p-6 space-y-4 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-base font-bold text-text-main flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-brand-500"></span>
                <span>Panduan Tombol Operasi (Action Buttons)</span>
              </h3>
              <span className="text-xs text-text-muted">
                Fungsi dan panduan penggunaan tombol aksi pada CLI Console &amp; Header
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {/* 1. Dry Run */}
              <div className="p-4 rounded-xl bg-surface-2 border border-border hover:border-amber-500/40 transition space-y-2">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-surface-3 text-text-main font-semibold text-xs border border-border">
                    <span>⚡ Dry Run</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">Simulasi / Safe</span>
                </div>
                <p className="text-text-main leading-relaxed">
                  Menjalankan proses scraping, filter, dan live pre-test terhadap semua model gratis <strong>tanpa mengubah</strong> susunan combo di database SQLite.
                </p>
                <div className="p-2.5 rounded-lg bg-surface border border-border text-text-muted space-y-1">
                  <div className="font-semibold text-text-main">🎯 Kapan Digunakan:</div>
                  <div>Gunakan saat ingin menguji apakah API key aktif, mengukur latensi real-time, atau melihat ranking model tanpa mempengaruhi sesi coding IDE yang sedang berjalan.</div>
                </div>
              </div>

              {/* 2. Full Sync */}
              <div className="p-4 rounded-xl bg-surface-2 border border-brand-500/30 hover:border-brand-500/60 transition space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-brand-500 text-white font-semibold text-xs shadow-sm">
                    <span>🚀 Full Sync</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-brand-600 dark:text-brand-400">Sinkronisasi Penuh</span>
                </div>
                <p className="text-text-main leading-relaxed">
                  Melakukan siklus otomatis penuh (Scrape &rarr; Filter &rarr; Live Test paralel &rarr; Ranking benchmark empiris &rarr; <strong>Injeksi langsung ke SQLite</strong>).
                </p>
                <div className="p-2.5 rounded-lg bg-surface border border-border text-text-muted space-y-1">
                  <div className="font-semibold text-text-main">🎯 Kapan Digunakan:</div>
                  <div>Gunakan saat pertama kali setup, setelah menambahkan/mengedit API key baru, atau saat ingin mereset dan menyusun ulang seluruh combo model dari nol.</div>
                </div>
              </div>

              {/* 3. Watchdog Refresh */}
              <div className="p-4 rounded-xl bg-surface-2 border border-border hover:border-blue-500/40 transition space-y-2">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-surface-3 text-blue-600 dark:text-blue-400 font-semibold text-xs border border-border">
                    <span>🔄 Watchdog Refresh</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400">Pemeriksaan Cepat</span>
                </div>
                <p className="text-text-main leading-relaxed">
                  Memverifikasi kesehatan model yang sedang aktif di combo dan mengecek apakah model di <code>cooldown</code> sudah pulih kuotanya.
                </p>
                <div className="p-2.5 rounded-lg bg-surface border border-border text-text-muted space-y-1">
                  <div className="font-semibold text-text-main">🎯 Kapan Digunakan:</div>
                  <div>Gunakan di tengah jam kerja saat ada model yang terkena rate limit (429). Sangat cepat (hanya beberapa detik) tanpa perlu scrape ulang dari awal.</div>
                </div>
              </div>

              {/* 4. Update Benchmarks */}
              <div className="p-4 rounded-xl bg-surface-2 border border-border hover:border-purple-500/40 transition space-y-2">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-surface-3 text-purple-600 dark:text-purple-400 font-semibold text-xs border border-border">
                    <span>📊 Update Benchmarks</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400">Kualitas Coding</span>
                </div>
                <p className="text-text-main leading-relaxed">
                  Mengunduh database skor benchmark coding empiris terkini (EvalPlus, HumanEval, SWE-bench, LiveCodeBench, LMSYS).
                </p>
                <div className="p-2.5 rounded-lg bg-surface border border-border text-text-muted space-y-1">
                  <div className="font-semibold text-text-main">🎯 Kapan Digunakan:</div>
                  <div>Gunakan saat ada rilis arsitektur model AI baru atau saat ingin memperbarui bobot kecerdasan coding agar penentuan peringkat model selalu up-to-date.</div>
                </div>
              </div>

              {/* 5. Setup Scheduler */}
              <div className="p-4 rounded-xl bg-surface-2 border border-border hover:border-pink-500/40 transition space-y-2 md:col-span-2 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-surface-3 text-text-main font-semibold text-xs border border-border">
                    <span>⏰ Setup Scheduler</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Otomatisasi 24/7</span>
                </div>
                <p className="text-text-main leading-relaxed">
                  Mengatur daemon penjadwalan otomatis (background timer/cron) agar 9router secara rutin menjalankan <strong>Full Sync</strong> (setiap tengah malam) dan <strong>Watchdog Refresh</strong> (setiap 30-60 menit) tanpa intervensi manual.
                </p>
                <div className="p-2.5 rounded-lg bg-surface border border-border text-text-muted space-y-1">
                  <div className="font-semibold text-text-main">🎯 Kapan Digunakan:</div>
                  <div>Cukup jalankan sekali saat instalasi awal. Begitu aktif, scheduler background akan menjaga ketersediaan model gratis di IDE Anda tetap optimal setiap saat.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD PROVIDER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border w-full max-w-lg rounded-2xl p-6 shadow-[var(--shadow-elevated)] space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center space-x-3">
                <div className="traffic-lights">
                  <span className="traffic-light red cursor-pointer hover:opacity-80" onClick={() => setShowAddModal(false)}></span>
                  <span className="traffic-light yellow opacity-50"></span>
                  <span className="traffic-light green opacity-50"></span>
                </div>
                <h3 className="text-sm font-bold text-text-main">{t("modal_title")}</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-text-muted hover:text-text-main text-xs font-mono px-2 py-0.5 rounded-lg bg-surface-2 border border-border"
              >
                ESC
              </button>
            </div>

            <form onSubmit={handleAddProviderSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-text-main font-semibold mb-1">
                  {t("modal_select_label")}
                </label>
                <select
                  value={modalProviderKey}
                  onChange={(e) => handleProviderSelectChange(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-text-main focus:outline-none focus:border-brand-500"
                >
                  {providers.map((p) => (
                    <option key={p.key} value={p.key} disabled={p.isInstalled}>
                      {p.label} {p.isInstalled ? " (Sudah terpasang)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-text-main font-semibold mb-1">
                  {t("modal_conn_name_label")}
                </label>
                <input
                  type="text"
                  required
                  value={modalConnName}
                  onChange={(e) => setModalConnName(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-text-main placeholder:text-text-subtle focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-text-main font-semibold mb-1">
                  {t("modal_api_key_label")}
                </label>
                <input
                  type="password"
                  required
                  value={modalApiKey}
                  onChange={(e) => setModalApiKey(e.target.value)}
                  placeholder={t("modal_api_key_ph")}
                  className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-text-main placeholder:text-text-subtle focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-text-main font-semibold mb-1">
                  {t("modal_base_url_label")}
                </label>
                <input
                  type="text"
                  value={modalBaseUrl}
                  onChange={(e) => setModalBaseUrl(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-text-main placeholder:text-text-subtle focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-text-main font-semibold mb-1">
                  {t("modal_prefix_label")}
                </label>
                <input
                  type="text"
                  value={modalCustomPrefix}
                  onChange={(e) => setModalCustomPrefix(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-text-main placeholder:text-text-subtle focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>

              {modalProviderKey === "cloudflare" && (
                <div>
                  <label className="block text-text-main font-semibold mb-1">
                    Account ID (Cloudflare)
                  </label>
                  <input
                    type="text"
                    required
                    value={modalAccountId}
                    onChange={(e) => setModalAccountId(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-text-main placeholder:text-text-subtle focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>
              )}

              {modalError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
                  {modalError}
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-text-main transition"
                >
                  {t("modal_cancel_btn")}
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold transition shadow-sm hover:shadow-[var(--shadow-warm)]"
                >
                  {modalLoading ? "Menyimpan..." : t("modal_submit_btn")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

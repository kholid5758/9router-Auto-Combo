/**
 * Scheduler module for 9router free sync & watchdog.
 * Supports:
 *  1. In-process Node.js background scheduler (runs 24/7 in memory on Railway, Docker, WSL, Windows)
 *  2. OS-level systemd user timers (preferred on full Linux installs)
 *  3. Crontab fallback (on Linux systems with SUID crontab)
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execSync, spawn } = require('node:child_process');

function resolveNineRouterDir() {
  const arg = process.argv.find(a => a.startsWith('--nine-router-dir=') || a.startsWith('--router-dir=') || a.startsWith('--data-dir='));
  if (arg) return path.resolve(arg.split('=')[1]);

  if (process.env.NINEROUTER_DIR) return path.resolve(process.env.NINEROUTER_DIR);
  if (process.env.NINE_ROUTER_DIR) return path.resolve(process.env.NINE_ROUTER_DIR);
  if (process.env.DATA_DIR) return path.resolve(process.env.DATA_DIR);

  if (fs.existsSync('/app/data/db/data.sqlite')) return '/app/data';

  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    const winDir = path.join(appData, '9router');
    if (fs.existsSync(winDir)) return winDir;
  }

  return path.join(os.homedir(), '.9router');
}

function getConfigFile() {
  const dataDir = resolveNineRouterDir();
  return path.join(dataDir, 'auto-free-scheduler.json');
}

function getSchedulerConfig() {
  try {
    const file = getConfigFile();
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      return {
        enabled: data.enabled ?? true,
        fullSyncIntervalHours: Number(data.fullSyncIntervalHours) || 24,
        watchdogIntervalMinutes: Number(data.watchdogIntervalMinutes) || 60,
        lastSync: data.lastSync || null,
        lastWatchdog: data.lastWatchdog || null,
        lastBenchmark: data.lastBenchmark || null,
      };
    }
  } catch (_) {}

  return {
    enabled: false,
    fullSyncIntervalHours: 24,
    watchdogIntervalMinutes: 60,
    lastSync: null,
    lastWatchdog: null,
    lastBenchmark: null,
  };
}

function saveSchedulerConfig(cfg) {
  try {
    const file = getConfigFile();
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(cfg, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[AutoFreeScheduler] Failed to save config:', err.message);
    return false;
  }
}

// Global state to survive hot-reload in Next.js development and single-process node
const g = (global.__autoFreeScheduler ??= {
  interval: null,
  active: false,
  runningJob: null,
});

function findSyncScript() {
  const candidates = [
    path.resolve(__dirname, 'sync.js'),
    path.resolve(process.cwd(), 'src/lib/autoFree/sync.js'),
    '/root/9router-stack/9router-x/src/lib/autoFree/sync.js',
    '/root/9router-auto-free/sync.js',
    '/app/src/lib/autoFree/sync.js',
  ];
  return candidates.find(p => fs.existsSync(p)) || path.resolve(__dirname, 'sync.js');
}

function runBackgroundJob(jobType, args = []) {
  if (g.runningJob) {
    console.log(`[AutoFreeScheduler] Job ${jobType} skipped: another job (${g.runningJob}) is currently running.`);
    return;
  }

  const scriptPath = findSyncScript();
  const scriptDir = path.dirname(scriptPath);
  const logPath = path.join(scriptDir, 'sync.log');
  const nodeBin = process.execPath || 'node';

  g.runningJob = jobType;
  console.log(`[AutoFreeScheduler] Starting background job: ${jobType} (${scriptPath} ${args.join(' ')})`);

  let logStream;
  try {
    logStream = fs.createWriteStream(logPath, { flags: 'a' });
    logStream.write(`\n--- [AutoFreeScheduler: ${jobType} Started at ${new Date().toISOString()}] ---\n`);
  } catch (_) {}

  const proc = spawn(nodeBin, [scriptPath, ...args], {
    cwd: scriptDir,
    env: { ...process.env, FORCE_COLOR: '1' },
    detached: false,
    stdio: ['ignore', logStream ? 'pipe' : 'ignore', logStream ? 'pipe' : 'ignore'],
  });

  if (logStream) {
    if (proc.stdout) proc.stdout.pipe(logStream);
    if (proc.stderr) proc.stderr.pipe(logStream);
  }

  proc.on('close', (code) => {
    console.log(`[AutoFreeScheduler] Background job ${jobType} finished with exit code ${code}`);
    g.runningJob = null;
    if (logStream) {
      try {
        logStream.write(`--- [AutoFreeScheduler: ${jobType} Finished code ${code} at ${new Date().toISOString()}] ---\n`);
        logStream.end();
      } catch (_) {}
    }

    const cfg = getSchedulerConfig();
    const now = new Date().toISOString();
    if (jobType === 'full-sync') cfg.lastSync = now;
    else if (jobType === 'watchdog') cfg.lastWatchdog = now;
    else if (jobType === 'benchmarks') cfg.lastBenchmark = now;
    saveSchedulerConfig(cfg);
  });

  proc.on('error', (err) => {
    console.error(`[AutoFreeScheduler] Background job ${jobType} failed to spawn:`, err.message);
    g.runningJob = null;
    if (logStream) {
      try { logStream.end(); } catch (_) {}
    }
  });
}

function startInternalScheduler() {
  if (g.interval) {
    g.active = true;
    return;
  }

  g.active = true;
  console.log('[AutoFreeScheduler] Internal 24/7 background scheduler started.');

  // Run initial watchdog after 10 seconds of startup if never run
  const initialCfg = getSchedulerConfig();
  if (!initialCfg.lastWatchdog && !initialCfg.lastSync) {
    setTimeout(() => {
      const cfg = getSchedulerConfig();
      if (cfg.enabled && g.active) {
        console.log('[AutoFreeScheduler] Performing initial startup watchdog...');
        runBackgroundJob('watchdog', ['--refresh']);
      }
    }, 10000);
  }

  // Tick loop: checks every 60 seconds
  g.interval = setInterval(() => {
    try {
      const cfg = getSchedulerConfig();
      if (!cfg.enabled) {
        stopInternalScheduler();
        return;
      }

      const now = Date.now();
      const watchdogIntervalMs = (cfg.watchdogIntervalMinutes || 60) * 60 * 1000;
      const syncIntervalMs = (cfg.fullSyncIntervalHours || 24) * 60 * 60 * 1000;
      const benchmarkIntervalMs = 7 * 24 * 60 * 60 * 1000;

      const lastWatchdogMs = cfg.lastWatchdog ? new Date(cfg.lastWatchdog).getTime() : 0;
      const lastSyncMs = cfg.lastSync ? new Date(cfg.lastSync).getTime() : 0;
      const lastBenchMs = cfg.lastBenchmark ? new Date(cfg.lastBenchmark).getTime() : 0;

      // 1. Full Sync check
      if (now - lastSyncMs >= syncIntervalMs) {
        runBackgroundJob('full-sync', []);
        return;
      }

      // 2. Watchdog Refresh check
      if (now - lastWatchdogMs >= watchdogIntervalMs) {
        runBackgroundJob('watchdog', ['--refresh']);
        return;
      }

      // 3. Benchmarks Update check
      if (now - lastBenchMs >= benchmarkIntervalMs) {
        const benchPath = path.join(path.dirname(findSyncScript()), 'update-benchmarks.js');
        if (fs.existsSync(benchPath)) {
          runBackgroundJob('benchmarks', ['--live-benchmarks']);
        }
      }
    } catch (err) {
      console.error('[AutoFreeScheduler] Error in tick loop:', err.message);
    }
  }, 60000);

  if (g.interval.unref) g.interval.unref();
}

function stopInternalScheduler() {
  if (g.interval) {
    clearInterval(g.interval);
    g.interval = null;
  }
  g.active = false;
  console.log('[AutoFreeScheduler] Internal background scheduler stopped.');
}

function initAutoFreeScheduler() {
  const cfg = getSchedulerConfig();
  if (cfg.enabled) {
    startInternalScheduler();
  }
}

function writeSystemdUnit(unitsDir, name, content) {
  fs.mkdirSync(unitsDir, { recursive: true });
  fs.writeFileSync(path.join(unitsDir, name), content);
}

function removeLegacyCronLines(scriptPath) {
  try {
    const currentCrontab = execSync('crontab -l 2>/dev/null', { encoding: 'utf8' });
    const filtered = currentCrontab.split('\n')
      .filter(line => line.trim().length > 0)
      .filter(line => !(line.includes('9router-auto-free') || line.includes(scriptPath)));

    if (filtered.length === 0) {
      execSync('crontab -r 2>/dev/null');
      return;
    }
    execSync(`echo "${filtered.join('\n').replace(/"/g, '\"')}" | crontab -`);
  } catch {}
}

function installScheduler(options = {}) {
  console.log('[*] Installing scheduler (Internal 24/7 Node.js engine with systemd/cron fallback)...');
  
  // 1. Always activate and persist internal Node.js scheduler (reliable everywhere, including Railway/Docker)
  const cfg = getSchedulerConfig();
  cfg.enabled = true;
  saveSchedulerConfig(cfg);
  startInternalScheduler();
  console.log('[✓] In-process Node.js background scheduler activated.');

  // 2. Best-effort OS-level integration (systemd / cron) if host supports it
  const scriptPath = options.scriptPath || findSyncScript();
  const benchPath = options.benchPath || path.join(path.dirname(scriptPath), 'update-benchmarks.js');
  const logPath = options.logPath || path.join(path.dirname(scriptPath), 'sync.log');
  const home = os.homedir();
  const unitsDir = path.join(home, '.config', 'systemd', 'user');
  const nodeBin = process.execPath || '/usr/bin/node';

  // Try systemd
  if (fs.existsSync('/run/systemd/system') || fs.existsSync('/usr/bin/systemctl')) {
    try {
      const serviceUnit = `[Unit]\nDescription=9router free models daily full sync\n\n[Service]\nType=oneshot\nWorkingDirectory=${path.dirname(scriptPath)}\nExecStart=${nodeBin} ${scriptPath}\n`;
      const serviceTimer = `[Unit]\nDescription=Daily 00:05 full sync\n\n[Timer]\nOnCalendar=*-*-* 00:05:00\nPersistent=true\nUnit=9router-auto-free.service\n\n[Install]\nWantedBy=timers.target\n`;
      const watchdogService = `[Unit]\nDescription=9router free combo watchdog\n\n[Service]\nType=oneshot\nWorkingDirectory=${path.dirname(scriptPath)}\nExecStart=${nodeBin} ${scriptPath} --refresh\n`;
      const watchdogTimer = `[Unit]\nDescription=Hourly watchdog re-test\n\n[Timer]\nOnCalendar=*-*-* *:35:00\nPersistent=true\nUnit=9router-free-watchdog.service\n\n[Install]\nWantedBy=timers.target\n`;
      const benchService = `[Unit]\nDescription=Weekly live coding-benchmark database update\n\n[Service]\nType=oneshot\nWorkingDirectory=${path.dirname(scriptPath)}\nExecStart=${nodeBin} ${benchPath}\n`;
      const benchTimer = `[Unit]\nDescription=Weekly benchmark update\n\n[Timer]\nOnCalendar=Mon *-*-* 04:17:00\nPersistent=true\nUnit=9router-bench-update.service\n\n[Install]\nWantedBy=timers.target\n`;

      writeSystemdUnit(unitsDir, '9router-auto-free.service', serviceUnit);
      writeSystemdUnit(unitsDir, '9router-auto-free.timer', serviceTimer);
      writeSystemdUnit(unitsDir, '9router-free-watchdog.service', watchdogService);
      writeSystemdUnit(unitsDir, '9router-free-watchdog.timer', watchdogTimer);
      writeSystemdUnit(unitsDir, '9router-bench-update.service', benchService);
      writeSystemdUnit(unitsDir, '9router-bench-update.timer', benchTimer);

      removeLegacyCronLines(scriptPath);

      execSync('systemctl --user daemon-reload 2>/dev/null');
      execSync('systemctl --user enable --now 9router-auto-free.timer 9router-free-watchdog.timer 9router-bench-update.timer 2>/dev/null');
      console.log('[✓] systemd user timers also registered on host.');
      return;
    } catch (_) {}
  }

  // Try crontab fallback
  try {
    const lines = [
      '# Free Models Sync for 9router (installed by sync.js)',
      `5 0 * * * ${nodeBin} ${scriptPath} >> ${logPath} 2>&1`,
      `35 * * * * ${nodeBin} ${scriptPath} --refresh >> ${logPath} 2>&1`,
      `17 4 * * 1 ${nodeBin} ${benchPath} >> ${logPath} 2>&1`
    ];

    let currentCrontab = '';
    try { currentCrontab = execSync('crontab -l 2>/dev/null', { encoding: 'utf8' }); } catch {}

    const filtered = currentCrontab.split('\n')
      .filter(line => !line.includes('9router-auto-free') && !line.includes(scriptPath))
      .filter(line => line.trim().length > 0);

    filtered.push(...lines);
    const newCrontab = filtered.join('\n') + '\n';
    execSync(`echo "${newCrontab.replace(/"/g, '\"')}" | crontab - 2>/dev/null`);
    console.log('[✓] crontab also registered on host.');
  } catch (_) {
    // Expected on Railway / Docker without SUID crontab. Internal scheduler handles everything.
    console.log('[*] Note: OS crontab not available (container environment). In-process Node.js scheduler will run all tasks automatically.');
  }
}

function uninstallScheduler() {
  const cfg = getSchedulerConfig();
  cfg.enabled = false;
  saveSchedulerConfig(cfg);
  stopInternalScheduler();

  const scriptPath = findSyncScript();
  removeLegacyCronLines(scriptPath);

  try {
    execSync('systemctl --user disable --now 9router-auto-free.timer 9router-free-watchdog.timer 9router-bench-update.timer 2>/dev/null');
  } catch (_) {}

  console.log('[✓] Scheduler uninstalled.');
}

function getSchedulerStatus() {
  const cfg = getSchedulerConfig();

  // 1. Check internal Node.js in-process scheduler
  if (g.active || cfg.enabled) {
    return {
      type: 'internal',
      active: true,
      timers: [
        { name: 'Daily Full Sync', schedule: `Setiap ${cfg.fullSyncIntervalHours || 24} jam`, status: 'running' },
        { name: 'Watchdog Refresh', schedule: `Setiap ${cfg.watchdogIntervalMinutes || 60} menit`, status: 'running' },
        { name: 'Live Benchmarks Update', schedule: 'Setiap 7 hari', status: 'running' }
      ],
      lastSync: cfg.lastSync,
      lastWatchdog: cfg.lastWatchdog,
      lastBenchmark: cfg.lastBenchmark,
      runningJob: g.runningJob
    };
  }

  // 2. Check systemd user timers
  try {
    const out = execSync('systemctl --user is-active 9router-auto-free.timer 9router-free-watchdog.timer 9router-bench-update.timer 2>/dev/null', { encoding: 'utf8' });
    const lines = out.trim().split('\n');
    const isActive = lines.some(l => l.trim() === 'active');
    if (isActive) {
      return {
        type: 'systemd',
        active: true,
        timers: [
          { name: '9router-auto-free.timer', schedule: 'Daily 00:05', status: lines[0] || 'active' },
          { name: '9router-free-watchdog.timer', schedule: 'Hourly :35', status: lines[1] || 'active' },
          { name: '9router-bench-update.timer', schedule: 'Mon 04:17', status: lines[2] || 'active' }
        ]
      };
    }
  } catch {}

  // 3. Check crontab
  try {
    const crontab = execSync('crontab -l 2>/dev/null', { encoding: 'utf8' });
    if (crontab.includes('9router-auto-free') || crontab.includes('sync.js')) {
      return {
        type: 'cron',
        active: true,
        timers: [
          { name: 'Full Sync', schedule: '5 0 * * *', status: 'crontab' },
          { name: 'Watchdog Refresh', schedule: '35 * * * *', status: 'crontab' },
          { name: 'Benchmark Update', schedule: '17 4 * * 1', status: 'crontab' }
        ]
      };
    }
  } catch {}

  return {
    type: 'none',
    active: false,
    timers: []
  };
}

module.exports = {
  installScheduler,
  uninstallScheduler,
  getSchedulerStatus,
  getSchedulerConfig,
  saveSchedulerConfig,
  startInternalScheduler,
  stopInternalScheduler,
  initAutoFreeScheduler,
  runBackgroundJob,
  writeSystemdUnit,
  removeLegacyCronLines
};

module.exports.default = module.exports;


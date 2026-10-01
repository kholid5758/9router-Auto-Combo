import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

export const dynamic = "force-dynamic";

let currentProcess = null;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action"); // sync | dry-run | refresh | benchmarks | setup-cron | stop | check
  const force = searchParams.get("force") === "true";

  // Check action: returns JSON status
  if (action === "check") {
    const isRunning = !!(currentProcess && !currentProcess.killed && currentProcess.exitCode === null);
    return new Response(
      JSON.stringify({
        running: isRunning,
        error: isRunning
          ? "Ada proses CLI lain yang sedang berjalan di background! Klik 'Hentikan' jika ingin membatalkan."
          : null,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Stop / Kill action
  if (action === "stop" || action === "kill") {
    if (currentProcess && !currentProcess.killed && currentProcess.exitCode === null) {
      try {
        currentProcess.kill("SIGTERM");
        setTimeout(() => {
          if (currentProcess && !currentProcess.killed) {
            try { currentProcess.kill("SIGKILL"); } catch (_) {}
          }
          currentProcess = null;
        }, 1000);
      } catch (_) {
        currentProcess = null;
      }
      return new Response(
        JSON.stringify({ success: true, message: "Proses CLI dihentikan." }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    currentProcess = null;
    return new Response(
      JSON.stringify({ success: true, message: "Tidak ada proses yang berjalan." }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Check if an existing process is running
  if (currentProcess) {
    if (currentProcess.killed || currentProcess.exitCode !== null) {
      currentProcess = null;
    } else if (force) {
      try {
        currentProcess.kill("SIGKILL");
      } catch (_) {}
      currentProcess = null;
    } else {
      return new Response(
        JSON.stringify({ error: "Ada proses CLI lain yang sedang berjalan! Tunggu hingga selesai atau klik Hentikan." }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  const candidates = [
    path.resolve(process.cwd(), "src/lib/autoFree"),
    path.resolve(process.cwd(), "../src/lib/autoFree"),
    path.resolve(process.cwd(), "../../src/lib/autoFree"),
    path.resolve(__dirname, "../../../lib/autoFree"),
    path.resolve(__dirname, "../../../../src/lib/autoFree"),
    "/root/9router-stack/9router-x/src/lib/autoFree",
    "/root/9router-auto-free",
  ];

  let scriptDir = candidates.find((d) => {
    try {
      return fs.existsSync(path.join(d, "sync.js"));
    } catch (_) {
      return false;
    }
  });
  if (!scriptDir) scriptDir = "/root/9router-auto-free";

  let script = path.join(scriptDir, "sync.js");
  let cliArgs = [];

  if (action === "dry-run") {
    cliArgs = ["--dry-run"];
  } else if (action === "refresh") {
    cliArgs = ["--refresh"];
  } else if (action === "benchmarks") {
    script = path.join(scriptDir, "update-benchmarks.js");
    cliArgs = [];
  } else if (action === "setup-cron") {
    cliArgs = ["--setup-cron"];
  } else if (action === "sync") {
    cliArgs = [];
  } else {
    return new Response(
      JSON.stringify({ error: "Aksi tidak dikenali" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();
  let isClosed = false;

  const sendEvent = async (event, data) => {
    if (isClosed) return;
    try {
      await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    } catch (_) {
      isClosed = true;
    }
  };

  let pingInterval = null;

  const cleanup = async () => {
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
    if (!isClosed) {
      isClosed = true;
      try {
        await writer.close();
      } catch (_) {}
    }
  };

  if (request.signal) {
    request.signal.addEventListener("abort", () => {
      cleanup();
    });
  }

  // Execute child process and stream output asynchronously without blocking Response return
  (async () => {
    // Keepalive heartbeat ping every 10 seconds to keep SSE connection alive through proxies
    pingInterval = setInterval(async () => {
      if (isClosed) {
        if (pingInterval) clearInterval(pingInterval);
        return;
      }
      try {
        await writer.write(encoder.encode(`: ping\n\n`));
      } catch (_) {
        isClosed = true;
        if (pingInterval) clearInterval(pingInterval);
      }
    }, 10000);

    await sendEvent("start", { action, command: `node ${path.basename(script)} ${cliArgs.join(" ")}` });

    const proc = spawn(process.execPath, [script, ...cliArgs], {
      cwd: scriptDir,
      env: { ...process.env, FORCE_COLOR: "1" },
    });

    currentProcess = proc;

    proc.stdout.on("data", (chunk) => {
      sendEvent("log", { text: chunk.toString() });
    });

    proc.stderr.on("data", (chunk) => {
      sendEvent("log", { text: chunk.toString(), isError: true });
    });

    proc.on("close", async (code) => {
      currentProcess = null;
      await sendEvent("done", { code, success: code === 0 });
      await cleanup();
    });

    proc.on("error", async (err) => {
      currentProcess = null;
      await sendEvent("error", { error: err.message });
      await cleanup();
    });
  })().catch(async (err) => {
    currentProcess = null;
    await sendEvent("error", { error: err?.message || String(err) });
    await cleanup();
  });

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

import { readFileSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getPortFromEnv() {
  const envFiles = [".env", ".env.local", ".env.production"];
  for (const file of envFiles) {
    const fullPath = path.join(__dirname, file);
    if (existsSync(fullPath)) {
      const content = readFileSync(fullPath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const match = trimmed.match(/^PORT\s*=\s*(.+)$/);
        if (match) {
          let val = match[1].trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          const num = parseInt(val, 10);
          if (!isNaN(num) && num > 0) return num;
        }
      }
    }
  }
  return 20135;
}

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : getPortFromEnv();

console.log(`[auto-combo-9r] Starting on port ${port} (from .env)...`);

const nextBin = path.join(__dirname, "node_modules", ".bin", "next");

const proc = spawn(nextBin, ["start", "-p", String(port)], {
  stdio: "inherit",
  cwd: __dirname,
  env: { ...process.env, PORT: String(port) },
});

proc.on("exit", (code) => {
  process.exit(code ?? 0);
});

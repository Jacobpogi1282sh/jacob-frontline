import { spawn } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requestedPort = Number(process.argv[2] || process.env.APP_PORT || 5173);
const webPort = Number.isInteger(requestedPort) && requestedPort > 0 && requestedPort <= 65535 ? requestedPort : 5173;
const configuredApiPort = Number(process.env.JACOB_API_PORT || 0);
const apiPort = configuredApiPort
  ? configuredApiPort
  : await findAvailablePort(webPort === 65535 ? 1 : webPort + 1, webPort);

async function findAvailablePort(startPort, excludedPort) {
  for (let offset = 0; offset < 128; offset += 1) {
    const candidate = ((startPort - 1 + offset) % 65535) + 1;
    if (candidate === excludedPort) continue;
    const available = await new Promise((resolve) => {
      const probe = createServer();
      probe.once("error", () => resolve(false));
      probe.listen(candidate, "0.0.0.0", () => probe.close(() => resolve(true)));
    });
    if (available) return candidate;
  }
  throw new Error("Walang available na port para sa game API. Isara ang ibang local server at subukan muli.");
}

const jobs = [
  ["API", ["server.js"], { ...process.env, PORT: String(apiPort) }],
  ["WEB", ["node_modules/vite/bin/vite.js", "--host", "0.0.0.0", "--port", String(webPort), "--strictPort"], { ...process.env, VITE_GAME_API_PORT: String(apiPort) }],
];
const children = jobs.map(([name, args, env]) => {
  const child = spawn(process.execPath, args, { cwd: root, stdio: "inherit", windowsHide: true, env });
  child.on("error", (error) => { console.error(`[${name}] ${error.message}`); shutdown(1); });
  child.on("exit", (code) => { if (!stopping) shutdown(code ?? 1); });
  return child;
});
let stopping = false;

function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill();
  process.exitCode = code;
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vitePath = path.join(root, "node_modules", "vite", "bin", "vite.js");
const serverPath = path.join(root, "server.js");
const requestedPort = Number(process.argv[2] || process.env.APP_PORT || process.env.PORT || 3000);

if (!Number.isInteger(requestedPort) || requestedPort < 1 || requestedPort > 65535) {
  console.error("PORT must be an integer from 1 to 65535.");
  process.exit(1);
}

const build = spawnSync(process.execPath, [vitePath, "build"], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
  windowsHide: true,
});

if (build.error) {
  console.error(`Could not start the production build: ${build.error.message}`);
  process.exit(1);
}
if (build.status !== 0) process.exit(build.status ?? 1);

const server = spawn(process.execPath, [serverPath, "--production"], {
  cwd: root,
  env: { ...process.env, NODE_ENV: "production", PORT: String(requestedPort) },
  stdio: "inherit",
  windowsHide: true,
});

let stopping = false;
const stop = (signal) => {
  if (stopping) return;
  stopping = true;
  if (server.exitCode === null) server.kill(signal);
};

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
server.on("error", (error) => {
  console.error(`Could not start the game server: ${error.message}`);
  process.exitCode = 1;
});
server.on("exit", (code, signal) => {
  if (!stopping) process.exitCode = code ?? (signal ? 1 : 0);
});

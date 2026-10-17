import express from "express";
import { createServer } from "node:http";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { WebSocketServer, WebSocket } from "ws";

const app = express();
app.set("trust proxy", 1);
const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const production = process.env.NODE_ENV === "production" || process.argv.includes("--production");
const requestCounts = new Map();
const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 15;
const scrypt = promisify(scryptCallback);
const playerStorePath = path.join(dirname, "data", "players.json");
const playerAccounts = new Map();
const playerSessions = new Map();
const missionRooms = new Map();
const activeMaps = new Set(["barangay", "highlands", "port"]);
const activeMissions = new Map([["assault", 20], ["intel", 3], ["defense", 35]]);
const DEMO_USERNAME = "demo";
const DEMO_PASSWORD = "JacobDemo2026!";
let playerStoreWrite = Promise.resolve();

app.disable("x-powered-by");
app.use(express.json({ limit: "64kb" }));

async function hashPassword(password, salt) {
  return scrypt(password, salt, 64);
}

function persistPlayerAccounts() {
  playerStoreWrite = playerStoreWrite.catch(() => {}).then(async () => {
    await mkdir(path.dirname(playerStorePath), { recursive: true });
    await writeFile(playerStorePath, JSON.stringify([...playerAccounts.values()]), { encoding: "utf8", mode: 0o600 });
  });
  return playerStoreWrite;
}

async function loadPlayerAccounts() {
  await mkdir(path.dirname(playerStorePath), { recursive: true });
  try {
    const saved = JSON.parse(await readFile(playerStorePath, "utf8"));
    if (Array.isArray(saved)) for (const account of saved) {
      if (typeof account.username === "string" && typeof account.salt === "string" && typeof account.hash === "string") playerAccounts.set(account.username.toLowerCase(), account);
    }
  } catch (error) {
    if (error.code !== "ENOENT") console.error("Player account store could not be read:", error.message);
  }
  if (!playerAccounts.has(DEMO_USERNAME)) {
    const salt = randomBytes(16);
    const hash = await hashPassword(DEMO_PASSWORD, salt);
    playerAccounts.set(DEMO_USERNAME, { username: DEMO_USERNAME, displayName: "Jacob Demo", salt: salt.toString("base64"), hash: hash.toString("base64") });
    await persistPlayerAccounts();
  }
}

function isSecureOrigin(req) {
  if (req.secure) return true;
  try {
    const origin = new URL(req.get("origin") || `http://${req.get("host")}`);
    return ["localhost", "127.0.0.1", "::1"].includes(origin.hostname);
  } catch { return false; }
}

function getCookie(req, name) {
  const entry = (req.headers.cookie || "").split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : "";
}

function issuePlayerSession(req, res, account) {
  const sessionId = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7;
  playerSessions.set(sessionId, { username: account.username, expiresAt });
  const secure = req.secure ? "; Secure" : "";
  res.setHeader("Set-Cookie", `jacob_session=${sessionId}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800${secure}`);
  res.json({ user: { username: account.username, displayName: account.displayName || account.username } });
}

function getSession(req) {
  const sessionId = getCookie(req, "jacob_session");
  const session = playerSessions.get(sessionId);
  if (!session || session.expiresAt <= Date.now()) {
    if (sessionId) playerSessions.delete(sessionId);
    return null;
  }
  return session;
}

app.post("/api/auth/register", rateLimit, async (req, res) => {
  if (!isSecureOrigin(req)) return res.status(400).json({ error: "Gumamit ng localhost o HTTPS para gumawa ng account." });
  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!/^[a-zA-Z0-9_-]{3,24}$/.test(username)) return res.status(400).json({ error: "Username: 3–24 letra, numero, underscore, o gitling." });
  if (password.length < 8 || password.length > 128) return res.status(400).json({ error: "Password: gumamit ng 8–128 character." });
  if (playerAccounts.has(username.toLowerCase())) return res.status(409).json({ error: "May account na sa username na iyan." });
  const salt = randomBytes(16);
  const hash = await hashPassword(password, salt);
  const account = { username, displayName: username, salt: salt.toString("base64"), hash: hash.toString("base64") };
  playerAccounts.set(username.toLowerCase(), account);
  try { await persistPlayerAccounts(); }
  catch (error) { playerAccounts.delete(username.toLowerCase()); console.error("Player account could not be saved:", error.message); return res.status(500).json({ error: "Hindi na-save ang account. Subukan muli." }); }
  issuePlayerSession(req, res, account);
});

app.post("/api/auth/login", rateLimit, async (req, res) => {
  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!isSecureOrigin(req) && username.toLowerCase() !== DEMO_USERNAME) return res.status(400).json({ error: "Para sa personal account, buksan ang localhost o ang naka-deploy na HTTPS site. Demo login puwedeng gamitin rito." });
  const account = playerAccounts.get(username.toLowerCase());
  if (!account || password.length > 128) return res.status(401).json({ error: "Hindi tama ang username o password." });
  const salt = Buffer.from(account.salt, "base64");
  const expected = Buffer.from(account.hash, "base64");
  const supplied = await hashPassword(password, salt);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return res.status(401).json({ error: "Hindi tama ang username o password." });
  issuePlayerSession(req, res, account);
});

app.get("/api/auth/session", (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: "Mag-log in muna." });
  const account = playerAccounts.get(session.username.toLowerCase());
  if (!account) return res.status(401).json({ error: "Hindi na makita ang account." });
  res.json({ user: { username: account.username, displayName: account.displayName || account.username } });
});

app.post("/api/auth/logout", (req, res) => {
  const sessionId = getCookie(req, "jacob_session");
  if (sessionId) playerSessions.delete(sessionId);
  res.setHeader("Set-Cookie", `jacob_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${req.secure ? "; Secure" : ""}`);
  res.json({ ok: true });
});

function getPublicBaseUrl(req) {
  const configuredUrl = process.env.PUBLIC_SITE_URL?.trim();
  const publicUrl = new URL(configuredUrl || `${req.protocol}://${req.get("host")}`);
  if (publicUrl.protocol !== "http:" && publicUrl.protocol !== "https:") throw new Error("PUBLIC_SITE_URL must use HTTP or HTTPS.");
  return publicUrl.origin;
}

function escapeXml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

app.get("/robots.txt", (req, res) => {
  const baseUrl = getPublicBaseUrl(req);
  res.type("text/plain").send(`User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`);
});

app.get("/sitemap.xml", (req, res) => {
  const baseUrl = getPublicBaseUrl(req);
  res.type("application/xml").set("Cache-Control", "public, max-age=3600").send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escapeXml(`${baseUrl}/`)}</loc><changefreq>weekly</changefreq><priority>1.0</priority></url></urlset>`,
  );
});

function rateLimit(req, res, next) {
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const current = requestCounts.get(key);
  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    requestCounts.set(key, { startedAt: now, count: 1 });
    next();
    return;
  }
  if (current.count >= MAX_REQUESTS_PER_WINDOW) {
    res.set("Retry-After", String(Math.ceil((RATE_WINDOW_MS - (now - current.startedAt)) / 1000)));
    res.status(429).json({ error: "Sandali muna bago magpadala ulit. Subukan muli makalipas ang isang minuto." });
    return;
  }
  current.count += 1;
  next();
}

if (production) {
  const distPath = path.join(dirname, "dist");
  app.use(express.static(distPath));
  app.get(/.*/, (_req, res) => res.sendFile(path.join(distPath, "index.html")));
}

const port = Number(process.env.PORT || (production ? 3000 : 3001));
const httpServer = createServer(app);
const multiplayer = new WebSocketServer({ server: httpServer, path: "/multiplayer", maxPayload: 2048 });

function roomSnapshot(room) {
  return JSON.stringify({ type: "players", count: room.clients.size, players: [...room.clients].filter((client) => client.readyState === WebSocket.OPEN && client.playerState).map((client) => client.playerState), progress: room.progress, items: [...room.items], completed: room.completed });
}

function leaveRoom(client) {
  const room = client.room;
  if (!room) return;
  room.clients.delete(client);
  client.room = null;
  if (!room.clients.size) {
    for (const [key, value] of missionRooms) if (value === room) missionRooms.delete(key);
  }
}

multiplayer.on("connection", (client, req) => {
  const session = getSession(req);
  const account = session && playerAccounts.get(session.username.toLowerCase());
  if (!account) { client.close(4401, "Login required"); return; }
  client.user = { username: account.username, displayName: account.displayName || account.username };
  client.playerId = randomBytes(8).toString("hex");
  client.messageWindow = Date.now();
  client.messageCount = 0;

  client.on("message", (raw) => {
    const now = Date.now();
    if (now - client.messageWindow > 1000) { client.messageWindow = now; client.messageCount = 0; }
    client.messageCount += 1;
    if (client.messageCount > 30) { client.close(4408, "Update rate exceeded"); return; }
    let packet;
    try { packet = JSON.parse(raw.toString()); } catch { return; }
    if (packet.type === "join") {
      const mapId = String(packet.mapId || "");
      const missionId = String(packet.missionId || "");
      if (!activeMaps.has(mapId) || !activeMissions.has(missionId)) { client.close(4400, "Unknown operation"); return; }
      leaveRoom(client);
      const roomId = `${mapId}:${missionId}`;
      if (!missionRooms.has(roomId)) missionRooms.set(roomId, { clients: new Set(), missionId, target: activeMissions.get(missionId), progress: 0, items: new Set(), events: new Set(), completed: false });
      const room = missionRooms.get(roomId);
      if (room.clients.size >= 8) { client.send(JSON.stringify({ type: "full" })); return; }
      client.room = room;
      client.mapId = mapId;
      client.missionId = missionId;
      const demoSuffix = client.user.username.toLowerCase() === DEMO_USERNAME ? ` ${client.playerId.slice(0, 3).toUpperCase()}` : "";
      const spawnPoints = [[-2.4, 18], [2.4, 18], [-2.4, 11], [2.4, 11], [-4.7, 14.5], [4.7, 14.5], [-5.2, 20], [5.2, 20]];
      const spawn = spawnPoints[room.clients.size];
      client.playerState = { id: client.playerId, username: client.user.username, name: `${client.user.displayName}${demoSuffix}`, x: spawn[0], y: 0, z: spawn[1], yaw: 0, health: 100, weapon: "m4", vehicle: null, moving: false, zone: false };
      room.clients.add(client);
      client.send(JSON.stringify({ type: "joined", id: client.playerId, mapId, missionId, spawn, progress: room.progress, items: [...room.items], completed: room.completed, players: [...room.clients].filter((member) => member !== client).map((member) => member.playerState).filter(Boolean) }));
      const joined = JSON.stringify({ type: "join", player: client.playerState, count: room.clients.size });
      for (const member of room.clients) if (member !== client && member.readyState === WebSocket.OPEN) member.send(joined);
      return;
    }
    if (packet.type === "state" && client.room && client.playerState) {
      const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
      client.playerState = {
        ...client.playerState,
        x: Math.max(-35, Math.min(35, finite(packet.x, client.playerState.x))),
        y: Math.max(0, Math.min(20, finite(packet.y, client.playerState.y))),
        z: Math.max(-118, Math.min(34, finite(packet.z, client.playerState.z))),
        yaw: finite(packet.yaw, client.playerState.yaw),
        health: Math.max(0, Math.min(100, finite(packet.health, client.playerState.health))),
        weapon: packet.weapon === "glock" ? "glock" : "m4",
        vehicle: packet.vehicle === "apc" || packet.vehicle === "helicopter" ? packet.vehicle : null,
        parachute: Boolean(packet.parachute),
        moving: Boolean(packet.moving),
        zone: Boolean(packet.zone),
      };
    }
    if (packet.type === "objective" && client.room && !client.room.completed) {
      const eventId = `${client.playerId}:${String(packet.eventId || "").slice(0, 48)}`;
      if (!client.room.events.has(eventId)) {
        client.room.events.add(eventId);
        if (client.room.missionId === "assault" && packet.action === "kill") client.room.progress = Math.min(client.room.target, client.room.progress + 1);
        if (client.room.missionId === "intel" && packet.action === "intel" && Number.isInteger(packet.item) && packet.item >= 0 && packet.item < client.room.target) {
          client.room.items.add(packet.item);
          client.room.progress = client.room.items.size;
        }
        client.room.completed = client.room.progress >= client.room.target;
      }
    }
  });

  client.on("close", () => {
    const room = client.room;
    leaveRoom(client);
    if (room) {
      const packet = JSON.stringify({ type: "leave", id: client.playerId, count: room.clients.size });
      for (const member of room.clients) if (member.readyState === WebSocket.OPEN) member.send(packet);
    }
  });
});

const roomBroadcastTimer = setInterval(() => {
  for (const room of missionRooms.values()) {
    if (!room.clients.size) continue;
    if (room.missionId === "defense" && !room.completed && [...room.clients].some((client) => client.playerState?.zone)) {
      room.progress = Math.min(room.target, room.progress + 0.1);
      room.completed = room.progress >= room.target;
    }
    const snapshot = roomSnapshot(room);
    for (const client of room.clients) if (client.readyState === WebSocket.OPEN) client.send(snapshot);
  }
}, 100);
roomBroadcastTimer.unref();

loadPlayerAccounts().then(() => {
  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`${production ? "Jacob: Frontline" : "Jacob: Frontline API"} listening on port ${port}`);
  });
}).catch((error) => {
  console.error("Could not initialize player accounts:", error.message);
  process.exitCode = 1;
});

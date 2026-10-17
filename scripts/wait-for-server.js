const url = "http://localhost:3000/";
const timeoutMs = 60_000;

async function isGameServerReady() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1_500);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return false;
    const page = await response.text();
    return page.toLowerCase().includes("jacob: frontline");
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

if (process.argv.includes("--check")) {
  process.exitCode = await isGameServerReady() ? 0 : 1;
} else {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isGameServerReady()) process.exit(0);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  console.error("Hindi sumagot ang Jacob: Frontline server sa loob ng 60 segundo.");
  process.exitCode = 1;
}

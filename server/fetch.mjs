import dns from "node:dns";

dns.setDefaultResultOrder("ipv4first");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function fetchText(url, options = {}) {
  const { retries = 2, timeoutMs = 20000, headers = {} } = options;
  let lastError;

  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, ...headers },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      lastError = err;
      if (i < retries) await sleep(400 * (i + 1));
    }
  }
  throw lastError;
}

export async function fetchJson(url, options = {}) {
  const text = await fetchText(url, options);
  return JSON.parse(text);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

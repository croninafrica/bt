import { fetchJson, fetchText } from "../fetch.mjs";
import { formatSize } from "../utils.mjs";

const ENDPOINTS = [
  (q) => `https://apibay.org/q.php?q=${encodeURIComponent(q)}&cat=0`,
  (q) =>
    `https://api.allorigins.win/raw?url=${encodeURIComponent(
      `https://apibay.org/q.php?q=${encodeURIComponent(q)}&cat=0`
    )}`,
];

function parseItems(data, offset, limit) {
  if (
    !Array.isArray(data) ||
    (data.length === 1 && data[0]?.name === "No results returned")
  ) {
    return [];
  }

  return data.slice(offset, offset + limit).flatMap((item) => {
    const infoHash = (item.info_hash || "").toLowerCase();
    if (!infoHash) return [];
    const name = item.name || "Unknown";
    const size = parseInt(item.size || "0", 10) || 0;
    return [
      {
        id: `apibay-${infoHash}`,
        title: name,
        magnet: `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(name)}`,
        size,
        size_label: formatSize(size),
        seeders: parseInt(item.seeders || "0", 10) || 0,
        leechers: parseInt(item.leechers || "0", 10) || 0,
        category: item.category || "",
        source: "apibay",
        added: parseInt(item.added || "0", 10) || null,
      },
    ];
  });
}

export async function searchApibay(query, page, limit) {
  if (!query.trim()) return [];

  const offset = Math.max(0, (page - 1) * limit);
  let lastError;

  for (const buildUrl of ENDPOINTS) {
    const url = buildUrl(query);
    try {
      const data = await fetchJson(url, { retries: 1, timeoutMs: 25000 });
      const items = parseItems(data, offset, limit);
      if (items.length > 0 || Array.isArray(data)) return items;
    } catch (err) {
      lastError = err;
      try {
        const text = await fetchText(url, { retries: 0, timeoutMs: 25000 });
        const data = JSON.parse(text);
        return parseItems(data, offset, limit);
      } catch (e) {
        lastError = e;
      }
    }
  }

  throw lastError || new Error("apibay 所有镜像均不可用");
}

import { fetchJson } from "../fetch.mjs";
import { formatSize } from "../utils.mjs";

const API = "https://torrents-csv.com/service/search";

export async function searchTorrentsCsv(query, page, limit) {
  if (!query.trim()) return [];

  const url = `${API}?q=${encodeURIComponent(query)}&limit=${Math.min(limit * page, 100)}`;
  const data = await fetchJson(url, { retries: 2, timeoutMs: 20000 });
  const list = data?.torrents;
  if (!Array.isArray(list) || list.length === 0) return [];

  const offset = (page - 1) * limit;
  return list.slice(offset, offset + limit).map((item) => {
    const infoHash = (item.infohash || "").toLowerCase();
    const name = item.name || "Unknown";
    const size = Number(item.size_bytes) || 0;
    return {
      id: `csv-${infoHash}`,
      title: name,
      magnet: `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(name)}`,
      size,
      size_label: formatSize(size),
      seeders: Number(item.seeders) || 0,
      leechers: Number(item.leechers) || 0,
      category: "",
      source: "torrents-csv",
      added: Number(item.created_unix) || null,
    };
  });
}

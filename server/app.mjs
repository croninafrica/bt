import express from "express";
import { LRUCache } from "lru-cache";
import path from "path";
import { fileURLToPath } from "url";
import { searchApibay } from "./sources/apibay.mjs";
import { searchNyaa } from "./sources/nyaa.mjs";
import { searchTorrentsCsv } from "./sources/torrents-csv.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const STATIC = path.join(ROOT, "web", "dist");

const SEARCHERS = {
  "torrents-csv": searchTorrentsCsv,
  apibay: searchApibay,
  nyaa: searchNyaa,
};

const cache = new LRUCache({ max: 256, ttl: 120_000 });

export function withTimeout(fn, ms, label) {
  return Promise.race([
    fn(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} 请求超时`)), ms)
    ),
  ]);
}

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", cloud: Boolean(process.env.RENDER || process.env.VERCEL) });
});

app.get("/api/diag", async (_req, res) => {
  const sample = "test";
  const out = {};
  for (const [name, fn] of Object.entries(SEARCHERS)) {
    try {
      const items = await withTimeout(() => fn(sample, 1, 2), 15_000, name);
      out[name] = { ok: true, count: items.length };
    } catch (err) {
      out[name] = { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
  res.json(out);
});

app.get("/api/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q || q.length > 200) {
    res.status(400).json({ detail: "关键词无效" });
    return;
  }

  const page = Math.min(50, Math.max(1, parseInt(req.query.page || "1", 10) || 1));
  const limit = Math.min(50, Math.max(5, parseInt(req.query.limit || "20", 10) || 20));
  const source = ["all", "torrents-csv", "apibay", "nyaa"].includes(req.query.source)
    ? req.query.source
    : "all";
  const sort = ["seeders", "size", "date", "title"].includes(req.query.sort)
    ? req.query.sort
    : "seeders";

  const cacheKey = `${q}:${page}:${limit}:${source}:${sort}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  const started = performance.now();
  const allSources = ["torrents-csv", "apibay"];
  const names =
    source === "all" ? allSources : [source].filter((n) => SEARCHERS[n]);

  const timeouts = { "torrents-csv": 20_000, apibay: 25_000, nyaa: 12_000 };

  const batches = await Promise.all(
    names.map(async (name) => {
      try {
        const items = await withTimeout(
          () => SEARCHERS[name](q, page, limit),
          timeouts[name] ?? 15_000,
          name
        );
        return { name, items, error: null };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[search] ${name} failed:`, msg);
        return { name, items: [], error: msg };
      }
    })
  );

  const merged = batches.flatMap((b) => b.items);
  const activeSources = batches.filter((b) => b.items.length).map((b) => b.name);
  const source_errors = Object.fromEntries(
    batches.filter((b) => b.error).map((b) => [b.name, b.error])
  );

  const seen = new Set();
  const unique = [];
  for (const item of merged) {
    const key = item.magnet.split("&")[0];
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }

  const sortFns = {
    seeders: (a, b) => b.seeders - a.seeders || b.size - a.size,
    size: (a, b) => b.size - a.size,
    date: (a, b) => (b.added || 0) - (a.added || 0),
    title: (a, b) => a.title.localeCompare(b.title, "zh"),
  };
  unique.sort(sortFns[sort]);

  const response = {
    query: q,
    page,
    total: unique.length,
    results: unique.slice(0, limit),
    sources: activeSources,
    source_errors,
    took_ms: Math.round(performance.now() - started),
  };

  cache.set(cacheKey, response);
  res.json(response);
});

app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    res.status(404).json({ detail: "接口不存在" });
    return;
  }
  next();
});

app.use(express.static(STATIC));

app.get("*", (_req, res) => {
  res.sendFile(path.join(STATIC, "index.html"), (err) => {
    if (err) res.status(404).send("请先构建前端: npm run build");
  });
});

export default app;

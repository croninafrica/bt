import { fetchText } from "../fetch.mjs";
import { formatSize } from "../utils.mjs";

const BASE = "https://nyaa.si";
const ROW_RE = /<tr class="(?:default|success|danger)">([\s\S]*?)<\/tr>/g;
const MAGNET_RE = /href="(magnet:\?[^"]+)"/i;
const TITLE_RE =
  /<a href="\/view\/\d+"[^>]*title="([^"]*)"[^>]*>([^<]*)<\/a>/i;

function parseSize(text) {
  const m = text.match(/([\d.]+)\s*(GiB|MiB|KiB|B)/i);
  if (!m) return { size: 0, size_label: "—" };
  const mult = { B: 1, KiB: 1024, MiB: 1024 ** 2, GiB: 1024 ** 3 };
  const size = Math.floor(parseFloat(m[1]) * (mult[m[2]] || 1));
  return { size, size_label: formatSize(size) };
}

function stripHtml(s) {
  return s.replace(/<[^>]+>/g, "").trim();
}

export async function searchNyaa(query, page, limit) {
  if (!query.trim()) return [];

  const url = `${BASE}/?f=0&c=0_0&q=${encodeURIComponent(query)}&p=${page}`;
  const html = await fetchText(url, { retries: 2, timeoutMs: 25000 });
  const results = [];

  for (const row of html.matchAll(ROW_RE)) {
    const block = row[1];
    const magnetM = block.match(MAGNET_RE);
    const titleM = block.match(TITLE_RE);
    if (!magnetM || !titleM) continue;

    const title = titleM[1] || stripHtml(titleM[2]);
    const magnet = magnetM[1].replace(/&amp;/g, "&");
    const cells = [...block.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) =>
      stripHtml(c[1])
    );
    const sizeCell = cells.find((c) => /GiB|MiB|KiB|\d+\s*B/i.test(c)) || "";
    const { size, size_label } = parseSize(sizeCell);

    const seedCells = [...block.matchAll(
      /<td class="text-center">(\d+)<\/td>/gi
    )].map((m) => parseInt(m[1], 10));
    const seeders = seedCells.length >= 3 ? seedCells[seedCells.length - 3] : 0;
    const leechers = seedCells.length >= 2 ? seedCells[seedCells.length - 2] : 0;

    const dateM = block.match(/data-timestamp="(\d+)"/);
    const added = dateM ? parseInt(dateM[1], 10) : null;

    const ih = magnet.match(/btih:([a-fA-F0-9]{40})/i);
    const infoHash = ih ? ih[1].toLowerCase() : "";

    results.push({
      id: `nyaa-${infoHash || Math.abs(hashCode(magnet))}`,
      title,
      magnet,
      size,
      size_label,
      seeders,
      leechers,
      category: "",
      source: "nyaa",
      added,
    });
    if (results.length >= limit) break;
  }

  return results;
}

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return h;
}

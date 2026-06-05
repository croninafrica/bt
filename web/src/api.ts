import type { SearchResponse, SortKey, SourceFilter } from "./types";

function apiUrl(path: string): string {
  return `${window.location.origin}${path}`;
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(apiUrl("/api/health"), {
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function searchTorrents(
  q: string,
  page: number,
  source: SourceFilter,
  sort: SortKey,
  signal?: AbortSignal
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    q,
    page: String(page),
    limit: "20",
    source,
    sort,
  });

  const res = await fetch(apiUrl(`/api/search?${params}`), { signal });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = (err as { detail?: string }).detail;
    if (res.status === 403) {
      throw new Error(
        detail || "403：请用 http://127.0.0.1:8787 打开，并确认已运行 node server/index.mjs"
      );
    }
    throw new Error(detail || `${res.status} ${res.statusText}`);
  }

  return res.json();
}

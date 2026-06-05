import { checkHealth, searchTorrents } from "./api";
import type { SortKey, SourceFilter, TorrentResult } from "./types";
import "./style.css";

const SOURCE_LABELS: Record<SourceFilter, string> = {
  all: "全部源",
  "torrents-csv": "Torrents CSV",
  apibay: "Pirate Bay",
  sukebei: "Sukebei（番号/JAV）",
  nyaa: "Nyaa（动漫）",
};

const JAV_CODE = /^[A-Za-z]{2,12}-\d{2,6}$/i;

const SORT_LABELS: Record<SortKey, string> = {
  seeders: "做种数",
  size: "体积",
  date: "时间",
  title: "名称",
};

interface State {
  query: string;
  page: number;
  source: SourceFilter;
  sort: SortKey;
  loading: boolean;
  error: string | null;
  results: TorrentResult[];
  total: number;
  tookMs: number;
  sources: string[];
  sourceErrors: Record<string, string>;
  backendOk: boolean | null;
}

const state: State = {
  query: "",
  page: 1,
  source: "all",
  sort: "seeders",
  loading: false,
  error: null,
  results: [],
  total: 0,
  tookMs: 0,
  sources: [],
  sourceErrors: {},
  backendOk: null,
};

let abortController: AbortController | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const app = document.getElementById("app")!;

function getParams(): { q: string; page: number; source: SourceFilter; sort: SortKey } {
  const params = new URLSearchParams(location.search);
  const source = (params.get("source") || "all") as SourceFilter;
  const sort = (params.get("sort") || "seeders") as SortKey;
  return {
    q: params.get("q") || "",
    page: Math.max(1, parseInt(params.get("page") || "1", 10) || 1),
    source: ["all", "torrents-csv", "apibay", "sukebei", "nyaa"].includes(source)
      ? source
      : "all",
    sort: ["seeders", "size", "date", "title"].includes(sort) ? sort : "seeders",
  };
}

function syncUrl() {
  const params = new URLSearchParams();
  if (state.query) params.set("q", state.query);
  if (state.page > 1) params.set("page", String(state.page));
  if (state.source !== "all") params.set("source", state.source);
  if (state.sort !== "seeders") params.set("sort", state.sort);
  const qs = params.toString();
  history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
}

function formatDate(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleDateString("zh-CN");
}

async function copyMagnet(magnet: string, btn: HTMLButtonElement) {
  try {
    await navigator.clipboard.writeText(magnet);
    btn.textContent = "已复制";
    btn.classList.add("copied");
    setTimeout(() => {
      btn.textContent = "复制磁力";
      btn.classList.remove("copied");
    }, 2000);
  } catch {
    btn.textContent = "复制失败";
  }
}

function render() {
  const hasQuery = state.query.trim().length > 0;
  const showResults = hasQuery && !state.loading && !state.error;

  app.innerHTML = `
    <header>
      <h1 class="logo">
        <span class="logo-icon" aria-hidden="true">⬡</span>
        磁力搜
      </h1>
      <p class="tagline">简洁 · 多源聚合 · 番号如 DASS-945 自动走 Sukebei</p>
      ${JAV_CODE.test(state.query) ? `<p class="status-ok">● 已识别番号格式，将搜索 Sukebei</p>` : ""}
      ${state.backendOk === true ? `<p class="status-ok">● 服务已连接</p>` : state.backendOk === false ? `<p class="status-bad">● 未连接后端 · 本地请运行 <code>run.bat</code> · 云端见 DEPLOY.md</p>` : ""}
      <form class="search-box" id="search-form" role="search">
        <input
          type="search"
          name="q"
          placeholder="输入关键词搜索…"
          value="${escapeHtml(state.query)}"
          autocomplete="off"
          spellcheck="false"
          aria-label="搜索关键词"
        />
        <button type="submit" ${state.loading ? "disabled" : ""}>
          ${state.loading ? "搜索中" : "搜索"}
        </button>
      </form>
    </header>

    ${
      hasQuery
        ? `
      <div class="toolbar">
        <label>
          数据源
          <select id="source-select">
            ${(Object.keys(SOURCE_LABELS) as SourceFilter[])
              .map(
                (k) =>
                  `<option value="${k}" ${state.source === k ? "selected" : ""}>${SOURCE_LABELS[k]}</option>`
              )
              .join("")}
          </select>
        </label>
        <label>
          排序
          <select id="sort-select">
            ${(Object.keys(SORT_LABELS) as SortKey[])
              .map(
                (k) =>
                  `<option value="${k}" ${state.sort === k ? "selected" : ""}>${SORT_LABELS[k]}</option>`
              )
              .join("")}
          </select>
        </label>
        ${
          showResults && state.results.length > 0
            ? `<span class="meta ok-badge">找到 ${state.results.length} 条 · ${state.tookMs}ms · ${state.sources.join(", ")}</span>`
            : showResults
              ? `<span class="meta">${state.total} 条 · ${state.tookMs}ms</span>`
              : ""
        }
      </div>
    `
        : ""
    }

    <main>
      ${
        state.loading
          ? `<div class="loading">${Array.from({ length: 5 }, () => '<div class="skeleton" style="margin-bottom:10px"></div>').join("")}</div>`
          : state.error
            ? `<p class="error">${escapeHtml(state.error)}</p>`
            : showResults && state.results.length === 0
              ? `<div class="empty">
                  <p>未找到相关资源</p>
                  ${renderSourceErrors()}
                  <p class="hint">番号类请选「Sukebei」或「全部源」，如 DASS-945、SSIS-001</p>
                  <p class="hint"><a href="/api/diag" target="_blank" rel="noopener">检测数据源状态</a></p>
                </div>`
              : showResults
                ? `<ul class="results">${state.results.map(renderCard).join("")}</ul>`
                : !hasQuery
                  ? `<p class="empty">${backendBanner()}输入关键词开始搜索，支持中英文</p>`
                  : ""
      }
    </main>

    ${
      showResults && state.results.length > 0
        ? `
      <nav class="pagination" aria-label="分页">
        <button class="btn" id="prev-page" ${state.page <= 1 ? "disabled" : ""}>上一页</button>
        <span class="meta" style="align-self:center">第 ${state.page} 页</span>
        <button class="btn" id="next-page" ${state.results.length < 20 ? "disabled" : ""}>下一页</button>
      </nav>
    `
        : ""
    }

    <footer>仅供学习研究 · 请遵守当地法律法规</footer>
  `;

  bindEvents();
}

function renderCard(item: TorrentResult): string {
  return `
    <li class="result-card">
      <h2 class="result-title">
        <a href="${escapeAttr(item.magnet)}" title="${escapeAttr(item.title)}">${escapeHtml(item.title)}</a>
      </h2>
      <div class="result-stats">
        <span class="stat-seeders">↑ ${item.seeders}</span>
        <span class="stat-leechers">↓ ${item.leechers}</span>
        <span>${escapeHtml(item.size_label)}</span>
        <span>${formatDate(item.added)}</span>
        <span class="source-badge">${escapeHtml(item.source)}</span>
      </div>
      <div class="result-actions">
        <button type="button" class="btn btn-primary copy-btn" data-magnet="${escapeAttr(item.magnet)}">复制磁力</button>
        <a class="btn" href="${escapeAttr(item.magnet)}">打开</a>
      </div>
    </li>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

function bindEvents() {
  const form = document.getElementById("search-form") as HTMLFormElement | null;
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = form.querySelector<HTMLInputElement>('input[name="q"]')!;
    state.query = input.value.trim();
    state.page = 1;
    syncUrl();
    void runSearch();
  });

  document.getElementById("source-select")?.addEventListener("change", (e) => {
    state.source = (e.target as HTMLSelectElement).value as SourceFilter;
    state.page = 1;
    syncUrl();
    void runSearch();
  });

  document.getElementById("sort-select")?.addEventListener("change", (e) => {
    state.sort = (e.target as HTMLSelectElement).value as SortKey;
    syncUrl();
    void runSearch();
  });

  document.getElementById("prev-page")?.addEventListener("click", () => {
    if (state.page > 1) {
      state.page--;
      syncUrl();
      void runSearch();
    }
  });

  document.getElementById("next-page")?.addEventListener("click", () => {
    state.page++;
    syncUrl();
    void runSearch();
  });

  document.querySelectorAll<HTMLButtonElement>(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const magnet = btn.dataset.magnet;
      if (magnet) void copyMagnet(magnet, btn);
    });
  });
}

async function runSearch() {
  if (!state.query.trim()) {
    state.results = [];
    state.error = null;
    render();
    return;
  }

  abortController?.abort();
  abortController = new AbortController();

  state.loading = true;
  state.error = null;
  render();

  try {
    const data = await searchTorrents(
      state.query,
      state.page,
      state.source,
      state.sort,
      abortController.signal
    );
    state.results = data.results;
    state.total = data.total;
    state.tookMs = data.took_ms;
    state.sources = data.sources;
    state.sourceErrors = data.source_errors || {};
    state.backendOk = true;
  } catch (err) {
    if ((err as Error).name === "AbortError") return;
    state.error = err instanceof Error ? err.message : "搜索失败，请稍后重试";
    state.results = [];
  } finally {
    state.loading = false;
    render();
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
    e.preventDefault();
    document.querySelector<HTMLInputElement>('input[name="q"]')?.focus();
  }
});

function backendBanner(): string {
  if (state.backendOk === false) {
    return `<p class="error">后端未连接。请在项目目录运行：<code>node server/index.mjs</code>，然后访问 <a href="http://127.0.0.1:8787">127.0.0.1:8787</a></p>`;
  }
  return "";
}

function renderSourceErrors(): string {
  const entries = Object.entries(state.sourceErrors);
  if (!entries.length) return "";
  return `<ul class="source-errors">${entries
    .map(([k, v]) => `<li><strong>${escapeHtml(k)}</strong>: ${escapeHtml(v)}</li>`)
    .join("")}</ul>`;
}

async function init() {
  const params = getParams();
  state.query = params.q;
  state.page = params.page;
  state.source = params.source;
  state.sort = params.sort;
  state.backendOk = await checkHealth();
  render();
  if (state.query) void runSearch();
}

void init();

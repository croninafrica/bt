export interface TorrentResult {
  id: string;
  title: string;
  magnet: string;
  size: number;
  size_label: string;
  seeders: number;
  leechers: number;
  category: string;
  source: string;
  added: number | null;
}

export interface SearchResponse {
  query: string;
  page: number;
  total: number;
  results: TorrentResult[];
  sources: string[];
  source_errors?: Record<string, string>;
  took_ms: number;
}

export type SourceFilter =
  | "all"
  | "torrents-csv"
  | "apibay"
  | "sukebei"
  | "nyaa";
export type SortKey = "seeders" | "size" | "date" | "title";

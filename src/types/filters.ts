export type SortBy = "updated" | "popularity" | "name_asc" | "name_desc" | "game_version";
export type TimeRange = "all-time" | "past-week" | "past-month" | "past-year";

export interface SidebarFilters {
  sortBy: SortBy;
  timeRange: TimeRange;
  selectedTag: string | null;
  devstates: number[];   // empty = all; subset = filter to these devstates
  gameVersion: string;   // empty = any
}

// sortBy values that map to scrape_rank (order depends on last sync params)
export const SCRAPE_RANK_SORTS: SortBy[] = ["updated", "popularity"];

export const SORT_OPTIONS: { value: SortBy; label: string; apiValue: string }[] = [
  { value: "updated",      label: "Recentemente atualizado", apiValue: "updated" },
  { value: "popularity",   label: "Popularidade",            apiValue: "popularity" },
  { value: "name_asc",     label: "Nome A → Z",              apiValue: "popularity" },
  { value: "name_desc",    label: "Nome Z → A",              apiValue: "popularity" },
  { value: "game_version", label: "Versão do jogo",          apiValue: "popularity" },
];

export const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "all-time",    label: "Todo o período" },
  { value: "past-week",   label: "Última semana" },
  { value: "past-month",  label: "Último mês" },
  { value: "past-year",   label: "Último ano" },
];

export type SortBy = "popularity" | "score" | "latest" | "updated" | "downloads" | "favorites" | "name_asc" | "name_desc" | "game_version";
export type TimeRange = "all-time" | "past-week" | "past-month" | "past-year";

export interface SidebarFilters {
  sortBy: SortBy;
  timeRange: TimeRange;
  selectedTag: string | null;
  devstates: number[];   // empty = all; subset = filter to these devstates
  gameVersion: string;   // empty = any
}

export const SORT_OPTIONS: { value: SortBy; apiValue: string }[] = [
  { value: "popularity",   apiValue: "popularity" },
  { value: "score",        apiValue: "score" },
  { value: "latest",       apiValue: "latest" },
  { value: "updated",      apiValue: "updated" },
  { value: "downloads",    apiValue: "downloads" },
  { value: "favorites",    apiValue: "favorites" },
  { value: "name_asc",     apiValue: "popularity" },
  { value: "name_desc",    apiValue: "popularity" },
  { value: "game_version", apiValue: "popularity" },
];

export const TIME_RANGE_OPTIONS: { value: TimeRange }[] = [
  { value: "all-time" },
  { value: "past-week" },
  { value: "past-month" },
  { value: "past-year" },
];

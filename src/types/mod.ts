export interface Mod {
  id: string;
  name: string;
  author: string;
  description: string;
  category: string;
  devstate: number; // 0=unknown 1=Beta 2=Stable 3=Deprecated 4=Abandoned
  game_version: string;
  scrape_rank: number;
  version_available: string;
  version_installed: string | null;
  updated_at: string | null;
  downloads: number;
  favorites: number;
  approval_pct: number; // -1 = sem dados
  url: string;
  thumbnail: string | null;
  is_installed: boolean;
  last_scraped_at: string | null;
}

export type ModStatus = "installed" | "not_installed" | "outdated";

export function getModStatus(mod: Mod): ModStatus {
  if (!mod.is_installed) return "not_installed";
  if (mod.version_installed !== mod.version_available) return "outdated";
  return "installed";
}

export const DEVSTATE_LABELS: Record<number, string> = {
  1: "Beta",
  2: "Stable",
  3: "Deprecated",
  4: "Abandoned",
};

// bg/color pairs matching .mod-card-devstate-N from site.css
export const DEVSTATE_STYLES: Record<number, { bg: string; color: string }> = {
  1: { bg: "#2a6496", color: "#b8daff" },
  2: { bg: "#1e6e3e", color: "#a3e4bc" },
  3: { bg: "#7a5a00", color: "#ffe08a" },
  4: { bg: "#6e2020", color: "#f5b7b7" },
};

export interface Mod {
  id: string;
  name: string;
  category: string;
  version_available: string;
  version_installed: string | null;
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

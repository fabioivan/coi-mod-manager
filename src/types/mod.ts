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

import { compareVersions } from "@/utils/version";

export function getModStatus(mod: Mod): ModStatus {
	if (!mod.is_installed) return "not_installed";
	if (mod.version_installed == null) return "outdated";
	if (compareVersions(mod.version_installed, mod.version_available) !== 0)
		return "outdated";
	return "installed";
}

export const DEVSTATE_LABELS: Record<number, string> = {
	1: "devstate_beta",
	2: "devstate_stable",
	3: "devstate_deprecated",
	4: "devstate_abandoned",
};

// bg/color pairs matching .mod-card-devstate-N from site.css
export const DEVSTATE_STYLES: Record<number, { bg: string; color: string }> = {
	1: { bg: "#2a6496", color: "#b8daff" },
	2: { bg: "#1e6e3e", color: "#a3e4bc" },
	3: { bg: "#7a5a00", color: "#ffe08a" },
	4: { bg: "#6e2020", color: "#f5b7b7" },
};

export interface ModCapability {
	name: string;
	severity: string;
	description: string;
}

export interface Announcement {
	title: string;
	date: string;
	version: string;
	content_html: string;
}

export interface ModVersion {
	version: string;
	latest: boolean;
	download_url: string;
	downloads: number;
	game_version: string;
	released_date: string;
	file_size: string;
	license: string;
	changelog: string;
}

export interface ChangelogEntry {
	version: string;
	date: string;
	text: string;
}

export interface ModDetails {
	id: string;
	name: string;
	author: string;
	short_description: string;
	version_available: string;
	updated_at: string;
	license: string | null;
	source_code_url: string | null;
	zip_file_size: string | null;
	game_versions: string;
	save_game_add_ok: boolean;
	save_game_remove_ok: boolean;
	downloads: number;
	favorites: number;
	approval_pct: number;
	description_html: string;
	screenshots: string[];
	websites: string[];
	tags: string[];
	capabilities: ModCapability[];
	announcements: Announcement[];
	versions: ModVersion[];
	changelogs: ChangelogEntry[];
	dependencies: string;
}

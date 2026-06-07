export interface MapItem {
	id: string;
	name: string;
	author: string;
	description: string;
	thumbnail: string | null;
	downloads: number;
	favorites: number;
	comment_count: number;
	approval_pct: number;
	updated_at: string | null;
	url: string;
	is_downloaded: boolean;
	last_scraped_at: string | null;
}

export interface MapDetails {
	id: string;
	name: string;
	author: string;
	description_html: string;
	thumbnail: string | null;
	screenshots: string[];
	downloads: number;
	favorites: number;
	approval_pct: number;
	vote_count: number;
	updated_at: string | null;
	created_at: string | null;
	url: string;
	download_url: string | null;
	map_size: string | null;
	resources: MapResource[];
	versions: MapVersion[];
	starting_locations: MapStartingLocation[];
	comments: MapComment[];
}

export interface MapResource {
	name: string;
	amount: string;
}

export interface MapVersion {
	version: string;
	download_url: string;
	release_date: string;
	downloads: number;
	is_current: boolean;
}

export interface MapStartingLocation {
	difficulty: string;
	description: string;
}

export interface MapComment {
	author: string;
	author_url: string;
	text: string;
	created_ago: string;
}

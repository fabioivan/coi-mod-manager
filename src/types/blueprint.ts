export interface Blueprint {
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

export interface BlueprintDetails {
	id: string;
	name: string;
	author: string;
	description_html: string;
	thumbnail: string | null;
	screenshots: string[];
	blueprint_data: string | null;
	downloads: number;
	favorites: number;
	approval_pct: number;
	updated_at: string | null;
	url: string;
}

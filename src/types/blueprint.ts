export interface Blueprint {
	id: string;
	name: string;
	author: string;
	description: string;
	thumbnail: string | null;
	downloads: number;
	favorites: number;
	approval_pct: number;
	updated_at: string | null;
	url: string;
	is_downloaded: boolean;
	last_scraped_at: string | null;
}

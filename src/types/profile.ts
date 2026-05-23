export interface Profile {
  id: string;
  name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  mod_count: number;
}

export interface ImportResult {
  profile: Profile;
  mods_installed: number;
}

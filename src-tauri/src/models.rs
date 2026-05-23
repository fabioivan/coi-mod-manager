use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Mod {
    pub id: String,
    pub name: String,
    pub author: String,
    pub description: String,
    pub category: String,
    pub devstate: i32,
    pub game_version: String,
    pub scrape_rank: i32,
    pub version_available: String,
    pub version_installed: Option<String>,
    pub updated_at: Option<String>,
    pub downloads: i64,
    pub favorites: i64,
    pub approval_pct: i32,
    pub url: String,
    pub thumbnail: Option<String>,
    pub is_installed: bool,
    pub last_scraped_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub is_default: bool,
    pub created_at: String,
    pub updated_at: String,
    pub mod_count: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProfileMod {
    pub mod_id: String,
    pub version_installed: String,
    pub pool_path: Option<String>,
    pub folder_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExportMod {
    pub id: String,
    pub name: String,
    pub version: String,
    pub url: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExportData {
    pub format_version: i32,
    pub name: String,
    pub mods: Vec<ExportMod>,
}

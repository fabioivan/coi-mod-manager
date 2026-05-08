use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Mod {
    pub id: String,
    pub name: String,
    pub category: String,
    pub version_available: String,
    pub version_installed: Option<String>,
    pub url: String,
    pub thumbnail: Option<String>,
    pub is_installed: bool,
    pub last_scraped_at: Option<String>,
}

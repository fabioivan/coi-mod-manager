use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Mod {
    pub id: String,
    pub name: String,
    pub author: String,
    pub description: String,
    pub category: String,
    pub devstate: i32,       // 0=unknown 1=Beta 2=Stable 3=Deprecated 4=Abandoned
    pub game_version: String, // versão(ões) do jogo suportada(s) ex: "0.8.2 – 0.8.4"
    pub scrape_rank: i32,
    pub version_available: String, // versão do mod ex: "0.2.4"
    pub version_installed: Option<String>,
    pub updated_at: Option<String>, // data-utc-date do site (ISO 8601)
    pub downloads: i64,
    pub favorites: i64,
    pub approval_pct: i32,
    pub url: String,
    pub thumbnail: Option<String>,
    pub is_installed: bool,
    pub last_scraped_at: Option<String>,
}

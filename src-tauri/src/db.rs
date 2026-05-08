use rusqlite::{Connection, Result, params};
use std::path::Path;
use tokio::sync::Mutex;
use crate::models::Mod;

pub struct Database(pub Mutex<Connection>);

impl Database {
    pub fn open(path: &Path) -> Result<Self> {
        let conn = Connection::open(path)?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
        Ok(Self(Mutex::new(conn)))
    }

    pub async fn migrate(&self) -> Result<()> {
        let conn = self.0.lock().await;
        conn.execute_batch("
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                applied_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
        ")?;

        let applied: i64 = conn.query_row(
            "SELECT COUNT(*) FROM schema_migrations WHERE version = 1",
            [],
            |r| r.get(0),
        )?;

        if applied == 0 {
            conn.execute_batch("
                CREATE TABLE IF NOT EXISTS mods (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    category TEXT NOT NULL DEFAULT '',
                    version_available TEXT NOT NULL DEFAULT '',
                    version_installed TEXT,
                    url TEXT NOT NULL DEFAULT '',
                    thumbnail TEXT,
                    is_installed INTEGER NOT NULL DEFAULT 0,
                    last_scraped_at TEXT
                );
                CREATE INDEX IF NOT EXISTS idx_category ON mods(category);
                CREATE INDEX IF NOT EXISTS idx_installed ON mods(is_installed);
                INSERT INTO schema_migrations (version) VALUES (1);
            ")?;
        }

        Ok(())
    }

    pub async fn get_all_mods(&self) -> Result<Vec<Mod>> {
        let conn = self.0.lock().await;
        let mut stmt = conn.prepare(
            "SELECT id, name, category, version_available, version_installed,
                    url, thumbnail, is_installed, last_scraped_at
             FROM mods
             ORDER BY category, name"
        )?;

        let mods = stmt.query_map([], |row| {
            Ok(Mod {
                id: row.get(0)?,
                name: row.get(1)?,
                category: row.get(2)?,
                version_available: row.get(3)?,
                version_installed: row.get(4)?,
                url: row.get(5)?,
                thumbnail: row.get(6)?,
                is_installed: row.get::<_, i32>(7)? != 0,
                last_scraped_at: row.get(8)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;

        Ok(mods)
    }

    pub async fn upsert_mod(&self, m: &Mod) -> Result<()> {
        let conn = self.0.lock().await;
        conn.execute(
            "INSERT INTO mods (id, name, category, version_available, url, thumbnail, last_scraped_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
             ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                category = excluded.category,
                version_available = excluded.version_available,
                url = excluded.url,
                thumbnail = excluded.thumbnail,
                last_scraped_at = excluded.last_scraped_at",
            params![m.id, m.name, m.category, m.version_available, m.url, m.thumbnail, m.last_scraped_at],
        )?;
        Ok(())
    }

    pub async fn set_installed(&self, mod_id: &str, version: &str) -> Result<()> {
        let conn = self.0.lock().await;
        conn.execute(
            "UPDATE mods SET is_installed = 1, version_installed = ?1 WHERE id = ?2",
            params![version, mod_id],
        )?;
        Ok(())
    }

    pub async fn set_uninstalled(&self, mod_id: &str) -> Result<()> {
        let conn = self.0.lock().await;
        conn.execute(
            "UPDATE mods SET is_installed = 0, version_installed = NULL WHERE id = ?1",
            params![mod_id],
        )?;
        Ok(())
    }

    pub async fn get_outdated_mods(&self) -> Result<Vec<Mod>> {
        let conn = self.0.lock().await;
        let mut stmt = conn.prepare(
            "SELECT id, name, category, version_available, version_installed,
                    url, thumbnail, is_installed, last_scraped_at
             FROM mods
             WHERE is_installed = 1
               AND version_installed IS NOT NULL
               AND version_installed != version_available
             ORDER BY category, name"
        )?;

        let mods = stmt.query_map([], |row| {
            Ok(Mod {
                id: row.get(0)?,
                name: row.get(1)?,
                category: row.get(2)?,
                version_available: row.get(3)?,
                version_installed: row.get(4)?,
                url: row.get(5)?,
                thumbnail: row.get(6)?,
                is_installed: row.get::<_, i32>(7)? != 0,
                last_scraped_at: row.get(8)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;

        Ok(mods)
    }

    pub async fn needs_scrape(&self, min_age_hours: i64) -> Result<bool> {
        let conn = self.0.lock().await;
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM mods
             WHERE last_scraped_at > datetime('now', ?1)",
            params![format!("-{} hours", min_age_hours)],
            |r| r.get(0),
        )?;
        Ok(count == 0)
    }
}

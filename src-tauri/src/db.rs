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

        let v1: i64 = conn.query_row(
            "SELECT COUNT(*) FROM schema_migrations WHERE version = 1", [], |r| r.get(0))?;
        if v1 == 0 {
            conn.execute_batch("
                CREATE TABLE IF NOT EXISTS mods (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    author TEXT NOT NULL DEFAULT '',
                    description TEXT NOT NULL DEFAULT '',
                    category TEXT NOT NULL DEFAULT '',
                    devstate INTEGER NOT NULL DEFAULT 0,
                    game_version TEXT NOT NULL DEFAULT '',
                    scrape_rank INTEGER NOT NULL DEFAULT 0,
                    version_available TEXT NOT NULL DEFAULT '',
                    version_installed TEXT,
                    updated_at TEXT,
                    url TEXT NOT NULL DEFAULT '',
                    thumbnail TEXT,
                    is_installed INTEGER NOT NULL DEFAULT 0,
                    last_scraped_at TEXT
                );
                CREATE INDEX IF NOT EXISTS idx_category ON mods(category);
                CREATE INDEX IF NOT EXISTS idx_installed ON mods(is_installed);
                CREATE INDEX IF NOT EXISTS idx_updated_at ON mods(updated_at DESC);
                INSERT INTO schema_migrations (version) VALUES (1);
            ")?;
        }

        macro_rules! alter_if_missing {
            ($ver:expr, $sql:expr) => {{
                let n: i64 = conn.query_row(
                    "SELECT COUNT(*) FROM schema_migrations WHERE version = ?1",
                    params![$ver], |r| r.get(0))?;
                if n == 0 {
                    let _ = conn.execute_batch($sql);
                    conn.execute_batch(&format!(
                        "INSERT INTO schema_migrations (version) VALUES ({});", $ver))?;
                }
            }};
        }

        alter_if_missing!(2, "ALTER TABLE mods ADD COLUMN author TEXT NOT NULL DEFAULT '';\
                              ALTER TABLE mods ADD COLUMN description TEXT NOT NULL DEFAULT '';\
                              ALTER TABLE mods ADD COLUMN devstate INTEGER NOT NULL DEFAULT 0;");
        alter_if_missing!(3, "ALTER TABLE mods ADD COLUMN game_version TEXT NOT NULL DEFAULT '';");
        alter_if_missing!(4, "ALTER TABLE mods ADD COLUMN scrape_rank INTEGER NOT NULL DEFAULT 0;");
        alter_if_missing!(5, "ALTER TABLE mods ADD COLUMN updated_at TEXT;");
        alter_if_missing!(6,
            "ALTER TABLE mods ADD COLUMN downloads INTEGER NOT NULL DEFAULT 0;\
             ALTER TABLE mods ADD COLUMN favorites INTEGER NOT NULL DEFAULT 0;\
             ALTER TABLE mods ADD COLUMN approval_pct INTEGER NOT NULL DEFAULT -1;");

        let v7: i64 = conn.query_row(
            "SELECT COUNT(*) FROM schema_migrations WHERE version = 7", [], |r| r.get(0))?;
        if v7 == 0 {
            conn.execute_batch("
                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );
                INSERT INTO schema_migrations (version) VALUES (7);
            ")?;
        }

        Ok(())
    }

    pub async fn get_all_mods(&self) -> Result<Vec<Mod>> {
        let conn = self.0.lock().await;
        let mut stmt = conn.prepare(
            "SELECT id, name, author, description, category, devstate,
                    game_version, scrape_rank, version_available, version_installed,
                    updated_at, downloads, favorites, approval_pct,
                    url, thumbnail, is_installed, last_scraped_at
             FROM mods
             ORDER BY updated_at DESC NULLS LAST, scrape_rank ASC"
        )?;

        let mods = stmt.query_map([], |row| {
            Ok(Mod {
                id:                row.get(0)?,
                name:              row.get(1)?,
                author:            row.get(2)?,
                description:       row.get(3)?,
                category:          row.get(4)?,
                devstate:          row.get(5)?,
                game_version:      row.get(6)?,
                scrape_rank:       row.get(7)?,
                version_available: row.get(8)?,
                version_installed: row.get(9)?,
                updated_at:        row.get(10)?,
                downloads:         row.get(11)?,
                favorites:         row.get(12)?,
                approval_pct:      row.get(13)?,
                url:               row.get(14)?,
                thumbnail:         row.get(15)?,
                is_installed:      row.get::<_, i32>(16)? != 0,
                last_scraped_at:   row.get(17)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;

        Ok(mods)
    }

    pub async fn upsert_mod(&self, m: &Mod) -> Result<()> {
        let conn = self.0.lock().await;
        conn.execute(
            "INSERT INTO mods (id, name, author, description, category, devstate,
                               game_version, scrape_rank, version_available,
                               updated_at, downloads, favorites, approval_pct,
                               url, thumbnail, last_scraped_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16)
             ON CONFLICT(id) DO UPDATE SET
                name              = excluded.name,
                author            = excluded.author,
                description       = excluded.description,
                category          = excluded.category,
                devstate          = excluded.devstate,
                game_version      = excluded.game_version,
                scrape_rank       = excluded.scrape_rank,
                version_available = excluded.version_available,
                updated_at        = excluded.updated_at,
                downloads         = excluded.downloads,
                favorites         = excluded.favorites,
                approval_pct      = excluded.approval_pct,
                url               = excluded.url,
                thumbnail         = excluded.thumbnail,
                last_scraped_at   = excluded.last_scraped_at",
            params![
                m.id, m.name, m.author, m.description, m.category, m.devstate,
                m.game_version, m.scrape_rank, m.version_available,
                m.updated_at, m.downloads, m.favorites, m.approval_pct,
                m.url, m.thumbnail, m.last_scraped_at
            ],
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
            "SELECT id, name, author, description, category, devstate,
                    game_version, scrape_rank, version_available, version_installed,
                    updated_at, url, thumbnail, is_installed, last_scraped_at
             FROM mods
             WHERE is_installed = 1
               AND version_installed IS NOT NULL
               AND version_installed != version_available
             ORDER BY name"
        )?;

        let mods = stmt.query_map([], |row| {
            Ok(Mod {
                id:                row.get(0)?,
                name:              row.get(1)?,
                author:            row.get(2)?,
                description:       row.get(3)?,
                category:          row.get(4)?,
                devstate:          row.get(5)?,
                game_version:      row.get(6)?,
                scrape_rank:       row.get(7)?,
                version_available: row.get(8)?,
                version_installed: row.get(9)?,
                updated_at:        row.get(10)?,
                downloads:         row.get(11)?,
                favorites:         row.get(12)?,
                approval_pct:      row.get(13)?,
                url:               row.get(14)?,
                thumbnail:         row.get(15)?,
                is_installed:      row.get::<_, i32>(16)? != 0,
                last_scraped_at:   row.get(17)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;

        Ok(mods)
    }

    pub async fn get_setting(&self, key: &str) -> Result<Option<String>> {
        let conn = self.0.lock().await;
        match conn.query_row(
            "SELECT value FROM settings WHERE key = ?1",
            params![key],
            |r| r.get(0),
        ) {
            Ok(v) => Ok(Some(v)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub async fn set_setting(&self, key: &str, value: &str) -> Result<()> {
        let conn = self.0.lock().await;
        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![key, value],
        )?;
        Ok(())
    }

    pub async fn get_outdated_ids(&self) -> Result<Vec<String>> {
        let conn = self.0.lock().await;
        let mut stmt = conn.prepare(
            "SELECT id FROM mods
             WHERE is_installed = 1
               AND version_installed IS NOT NULL
               AND version_installed != version_available
               AND version_available != ''"
        )?;
        let ids = stmt.query_map([], |r| r.get(0))?.collect::<Result<Vec<String>>>()?;
        Ok(ids)
    }

    pub async fn needs_scrape(&self, min_age_hours: i64) -> Result<bool> {
        let conn = self.0.lock().await;
        // Re-scrape se: nenhum mod recente OU mods existem mas faltam updated_at (schema antigo)
        let fresh: i64 = conn.query_row(
            "SELECT COUNT(*) FROM mods
             WHERE last_scraped_at > datetime('now', ?1)
               AND updated_at IS NOT NULL",
            params![format!("-{} hours", min_age_hours)],
            |r| r.get(0),
        )?;
        Ok(fresh == 0)
    }
}

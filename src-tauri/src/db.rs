use crate::models::{Blueprint, MapItem, Mod, Profile, ProfileMod};
use rusqlite::{params, Connection, Result};
use std::path::Path;
use tokio::sync::Mutex;

pub struct Database(pub Mutex<Connection>);

impl Database {
    pub fn open(path: &Path) -> Result<Self> {
        let conn = Connection::open(path)?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
        Ok(Self(Mutex::new(conn)))
    }

    pub async fn migrate(&self) -> Result<()> {
        let conn = self.0.lock().await;
        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                applied_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
        ",
        )?;

        let v1: i64 = conn.query_row(
            "SELECT COUNT(*) FROM schema_migrations WHERE version = 1",
            [],
            |r| r.get(0),
        )?;
        if v1 == 0 {
            conn.execute_batch(
                "
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
            ",
            )?;
        }

        macro_rules! alter_if_missing {
            ($ver:expr, $sql:expr) => {{
                let n: i64 = conn.query_row(
                    "SELECT COUNT(*) FROM schema_migrations WHERE version = ?1",
                    params![$ver],
                    |r| r.get(0),
                )?;
                if n == 0 {
                    let _ = conn.execute_batch($sql);
                    conn.execute_batch(&format!(
                        "INSERT INTO schema_migrations (version) VALUES ({});",
                        $ver
                    ))?;
                }
            }};
        }

        alter_if_missing!(
            2,
            "ALTER TABLE mods ADD COLUMN author TEXT NOT NULL DEFAULT '';\
                              ALTER TABLE mods ADD COLUMN description TEXT NOT NULL DEFAULT '';\
                              ALTER TABLE mods ADD COLUMN devstate INTEGER NOT NULL DEFAULT 0;"
        );
        alter_if_missing!(
            3,
            "ALTER TABLE mods ADD COLUMN game_version TEXT NOT NULL DEFAULT '';"
        );
        alter_if_missing!(
            4,
            "ALTER TABLE mods ADD COLUMN scrape_rank INTEGER NOT NULL DEFAULT 0;"
        );
        alter_if_missing!(5, "ALTER TABLE mods ADD COLUMN updated_at TEXT;");
        alter_if_missing!(
            6,
            "ALTER TABLE mods ADD COLUMN downloads INTEGER NOT NULL DEFAULT 0;\
             ALTER TABLE mods ADD COLUMN favorites INTEGER NOT NULL DEFAULT 0;\
             ALTER TABLE mods ADD COLUMN approval_pct INTEGER NOT NULL DEFAULT -1;"
        );

        let v7: i64 = conn.query_row(
            "SELECT COUNT(*) FROM schema_migrations WHERE version = 7",
            [],
            |r| r.get(0),
        )?;
        if v7 == 0 {
            conn.execute_batch(
                "
                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );
                INSERT INTO schema_migrations (version) VALUES (7);
            ",
            )?;
        }

        let v8: i64 = conn.query_row(
            "SELECT COUNT(*) FROM schema_migrations WHERE version = 8",
            [],
            |r| r.get(0),
        )?;
        if v8 == 0 {
            conn.execute_batch(
                "
                CREATE TABLE IF NOT EXISTS profiles (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    is_default INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
                );
                CREATE TABLE IF NOT EXISTS profile_mods (
                    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
                    mod_id TEXT NOT NULL REFERENCES mods(id),
                    version_installed TEXT NOT NULL,
                    pool_path TEXT,
                    folder_name TEXT,
                    PRIMARY KEY (profile_id, mod_id)
                );
                INSERT OR IGNORE INTO profiles (id, name, is_default)
                VALUES ('default', 'Default', 1);
                INSERT OR IGNORE INTO settings (key, value) VALUES ('active_profile', 'default');
                INSERT INTO schema_migrations (version) VALUES (8);
            ",
            )?;

            let existing: i64 = conn.query_row(
                "SELECT COUNT(*) FROM profile_mods WHERE profile_id = 'default'",
                [],
                |r| r.get(0),
            )?;
            if existing == 0 {
                conn.execute_batch(
                    "
                    INSERT INTO profile_mods (profile_id, mod_id, version_installed)
                    SELECT 'default', id, version_installed
                    FROM mods
                    WHERE is_installed = 1 AND version_installed IS NOT NULL;
                ",
                )?;
            }
        }

        let v9: i64 = conn.query_row(
            "SELECT COUNT(*) FROM schema_migrations WHERE version = 9",
            [],
            |r| r.get(0),
        )?;
        if v9 == 0 {
            conn.execute_batch(
                "
                CREATE TABLE IF NOT EXISTS blueprints (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    author TEXT NOT NULL DEFAULT '',
                    description TEXT NOT NULL DEFAULT '',
                    thumbnail TEXT,
                    downloads INTEGER NOT NULL DEFAULT 0,
                    favorites INTEGER NOT NULL DEFAULT 0,
                    approval_pct INTEGER NOT NULL DEFAULT -1,
                    updated_at TEXT,
                    url TEXT NOT NULL DEFAULT '',
                    is_downloaded INTEGER NOT NULL DEFAULT 0,
                    last_scraped_at TEXT
                );
                INSERT INTO schema_migrations (version) VALUES (9);
            ",
            )?;
        }

        let v10: i64 = conn.query_row(
            "SELECT COUNT(*) FROM schema_migrations WHERE version = 10",
            [],
            |r| r.get(0),
        )?;
        if v10 == 0 {
            conn.execute_batch(
                "
                CREATE TABLE IF NOT EXISTS maps (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    author TEXT NOT NULL DEFAULT '',
                    description TEXT NOT NULL DEFAULT '',
                    thumbnail TEXT,
                    downloads INTEGER NOT NULL DEFAULT 0,
                    favorites INTEGER NOT NULL DEFAULT 0,
                    approval_pct INTEGER NOT NULL DEFAULT -1,
                    updated_at TEXT,
                    url TEXT NOT NULL DEFAULT '',
                    is_downloaded INTEGER NOT NULL DEFAULT 0,
                    last_scraped_at TEXT
                );
                INSERT INTO schema_migrations (version) VALUES (10);
            ",
            )?;
        }

        let v11: i64 = conn.query_row(
            "SELECT COUNT(*) FROM schema_migrations WHERE version = 11",
            [],
            |r| r.get(0),
        )?;
        if v11 == 0 {
            conn.execute_batch(
                "ALTER TABLE maps ADD COLUMN comment_count INTEGER NOT NULL DEFAULT 0;
                 ALTER TABLE blueprints ADD COLUMN comment_count INTEGER NOT NULL DEFAULT 0;
                 INSERT INTO schema_migrations (version) VALUES (11);",
            )?;
        }

        Ok(())
    }

    pub async fn get_all_maps(&self) -> Result<Vec<MapItem>> {
        let conn = self.0.lock().await;
        let mut stmt = conn.prepare(
            "SELECT id, name, author, description, thumbnail,
                    downloads, favorites, comment_count, approval_pct, updated_at,
                    url, is_downloaded, last_scraped_at
             FROM maps
             ORDER BY updated_at DESC NULLS LAST",
        )?;

        let maps = stmt
            .query_map([], |row| {
                Ok(MapItem {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    author: row.get(2)?,
                    description: row.get(3)?,
                    thumbnail: row.get(4)?,
                    downloads: row.get(5)?,
                    favorites: row.get(6)?,
                    comment_count: row.get(7)?,
                    approval_pct: row.get(8)?,
                    updated_at: row.get(9)?,
                    url: row.get(10)?,
                    is_downloaded: row.get::<_, i32>(11)? != 0,
                    last_scraped_at: row.get(12)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(maps)
    }

    pub async fn upsert_map(&self, m: &MapItem) -> Result<()> {
        let conn = self.0.lock().await;
        conn.execute(
            "INSERT INTO maps (id, name, author, description, thumbnail,
                               downloads, favorites, comment_count, approval_pct, updated_at,
                               url, last_scraped_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)
             ON CONFLICT(id) DO UPDATE SET
                name            = excluded.name,
                author          = excluded.author,
                description     = excluded.description,
                thumbnail       = excluded.thumbnail,
                downloads       = excluded.downloads,
                favorites       = excluded.favorites,
                comment_count   = excluded.comment_count,
                approval_pct    = excluded.approval_pct,
                updated_at      = excluded.updated_at,
                url             = excluded.url,
                last_scraped_at = excluded.last_scraped_at",
            params![
                m.id,
                m.name,
                m.author,
                m.description,
                m.thumbnail,
                m.downloads,
                m.favorites,
                m.comment_count,
                m.approval_pct,
                m.updated_at,
                m.url,
                m.last_scraped_at
            ],
        )?;
        Ok(())
    }

    pub async fn get_map_url(&self, map_id: &str) -> Result<Option<String>> {
        let conn = self.0.lock().await;
        match conn.query_row("SELECT url FROM maps WHERE id = ?1", params![map_id], |r| {
            r.get(0)
        }) {
            Ok(url) => Ok(Some(url)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub async fn mark_map_downloaded(&self, id: &str) -> Result<()> {
        let conn = self.0.lock().await;
        conn.execute(
            "UPDATE maps SET is_downloaded = 1 WHERE id = ?1",
            params![id],
        )?;
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
             ORDER BY updated_at DESC NULLS LAST, scrape_rank ASC",
        )?;

        let mods = stmt
            .query_map([], |row| {
                Ok(Mod {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    author: row.get(2)?,
                    description: row.get(3)?,
                    category: row.get(4)?,
                    devstate: row.get(5)?,
                    game_version: row.get(6)?,
                    scrape_rank: row.get(7)?,
                    version_available: row.get(8)?,
                    version_installed: row.get(9)?,
                    updated_at: row.get(10)?,
                    downloads: row.get(11)?,
                    favorites: row.get(12)?,
                    approval_pct: row.get(13)?,
                    url: row.get(14)?,
                    thumbnail: row.get(15)?,
                    is_installed: row.get::<_, i32>(16)? != 0,
                    last_scraped_at: row.get(17)?,
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
                m.id,
                m.name,
                m.author,
                m.description,
                m.category,
                m.devstate,
                m.game_version,
                m.scrape_rank,
                m.version_available,
                m.updated_at,
                m.downloads,
                m.favorites,
                m.approval_pct,
                m.url,
                m.thumbnail,
                m.last_scraped_at
            ],
        )?;
        Ok(())
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

    pub async fn upsert_mod_minimal(
        &self,
        mod_id: &str,
        name: &str,
        version: &str,
        url: &str,
    ) -> Result<()> {
        let conn = self.0.lock().await;
        conn.execute(
            "INSERT INTO mods (id, name, version_available, url, author)
             VALUES (?1, ?2, ?3, ?4, '')
             ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                version_available = CASE
                    WHEN excluded.version_available != '' THEN excluded.version_available
                    ELSE mods.version_available
                END,
                url = excluded.url",
            params![mod_id, name, version, url],
        )?;
        Ok(())
    }

    pub async fn get_mod_page_url(&self, mod_id: &str) -> Result<Option<String>> {
        let conn = self.0.lock().await;
        match conn.query_row("SELECT url FROM mods WHERE id = ?1", params![mod_id], |r| {
            r.get(0)
        }) {
            Ok(url) => Ok(Some(url)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub async fn get_outdated_ids(&self) -> Result<Vec<String>> {
        let conn = self.0.lock().await;
        let mut stmt = conn.prepare(
            "SELECT id FROM mods
             WHERE is_installed = 1
               AND version_installed IS NOT NULL
               AND version_installed != version_available
               AND version_available != ''",
        )?;
        let ids = stmt
            .query_map([], |r| r.get(0))?
            .collect::<Result<Vec<String>>>()?;
        Ok(ids)
    }

    pub async fn needs_scrape(&self, min_age_hours: i64) -> Result<bool> {
        let conn = self.0.lock().await;
        let fresh: i64 = conn.query_row(
            "SELECT COUNT(*) FROM mods
             WHERE last_scraped_at > datetime('now', ?1)
               AND updated_at IS NOT NULL",
            params![format!("-{} hours", min_age_hours)],
            |r| r.get(0),
        )?;
        Ok(fresh == 0)
    }

    // ─── Profile methods ───

    pub async fn get_profiles(&self) -> Result<Vec<Profile>> {
        let conn = self.0.lock().await;
        let mut stmt = conn.prepare(
            "SELECT p.id, p.name, p.is_default, p.created_at, p.updated_at,
                    COALESCE(pm.cnt, 0) as mod_count
             FROM profiles p
             LEFT JOIN (SELECT profile_id, COUNT(*) as cnt FROM profile_mods GROUP BY profile_id) pm
               ON pm.profile_id = p.id
             ORDER BY p.is_default DESC, p.name ASC",
        )?;
        let rows = stmt
            .query_map([], |row| {
                Ok(Profile {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    is_default: row.get::<_, i32>(2)? != 0,
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
                    mod_count: row.get(5)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(rows)
    }

    pub async fn create_profile(&self, id: &str, name: &str) -> Result<()> {
        let conn = self.0.lock().await;
        conn.execute(
            "INSERT INTO profiles (id, name) VALUES (?1, ?2)",
            params![id, name],
        )?;
        Ok(())
    }

    pub async fn rename_profile(&self, id: &str, name: &str) -> Result<()> {
        let conn = self.0.lock().await;
        conn.execute(
            "UPDATE profiles SET name = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![name, id],
        )?;
        Ok(())
    }

    pub async fn delete_profile(&self, id: &str) -> Result<()> {
        let conn = self.0.lock().await;
        conn.execute("DELETE FROM profiles WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub async fn set_default_profile(&self, id: &str) -> Result<()> {
        let conn = self.0.lock().await;
        conn.execute("UPDATE profiles SET is_default = 0", [])?;
        conn.execute(
            "UPDATE profiles SET is_default = 1, updated_at = datetime('now') WHERE id = ?1",
            params![id],
        )?;
        Ok(())
    }

    pub async fn get_active_profile_id(&self) -> Result<Option<String>> {
        self.get_setting("active_profile").await
    }

    pub async fn set_active_profile_id(&self, id: &str) -> Result<()> {
        self.set_setting("active_profile", id).await
    }

    pub async fn get_profile_mods(&self, profile_id: &str) -> Result<Vec<ProfileMod>> {
        let conn = self.0.lock().await;
        let mut stmt = conn.prepare(
            "SELECT mod_id, version_installed, pool_path, folder_name
             FROM profile_mods
             WHERE profile_id = ?1
             ORDER BY mod_id",
        )?;
        let rows = stmt
            .query_map(params![profile_id], |row| {
                Ok(ProfileMod {
                    mod_id: row.get(0)?,
                    version_installed: row.get(1)?,
                    pool_path: row.get(2)?,
                    folder_name: row.get(3)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(rows)
    }

    pub async fn add_profile_mod(
        &self,
        profile_id: &str,
        mod_id: &str,
        version: &str,
        pool_path: Option<&str>,
        folder_name: Option<&str>,
    ) -> Result<()> {
        let conn = self.0.lock().await;
        conn.execute(
            "INSERT OR REPLACE INTO profile_mods (profile_id, mod_id, version_installed, pool_path, folder_name)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![profile_id, mod_id, version, pool_path, folder_name],
        )?;
        conn.execute(
            "UPDATE profiles SET updated_at = datetime('now') WHERE id = ?1",
            params![profile_id],
        )?;
        Ok(())
    }

    pub async fn remove_profile_mod(&self, profile_id: &str, mod_id: &str) -> Result<()> {
        let conn = self.0.lock().await;
        conn.execute(
            "DELETE FROM profile_mods WHERE profile_id = ?1 AND mod_id = ?2",
            params![profile_id, mod_id],
        )?;
        conn.execute(
            "UPDATE profiles SET updated_at = datetime('now') WHERE id = ?1",
            params![profile_id],
        )?;
        Ok(())
    }

    pub async fn update_is_installed_from_profile(&self, profile_id: &str) -> Result<()> {
        let conn = self.0.lock().await;
        conn.execute(
            "UPDATE mods SET is_installed = 0, version_installed = NULL",
            [],
        )?;
        conn.execute_batch(&format!(
            "UPDATE mods SET is_installed = 1, version_installed = (
                SELECT version_installed FROM profile_mods
                WHERE profile_mods.mod_id = mods.id AND profile_mods.profile_id = '{}'
             )
             WHERE id IN (
                SELECT mod_id FROM profile_mods WHERE profile_id = '{}'
             )",
            profile_id.replace('\'', "''"),
            profile_id.replace('\'', "''"),
            ))?;
        Ok(())
    }

    // ─── Blueprint methods ───

    pub async fn get_all_blueprints(&self) -> Result<Vec<Blueprint>> {
        let conn = self.0.lock().await;
        let mut stmt = conn.prepare(
            "SELECT id, name, author, description, thumbnail,
                    downloads, favorites, comment_count, approval_pct, updated_at,
                    url, is_downloaded, last_scraped_at
             FROM blueprints
             ORDER BY updated_at DESC NULLS LAST",
        )?;

        let blueprints = stmt
            .query_map([], |row| {
                Ok(Blueprint {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    author: row.get(2)?,
                    description: row.get(3)?,
                    thumbnail: row.get(4)?,
                    downloads: row.get(5)?,
                    favorites: row.get(6)?,
                    comment_count: row.get(7)?,
                    approval_pct: row.get(8)?,
                    updated_at: row.get(9)?,
                    url: row.get(10)?,
                    is_downloaded: row.get::<_, i32>(11)? != 0,
                    last_scraped_at: row.get(12)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(blueprints)
    }

    pub async fn mark_blueprint_downloaded(&self, id: &str) -> Result<()> {
        let conn = self.0.lock().await;
        conn.execute(
            "UPDATE blueprints SET is_downloaded = 1 WHERE id = ?1",
            params![id],
        )?;
        Ok(())
    }

    pub async fn upsert_blueprint(&self, bp: &Blueprint) -> Result<()> {
        let conn = self.0.lock().await;
        conn.execute(
            "INSERT INTO blueprints (id, name, author, description, thumbnail,
                                      downloads, favorites, comment_count, approval_pct, updated_at,
                                      url, last_scraped_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)
             ON CONFLICT(id) DO UPDATE SET
                name            = excluded.name,
                author          = excluded.author,
                description     = excluded.description,
                thumbnail       = excluded.thumbnail,
                downloads       = excluded.downloads,
                favorites       = excluded.favorites,
                comment_count   = excluded.comment_count,
                approval_pct    = excluded.approval_pct,
                updated_at      = excluded.updated_at,
                url             = excluded.url,
                last_scraped_at = excluded.last_scraped_at",
            params![
                bp.id,
                bp.name,
                bp.author,
                bp.description,
                bp.thumbnail,
                bp.downloads,
                bp.favorites,
                bp.comment_count,
                bp.approval_pct,
                bp.updated_at,
                bp.url,
                bp.last_scraped_at
            ],
        )?;
        Ok(())
    }
}

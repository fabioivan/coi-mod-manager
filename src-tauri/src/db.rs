use tauri_plugin_sql::{Migration, MigrationKind};

pub fn migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "create_mods_table",
        sql: "
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
        ",
        kind: MigrationKind::Up,
    }]
}

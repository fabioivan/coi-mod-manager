mod commands;
mod db;
mod models;

use commands::{get_mods, install_mod, sync_mods, update_all_mods, update_mod};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:coi_mods.db", db::migrations())
                .build(),
        )
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            get_mods,
            sync_mods,
            update_mod,
            update_all_mods,
            install_mod,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

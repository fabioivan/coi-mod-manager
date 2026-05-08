mod commands;
mod db;
mod models;

use commands::{get_mods, install_mod, sync_mods, update_all_mods, update_mod};
use db::Database;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            let db_path = data_dir.join("coi_mods.db");

            let db = Database::open(&db_path)
                .expect("falha ao abrir banco de dados");

            tauri::async_runtime::block_on(db.migrate())
                .expect("falha ao executar migrations");

            app.manage(db);
            Ok(())
        })
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

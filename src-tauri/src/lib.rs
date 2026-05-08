mod commands;
mod db;
mod models;
mod scraper;

use commands::{get_mods, install_mod, run_scrape, sync_mods, update_all_mods, update_mod};
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

            let needs = tauri::async_runtime::block_on(db.needs_scrape(1))
                .unwrap_or(true);

            app.manage(db);

            if needs {
                let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    run_scrape(&handle, "updated", "all-time").await;
                });
            }

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

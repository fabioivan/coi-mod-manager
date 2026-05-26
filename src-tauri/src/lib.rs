mod blueprint_scraper;
mod commands;
mod db;
mod models;
mod scraper;

use commands::{
    check_app_update_on_startup, check_for_update, create_profile, delete_profile,
    detect_game_version, detect_game_version_from_path, detect_mods_folder, download_blueprint,
    export_profile, get_active_profile, get_app_version, get_blueprint_details, get_blueprints,
    get_changelog, get_mod_details, get_mods, get_mods_folder_size, get_profiles, get_setting,
    import_profile, install_mod, install_update, pick_folder, rename_profile,
    run_blueprint_scrape, run_scan_installed, run_scrape, scan_installed_mods, set_default_profile,
    set_setting, switch_profile, sync_blueprints, sync_mods, uninstall_mod, update_all_mods,
    update_mod,
};
use db::Database;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            let db_path = data_dir.join("coi_mods.db");

            let db = Database::open(&db_path).expect("falha ao abrir banco de dados");

            tauri::async_runtime::block_on(db.migrate()).expect("falha ao executar migrations");

            let needs = tauri::async_runtime::block_on(db.needs_scrape(1)).unwrap_or(true);

            app.manage(db);

            if needs {
                let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    run_scrape(&handle, "updated", "all-time").await;
                });
            }

            // Sync blueprints in background
            {
                let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    run_blueprint_scrape(&handle).await;
                });
            }

            // Scan mods instalados em background se pasta configurada
            {
                let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    run_scan_installed(&handle).await;
                });
            }

            // Verifica atualizações do app em background
            {
                let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    check_app_update_on_startup(&handle).await;
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_blueprints,
            get_blueprint_details,
            download_blueprint,
            sync_blueprints,
            get_mods,
            sync_mods,
            update_mod,
            update_all_mods,
            install_mod,
            uninstall_mod,
            get_setting,
            set_setting,
            detect_mods_folder,
            detect_game_version,
            detect_game_version_from_path,
            pick_folder,
            scan_installed_mods,
            check_for_update,
            install_update,
            get_mod_details,
            get_profiles,
            create_profile,
            rename_profile,
            delete_profile,
            set_default_profile,
            get_active_profile,
            switch_profile,
            export_profile,
            import_profile,
            get_mods_folder_size,
            get_app_version,
            get_changelog,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

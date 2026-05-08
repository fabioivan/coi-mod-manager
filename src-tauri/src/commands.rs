use tauri::{Emitter, Manager, State};
use crate::db::Database;
use crate::models::Mod;

#[tauri::command]
pub async fn get_mods(db: State<'_, Database>) -> Result<Vec<Mod>, String> {
    db.get_all_mods().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn sync_mods(
    app: tauri::AppHandle,
    order_by: Option<String>,
    time_range: Option<String>,
) -> Result<(), String> {
    let order_by = order_by.unwrap_or_else(|| "popularity".into());
    let time_range = time_range.unwrap_or_else(|| "all-time".into());
    tauri::async_runtime::spawn(async move {
        run_scrape(&app, &order_by, &time_range).await;
    });
    Ok(())
}

pub async fn run_scrape(app: &tauri::AppHandle, order_by: &str, time_range: &str) {
    let client = reqwest::Client::new();
    match crate::scraper::scrape_all(&client, order_by, time_range).await {
        Ok(mods) => {
            let db = app.state::<Database>();
            for m in &mods {
                if let Err(e) = db.upsert_mod(m).await {
                    eprintln!("upsert erro: {e}");
                }
            }
            let _ = app.emit("mods-updated", mods.len());
        }
        Err(e) => {
            eprintln!("scraping erro: {e}");
            let _ = app.emit("mods-sync-error", e.to_string());
        }
    }
}

#[tauri::command]
pub async fn update_mod(_db: State<'_, Database>, mod_id: String) -> Result<(), String> {
    println!("Atualizando mod: {}", mod_id);
    Ok(())
}

#[tauri::command]
pub async fn update_all_mods(_db: State<'_, Database>) -> Result<(), String> {
    println!("Atualizando todos os mods desatualizados");
    Ok(())
}

#[tauri::command]
pub async fn install_mod(_db: State<'_, Database>, mod_id: String) -> Result<(), String> {
    println!("Instalando mod: {}", mod_id);
    Ok(())
}

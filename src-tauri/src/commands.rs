use tauri::State;
use crate::db::Database;
use crate::models::Mod;

#[tauri::command]
pub async fn get_mods(db: State<'_, Database>) -> Result<Vec<Mod>, String> {
    db.get_all_mods().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn sync_mods(_db: State<'_, Database>) -> Result<(), String> {
    // TODO Parte 3: scraping + upsert
    Ok(())
}

#[tauri::command]
pub async fn update_mod(_db: State<'_, Database>, mod_id: String) -> Result<(), String> {
    // TODO Parte 5: download + replace + set_installed
    println!("Atualizando mod: {}", mod_id);
    Ok(())
}

#[tauri::command]
pub async fn update_all_mods(_db: State<'_, Database>) -> Result<(), String> {
    // TODO Parte 5: batch update
    println!("Atualizando todos os mods desatualizados");
    Ok(())
}

#[tauri::command]
pub async fn install_mod(_db: State<'_, Database>, mod_id: String) -> Result<(), String> {
    // TODO Parte 4: download + copy + set_installed
    println!("Instalando mod: {}", mod_id);
    Ok(())
}

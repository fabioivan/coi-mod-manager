use tauri::AppHandle;
use crate::models::Mod;

#[tauri::command]
pub async fn get_mods(_app: AppHandle) -> Result<Vec<Mod>, String> {
    // TODO Parte 2: query SQLite
    // Por ora retorna dados de exemplo para validar UI
    Ok(vec![
        Mod {
            id: "mod-example-1".to_string(),
            name: "Auto Miner Pro".to_string(),
            category: "Industry".to_string(),
            version_available: "1.2.0".to_string(),
            version_installed: Some("1.1.0".to_string()),
            url: "https://hub.coigame.com/mods/auto-miner-pro".to_string(),
            thumbnail: None,
            is_installed: true,
            last_scraped_at: None,
        },
        Mod {
            id: "mod-example-2".to_string(),
            name: "Better UI".to_string(),
            category: "UI".to_string(),
            version_available: "2.0.0".to_string(),
            version_installed: Some("2.0.0".to_string()),
            url: "https://hub.coigame.com/mods/better-ui".to_string(),
            thumbnail: None,
            is_installed: true,
            last_scraped_at: None,
        },
        Mod {
            id: "mod-example-3".to_string(),
            name: "Resource Pack Expanded".to_string(),
            category: "Resources".to_string(),
            version_available: "0.9.5".to_string(),
            version_installed: None,
            url: "https://hub.coigame.com/mods/resource-pack".to_string(),
            thumbnail: None,
            is_installed: false,
            last_scraped_at: None,
        },
    ])
}

#[tauri::command]
pub async fn sync_mods(_app: AppHandle) -> Result<(), String> {
    // TODO Parte 3: scraping + upsert SQLite
    Ok(())
}

#[tauri::command]
pub async fn update_mod(_app: AppHandle, mod_id: String) -> Result<(), String> {
    // TODO Parte 5: download + replace arquivo + UPDATE DB
    println!("Atualizando mod: {}", mod_id);
    Ok(())
}

#[tauri::command]
pub async fn update_all_mods(_app: AppHandle) -> Result<(), String> {
    // TODO Parte 5: batch update
    println!("Atualizando todos os mods desatualizados");
    Ok(())
}

#[tauri::command]
pub async fn install_mod(_app: AppHandle, mod_id: String) -> Result<(), String> {
    // TODO Parte 4: download + copy para pasta de mods + UPDATE DB
    println!("Instalando mod: {}", mod_id);
    Ok(())
}

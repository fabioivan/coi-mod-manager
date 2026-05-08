use tauri::{Emitter, Manager, State};
use crate::db::Database;
use crate::models::Mod;

#[derive(serde::Serialize, Clone)]
pub struct UpdateInfo {
    pub version: String,
    pub notes: Option<String>,
    pub date: Option<String>,
}

#[tauri::command]
pub async fn check_for_update(app: tauri::AppHandle) -> Result<Option<UpdateInfo>, String> {
    use tauri_plugin_updater::UpdaterExt;
    let update = app.updater()
        .map_err(|e| e.to_string())?
        .check().await
        .map_err(|e| e.to_string())?;
    Ok(update.map(|u| UpdateInfo {
        version: u.version.clone(),
        notes: u.body.clone(),
        date: u.date.map(|d| d.to_string()),
    }))
}

#[tauri::command]
pub async fn install_update(app: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_updater::UpdaterExt;
    let update = app.updater()
        .map_err(|e| e.to_string())?
        .check().await
        .map_err(|e| e.to_string())?;
    if let Some(u) = update {
        let app2 = app.clone();
        u.download_and_install(
            move |downloaded, total| {
                let _ = app2.emit("update-progress", (downloaded, total));
            },
            move || { let _ = app.emit("update-restart", ()); },
        ).await.map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub async fn check_app_update_on_startup(app: &tauri::AppHandle) {
    use tauri_plugin_updater::UpdaterExt;
    let Ok(updater) = app.updater() else { return };
    let Ok(Some(update)) = updater.check().await else { return };
    let _ = app.emit("update-available", UpdateInfo {
        version: update.version.clone(),
        notes: update.body.clone(),
        date: update.date.map(|d| d.to_string()),
    });
}

#[tauri::command]
pub async fn get_setting(db: State<'_, Database>, key: String) -> Result<Option<String>, String> {
    db.get_setting(&key).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_setting(db: State<'_, Database>, key: String, value: String) -> Result<(), String> {
    db.set_setting(&key, &value).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn detect_mods_folder() -> Result<Option<String>, String> {
    Ok(find_mods_folder())
}

#[tauri::command]
pub async fn pick_folder(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::{DialogExt, FilePath};
    let (tx, rx) = tokio::sync::oneshot::channel::<Option<FilePath>>();
    app.dialog().file().pick_folder(move |path| {
        let _ = tx.send(path);
    });
    let result = rx.await.map_err(|e| e.to_string())?;
    Ok(result.map(|p| p.to_string()))
}

fn find_mods_folder() -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        let appdata = std::env::var("APPDATA").ok()?;
        let path = std::path::PathBuf::from(appdata)
            .join("Captain of Industry")
            .join("Mods");
        if path.exists() { Some(path.to_string_lossy().into_owned()) } else { None }
    }

    #[cfg(target_os = "linux")]
    {
        let home = std::env::var("HOME").ok()?;
        let suffix = "steamapps/compatdata/1594320/pfx/drive_c/users/steamuser/AppData/Roaming/Captain of Industry/Mods";
        let candidates = [
            format!("{}/.local/share/Steam/{}", home, suffix),
            format!("{}/.steam/steam/{}", home, suffix),
            format!("{}/snap/steam/common/.local/share/Steam/{}", home, suffix),
            format!("{}/.var/app/com.valvesoftware.Steam/.local/share/Steam/{}", home, suffix),
        ];
        candidates.into_iter().find(|p| std::path::Path::new(p).exists())
    }

    #[cfg(not(any(target_os = "windows", target_os = "linux")))]
    {
        None
    }
}

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
pub async fn update_all_mods(
    app: tauri::AppHandle,
    db: State<'_, Database>,
) -> Result<usize, String> {
    let folder = db.get_setting("mods_folder").await
        .map_err(|e| e.to_string())?
        .ok_or("Pasta de mods não configurada. Acesse Configurações.")?;

    let ids = db.get_outdated_ids().await.map_err(|e| e.to_string())?;
    let count = ids.len();

    for id in &ids {
        download_and_extract(id, &folder).await?;
    }

    if count > 0 {
        run_scan_installed(&app).await;

        use tauri_plugin_notification::NotificationExt;
        let body = format!(
            "{} mod{} atualizad{} com sucesso!",
            count,
            if count == 1 { "" } else { "s" },
            if count == 1 { "o" } else { "os" }
        );
        let _ = app.notification().builder()
            .title("CoI Mod Manager")
            .body(&body)
            .show();
    }

    Ok(count)
}

const HUB_BASE: &str = "https://hub.coigame.com";

async fn download_and_extract(mod_id: &str, mods_folder: &str) -> Result<(), String> {
    let url = format!("{}/Mod/DownloadMod/{}", HUB_BASE, mod_id);
    let client = reqwest::Client::builder()
        .user_agent("CoI-Mod-Manager/1.0")
        .build().map_err(|e| e.to_string())?;

    let bytes = client
        .get(&url)
        .send().await.map_err(|e| e.to_string())?
        .bytes().await.map_err(|e| e.to_string())?
        .to_vec();

    let cursor = std::io::Cursor::new(bytes);
    let mut archive = zip::ZipArchive::new(cursor).map_err(|e| e.to_string())?;
    let dest = std::path::Path::new(mods_folder);
    archive.extract(dest).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn install_mod(
    app: tauri::AppHandle,
    db: State<'_, Database>,
    mod_id: String,
) -> Result<(), String> {
    let folder = db.get_setting("mods_folder").await
        .map_err(|e| e.to_string())?
        .ok_or("Pasta de mods não configurada. Acesse Configurações.")?;

    download_and_extract(&mod_id, &folder).await?;
    run_scan_installed(&app).await;
    Ok(())
}

#[tauri::command]
pub async fn update_mod(
    app: tauri::AppHandle,
    db: State<'_, Database>,
    mod_id: String,
) -> Result<(), String> {
    let folder = db.get_setting("mods_folder").await
        .map_err(|e| e.to_string())?
        .ok_or("Pasta de mods não configurada. Acesse Configurações.")?;

    download_and_extract(&mod_id, &folder).await?;
    run_scan_installed(&app).await;
    Ok(())
}

#[tauri::command]
pub async fn scan_installed_mods(
    app: tauri::AppHandle,
    db: State<'_, Database>,
) -> Result<usize, String> {
    let folder = db.get_setting("mods_folder").await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Pasta de mods não configurada".to_string())?;

    let folder_path = std::path::Path::new(&folder);
    if !folder_path.exists() {
        return Err(format!("Pasta não encontrada: {}", folder));
    }

    let all_mods = db.get_all_mods().await.map_err(|e| e.to_string())?;

    let entries = std::fs::read_dir(folder_path).map_err(|e| e.to_string())?;
    let mut found_ids: std::collections::HashSet<String> = std::collections::HashSet::new();

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() { continue; }

        let folder_name = path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_lowercase();

        let manifest_path = path.join("manifest.json");
        if !manifest_path.exists() { continue; }

        let Ok(manifest_str) = std::fs::read_to_string(&manifest_path) else { continue; };
        let Ok(manifest) = serde_json::from_str::<serde_json::Value>(&manifest_str) else { continue; };

        let manifest_id = manifest["id"].as_str().unwrap_or("").to_lowercase();
        let version = manifest["version"].as_str().unwrap_or("").to_string();

        // Tenta casar com mod do DB pelo slug da URL ou pelo nome normalizado
        let matched = all_mods.iter().find(|m| {
            let slug = m.url.split('/').last().unwrap_or("").to_lowercase();
            slug == manifest_id
                || slug == folder_name
                || manifest_id == folder_name
                || m.name.to_lowercase().replace(' ', "-") == manifest_id
        });

        if let Some(m) = matched {
            db.set_installed(&m.id, &version).await.map_err(|e| e.to_string())?;
            found_ids.insert(m.id.clone());
        }
    }

    // Desmarca mods que não foram encontrados no disco
    for m in &all_mods {
        if m.is_installed && !found_ids.contains(&m.id) {
            db.set_uninstalled(&m.id).await.map_err(|e| e.to_string())?;
        }
    }

    let _ = app.emit("mods-updated", ());
    Ok(found_ids.len())
}

pub async fn run_scan_installed(app: &tauri::AppHandle) {
    let db = app.state::<Database>();
    match scan_installed_mods_inner(&db).await {
        Ok((found, total)) => {
            let _ = app.emit("mods-updated", ());
            println!("Scan: {}/{} mods instalados detectados", found, total);
        }
        Err(e) => eprintln!("Scan instalados erro: {e}"),
    }
}

async fn scan_installed_mods_inner(db: &Database) -> Result<(usize, usize), String> {
    let folder = db.get_setting("mods_folder").await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "mods_folder não configurado".to_string())?;

    let folder_path = std::path::Path::new(&folder);
    if !folder_path.exists() {
        return Err(format!("Pasta não encontrada: {}", folder));
    }

    let all_mods = db.get_all_mods().await.map_err(|e| e.to_string())?;
    let total = all_mods.len();
    let entries = std::fs::read_dir(folder_path).map_err(|e| e.to_string())?;
    let mut found_ids: std::collections::HashSet<String> = std::collections::HashSet::new();

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() { continue; }

        let folder_name = path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_lowercase();

        let manifest_path = path.join("manifest.json");
        if !manifest_path.exists() { continue; }
        let Ok(manifest_str) = std::fs::read_to_string(&manifest_path) else { continue; };
        let Ok(manifest) = serde_json::from_str::<serde_json::Value>(&manifest_str) else { continue; };

        let manifest_id = manifest["id"].as_str().unwrap_or("").to_lowercase();
        let version = manifest["version"].as_str().unwrap_or("").to_string();

        let matched = all_mods.iter().find(|m| {
            let slug = m.url.split('/').last().unwrap_or("").to_lowercase();
            slug == manifest_id
                || slug == folder_name
                || manifest_id == folder_name
                || m.name.to_lowercase().replace(' ', "-") == manifest_id
        });

        if let Some(m) = matched {
            let _ = db.set_installed(&m.id, &version).await;
            found_ids.insert(m.id.clone());
        }
    }

    for m in &all_mods {
        if m.is_installed && !found_ids.contains(&m.id) {
            let _ = db.set_uninstalled(&m.id).await;
        }
    }

    Ok((found_ids.len(), total))
}

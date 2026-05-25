use crate::db::Database;
use crate::models::{ExportData, ExportMod, Mod, Profile};
use base64::{engine::general_purpose, Engine as _};
use std::sync::OnceLock;
use tauri::{Emitter, Manager, State};

fn http_client() -> &'static reqwest::Client {
    static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
    CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .user_agent("CoI-Mod-Manager/1.0")
            .build()
            .expect("Failed to create HTTP client")
    })
}

fn generate_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    format!(
        "p{}",
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos()
    )
}

fn is_game_running() -> bool {
    let names = [
        "Captain of Industry",
        "Captain of Industry.exe",
        "Captain of Industry.x86_64",
    ];
    for name in &names {
        #[cfg(target_os = "windows")]
        {
            use std::process::Command;
            if let Ok(out) = Command::new("tasklist")
                .args(["/FI", &format!("IMAGENAME eq {}", name), "/NH"])
                .output()
            {
                let s = String::from_utf8_lossy(&out.stdout);
                if s.contains(name) && !s.contains("No tasks") {
                    return true;
                }
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            use std::process::Command;
            if let Ok(out) = Command::new("pgrep").args(["-x", name]).output() {
                if out.status.success() {
                    return true;
                }
            }
        }
    }
    false
}

fn check_game_not_running() -> Result<(), String> {
    if is_game_running() {
        Err("Game is running. Please close Captain of Industry before installing, updating, or uninstalling mods.".to_string())
    } else {
        Ok(())
    }
}

#[derive(serde::Serialize, Clone)]
pub struct UpdateInfo {
    pub version: String,
    pub notes: Option<String>,
    pub date: Option<String>,
}

#[tauri::command]
pub async fn check_for_update(app: tauri::AppHandle) -> Result<Option<UpdateInfo>, String> {
    use tauri_plugin_updater::UpdaterExt;
    let update = app
        .updater()
        .map_err(|e| e.to_string())?
        .check()
        .await
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
    let update = app
        .updater()
        .map_err(|e| e.to_string())?
        .check()
        .await
        .map_err(|e| e.to_string())?;
    if let Some(u) = update {
        let app2 = app.clone();
        u.download_and_install(
            move |downloaded, total| {
                let _ = app2.emit("update-progress", (downloaded, total));
            },
            move || {
                let _ = app.emit("update-restart", ());
            },
        )
        .await
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_app_version(app: tauri::AppHandle) -> Result<String, String> {
    Ok(app
        .config()
        .version
        .clone()
        .unwrap_or_else(|| "0.0.0".to_string()))
}

#[tauri::command]
pub fn get_changelog() -> Result<String, String> {
    let md = include_str!("../../CHANGELOG.md");
    let parser = pulldown_cmark::Parser::new(md);
    let mut html = String::new();
    pulldown_cmark::html::push_html(&mut html, parser);
    Ok(html)
}

// ─── Profile Commands ───

#[tauri::command]
pub async fn get_profiles(db: State<'_, Database>) -> Result<Vec<Profile>, String> {
    db.get_profiles().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_profile(db: State<'_, Database>, name: String) -> Result<Profile, String> {
    let id = generate_id();
    db.create_profile(&id, &name)
        .await
        .map_err(|e| e.to_string())?;
    let profiles = db.get_profiles().await.map_err(|e| e.to_string())?;
    profiles
        .into_iter()
        .find(|p| p.id == id)
        .ok_or_else(|| "Failed to create profile".to_string())
}

#[tauri::command]
pub async fn rename_profile(
    db: State<'_, Database>,
    profile_id: String,
    name: String,
) -> Result<(), String> {
    db.rename_profile(&profile_id, &name)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_profile(
    app: tauri::AppHandle,
    db: State<'_, Database>,
    profile_id: String,
) -> Result<(), String> {
    let active = db
        .get_active_profile_id()
        .await
        .map_err(|e| e.to_string())?;
    if active.as_deref() == Some(&profile_id) {
        return Err("Cannot delete the active profile".to_string());
    }
    db.delete_profile(&profile_id)
        .await
        .map_err(|e| e.to_string())?;
    let _ = app.emit("profile-deleted", &profile_id);
    Ok(())
}

#[tauri::command]
pub async fn set_default_profile(
    db: State<'_, Database>,
    profile_id: String,
) -> Result<(), String> {
    db.set_default_profile(&profile_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_active_profile(db: State<'_, Database>) -> Result<Option<Profile>, String> {
    let id = db
        .get_active_profile_id()
        .await
        .map_err(|e| e.to_string())?;
    match id {
        Some(id) => {
            let profiles = db.get_profiles().await.map_err(|e| e.to_string())?;
            Ok(profiles.into_iter().find(|p| p.id == id))
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn switch_profile(
    app: tauri::AppHandle,
    db: State<'_, Database>,
    profile_id: String,
) -> Result<(), String> {
    check_game_not_running()?;
    let folder = db
        .get_setting("mods_folder")
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Mods folder not configured. Go to Settings.")?;

    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

    let active_id = db
        .get_active_profile_id()
        .await
        .map_err(|e| e.to_string())?;

    // Remove symlinks from current active profile, saving per-profile configs
    if let Some(ref current_id) = active_id {
        let current_mods = db
            .get_profile_mods(current_id)
            .await
            .map_err(|e| e.to_string())?;
        for pm in &current_mods {
            if let Some(ref fname) = pm.folder_name {
                let link = std::path::Path::new(&folder).join(fname);

                // Save this profile's mod configs persistently so they
                // are restored when the user switches back to this profile.
                if link.is_dir() && !link.is_symlink() {
                    let profile_dir = data_dir
                        .join("profile_configs")
                        .join(current_id)
                        .join(fname);
                    let _ = std::fs::remove_dir_all(&profile_dir);
                    let _ = copy_dir_all(&link, &profile_dir);
                }

                let _ = remove_any(&link);
            }
        }
    }

    // Create symlinks (or copies) for target profile, restoring its configs
    let target_mods = db
        .get_profile_mods(&profile_id)
        .await
        .map_err(|e| e.to_string())?;
    for pm in &target_mods {
        if let Some(ref pool_path) = pm.pool_path {
            let pool_dir = std::path::Path::new(pool_path);
            if pool_dir.exists() {
                if let Some(ref fname) = pm.folder_name {
                    let link = std::path::Path::new(&folder).join(fname);
                    let _ = remove_any(&link);
                    create_symlink_or_copy(pool_dir, &link)?;

                    // Restore this profile's saved configs from a previous
                    // session. copy_extra_files only copies files that exist
                    // in the backup but NOT in the freshly copied mod dir,
                    // so mod distribution files are replaced while user
                    // configs (settings, saves, etc.) are preserved.
                    let profile_dir = data_dir
                        .join("profile_configs")
                        .join(&profile_id)
                        .join(fname);
                    if profile_dir.exists() {
                        let _ = copy_extra_files(&profile_dir, &link);
                    }
                }
            }
        }
    }

    // Update active profile in DB
    db.set_active_profile_id(&profile_id)
        .await
        .map_err(|e| e.to_string())?;
    db.update_is_installed_from_profile(&profile_id)
        .await
        .map_err(|e| e.to_string())?;

    let _ = app.emit("mods-updated", ());
    Ok(())
}

const EXPORT_PREFIX: &str = "coiexport_";

#[derive(serde::Serialize)]
pub(crate) struct ImportResult {
    profile: Profile,
    mods_installed: usize,
}

#[tauri::command]
pub async fn export_profile(db: State<'_, Database>, profile_id: String) -> Result<String, String> {
    let profiles = db.get_profiles().await.map_err(|e| e.to_string())?;
    let profile = profiles
        .into_iter()
        .find(|p| p.id == profile_id)
        .ok_or_else(|| "Profile not found".to_string())?;

    let profile_mods = db
        .get_profile_mods(&profile_id)
        .await
        .map_err(|e| e.to_string())?;
    let all_mods = db.get_all_mods().await.map_err(|e| e.to_string())?;

    let mut export_mods = Vec::with_capacity(profile_mods.len());
    for pm in &profile_mods {
        if let Some(m) = all_mods.iter().find(|m| m.id == pm.mod_id) {
            export_mods.push(ExportMod {
                id: pm.mod_id.clone(),
                name: m.name.clone(),
                version: pm.version_installed.clone(),
                url: m.url.clone(),
            });
        }
    }

    let data = ExportData {
        format_version: 1,
        name: profile.name,
        mods: export_mods,
    };

    let json = serde_json::to_string(&data).map_err(|e| e.to_string())?;
    let encoded = general_purpose::URL_SAFE_NO_PAD.encode(json.as_bytes());
    Ok(format!("{}{}", EXPORT_PREFIX, encoded))
}

#[tauri::command]
pub async fn import_profile(
    app: tauri::AppHandle,
    db: State<'_, Database>,
    data: String,
) -> Result<ImportResult, String> {
    let stripped = data.strip_prefix(EXPORT_PREFIX).unwrap_or(&data);
    let bytes = general_purpose::URL_SAFE_NO_PAD
        .decode(stripped)
        .map_err(|e| format!("Invalid export code: {}", e))?;
    let export: ExportData =
        serde_json::from_slice(&bytes).map_err(|e| format!("Invalid export data: {}", e))?;

    if export.format_version != 1 {
        return Err(format!(
            "Unsupported format version: {}",
            export.format_version
        ));
    }

    // Generate unique profile name
    let profile_name = {
        let existing = db.get_profiles().await.map_err(|e| e.to_string())?;
        let names: std::collections::HashSet<String> =
            existing.into_iter().map(|p| p.name).collect();
        let mut name = export.name.clone();
        let mut counter = 2;
        while names.contains(&name) {
            name = format!("{} ({})", export.name, counter);
            counter += 1;
        }
        name
    };

    let profile_id = generate_id();
    db.create_profile(&profile_id, &profile_name)
        .await
        .map_err(|e| e.to_string())?;

    let folder = db
        .get_setting("mods_folder")
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Mods folder not configured. Go to Settings.")?;

    let mut count = 0usize;

    for em in &export.mods {
        // Ensure mod exists in DB with at least minimal info
        db.upsert_mod_minimal(&em.id, &em.name, &em.version, &em.url)
            .await
            .map_err(|e| e.to_string())?;

        let (folder_name, pool_dir) =
            extract_to_pool(&app, &em.id, &em.name, &em.version, &em.url, None).await?;

        let link = std::path::Path::new(&folder).join(&folder_name);
        remove_symlink(&link)?;
        create_symlink_or_copy(&pool_dir, &link)?;

        db.add_profile_mod(
            &profile_id,
            &em.id,
            &em.version,
            Some(pool_dir.to_str().unwrap_or("")),
            Some(&folder_name),
        )
        .await
        .map_err(|e| e.to_string())?;

        count += 1;
    }

    db.update_is_installed_from_profile(&profile_id)
        .await
        .map_err(|e| e.to_string())?;
    let _ = app.emit("mods-updated", ());

    let profiles = db.get_profiles().await.map_err(|e| e.to_string())?;
    let profile = profiles
        .into_iter()
        .find(|p| p.id == profile_id)
        .ok_or_else(|| "Failed to retrieve created profile".to_string())?;

    Ok(ImportResult {
        profile,
        mods_installed: count,
    })
}

fn remove_any(path: &std::path::Path) -> std::io::Result<()> {
    if path.is_symlink() {
        // On Windows, directory symlinks must be removed with remove_dir, not remove_file.
        #[cfg(target_os = "windows")]
        {
            if path.is_dir() {
                std::fs::remove_dir(path)
            } else {
                std::fs::remove_file(path)
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            std::fs::remove_file(path)
        }
    } else if path.is_file() {
        std::fs::remove_file(path)
    } else if path.is_dir() {
        if !is_mod_directory(path) {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                format!("Not a valid mod directory: {}", path.display()),
            ));
        }
        std::fs::remove_dir_all(path)
    } else {
        Ok(())
    }
}

/// Recursively copy a directory tree from `src` to `dst`.
fn copy_dir_all(src: &std::path::Path, dst: &std::path::Path) -> std::io::Result<()> {
    std::fs::create_dir_all(dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_all(&entry.path(), &dst.join(entry.file_name()))?;
        } else {
            std::fs::copy(entry.path(), dst.join(entry.file_name()))?;
        }
    }
    Ok(())
}

/// Try to create a directory symlink from `link` → `target`.
/// If symlink creation fails (e.g. Windows without Developer Mode / admin rights),
/// fall back to copying the directory tree so regular users are not blocked.
fn create_symlink_or_copy(target: &std::path::Path, link: &std::path::Path) -> Result<(), String> {
    let symlink_result = {
        #[cfg(target_os = "windows")]
        {
            std::os::windows::fs::symlink_dir(target, link)
        }
        #[cfg(not(target_os = "windows"))]
        {
            std::os::unix::fs::symlink(target, link)
        }
    };
    match symlink_result {
        Ok(()) => Ok(()),
        Err(_) => {
            // Symlink failed (most likely Windows without admin/Developer Mode).
            // Fall back to a full directory copy so the mod still works.
            copy_dir_all(target, link).map_err(|e| format!("Failed to copy mod files: {}", e))
        }
    }
}

/// Check if a directory is a valid mod directory (contains manifest.json).
fn is_mod_directory(path: &std::path::Path) -> bool {
    if path.join("manifest.json").exists() {
        return true;
    }
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.flatten() {
            if entry.path().is_dir() && entry.path().join("manifest.json").exists() {
                return true;
            }
        }
    }
    false
}

fn remove_symlink(link: &std::path::Path) -> Result<(), String> {
    if link.is_symlink() {
        // On Windows, directory symlinks require remove_dir, not remove_file.
        #[cfg(target_os = "windows")]
        {
            if link.is_dir() {
                std::fs::remove_dir(link).map_err(|e| e.to_string())
            } else {
                std::fs::remove_file(link).map_err(|e| e.to_string())
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            std::fs::remove_file(link).map_err(|e| e.to_string())
        }
    } else if link.is_dir() {
        // Was installed via copy fallback — only delete if it's a valid mod directory.
        if !is_mod_directory(link) {
            return Err(format!(
                "Refusing to delete '{}': not a valid mod directory (manifest.json not found)",
                link.display()
            ));
        }
        std::fs::remove_dir_all(link).map_err(|e| e.to_string())
    } else if link.exists() {
        std::fs::remove_file(link).map_err(|e| e.to_string())
    } else {
        Ok(())
    }
}

pub async fn check_app_update_on_startup(app: &tauri::AppHandle) {
    let db = app.state::<Database>();
    let enabled = match db.get_setting("auto_update_enabled").await {
        Ok(Some(v)) => v == "true",
        _ => true,
    };
    if !enabled {
        return;
    }

    use tauri_plugin_updater::UpdaterExt;
    let Ok(updater) = app.updater() else { return };
    let Ok(Some(update)) = updater.check().await else {
        return;
    };

    let _ = app.emit(
        "update-available",
        UpdateInfo {
            version: update.version.clone(),
            notes: update.body.clone(),
            date: update.date.map(|d| d.to_string()),
        },
    );

    let app2 = app.clone();
    let result = update
        .download_and_install(
            move |downloaded, total| {
                let _ = app2.emit("update-progress", (downloaded, total));
            },
            move || {
                let _ = app.emit("update-restart", ());
            },
        )
        .await;

    if result.is_ok() {
        let _ = app.emit(
            "update-installed",
            UpdateInfo {
                version: update.version.clone(),
                notes: None,
                date: None,
            },
        );
    }
}

#[tauri::command]
pub async fn get_setting(db: State<'_, Database>, key: String) -> Result<Option<String>, String> {
    db.get_setting(&key).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_setting(
    db: State<'_, Database>,
    key: String,
    value: String,
) -> Result<(), String> {
    db.set_setting(&key, &value)
        .await
        .map_err(|e| e.to_string())
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

fn find_game_install_dir() -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        let candidates = [
            r"C:\Program Files (x86)\Steam\steamapps\common\Captain of Industry",
            r"C:\Program Files\Steam\steamapps\common\Captain of Industry",
        ];
        let found = candidates
            .into_iter()
            .find(|p| std::path::Path::new(p).exists());
        if let Some(p) = found {
            return Some(p.to_string());
        }
        if let Ok(steam_path) = std::env::var("STEAM_PATH") {
            let path =
                std::path::PathBuf::from(steam_path).join("steamapps/common/Captain of Industry");
            if path.exists() {
                return Some(path.to_string_lossy().into_owned());
            }
        }
        None
    }

    #[cfg(target_os = "linux")]
    {
        let home = std::env::var("HOME").ok()?;
        let suffix = "steamapps/common/Captain of Industry";

        let default_steam_dirs = [
            format!("{}/.local/share/Steam", home),
            format!("{}/.steam/steam", home),
            format!("{}/snap/steam/common/.local/share/Steam", home),
            format!(
                "{}/.var/app/com.valvesoftware.Steam/.local/share/Steam",
                home
            ),
        ];

        for steam_dir in &default_steam_dirs {
            let path = format!("{}/{}", steam_dir, suffix);
            if std::path::Path::new(&path).exists() {
                return Some(path);
            }
        }

        for steam_dir in &default_steam_dirs {
            let vdf_path = std::path::PathBuf::from(steam_dir).join("steamapps/libraryfolders.vdf");
            if !vdf_path.exists() {
                continue;
            }
            if let Ok(content) = std::fs::read_to_string(&vdf_path) {
                for line in content.lines() {
                    if let Some(val) = line.rsplit('"').nth(1) {
                        let val = val.trim();
                        if val.starts_with('/') || (val.len() > 1 && val.as_bytes()[1] == b':') {
                            let candidate = format!("{}/{}", val, suffix);
                            if std::path::Path::new(&candidate).exists() {
                                return Some(candidate);
                            }
                        }
                    }
                }
            }
        }

        None
    }

    #[cfg(not(any(target_os = "windows", target_os = "linux")))]
    {
        None
    }
}

fn read_version_from_changelog(install_dir: &std::path::Path) -> Option<String> {
    let changelog = install_dir.join("changelog.txt");
    if !changelog.exists() {
        return None;
    }
    let content = std::fs::read_to_string(changelog).ok()?;
    let first_line = content.lines().next()?.trim().to_string();
    if first_line.is_empty() {
        return None;
    }
    let version = first_line
        .split('|')
        .next()?
        .trim()
        .trim_start_matches('v')
        .trim_start_matches('V')
        .trim_start_matches("ersion ")
        .trim()
        .to_string();
    if version.is_empty() {
        None
    } else {
        Some(version)
    }
}

#[tauri::command]
pub async fn detect_game_version() -> Result<Option<String>, String> {
    let dir = match find_game_install_dir() {
        Some(d) => d,
        None => return Ok(None),
    };
    let path = std::path::Path::new(&dir);
    if let Some(version) = read_version_from_changelog(path) {
        return Ok(Some(version));
    }
    Ok(None)
}

#[tauri::command]
pub async fn detect_game_version_from_path(path: String) -> Result<Option<String>, String> {
    let p = std::path::Path::new(&path);
    if !p.exists() {
        return Ok(None);
    }
    Ok(read_version_from_changelog(p))
}

fn find_mods_folder() -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        let appdata = std::env::var("APPDATA").ok()?;
        let path = std::path::PathBuf::from(appdata)
            .join("Captain of Industry")
            .join("Mods");
        if path.exists() {
            Some(path.to_string_lossy().into_owned())
        } else {
            None
        }
    }

    #[cfg(target_os = "linux")]
    {
        let home = std::env::var("HOME").ok()?;
        let suffix = "steamapps/compatdata/1594320/pfx/drive_c/users/steamuser/AppData/Roaming/Captain of Industry/Mods";
        let candidates = [
            format!("{}/.local/share/Steam/{}", home, suffix),
            format!("{}/.steam/steam/{}", home, suffix),
            format!("{}/snap/steam/common/.local/share/Steam/{}", home, suffix),
            format!(
                "{}/.var/app/com.valvesoftware.Steam/.local/share/Steam/{}",
                home, suffix
            ),
        ];
        candidates
            .into_iter()
            .find(|p| std::path::Path::new(p).exists())
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
    run_scrape(&app, &order_by, &time_range).await;
    Ok(())
}

pub async fn run_scrape(app: &tauri::AppHandle, order_by: &str, time_range: &str) {
    let client = reqwest::Client::new();
    match crate::scraper::scrape_all(&client, order_by, time_range).await {
        Ok(mods) => {
            let db = app.state::<Database>();
            for m in &mods {
                if let Err(e) = db.upsert_mod(m).await {
                    eprintln!("upsert error: {e}");
                }
            }
            let _ = app.emit("mods-updated", mods.len());
        }
        Err(e) => {
            eprintln!("scraping error: {e}");
            let _ = app.emit("mods-sync-error", e.to_string());
        }
    }
}

// ─── Pool + Symlink Helpers ───

fn get_pool_base(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let pool = data_dir.join("mod_pool");
    std::fs::create_dir_all(&pool).map_err(|e| e.to_string())?;
    Ok(pool)
}

fn find_manifest_dir(dir: &std::path::Path) -> Option<(String, std::path::PathBuf)> {
    if dir.join("manifest.json").exists() {
        return dir
            .file_name()
            .and_then(|n| n.to_str())
            .map(|s| (s.to_string(), dir.to_path_buf()));
    }
    let entries = std::fs::read_dir(dir).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() && path.join("manifest.json").exists() {
            return entry
                .file_name()
                .into_string()
                .ok()
                .map(|name| (name, path));
        }
    }
    None
}

async fn download_zip_to_file(url: &str, dest: &std::path::Path) -> Result<(), String> {
    use std::io::Write;
    let client = http_client();
    let bytes = client
        .get(url)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .bytes()
        .await
        .map_err(|e| e.to_string())?
        .to_vec();
    let mut file = std::fs::File::create(dest).map_err(|e| e.to_string())?;
    file.write_all(&bytes).map_err(|e| e.to_string())?;
    Ok(())
}

fn copy_extra_files(src: &std::path::Path, dst: &std::path::Path) -> std::io::Result<()> {
    if !src.exists() {
        return Ok(());
    }
    let mut dirs = vec![src.to_path_buf()];
    while let Some(dir) = dirs.pop() {
        let mut entries = match std::fs::read_dir(&dir) {
            Ok(e) => e,
            Err(_) => continue,
        };
        while let Some(entry) = entries.next().transpose()? {
            let path = entry.path();
            let relative = path.strip_prefix(src).unwrap();
            let dst_path = dst.join(relative);
            if path.is_dir() {
                if !dst_path.exists() {
                    let _ = std::fs::create_dir_all(&dst_path);
                    copy_extra_files(&path, &dst_path)?;
                } else {
                    dirs.push(path);
                }
            } else if !dst_path.exists() {
                if let Some(parent) = dst_path.parent() {
                    let _ = std::fs::create_dir_all(parent);
                }
                std::fs::copy(&path, &dst_path)?;
            }
        }
    }
    Ok(())
}

async fn extract_to_pool(
    app: &tauri::AppHandle,
    mod_id: &str,
    mod_name: &str,
    version: &str,
    mod_page_url: &str,
    version_download_url: Option<&str>,
) -> Result<(String, std::path::PathBuf), String> {
    let pool_base = get_pool_base(app)?;
    let version_dir = pool_base.join(format!("{}-{}", mod_id, version));

    if version_dir.join("manifest.json").exists() || version_dir.is_dir() {
        if let Some((fname, _)) = find_manifest_dir(&version_dir) {
            return Ok((fname, version_dir));
        }
    }

    let zip_path = std::env::temp_dir().join(format!("coi_dl_{}.zip", mod_id));
    let dl_url = match version_download_url {
        Some(direct) => direct.to_string(),
        None => crate::scraper::resolve_download_url(http_client(), mod_page_url).await?,
    };
    download_zip_to_file(&dl_url, &zip_path).await?;

    let file = std::fs::File::open(&zip_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;

    let temp_dir = std::env::temp_dir().join(format!("coi_extract_{}", mod_id));
    let _ = std::fs::remove_dir_all(&temp_dir);
    std::fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;
    archive.extract(&temp_dir).map_err(|e| e.to_string())?;
    std::mem::drop(archive);
    let _ = std::fs::remove_file(&zip_path);

    // Copy user-generated files (settings, saves, etc.) from old versions
    if let Ok(entries) = std::fs::read_dir(&pool_base) {
        for entry in entries.flatten() {
            let dir_name = entry.file_name();
            let name = dir_name.to_string_lossy();
            if name.starts_with(&format!("{}-", mod_id)) && entry.path().is_dir() {
                let old_dir = entry.path();
                if old_dir != version_dir {
                    let _ = copy_extra_files(&old_dir, &temp_dir);
                }
            }
        }
    }

    let folder_name: String;
    if let Some((fname, fpath)) = find_manifest_dir(&temp_dir) {
        folder_name = fname;
        if fpath != temp_dir {
            let _ = std::fs::remove_dir_all(&version_dir);
            std::fs::rename(&fpath, &version_dir).map_err(|e| e.to_string())?;
        } else {
            if version_dir.exists() {
                std::fs::remove_dir_all(&version_dir).map_err(|e| e.to_string())?;
            }
            std::fs::rename(&temp_dir, &version_dir).map_err(|e| e.to_string())?;
        }
    } else {
        let safe_name = mod_name.to_lowercase().replace([' ', '/', '\\', ':'], "-");
        let wrapped = version_dir.join(&safe_name);
        std::fs::create_dir_all(&wrapped).map_err(|e| e.to_string())?;
        for entry in std::fs::read_dir(&temp_dir).map_err(|e| e.to_string())? {
            let e = entry.map_err(|e| e.to_string())?;
            let src = e.path();
            let dst = wrapped.join(e.file_name());
            if src.is_dir() {
                std::fs::rename(&src, &dst).map_err(|e| e.to_string())?;
            } else {
                std::fs::copy(&src, &dst).map_err(|e| e.to_string())?;
            }
        }
        folder_name = safe_name;
    }

    let _ = std::fs::remove_dir_all(&temp_dir);
    Ok((folder_name, version_dir))
}

/// Remove old pool version directories for a given mod, keeping only the current version.
fn cleanup_old_pool_versions(pool_base: &std::path::Path, mod_id: &str, current_version: &str) {
    let prefix = format!("{}-", mod_id);
    let current_dir_name = format!("{}-{}", mod_id, current_version);
    if let Ok(entries) = std::fs::read_dir(pool_base) {
        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_dir() {
                continue;
            }
            let dir_name = entry.file_name();
            let name = dir_name.to_string_lossy();
            if name.starts_with(&prefix) && name.as_ref() != current_dir_name {
                let _ = std::fs::remove_dir_all(&path);
            }
        }
    }
}

async fn get_active_profile_id(db: &Database) -> Result<String, String> {
    db.get_active_profile_id()
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "No active profile".to_string())
}

// ─── Install / Update / Uninstall / Update All ───

#[tauri::command]
pub async fn update_all_mods(
    app: tauri::AppHandle,
    db: State<'_, Database>,
) -> Result<usize, String> {
    check_game_not_running()?;
    let folder = db
        .get_setting("mods_folder")
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Mods folder not configured. Go to Settings.")?;
    let profile_id = get_active_profile_id(&db).await?;

    let ids = db.get_outdated_ids().await.map_err(|e| e.to_string())?;
    let count = ids.len();

    for mod_id in &ids {
        let mod_entry = db
            .get_all_mods()
            .await
            .map_err(|e| e.to_string())?
            .into_iter()
            .find(|m| &m.id == mod_id)
            .ok_or_else(|| format!("Mod id={} not found", mod_id))?;

        let mod_page_url = db
            .get_mod_page_url(mod_id)
            .await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| format!("Mod id={} not found in database", mod_id))?;

        let (folder_name, pool_dir) = extract_to_pool(
            &app,
            mod_id,
            &mod_entry.name,
            &mod_entry.version_available,
            &mod_page_url,
            None,
        )
        .await?;

        let link = std::path::Path::new(&folder).join(&folder_name);
        remove_symlink(&link)?;
        create_symlink_or_copy(&pool_dir, &link)?;

        db.add_profile_mod(
            &profile_id,
            mod_id,
            &mod_entry.version_available,
            Some(pool_dir.to_str().unwrap_or("")),
            Some(&folder_name),
        )
        .await
        .map_err(|e| e.to_string())?;

        // Clean up old version pool directories
        if let Some(pool_base) = pool_dir.parent() {
            cleanup_old_pool_versions(pool_base, mod_id, &mod_entry.version_available);
        }
    }

    if count > 0 {
        db.update_is_installed_from_profile(&profile_id)
            .await
            .map_err(|e| e.to_string())?;
        let _ = app.emit("mods-updated-notification", count);
    }

    Ok(count)
}

#[tauri::command]
pub async fn install_mod(
    app: tauri::AppHandle,
    db: State<'_, Database>,
    mod_id: String,
    version: Option<String>,
    version_download_url: Option<String>,
) -> Result<(), String> {
    check_game_not_running()?;
    let folder = db
        .get_setting("mods_folder")
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Mods folder not configured. Go to Settings.")?;
    let profile_id = get_active_profile_id(&db).await?;

    let mod_entry = db
        .get_all_mods()
        .await
        .map_err(|e| e.to_string())?
        .into_iter()
        .find(|m| m.id == mod_id)
        .ok_or_else(|| format!("Mod id={} not found in database", mod_id))?;

    let mod_page_url = db
        .get_mod_page_url(&mod_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Mod id={} not found in database", mod_id))?;

    let target_version = version.as_deref().unwrap_or(&mod_entry.version_available);
    let dl_url = version_download_url.as_deref();

    let (folder_name, pool_dir) = extract_to_pool(
        &app,
        &mod_id,
        &mod_entry.name,
        target_version,
        &mod_page_url,
        dl_url,
    )
    .await?;

    let link = std::path::Path::new(&folder).join(&folder_name);
    remove_symlink(&link)?;
    create_symlink_or_copy(&pool_dir, &link)?;

    db.add_profile_mod(
        &profile_id,
        &mod_id,
        target_version,
        Some(pool_dir.to_str().unwrap_or("")),
        Some(&folder_name),
    )
    .await
    .map_err(|e| e.to_string())?;

    db.update_is_installed_from_profile(&profile_id)
        .await
        .map_err(|e| e.to_string())?;
    let _ = app.emit("mods-updated", ());
    Ok(())
}

#[tauri::command]
pub async fn update_mod(
    app: tauri::AppHandle,
    db: State<'_, Database>,
    mod_id: String,
    version: Option<String>,
    version_download_url: Option<String>,
) -> Result<(), String> {
    check_game_not_running()?;
    let folder = db
        .get_setting("mods_folder")
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Mods folder not configured. Go to Settings.")?;
    let profile_id = get_active_profile_id(&db).await?;

    let mod_entry = db
        .get_all_mods()
        .await
        .map_err(|e| e.to_string())?
        .into_iter()
        .find(|m| m.id == mod_id)
        .ok_or_else(|| format!("Mod id={} not found in database", mod_id))?;

    let mod_page_url = db
        .get_mod_page_url(&mod_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Mod id={} not found in database", mod_id))?;

    let target_version = version.as_deref().unwrap_or(&mod_entry.version_available);
    let dl_url = version_download_url.as_deref();

    let (folder_name, pool_dir) = extract_to_pool(
        &app,
        &mod_id,
        &mod_entry.name,
        target_version,
        &mod_page_url,
        dl_url,
    )
    .await?;

    let link = std::path::Path::new(&folder).join(&folder_name);
    remove_symlink(&link)?;
    create_symlink_or_copy(&pool_dir, &link)?;

    db.add_profile_mod(
        &profile_id,
        &mod_id,
        target_version,
        Some(pool_dir.to_str().unwrap_or("")),
        Some(&folder_name),
    )
    .await
    .map_err(|e| e.to_string())?;

    // Clean up old version pool directories
    if let Some(pool_base) = pool_dir.parent() {
        cleanup_old_pool_versions(pool_base, &mod_id, target_version);
    }

    db.update_is_installed_from_profile(&profile_id)
        .await
        .map_err(|e| e.to_string())?;
    let _ = app.emit("mods-updated", ());
    Ok(())
}

#[tauri::command]
pub async fn uninstall_mod(
    app: tauri::AppHandle,
    db: State<'_, Database>,
    mod_id: String,
) -> Result<(), String> {
    check_game_not_running()?;
    let folder = db
        .get_setting("mods_folder")
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Mods folder not configured. Go to Settings.")?;
    let profile_id = get_active_profile_id(&db).await?;

    let profile_mods = db
        .get_profile_mods(&profile_id)
        .await
        .map_err(|e| e.to_string())?;
    let pm = profile_mods
        .iter()
        .find(|p| p.mod_id == mod_id)
        .ok_or_else(|| format!("Mod id={} not found in active profile", mod_id))?;

    if let Some(ref fname) = pm.folder_name {
        if fname.is_empty() {
            return Err("Cannot uninstall: mod folder name is empty".to_string());
        }
        let link = std::path::Path::new(&folder).join(fname);
        remove_symlink(&link)?;
    }

    db.remove_profile_mod(&profile_id, &mod_id)
        .await
        .map_err(|e| e.to_string())?;
    db.update_is_installed_from_profile(&profile_id)
        .await
        .map_err(|e| e.to_string())?;

    let _ = app.emit("mods-updated", ());
    Ok(())
}

// ─── Scan ───

#[tauri::command]
pub async fn get_mods_folder_size(db: State<'_, Database>) -> Result<Option<u64>, String> {
    let folder = db
        .get_setting("mods_folder")
        .await
        .map_err(|e| e.to_string())?;
    let folder = match folder {
        Some(f) => f,
        None => return Ok(None),
    };
    let path = std::path::Path::new(&folder);
    if !path.exists() {
        return Ok(None);
    }
    let mut total = 0u64;
    walk_dir(path, &mut total).map_err(|e| e.to_string())?;
    Ok(Some(total))
}

fn walk_dir(dir: &std::path::Path, total: &mut u64) -> std::io::Result<()> {
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            walk_dir(&path, total)?;
        } else {
            *total += entry.metadata()?.len();
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn scan_installed_mods(
    app: tauri::AppHandle,
    db: State<'_, Database>,
) -> Result<usize, String> {
    let folder = db
        .get_setting("mods_folder")
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Mods folder not configured".to_string())?;
    let profile_id = get_active_profile_id(&db).await?;

    let folder_path = std::path::Path::new(&folder);
    if !folder_path.exists() {
        return Err(format!("Folder not found: {}", folder));
    }

    let all_mods = db.get_all_mods().await.map_err(|e| e.to_string())?;
    let pool_base = get_pool_base(&app)?;
    let mut found_ids: std::collections::HashSet<String> = std::collections::HashSet::new();

    for entry in std::fs::read_dir(folder_path).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if !path.is_dir() && !path.is_symlink() {
            continue;
        }

        let folder_name = entry.file_name().to_string_lossy().to_lowercase();

        // For symlinks, follow the link to find the real path; otherwise use the
        // directory itself. We use std::fs::canonicalize so both cases work on
        // Windows (where read_link may return a device-namespace path) and on
        // systems where mods were installed via the copy fallback (plain dirs).
        let manifest_path = std::fs::canonicalize(&path)
            .unwrap_or_else(|_| path.clone())
            .join("manifest.json");

        if !manifest_path.exists() {
            continue;
        }
        let Ok(manifest_str) = std::fs::read_to_string(&manifest_path) else {
            continue;
        };
        let Ok(manifest) = serde_json::from_str::<serde_json::Value>(&manifest_str) else {
            continue;
        };
        let manifest_id = manifest["id"].as_str().unwrap_or("").to_lowercase();
        let display_name = manifest["display_name"]
            .as_str()
            .unwrap_or("")
            .to_lowercase();
        let version = manifest["version"]
            .as_str()
            .unwrap_or("")
            .trim()
            .trim_start_matches('v')
            .to_string();

        let matched = all_mods.iter().find(|m| {
            let slug = m.url.split('/').last().unwrap_or("").to_lowercase();
            slug == manifest_id
                || slug == folder_name
                || m.name.to_lowercase() == display_name
                || m.name.to_lowercase().replace(' ', "-") == manifest_id
        });

        if let Some(m) = matched {
            let pool_dir = pool_base.join(format!("{}-{}", m.id, version));
            let actual_folder = entry.file_name().to_string_lossy().to_string();
            let pool_path_str = if pool_dir.exists() {
                Some(pool_dir.to_str().unwrap_or("").to_string())
            } else {
                None
            };

            db.add_profile_mod(
                &profile_id,
                &m.id,
                &version,
                pool_path_str.as_deref(),
                Some(&actual_folder),
            )
            .await
            .map_err(|e| e.to_string())?;
            found_ids.insert(m.id.clone());
        }
    }

    db.update_is_installed_from_profile(&profile_id)
        .await
        .map_err(|e| e.to_string())?;

    let _ = app.emit("mods-updated", ());
    Ok(found_ids.len())
}

pub async fn run_scan_installed(app: &tauri::AppHandle) {
    let db = app.state::<Database>();
    let profile_id = match get_active_profile_id(&db).await {
        Ok(id) => id,
        Err(_) => return,
    };
    let folder = match db.get_setting("mods_folder").await {
        Ok(Some(f)) => f,
        _ => return,
    };

    let folder_path = std::path::Path::new(&folder);
    if !folder_path.exists() {
        return;
    }

    let all_mods = match db.get_all_mods().await {
        Ok(m) => m,
        Err(_) => return,
    };
    let pool_base = match get_pool_base(app) {
        Ok(p) => p,
        Err(_) => return,
    };
    let mut found_ids: std::collections::HashSet<String> = std::collections::HashSet::new();

    for entry in std::fs::read_dir(folder_path).into_iter().flatten() {
        let entry = match entry {
            Ok(e) => e,
            _ => continue,
        };
        let path = entry.path();
        if !path.is_dir() && !path.is_symlink() {
            continue;
        }
        let folder_name_lower = entry.file_name().to_string_lossy().to_lowercase();

        // Resolve the real directory (handles both symlinks and plain dirs,
        // including Windows device-namespace paths from read_link).
        let manifest_path = std::fs::canonicalize(&path)
            .unwrap_or_else(|_| path.clone())
            .join("manifest.json");

        if !manifest_path.exists() {
            continue;
        }
        let Ok(manifest_str) = std::fs::read_to_string(&manifest_path) else {
            continue;
        };
        let Ok(manifest) = serde_json::from_str::<serde_json::Value>(&manifest_str) else {
            continue;
        };
        let manifest_id = manifest["id"].as_str().unwrap_or("").to_lowercase();
        let display_name = manifest["display_name"]
            .as_str()
            .unwrap_or("")
            .to_lowercase();
        let version = manifest["version"]
            .as_str()
            .unwrap_or("")
            .trim()
            .trim_start_matches('v')
            .to_string();

        let matched = all_mods.iter().find(|m| {
            let slug = m.url.split('/').last().unwrap_or("").to_lowercase();
            slug == manifest_id
                || slug == folder_name_lower
                || m.name.to_lowercase() == display_name
                || m.name.to_lowercase().replace(' ', "-") == manifest_id
        });

        if let Some(m) = matched {
            let pool_dir = pool_base.join(format!("{}-{}", m.id, version));
            let actual_folder = entry.file_name().to_string_lossy().to_string();
            let pool_path_str = if pool_dir.exists() {
                Some(pool_dir.to_str().unwrap_or("").to_string())
            } else {
                None
            };
            let _ = db
                .add_profile_mod(
                    &profile_id,
                    &m.id,
                    &version,
                    pool_path_str.as_deref(),
                    Some(&actual_folder),
                )
                .await;
            found_ids.insert(m.id.clone());
        }
    }

    let _ = db.update_is_installed_from_profile(&profile_id).await;
    let _ = app.emit("mods-updated", ());
    println!(
        "Scan: {}/{} installed mods detected",
        found_ids.len(),
        all_mods.len()
    );
}

#[tauri::command]
pub async fn get_mod_details(
    db: State<'_, Database>,
    mod_id: String,
) -> Result<crate::scraper::ModDetails, String> {
    let mod_page_url = db
        .get_mod_page_url(&mod_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Mod id={} not found in database", mod_id))?;
    let client = reqwest::Client::builder()
        .user_agent("CoI-Mod-Manager/1.0")
        .build()
        .map_err(|e| e.to_string())?;
    crate::scraper::scrape_mod_details(&client, &mod_page_url).await
}

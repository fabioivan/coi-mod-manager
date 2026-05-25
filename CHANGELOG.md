# Changelog

## [unreleased]

## [0.3.2] – 2026-05-25

### Added
- Safety check (`is_mod_directory`) before deleting mod directories — prevents accidental deletion of non-mod files (savegames, settings, source code) when `manifest.json` is missing
- Empty folder name validation before uninstall
- Old version pool directories are cleaned up after mod updates (`cleanup_old_pool_versions`)
- Per‑profile mod config backup (`profile_configs/`) — each profile's user‑generated files (settings, saves) are preserved independently when switching profiles
- `game_version_title` translation key (en, pt‑BR, zh‑CN) — fixes hardcoded Portuguese fallback on mod detail page
- Semver‑aware mod status detection (`compareVersions` instead of strict string `!==`) — fixes false "update available" when installed version has a `v` prefix
- Browse button for game install folder — manually point to the game directory when auto‑detection fails
- `get_app_version` command and app version display in the status bar
- "Check for Updates" button in Settings
- Update notification icon in the status bar and an update modal with release notes and "Update Now" button
- Changelog viewer — click the app version in the status bar to read release history
- Portable Windows build (`--bundles nsis,msi,portable`) — no installation or admin needed
- NSIS installer mode changed to `currentUser` — no longer requires admin privileges
- Linux builds now produce only `.deb` and `.AppImage` (no `.rpm`)
- Raw HTML elements replaced with ShadcnUI `Button` and `ScrollArea` components in modals and status bar

### Fixed
- Mod version normalisation (trim + strip `v` prefix) when scanning `manifest.json` — aligns with the scraped version format
- `parseVersion` regex accepts optional `v` prefix (`/^v?(\d+)\.(\d+)\.(\d+)([a-z]*)$/i`)
- Initial language dropdown state now reads from `i18n.language` instead of being hardcoded to "pt‑BR"

## [0.3.1] – 2025-05-25

### Fixed
- Windows build — mismatched types in `find_game_install_dir`

## [0.3.0] – 2025-05-24

### Added
- Game version auto‑detection from `changelog.txt`
- Version compatibility warning before installing a mod that doesn't match the game version
- Version range expansion (e.g. "0.8.2 – 0.8.5") in the game version filter
- Status bar showing game version, Mods folder size, and installed mod count
- Chinese (Simplified) translation
- Install specific mod version by version ID
- Game‑running detection — blocks install/update/uninstall while the game is open
- Migration of settings and saves from previous mod versions on update

### Changed
- Default language changed to English
- Toast auto‑dismiss after 5 seconds on success

## [0.2.1] – 2025-05-22

### Added
- Settings/saves migration from old pool versions when updating a mod

### Changed
- Release body translated to English

## [0.2.0] – 2025-05-21

### Added
- Multilingual README with screenshots and release description
- BiomeJS code formatter
- Adjusted button spacing across all components

## [0.1.3] – 2025-05-20

### Added
- Mod detail page with full scraper support
- i18n improvements

## [0.1.2] – 2025-05-19

### Added
- Scraper fix (Search endpoint)
- Auto‑sync on sort change
- Uninstall functionality
- Download via mod page

## [0.1.1] – 2025-05-18

### Added
- Updated Tauri icons and added new formats (SVG, Android, iOS, favicon)
- Release scripts for Linux and Windows
- CI and release workflows

## [0.1.0] – 2025-05-17

### Added
- Initial Tauri v2 scaffold for CoI Mod Manager
- Scraper, filters and complete UI
- Mod download, settings and app updater
- Database layer with rusqlite

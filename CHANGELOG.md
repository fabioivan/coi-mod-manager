# Changelog

## [0.5.0] – 2026-06-07

### Added
- **Maps section** — Browse, search, and download community maps from `hub.coigame.com`. Full detail page with gallery, resources table, starting locations, version history, and comments. Infinite scroll grid with sort/filter controls.
- **Blueprints section** — Browse and search blueprints. Copy blueprint strings to clipboard with one click. Detail page with metadata and description. Infinite scroll grid with sort/filter controls.
- **COI Hub Login** — Sign in via magic link (browser → email → paste flow). Cookies stored locally for authenticated requests. Required for voting and favoriting.
- **Voting (upvote/downvote)** — Authenticated users can rate maps, mods, and blueprints from their detail pages.
- **Favoriting** — Authenticated users can add maps, mods, and blueprints to their favorites.
- **Status bar counters** — Maps count and blueprints count displayed alongside mods count in the status bar.
- **Top bar section tabs** — Blueprints, Maps, and Mods tab buttons with color-coded active states.
- **Collapsible navigation sidebar** — Quick section switching with hover-to-expand (48px → 160px). Shows active section with colored highlight.
- **Play button** — Launches Captain of Industry directly from the app via `steam://rungameid/2054330`.
- **Italian language support** — Full i18n for `it` locale.

### Changed
- **Default view changed** to **Blueprints** (was Mods).
- Blueprint and Map lists stay mounted when hidden to preserve scroll position (`display: none`).
- Login state persisted across app restarts via SQLite cookie store.

### Fixed
- `login_submit_magic_link` properly validates magic link expiration and returns meaningful error messages.

## [0.5.1] – 2026-06-07

### Added
- **Voting (upvote/downvote) for mods and blueprints** — Authenticated users can now rate mods and blueprints from their detail pages, in addition to maps.
- **Favoriting for mods and blueprints** — Authenticated users can now favorite mods and blueprints.
- **Back button navigation** — All detail pages (Mod, Blueprint, Map) now have a consistent yellow back button inside the content container.
- **COI Hub background** — Detail pages now use the same `background.jpg` as the website for a more immersive look.
- **Scan logging** — `scan_installed_mods` now outputs detailed per-mod status to the terminal for easier debugging.

### Changed
- **Play button restyled** — Now uses a blue background with white text and play icon (Steam-like), replacing the small green icon-only button.
- **Detail page layouts aligned with COI Hub website** — ModDetail and BlueprintDetail now use centered max-width containers (1140px), full-page background image, and a dark content container with rounded corners. MapDetail content container similarly restructured.
- **ModDetail header restructured** — Removed separate stats bar and standalone vote/fav section; moved to compound vote/favorite buttons in the meta bar, matching the website's mv2-meta-bar pattern.
- **BlueprintDetail header restructured** — Wrapped in a darkerGrey card with meta bar and compound vote/favorite buttons.
- **MapDetail resources table** — Alternating row colors and dark content container background.

### Fixed
- `launch_game` now uses the correct Steam App ID (1594320 instead of 2054330).

## [0.4.1] – 2026-05-27

### Added
- Stable pool directories (`mod_id` instead of `mod_id-version`) — user-created files (saves, settings) persist across mod updates
- `merge_into_dir` and `update_mod_link` functions — merge updated mod files without deleting user saves/configs
- Null safety in `splitTags` and mod list calculations — handles `null`/`undefined` category without crashing
- Proper effect cancellation and stable callback refs — event listeners no longer re-register on every render

### Changed
- Settings tab removed from navigation sidebar — settings remain accessible via the gear icon in the top bar
- Pool extraction no longer versioned — each mod has a single stable pool directory
- `extract_to_pool` now accepts `existing_folder_name` — preserves folder name across updates for game reference stability

### Fixed
- Windows `tasklist` command now uses `CREATE_NO_WINDOW` flag — prevents console window flash on game-running check
- `import_profile` updated to use the new stable pool structure
- `scan_installed_mods` and `run_scan_installed` use stable pool paths

### Removed
- `cleanup_old_pool_versions` function — no longer needed with stable pool directories
- Old symlink cleanup logic in `update_all_mods` and `update_mod` — consolidated into `update_mod_link`

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
- NSIS installer mode changed to `currentUser` — installs to `%LOCALAPPDATA%`, no admin privileges needed
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

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

| Command | Description |
|---------|-------------|
| `npm run tauri dev` | Full Tauri dev (Vite + Rust hot-reload) |
| `npm run dev` | Vite frontend only (port 1420) |
| `npm run build` | `tsc` typecheck → Vite build |
| `cargo check` (in `src-tauri/`) | Rust compile check |
| `cargo test` (in `src-tauri/`) | Rust unit tests (1 test in `scraper.rs`) |

**Pre-commit**: `npm run build` → `cargo check` → `cargo test`. No linter or formatter.

**Release**: `./scripts/release.sh <version|patch|minor|major>` — bumps `package.json` + `tauri.conf.json`, commits, tags `vX.Y.Z`. Pushing the tag triggers the GitHub Release workflow.

## Architecture

Tauri v2 desktop app (React 19 + TypeScript frontend, Rust backend) for managing Captain of Industry mods scraped from `hub.coigame.com`.

```
src/              # React 19 + TypeScript frontend (Vite)
src-tauri/src/
  lib.rs          # Plugin init, DB init, startup background tasks
  commands.rs     # All #[tauri::command] IPC handlers + download/extract logic
  db.rs           # SQLite via rusqlite (bundled), WAL mode, migrations v1–v7
  models.rs       # Rust Mod struct (mirrors frontend Mod interface)
  scraper.rs      # HTML scraper for hub.coigame.com (no API — pure HTML parsing)
```

### Frontend component tree

```
App.tsx                   # Root: view state, sorting, filters, error translation
├── Sidebar               # Filters panel (tags, devstates, game versions, sort)
├── TopBar                # Sync button, update-all button, app update notifications
├── NavSidebar            # Navigation between Mods and Blueprints sections
└── Content (by view)
    ├── ModList / ModCard          # Mod grid with search + status filter
    ├── ModDetail                  # 5-tab detail page (info/announcements/versions/changelog/deps)
    ├── BlueprintList / BlueprintCard  # Blueprint section
    ├── BlueprintDetail            # Blueprint detail page
    ├── ProfileSelect              # Mod profile management
    └── Settings                  # Mods folder path, language, auto-update toggle
```

### Frontend → Backend Communication

- **IPC only** via `invoke()` from `@tauri-apps/api/core` — never use `fetch()` or HTTP from frontend
- Backend push events via `listen()` from `@tauri-apps/api/event`
- All `#[tauri::command]` functions return `Result<_, String>`; errors flow as plain strings

### IPC Commands

| Command | Args | Returns |
|---------|------|---------|
| `get_mods` | — | `Mod[]` |
| `sync_mods` | `order_by?`, `time_range?` | `void` → emits `mods-updated` |
| `install_mod` / `update_mod` | `mod_id` | `void` → emits `mods-updated` |
| `update_all_mods` | — | `usize` → emits `mods-updated-notification` |
| `uninstall_mod` | `mod_id` | `void` → emits `mods-updated` |
| `get_mod_details` | `mod_id` | `ModDetails` (scraped on-demand) |
| `get_setting` / `set_setting` | `key`, `value?` | `Option<String>` / `void` |
| `detect_mods_folder` / `pick_folder` | — | `Option<String>` |
| `scan_installed_mods` | — | `usize` |
| `check_for_update` / `install_update` | — | `Option<UpdateInfo>` / `void` |

Settings keys: `mods_folder` (string), `language` (`"pt-BR"` \| `"en"`), `auto_update_enabled` (`"true"` \| `"false"`).

### Backend Events

| Event | When |
|-------|------|
| `mods-updated` | After scrape/install/update/uninstall |
| `mods-sync-error` | When scraping fails |
| `mods-updated-notification` | After `update_all_mods` |
| `update-available` / `update-installed` / `update-progress` / `update-restart` | App self-update lifecycle |

### Database

SQLite at `{app_data_dir}/coi_mods.db`. Key table: `mods` with columns including `id`, `name`, `author`, `devstate` (0=Unknown…4=Abandoned), `version_available`, `version_installed`, `is_installed`, `url`, `thumbnail`. The `Database` struct wraps `tokio::sync::Mutex<Connection>` — all DB access is async/serialized.

## Style & Conventions

- **Inline styles over Tailwind**: Most UI uses JS `style` objects. A `C` constant (colors as hex values) is defined at the top of each component file. Replicate this pattern when adding UI — do not switch to Tailwind utility classes.
- **Tailwind CSS v4**: Imported via `@import "tailwindcss"` in `App.css`; no `tailwind.config.js`.
- **Path alias**: `@/` → `./src/`
- **i18n**: All user-facing strings use `t("key")`. Language set via `set_setting("language")`, not browser detection. Add keys to both `src/i18n/en.json` and `src/i18n/pt-BR.json`.
- **Error translation**: Rust error strings are mapped to i18n keys via `ERROR_TRANSLATIONS` in `App.tsx`.
- **No frontend tests**.

## Key Rules

1. `mods_folder` must be configured before install/update/uninstall/scan operations will work.
2. `scraper.rs` depends on exact HTML structure of `hub.coigame.com` — it will break if the site changes.
3. Unused package.json deps (do not import): `@tauri-apps/plugin-sql`, `class-variance-authority`, `@radix-ui/react-slot`, `i18next-browser-languagedetector`.

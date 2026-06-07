import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChangelogModal } from "@/components/ChangelogModal";
import { LoginDialog } from "@/components/LoginDialog";
import { Sidebar } from "@/components/Sidebar";
import { StatusBar } from "@/components/StatusBar";
import { TopBar } from "@/components/TopBar";
import { UpdateModal } from "@/components/UpdateModal";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { BlueprintDetail } from "@/pages/BlueprintDetail";
import {
	BlueprintList,
	type BlueprintListFilters,
} from "@/pages/BlueprintList";
import { MapDetail } from "@/pages/MapDetail";
import { MapList, type MapListFilters } from "@/pages/MapList";
import { ModDetail } from "@/pages/ModDetail";
import { ModList } from "@/pages/ModList";
import { Settings } from "@/pages/Settings";
import type { Blueprint } from "@/types/blueprint";
import { type SidebarFilters, SORT_OPTIONS } from "@/types/filters";
import type { MapItem } from "@/types/map";
import { getModStatus, type Mod } from "@/types/mod";
import type { Profile } from "@/types/profile";
import {
	compareVersions,
	expandGameVersionRange,
	versionInRange,
} from "@/utils/version";

function splitTags(category: string | null | undefined): string[] {
	if (!category) return [];
	return category
		.split(",")
		.map((t) => t.trim())
		.filter(Boolean);
}

const ERROR_TRANSLATIONS: Record<string, string> = {
	"Mods folder not configured. Go to Settings.":
		"error.mods_folder_not_configured",
	"Mods folder not configured": "error.mods_folder_not_configured",
	"Folder not found:": "error.folder_not_found",
	"Mod id=": "error.mod_not_found",
	"Failed to remove": "error.failed_to_remove",
	"Mod folder": "error.mod_folder_not_found",
	"Download link not found at": "error.download_link_not_found",
	"Failed to access": "error.failed_to_access",
	"Failed to load mod": "error.failed_to_load_mod",
	"Selector error:": "error.selector_error",
	"Invalid mod URL": "error.invalid_mod_url",
	"Game is running.": "error.game_is_running",
	"Permission denied": "error.permission_denied",
	"Access denied": "error.permission_denied",
	"Access is denied": "error.permission_denied",
	"os error 5": "error.permission_denied",
	"This mod has no dependencies.": "",
};

function translateError(msg: string, t: (key: string) => string): string {
	for (const [key, i18nKey] of Object.entries(ERROR_TRANSLATIONS)) {
		if (msg.startsWith(key)) {
			if (!i18nKey) return msg;
			return t(i18nKey);
		}
	}
	return msg;
}

type TabView =
	| "blueprints"
	| "mods"
	| "maps"
	| "settings"
	| "details"
	| "blueprint-details"
	| "map-details";

export default function App() {
	const { i18n, t } = useTranslation();
	const { toast } = useToast();
	const [mods, setMods] = useState<Mod[]>([]);
	const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
	const [maps, setMaps] = useState<MapItem[]>([]);
	const [syncing, setSyncing] = useState(false);
	const [blueprintSyncing, setBlueprintSyncing] = useState(false);
	const [mapSyncing, setMapSyncing] = useState(false);
	const [installingIds, setInstallingIds] = useState<Set<string>>(new Set());
	const [view, setView] = useState<TabView>("blueprints");
	const [selectedModId, setSelectedModId] = useState<string | null>(null);
	const [selectedBlueprintId, setSelectedBlueprintId] = useState<string | null>(
		null,
	);
	const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
	const [appUpdate, setAppUpdate] = useState<{
		version: string;
		notes?: string;
	} | null>(null);
	const [showUpdateModal, setShowUpdateModal] = useState(false);
	const [showChangelog, setShowChangelog] = useState(false);
	const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
	const [savedGameVersion, setSavedGameVersion] = useState<string | null>(null);
	const [changelogVersion, setChangelogVersion] = useState<string | null>(null);
	const [appVersion, setAppVersion] = useState("");
	const [showLoginDialog, setShowLoginDialog] = useState(false);
	const { status: loginStatus, openBrowser, submitMagicLink, logout } = useAuth();

	const [blueprintFilters, setBlueprintFilters] =
		useState<BlueprintListFilters>({
			search: "",
			orderBy: "popularity",
			timeRange: "all-time",
			author: null,
		});

	const [mapFilters, setMapFilters] = useState<MapListFilters>({
		search: "",
		orderBy: "popularity",
		timeRange: "all-time",
		author: null,
	});

	const [filters, setFilters] = useState<SidebarFilters>({
		sortBy: "updated",
		timeRange: "all-time",
		selectedTag: null,
		devstates: [],
		gameVersion: "",
	});

	const showToast = useCallback(
		(message: string, type: "info" | "error" | "success" = "info") => {
			toast({
				description: message,
				variant:
					type === "error"
						? "destructive"
						: type === "success"
							? "success"
							: "default",
				duration: type === "error" ? undefined : 5000,
			});
		},
		[toast],
	);

	const loadProfiles = useCallback(async () => {
		try {
			const profile = await invoke<Profile | null>("get_active_profile");
			setActiveProfile(profile);
		} catch (_) {}
	}, []);

	useEffect(() => {
		let cancelled = false;
		let unlistens: Array<() => void> = [];

		async function init() {
			try {
				const lang = await invoke<string | null>("get_setting", {
					key: "language",
				});
				if (lang) i18n.changeLanguage(lang);
			} catch (_) {}

			try {
				const gv = await invoke<string | null>("get_setting", {
					key: "game_version",
				});
				if (gv) setSavedGameVersion(gv);
			} catch (_) {}

			try {
				const cv = await invoke<string | null>("detect_game_version");
				if (cv) setChangelogVersion(cv);
			} catch (_) {}

			invoke<string>("get_app_version")
				.then(setAppVersion)
				.catch(() => {});

			await loadProfilesRef.current();

			try {
				const result = await invoke<Mod[]>("get_mods");
				setMods(result ?? []);
				if (!result || result.length === 0) setSyncing(true);
			} catch (e) {
				console.error("Failed to load mods:", e);
			}

			try {
				const result = await invoke<Blueprint[]>("get_blueprints");
				setBlueprints(result);
			} catch (e) {
				console.error("Failed to load blueprints:", e);
			}

			try {
				const result = await invoke<MapItem[]>("get_maps");
				setMaps(result);
			} catch (e) {
				console.error("Failed to load maps:", e);
			}

			// Register all listeners atomically. If the effect was already cleaned up
			// while we were awaiting, immediately unlisten and bail out.
			const registered = await Promise.all([
				listen("mods-updated", async () => {
					try {
						const result = await invoke<Mod[]>("get_mods");
						setMods(result ?? []);
					} catch (e) {
						console.error("Failed to reload mods:", e);
					} finally {
						setSyncing(false);
					}
				}),
				listen("blueprints-updated", async () => {
					try {
						const result = await invoke<Blueprint[]>("get_blueprints");
						setBlueprints(result);
					} catch (e) {
						console.error("Failed to reload blueprints:", e);
					} finally {
						setBlueprintSyncing(false);
					}
				}),
				listen("maps-updated", async () => {
					try {
						const result = await invoke<MapItem[]>("get_maps");
						setMaps(result);
					} catch (e) {
						console.error("Failed to reload maps:", e);
					} finally {
						setMapSyncing(false);
					}
				}),
				listen<string>("mods-sync-error", (e) => {
					console.error("Mods sync error:", e.payload);
					showToastRef.current(
						translateError(e.payload, tRef.current),
						"error",
					);
				}),
				listen<{ version: string; notes?: string }>("update-available", (e) => {
					setAppUpdate(e.payload);
					showToastRef.current(
						tRef.current("toast.update_available", {
							version: e.payload.version,
						}),
						"info",
					);
				}),
				listen<{ version: string }>("update-installed", (e) => {
					showToastRef.current(
						tRef.current("toast.update_installed", {
							version: e.payload.version,
						}),
						"success",
					);
				}),
				listen("update-restart", () => {
					showToastRef.current(tRef.current("toast.update_restart"), "success");
				}),
				listen("update-progress", () => {}),
				listen<number>("mods-updated-notification", (e) => {
					showToastRef.current(
						tRef.current("toast.mods_updated", { count: e.payload }),
						"success",
					);
				}),
			]);

			if (cancelled) {
				registered.forEach((fn) => fn());
				return;
			}
			unlistens = registered;
		}

		init();
		return () => {
			cancelled = true;
			unlistens.forEach((fn) => fn());
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [i18n]);

	// Stable refs so event listeners never need to be re-registered when callbacks change.
	const tRef = useRef(t);
	const showToastRef = useRef(showToast);
	const loadProfilesRef = useRef(loadProfiles);
	useEffect(() => {
		tRef.current = t;
	});
	useEffect(() => {
		showToastRef.current = showToast;
	});
	useEffect(() => {
		loadProfilesRef.current = loadProfiles;
	});

	const prevSortRef = useRef(filters.sortBy);
	const prevTimeRef = useRef(filters.timeRange);

	const loadMods = useCallback(async () => {
		try {
			const result = await invoke<Mod[]>("get_mods");
			setMods(result);
		} catch (e) {
			console.error("Failed to load mods:", e);
			showToast(translateError(String(e), t), "error");
		}
	}, [showToast, t]);

	const handleRefresh = useCallback(async () => {
		setSyncing(true);
		const option = SORT_OPTIONS.find((o) => o.value === filters.sortBy);
		const orderBy = option?.apiValue ?? "updated";
		try {
			await invoke("sync_mods", { orderBy, timeRange: filters.timeRange });
			await loadMods();
		} catch (e) {
			console.error("Failed to sync:", e);
			showToast(translateError(String(e), t), "error");
		} finally {
			setSyncing(false);
		}
	}, [loadMods, filters.sortBy, filters.timeRange, showToast, t]);

	const handleRefreshRef = useRef(handleRefresh);
	useEffect(() => {
		handleRefreshRef.current = handleRefresh;
	}, [handleRefresh]);

	useEffect(() => {
		const sortChanged = filters.sortBy !== prevSortRef.current;
		const timeChanged = filters.timeRange !== prevTimeRef.current;
		prevSortRef.current = filters.sortBy;
		prevTimeRef.current = filters.timeRange;
		if (!sortChanged && !timeChanged) return;
		if (mods.length === 0) return;
		handleRefreshRef.current();
	}, [filters.sortBy, filters.timeRange, mods.length]);

	async function handleUpdateAll() {
		setSyncing(true);
		try {
			await invoke("update_all_mods");
			await loadMods();
		} catch (e) {
			console.error("Failed to update:", e);
			showToast(translateError(String(e), t), "error");
		} finally {
			setSyncing(false);
		}
	}

	async function handleUpdate(mod: Mod) {
		setInstallingIds((prev) => new Set([...prev, mod.id]));
		try {
			await invoke("update_mod", { modId: mod.id });
			await loadMods();
		} catch (e) {
			console.error("Failed to update mod:", e);
			showToast(translateError(String(e), t), "error");
		} finally {
			setInstallingIds((prev) => {
				const s = new Set(prev);
				s.delete(mod.id);
				return s;
			});
		}
	}

	async function handleInstall(
		mod: Mod,
		version?: string,
		versionDownloadUrl?: string,
	) {
		const realVersion = changelogVersion ?? savedGameVersion;
		if (
			realVersion &&
			mod.game_version &&
			!versionInRange(realVersion, mod.game_version)
		) {
			const msg = t("install.version_warning", {
				mod: mod.name,
				version: realVersion,
				modVersion: mod.game_version,
			});
			if (!window.confirm(msg)) return;
		}

		setInstallingIds((prev) => new Set([...prev, mod.id]));
		try {
			await invoke("install_mod", {
				modId: mod.id,
				version: version ?? null,
				versionDownloadUrl: versionDownloadUrl ?? null,
			});
			await loadMods();
		} catch (e) {
			console.error("Failed to install mod:", e);
			showToast(translateError(String(e), t), "error");
		} finally {
			setInstallingIds((prev) => {
				const s = new Set(prev);
				s.delete(mod.id);
				return s;
			});
		}
	}

	async function handleUninstall(mod: Mod) {
		setInstallingIds((prev) => new Set([...prev, mod.id]));
		try {
			await invoke("uninstall_mod", { modId: mod.id });
			await loadMods();
		} catch (e) {
			console.error("Failed to uninstall mod:", e);
			showToast(translateError(String(e), t), "error");
		} finally {
			setInstallingIds((prev) => {
				const s = new Set(prev);
				s.delete(mod.id);
				return s;
			});
		}
	}

	async function handleBlueprintSync() {
		setBlueprintSyncing(true);
		try {
			await invoke("sync_blueprints");
		} catch (e) {
			console.error("Failed to sync blueprints:", e);
			showToast(translateError(String(e), t), "error");
			setBlueprintSyncing(false);
		}
	}

	async function handleMapSync() {
		setMapSyncing(true);
		try {
			await invoke("sync_maps");
		} catch (e) {
			console.error("Failed to sync maps:", e);
			showToast(translateError(String(e), t), "error");
			setMapSyncing(false);
		}
	}

	const tags = useMemo(() => {
		const set = new Set<string>();
		for (const m of mods ?? []) {
			for (const t of splitTags(m.category)) {
				set.add(t);
			}
		}
		return [...set].sort();
	}, [mods]);

	const tagCounts = useMemo(() => {
		const counts: Record<string, number> = {};
		for (const m of mods ?? []) {
			for (const t of splitTags(m.category)) {
				counts[t] = (counts[t] ?? 0) + 1;
			}
		}
		return counts;
	}, [mods]);

	const gameVersions = useMemo(() => {
		const set = new Set<string>();
		mods.forEach((m) => {
			if (m.game_version) {
				expandGameVersionRange(m.game_version).forEach((v) => set.add(v));
			}
		});
		return [...set].sort((a, b) => compareVersions(b, a));
	}, [mods]);

	const gameVersionSet = useMemo(() => new Set(gameVersions), [gameVersions]);

	useEffect(() => {
		if (savedGameVersion && !filters.gameVersion && gameVersionSet.size > 0) {
			setFilters((prev) => ({ ...prev, gameVersion: savedGameVersion }));
		}
	}, [savedGameVersion, gameVersionSet]);

	const outdatedCount = useMemo(
		() => mods.filter((m) => getModStatus(m) === "outdated").length,
		[mods],
	);

	const sortedMods = useMemo(() => {
		const arr = [...mods];
		if (filters.sortBy === "name_asc") {
			arr.sort((a, b) => a.name.localeCompare(b.name));
		} else if (filters.sortBy === "name_desc") {
			arr.sort((a, b) => b.name.localeCompare(a.name));
		} else {
			arr.sort((a, b) => a.scrape_rank - b.scrape_rank);
		}
		return arr;
	}, [mods, filters.sortBy]);

	const installedCount = useMemo(
		() => mods.filter((m) => m.is_installed).length,
		[mods],
	);
	const installedMapsCount = useMemo(
		() => maps.filter((m) => m.is_downloaded).length,
		[maps],
	);
	const installedBlueprintsCount = useMemo(
		() => blueprints.filter((b) => b.is_downloaded).length,
		[blueprints],
	);

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				height: "100vh",
				backgroundImage: "url(https://coigame.com/images/background.jpg)",
				backgroundSize: "cover",
				backgroundPosition: "center",
				backgroundAttachment: "fixed",
				color: "#f8f8f8",
				overflow: "hidden",
			}}
		>
			<TopBar
				outdatedCount={outdatedCount}
				onRefresh={handleRefresh}
				onUpdateAll={handleUpdateAll}
				onBlueprintSync={handleBlueprintSync}
				onMapSync={handleMapSync}
				blueprintSyncing={blueprintSyncing}
				mapSyncing={mapSyncing}
				loading={syncing}
				view={view}
				onViewChange={setView}
				appUpdate={appUpdate}
				activeProfile={activeProfile}
				loginStatus={loginStatus}
				onLoginOpen={() => setShowLoginDialog(true)}
				onLoginLogout={() => {
					logout();
					showToast(t("login.sign_out"), "info");
				}}
				onInstallUpdate={async () => {
					setSyncing(true);
					try {
						await invoke("install_update");
					} catch (e) {
						console.error("Failed to install update:", e);
						showToast(translateError(String(e), t), "error");
						setSyncing(false);
					}
				}}
			/>
			<LoginDialog
				open={showLoginDialog}
				onOpenChange={setShowLoginDialog}
				onOpenBrowser={openBrowser}
				onSubmit={async (link) => {
					const ok = await submitMagicLink(link);
					if (ok) showToast(t("login.success"), "success");
					return ok;
				}}
			/>
			<div style={{ display: "flex", flex: 1, minHeight: 0 }}>
				<Toaster />
				<div style={{ display: "flex", flex: 1, minHeight: 0, justifyContent: "center" }}>
					{view === "mods" || view === "details" ? (
						<Sidebar
							tags={tags}
							counts={tagCounts}
							total={mods.length}
							gameVersions={gameVersions}
							filters={filters}
							onFiltersChange={setFilters}
							detectedGameVersion={savedGameVersion}
						/>
					) : null}
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							flex: 1,
							minWidth: 0,
						}}
					>
					{/* BlueprintList stays mounted to preserve scroll position */}
					<div
						style={{
							display: view === "blueprints" ? "flex" : "none",
							flex: 1,
							flexDirection: "column",
							minHeight: 0,
							minWidth: 0,
						}}
					>
						<BlueprintList
							blueprints={blueprints}
							filters={blueprintFilters}
							onFiltersChange={setBlueprintFilters}
							onSelectBlueprint={(id) => {
								setSelectedBlueprintId(id);
								setView("blueprint-details");
							}}
						/>
					</div>
					{/* MapList stays mounted to preserve scroll position */}
					<div
						style={{
							display: view === "maps" ? "flex" : "none",
							flex: 1,
							flexDirection: "column",
							minHeight: 0,
							minWidth: 0,
						}}
					>
						<MapList
							maps={maps}
							filters={mapFilters}
							onFiltersChange={setMapFilters}
							onSelectMap={(id) => {
								setSelectedMapId(id);
								setView("map-details");
							}}
						/>
					</div>
					{view === "blueprint-details" && selectedBlueprintId ? (
						<BlueprintDetail
							blueprintId={selectedBlueprintId}
							onBack={() => setView("blueprints")}
							onSelectAuthor={(author) => {
								setBlueprintFilters((f) => ({ ...f, author, search: "" }));
								setView("blueprints");
							}}
							allBlueprints={blueprints}
						/>
					) : view === "blueprints" ? null : view === "map-details" &&
						selectedMapId ? (
						<MapDetail
							mapId={selectedMapId}
							onBack={() => setView("maps")}
							onSelectAuthor={(author) => {
								setMapFilters((f) => ({ ...f, author, search: "" }));
								setView("maps");
							}}
							allMaps={maps}
						/>
					) : view === "maps" ? null : view === "mods" ? (
						<ModList
							mods={sortedMods}
							filters={filters}
							onUpdate={handleUpdate}
							onInstall={handleInstall}
							onUninstall={handleUninstall}
							onSelectMod={(id) => {
								setSelectedModId(id);
								setView("details");
							}}
							syncing={syncing}
							installingIds={installingIds}
						/>
					) : view === "details" && selectedModId ? (
						<ModDetail
							modId={selectedModId}
							onBack={() => setView("mods")}
							onUpdate={handleUpdate}
							onInstall={handleInstall}
							onUninstall={handleUninstall}
							installingIds={installingIds}
							allMods={mods}
						/>
					) : (
						<Settings
							activeProfile={activeProfile}
							onProfilesChanged={loadProfiles}
						/>
					)}
				</div>
				</div>
			</div>
			<StatusBar
				installedCount={installedCount}
				installedMapsCount={installedMapsCount}
				installedBlueprintsCount={installedBlueprintsCount}
				gameVersion={changelogVersion ?? savedGameVersion}
				appUpdate={appUpdate}
				onUpdateClick={() => setShowUpdateModal(true)}
				onChangelogClick={() => setShowChangelog(true)}
			/>
			{showUpdateModal && appUpdate && (
				<UpdateModal
					version={appUpdate.version}
					notes={appUpdate.notes}
					currentVersion={appVersion}
					onClose={() => setShowUpdateModal(false)}
				/>
			)}
			{showChangelog && (
				<ChangelogModal onClose={() => setShowChangelog(false)} />
			)}
		</div>
	);
}

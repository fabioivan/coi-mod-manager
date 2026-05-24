import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { ModDetail } from "@/pages/ModDetail";
import { ModList } from "@/pages/ModList";
import { Settings } from "@/pages/Settings";
import { type SidebarFilters, SORT_OPTIONS } from "@/types/filters";
import type { Mod } from "@/types/mod";
import type { Profile } from "@/types/profile";

function splitTags(category: string): string[] {
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

export default function App() {
	const { i18n, t } = useTranslation();
	const { toast } = useToast();
	const [mods, setMods] = useState<Mod[]>([]);
	const [syncing, setSyncing] = useState(false);
	const [installingIds, setInstallingIds] = useState<Set<string>>(new Set());
	const [view, setView] = useState<"mods" | "settings" | "details">("mods");
	const [selectedModId, setSelectedModId] = useState<string | null>(null);
	const [appUpdate, setAppUpdate] = useState<{
		version: string;
		notes?: string;
	} | null>(null);
	const [activeProfile, setActiveProfile] = useState<Profile | null>(null);

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
				variant: type === "error" ? "destructive" : type === "success" ? "success" : "default",
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
		let unlisten: (() => void) | undefined;

		async function init() {
			try {
				const lang = await invoke<string | null>("get_setting", {
					key: "language",
				});
				if (lang) i18n.changeLanguage(lang);
			} catch (_) {}

			await loadProfiles();

			try {
				const result = await invoke<Mod[]>("get_mods");
				setMods(result);
				if (result.length === 0) setSyncing(true);
			} catch (e) {
				console.error("Failed to load mods:", e);
			}

			unlisten = await listen("mods-updated", async () => {
				const result = await invoke<Mod[]>("get_mods");
				setMods(result);
				setSyncing(false);
			});

			await listen<string>("mods-sync-error", (e) => {
				console.error("Mods sync error:", e.payload);
				showToast(translateError(e.payload, t), "error");
			});

			await listen<{ version: string; notes?: string }>(
				"update-available",
				(e) => {
					setAppUpdate(e.payload);
					showToast(
						t("toast.update_available", { version: e.payload.version }),
						"info",
					);
				},
			);

			await listen<{ version: string }>("update-installed", (e) => {
				showToast(
					t("toast.update_installed", { version: e.payload.version }),
					"success",
				);
			});

			await listen("update-restart", () => {
				showToast(t("toast.update_restart"), "success");
			});

			await listen("update-progress", () => {
				// progress UI not yet implemented
			});

			await listen<number>("mods-updated-notification", (e) => {
				const count = e.payload;
				showToast(t("toast.mods_updated", { count }), "success");
			});
		}

		init();
		return () => {
			unlisten?.();
		};
	}, [i18n, t, showToast, loadProfiles]);

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

	useEffect(() => {
		const sortChanged = filters.sortBy !== prevSortRef.current;
		const timeChanged = filters.timeRange !== prevTimeRef.current;
		prevSortRef.current = filters.sortBy;
		prevTimeRef.current = filters.timeRange;
		if (!sortChanged && !timeChanged) return;
		if (mods.length === 0) return;
		handleRefresh();
	}, [filters.sortBy, filters.timeRange, mods.length, handleRefresh]);

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

	async function handleInstall(mod: Mod, version?: string, versionDownloadUrl?: string) {
		setInstallingIds((prev) => new Set([...prev, mod.id]));
		try {
			await invoke("install_mod", { modId: mod.id, version: version ?? null, versionDownloadUrl: versionDownloadUrl ?? null });
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

	const tags = useMemo(() => {
		const set = new Set<string>();
		for (const m of mods) {
			for (const t of splitTags(m.category)) {
				set.add(t);
			}
		}
		return [...set].sort();
	}, [mods]);

	const tagCounts = useMemo(() => {
		const counts: Record<string, number> = {};
		for (const m of mods) {
			for (const t of splitTags(m.category)) {
				counts[t] = (counts[t] ?? 0) + 1;
			}
		}
		return counts;
	}, [mods]);

	const gameVersions = useMemo(() => {
		const set = new Set<string>();
		mods.forEach((m) => {
			if (m.game_version) set.add(m.game_version);
		});
		return [...set].sort((a, b) =>
			b.localeCompare(a, undefined, { numeric: true }),
		);
	}, [mods]);

	const outdatedCount = useMemo(
		() =>
			mods.filter(
				(m) => m.is_installed && m.version_installed !== m.version_available,
			).length,
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

	return (
		<div
			style={{
				display: "flex",
				height: "100vh",
				backgroundColor: "#2f2f2f",
				color: "#f8f8f8",
				overflow: "hidden",
			}}
		>
			<Toaster />
			<Sidebar
				tags={tags}
				counts={tagCounts}
				total={mods.length}
				gameVersions={gameVersions}
				filters={filters}
				onFiltersChange={setFilters}
			/>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					flex: 1,
					minWidth: 0,
				}}
			>
				<TopBar
					outdatedCount={outdatedCount}
					onRefresh={handleRefresh}
					onUpdateAll={handleUpdateAll}
					loading={syncing}
					view={view}
					onViewChange={setView}
					appUpdate={appUpdate}
					activeProfile={activeProfile}
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
				{view === "mods" ? (
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
					<Settings activeProfile={activeProfile} onProfilesChanged={loadProfiles} />
				)}
			</div>
		</div>
	);
}

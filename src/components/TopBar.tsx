import { ArrowLeft, Download, LogIn, RefreshCw, Settings, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TabView } from "@/components/NavSidebar";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/types/profile";
import type { LoginStatus } from "@/types/login";

interface UpdateInfo {
	version: string;
	notes?: string;
}

interface TopBarProps {
	outdatedCount: number;
	onRefresh: () => void;
	onUpdateAll: () => void;
	onBlueprintSync: () => void;
	onMapSync: () => void;
	blueprintSyncing: boolean;
	mapSyncing: boolean;
	loading: boolean;
	view: TabView;
	onViewChange: (v: TabView) => void;
	appUpdate?: UpdateInfo | null;
	onInstallUpdate?: () => void;
	activeProfile?: Profile | null;
	loginStatus?: LoginStatus;
	onLoginOpen?: () => void;
	onLoginLogout?: () => void;
}

const C = {
	darkerGrey: "#292929",
	borderGrey: "#222222",
	metaGrey: "#a0a0a0",
	yellow: "#e5ca5f",
};

export function TopBar({
	outdatedCount,
	onRefresh,
	onUpdateAll,
	onBlueprintSync,
	onMapSync,
	blueprintSyncing,
	mapSyncing,
	loading,
	view,
	onViewChange,
	appUpdate,
	onInstallUpdate,
	activeProfile,
	loginStatus,
	onLoginOpen,
	onLoginLogout,
}: TopBarProps) {
	const { t } = useTranslation();
	return (
		<div
			style={{
				height: "42px",
				borderBottom: `1px solid ${C.borderGrey}`,
				padding: "0 16px",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				backgroundColor: C.darkerGrey,
				flexShrink: 0,
				position: "relative",
			}}
		>
			{loading && <div className="sync-progress-bar" />}

			<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
				{activeProfile && (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "4px",
							fontSize: "11px",
							color: C.yellow,
							fontWeight: 600,
							backgroundColor: "rgba(229,202,95,0.1)",
							padding: "2px 8px",
							borderRadius: "4px",
							border: `1px solid rgba(229,202,95,0.2)`,
						}}
					>
						<User size={11} />
						{activeProfile.name}
						{activeProfile.is_default && (
							<span
								style={{
									fontSize: "9px",
									opacity: 0.7,
									marginLeft: "2px",
								}}
							>
								({t("profile.default")})
							</span>
						)}
					</div>
				)}
				{appUpdate && (
					<>
						<span
							style={{ fontSize: "12px", color: "#81c784", fontWeight: 600 }}
						>
							{t("topBar.app_update_available", { version: appUpdate.version })}
						</span>
						<Button
							onClick={onInstallUpdate}
							size="sm"
							style={{ padding: "6px 14px", height: "auto" }}
							className="bg-[#2e7d32] text-[#e8f5e9] hover:bg-[#2e7d32]/90 text-[11px] font-bold uppercase"
						>
							<Download size={10} />
							{t("topBar.btn_install_update")}
						</Button>
					</>
				)}
				{outdatedCount > 0 && view !== "blueprints" && view !== "maps" && (
					<>
						<span
							style={{ fontSize: "12px", color: C.yellow, fontWeight: 600 }}
						>
							{t("topBar.outdated_count", { count: outdatedCount })}
						</span>
						<Button
							onClick={onUpdateAll}
							size="sm"
							style={{ padding: "6px 14px", height: "auto" }}
							className="text-[11px] font-bold uppercase"
						>
							{t("topBar.btn_update_all")}
						</Button>
					</>
				)}
			</div>

			<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
				<Button
					onClick={loginStatus === "signed_in" ? onLoginLogout : onLoginOpen}
					variant="ghost"
					size="sm"
					style={{ padding: "6px 10px", height: "auto" }}
					className="text-[11px] text-muted-foreground font-semibold tracking-wide"
				>
					<LogIn
						size={12}
						style={{
							color: loginStatus === "signed_in" ? "#81c784" : undefined,
						}}
					/>
					{loginStatus === "signed_in"
						? t("login.sign_out")
						: loginStatus === "loading"
							? "..."
							: t("login.sign_in")}
				</Button>
				{view === "blueprints" && (
					<Button
						onClick={onBlueprintSync}
						disabled={blueprintSyncing}
						variant="ghost"
						size="sm"
						style={{ padding: "6px 14px", height: "auto" }}
						className="text-[12px] text-muted-foreground uppercase font-semibold tracking-wide"
					>
						<RefreshCw
							size={12}
							className={blueprintSyncing ? "animate-spin" : ""}
						/>
						{blueprintSyncing ? t("topBar.btn_syncing") : "Sync"}
					</Button>
				)}
				{view === "maps" && (
					<Button
						onClick={onMapSync}
						disabled={mapSyncing}
						variant="ghost"
						size="sm"
						style={{ padding: "6px 14px", height: "auto" }}
						className="text-[12px] text-muted-foreground uppercase font-semibold tracking-wide"
					>
						<RefreshCw size={12} className={mapSyncing ? "animate-spin" : ""} />
						{mapSyncing ? t("topBar.btn_syncing") : "Sync"}
					</Button>
				)}
				{view === "mods" && (
					<Button
						onClick={onRefresh}
						disabled={loading}
						variant="ghost"
						size="sm"
						style={{ padding: "6px 14px", height: "auto" }}
						className="text-[12px] text-muted-foreground uppercase font-semibold tracking-wide"
					>
						<RefreshCw size={12} className={loading ? "animate-spin" : ""} />
						{loading ? t("topBar.btn_syncing") : t("topBar.btn_sync")}
					</Button>
				)}
				{(view === "details" ||
					view === "blueprint-details" ||
					view === "map-details") && (
					<Button
						onClick={() =>
							onViewChange(
								view === "blueprint-details"
									? "blueprints"
									: view === "map-details"
										? "maps"
										: "mods",
							)
						}
						title={t("topBar.tooltip_back")}
						variant="ghost"
						size="icon"
						className="h-7 w-7 text-muted-foreground"
					>
						<ArrowLeft size={15} />
					</Button>
				)}
				<Button
					onClick={() =>
						onViewChange(view === "settings" ? "mods" : "settings")
					}
					title={
						view === "settings"
							? t("topBar.tooltip_back")
							: t("topBar.tooltip_settings")
					}
					variant="ghost"
					size="icon"
					className="h-7 w-7 text-muted-foreground"
				>
					{view === "settings" ? (
						<ArrowLeft size={15} />
					) : (
						<Settings size={15} />
					)}
				</Button>
			</div>
		</div>
	);
}

import { invoke } from "@tauri-apps/api/core";
import { ArrowUpCircle, Folder, Gamepad2, Package } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

const C = {
	bar: "#1a1a1a",
	text: "#a0a0a0",
	accent: "#e5ca5f",
	metaGrey: "#a0a0a0",
};

function formatSize(bytes: number): string {
	if (bytes === 0) return "0 B";
	const units = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	const val = bytes / 1024 ** i;
	return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

interface StatusBarProps {
	installedCount: number;
	gameVersion: string | null;
	appUpdate: { version: string; notes?: string } | null;
	onUpdateClick: () => void;
	onChangelogClick: () => void;
}

export function StatusBar({
	installedCount,
	gameVersion,
	appUpdate,
	onUpdateClick,
	onChangelogClick,
}: StatusBarProps) {
	const { t } = useTranslation();
	const [folderSize, setFolderSize] = useState<string | null>(null);
	const [appVersion, setAppVersion] = useState<string>("");

	useEffect(() => {
		invoke<string>("get_app_version")
			.then(setAppVersion)
			.catch(() => {});
	}, []);

	useEffect(() => {
		let cancelled = false;
		async function load() {
			try {
				const bytes = await invoke<number | null>("get_mods_folder_size");
				if (!cancelled && bytes !== null) {
					setFolderSize(formatSize(bytes));
				}
			} catch {
				if (!cancelled) setFolderSize(null);
			}
		}
		load();
		return () => {
			cancelled = true;
		};
	}, [installedCount]);

	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: "20px",
				padding: "6px 16px",
				backgroundColor: C.bar,
				borderTop: "1px solid #222",
				fontSize: "11px",
				color: C.text,
				flexShrink: 0,
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
				<Gamepad2 size={12} color={C.accent} />
				{t("statusBar.game_version")}:
				<span style={{ color: "#c6c6c6", fontWeight: 600 }}>
					{gameVersion ?? "—"}
				</span>
			</div>

			<div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
				<Folder size={12} color={C.accent} />
				{t("statusBar.folder_size")}:
				<span style={{ color: "#c6c6c6", fontWeight: 600 }}>
					{folderSize ?? "—"}
				</span>
			</div>

			<div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
				<Package size={12} color={C.accent} />
				{t("statusBar.installed")}:
				<span style={{ color: "#c6c6c6", fontWeight: 600 }}>
					{installedCount}
				</span>
			</div>

			<div
				style={{
					marginLeft: "auto",
					display: "flex",
					alignItems: "center",
					gap: "8px",
				}}
			>
				{appUpdate && (
					<Button
						onClick={onUpdateClick}
						variant="ghost"
						size="sm"
						style={{
							color: "#81c784",
							gap: "4px",
							padding: "2px 6px",
							fontSize: "11px",
							height: "auto",
						}}
						title={t("statusBar.update_available")}
					>
						<ArrowUpCircle size={13} />
						<span style={{ fontWeight: 600 }}>
							{t("statusBar.update_available")}
						</span>
					</Button>
				)}
				<Button
					onClick={onChangelogClick}
					variant="ghost"
					size="sm"
					style={{
						color: C.metaGrey,
						padding: "2px 6px",
						fontSize: "11px",
						height: "auto",
					}}
					title="View changelog"
				>
					{t("statusBar.app_version", { version: appVersion || "—" })}
				</Button>
			</div>
		</div>
	);
}

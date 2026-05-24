import { invoke } from "@tauri-apps/api/core";
import { Folder, Gamepad2, Package } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const C = {
	bar: "#1a1a1a",
	text: "#a0a0a0",
	accent: "#e5ca5f",
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
}

export function StatusBar({ installedCount, gameVersion }: StatusBarProps) {
	const { t } = useTranslation();
	const [folderSize, setFolderSize] = useState<string | null>(null);

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
		</div>
	);
}

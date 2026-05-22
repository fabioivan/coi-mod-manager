import { invoke } from "@tauri-apps/api/core";
import { FolderOpen, Globe, ScanSearch, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

const C = {
	darkerGrey: "#292929",
	borderGrey: "#222222",
	grey: "#414141",
	metaGrey: "#a0a0a0",
	lighterGrey: "#c6c6c6",
	yellow: "#e5ca5f",
	white: "#f8f8f8",
};

const OS_LABELS: Record<string, string> = {
	linux: "Linux",
	windows: "Windows",
	macos: "macOS",
};

const LANGUAGES = ["pt-BR", "en"];

export function Settings() {
	const { t, i18n } = useTranslation();
	const [modsFolder, setModsFolder] = useState("");
	const [saved, setSaved] = useState(false);
	const [detecting, setDetecting] = useState(false);
	const [scanning, setScanning] = useState(false);
	const [detectMsg, setDetectMsg] = useState<string | null>(null);
	const [scanMsg, setScanMsg] = useState<string | null>(null);
	const [os, setOs] = useState<string>("");
	const [language, setLanguage] = useState("pt-BR");
	const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(true);

	useEffect(() => {
		invoke<string | null>("get_setting", { key: "mods_folder" }).then((v) => {
			if (v) setModsFolder(v);
		});
		invoke<string | null>("get_setting", { key: "language" }).then((v) => {
			if (v) {
				setLanguage(v);
				i18n.changeLanguage(v);
			}
		});
		invoke<string | null>("get_setting", { key: "auto_update_enabled" }).then(
			(v) => {
				if (v !== null) setAutoUpdateEnabled(v === "true");
			},
		);
		const p = navigator.platform.toLowerCase();
		if (p.includes("win")) setOs("windows");
		else if (p.includes("linux")) setOs("linux");
		else if (p.includes("mac")) setOs("macos");
	}, [i18n]);

	async function handleBrowse() {
		const folder = await invoke<string | null>("pick_folder");
		if (folder) {
			setModsFolder(folder);
			setSaved(false);
			setDetectMsg(null);
		}
	}

	async function handleDetect() {
		setDetecting(true);
		setDetectMsg(null);
		try {
			const folder = await invoke<string | null>("detect_mods_folder");
			if (folder) {
				setModsFolder(folder);
				setDetectMsg(t("settings.folder_found"));
				setSaved(false);
			} else {
				setDetectMsg(t("settings.folder_not_found"));
			}
		} finally {
			setDetecting(false);
		}
	}

	async function handleSave() {
		await invoke("set_setting", { key: "mods_folder", value: modsFolder });
		setSaved(true);
		setTimeout(() => setSaved(false), 2500);
		handleScan();
	}

	async function handleScan() {
		setScanning(true);
		setScanMsg(null);
		try {
			const count = await invoke<number>("scan_installed_mods");
			setScanMsg(t("settings.scan_result", { count }));
		} catch (e) {
			setScanMsg(t("settings.scan_error", { error: String(e) }));
		} finally {
			setScanning(false);
		}
	}

	async function handleLanguageChange(lang: string) {
		setLanguage(lang);
		i18n.changeLanguage(lang);
		await invoke("set_setting", { key: "language", value: lang });
	}

	async function handleAutoUpdateToggle(enabled: boolean) {
		setAutoUpdateEnabled(enabled);
		await invoke("set_setting", {
			key: "auto_update_enabled",
			value: enabled ? "true" : "false",
		});
	}

	return (
		<div
			style={{
				flex: 1,
				overflowY: "auto",
				padding: "32px",
				backgroundColor: "#2f2f2f",
				color: C.white,
			}}
		>
			<h2
				style={{
					fontSize: "16px",
					fontWeight: 700,
					marginBottom: "24px",
					color: C.lighterGrey,
					textTransform: "uppercase",
					letterSpacing: "1px",
				}}
			>
				{t("settings.title")}
			</h2>

			{/* Language section */}
			<div
				style={{
					backgroundColor: C.darkerGrey,
					border: `1px solid ${C.borderGrey}`,
					borderRadius: "6px",
					padding: "20px",
					maxWidth: "600px",
					marginBottom: "16px",
				}}
			>
				<h3
					style={{
						fontSize: "12px",
						fontWeight: 700,
						color: C.yellow,
						textTransform: "uppercase",
						letterSpacing: "1px",
						marginBottom: "6px",
					}}
				>
					{t("settings.language")}
				</h3>
				<p
					style={{
						fontSize: "12px",
						color: C.metaGrey,
						marginBottom: "16px",
						lineHeight: "1.5",
					}}
				>
					{t("settings.language_desc")}
				</p>
				<div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
					<Globe size={14} style={{ color: C.metaGrey, flexShrink: 0 }} />
					<select
						value={language}
						onChange={(e) => handleLanguageChange(e.target.value)}
						style={{
							padding: "6px 28px 6px 10px",
							fontSize: "12px",
							backgroundColor: C.grey,
							border: `1px solid ${C.borderGrey}`,
							borderRadius: "4px",
							color: C.white,
							outline: "none",
							cursor: "pointer",
							appearance: "none",
							WebkitAppearance: "none",
							backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="none" stroke="%23e5ca5f" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m2 5 6 6 6-6"/></svg>')`,
							backgroundRepeat: "no-repeat",
							backgroundPosition: "right 6px center",
							backgroundSize: "10px",
						}}
					>
						{LANGUAGES.map((l) => (
							<option
								key={l}
								value={l}
								style={{ backgroundColor: C.grey, color: C.white }}
							>
								{t(`settings.lang_${l}`)}
							</option>
						))}
					</select>
				</div>
			</div>

			{/* Auto-update section */}
			<div
				style={{
					backgroundColor: C.darkerGrey,
					border: `1px solid ${C.borderGrey}`,
					borderRadius: "6px",
					padding: "20px",
					maxWidth: "600px",
					marginBottom: "16px",
				}}
			>
				<h3
					style={{
						fontSize: "12px",
						fontWeight: 700,
						color: C.yellow,
						textTransform: "uppercase",
						letterSpacing: "1px",
						marginBottom: "6px",
					}}
				>
					{t("settings.auto_update")}
				</h3>
				<p
					style={{
						fontSize: "12px",
						color: C.metaGrey,
						marginBottom: "16px",
						lineHeight: "1.5",
					}}
				>
					{t("settings.auto_update_desc")}
				</p>

				<label
					style={{
						display: "flex",
						alignItems: "center",
						gap: "8px",
						cursor: "pointer",
						fontSize: "12px",
						color: C.white,
					}}
				>
					<input
						type="checkbox"
						checked={autoUpdateEnabled}
						onChange={(e) => handleAutoUpdateToggle(e.target.checked)}
						style={{
							accentColor: C.yellow,
							width: "14px",
							height: "14px",
							cursor: "pointer",
						}}
					/>
					{t("settings.auto_update_enabled")}
				</label>
			</div>

			{/* Section: Localização dos Mods */}
			<div
				style={{
					backgroundColor: C.darkerGrey,
					border: `1px solid ${C.borderGrey}`,
					borderRadius: "6px",
					padding: "20px",
					maxWidth: "600px",
					marginBottom: "16px",
				}}
			>
				<h3
					style={{
						fontSize: "12px",
						fontWeight: 700,
						color: C.yellow,
						textTransform: "uppercase",
						letterSpacing: "1px",
						marginBottom: "6px",
					}}
				>
					{t("settings.localization")}
				</h3>
				<p
					style={{
						fontSize: "12px",
						color: C.metaGrey,
						marginBottom: "16px",
						lineHeight: "1.5",
					}}
				>
					{t("settings.localization_desc")}
					{os && (
						<span
							style={{
								display: "block",
								marginTop: "4px",
								color: C.lighterGrey,
							}}
						>
							{t("settings.detected_os")}{" "}
							<strong style={{ color: C.yellow }}>{OS_LABELS[os] ?? os}</strong>
						</span>
					)}
				</p>

				<div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
					<input
						type="text"
						value={modsFolder}
						onChange={(e) => {
							setModsFolder(e.target.value);
							setSaved(false);
							setDetectMsg(null);
						}}
						placeholder={t("settings.folder_placeholder")}
						title={t("settings.folder_title")}
						style={{
							flex: 1,
							padding: "6px 10px",
							fontSize: "12px",
							backgroundColor: C.grey,
							border: `1px solid ${C.borderGrey}`,
							borderRadius: "4px",
							color: C.white,
							outline: "none",
							fontFamily: "monospace",
						}}
					/>
					<Button
						onClick={handleBrowse}
						title={t("settings.folder_title")}
						variant="outline"
						size="sm"
						style={{ padding: "6px 14px", height: "auto" }}
						className="border-[#222222] text-[#c6c6c6] hover:bg-[#414141] text-[11px] font-bold uppercase"
					>
						<FolderOpen size={13} />
						{t("settings.browse")}
					</Button>
				</div>

				<div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
					<Button
						onClick={handleDetect}
						disabled={detecting}
						variant="outline"
						size="sm"
						style={{ padding: "6px 14px", height: "auto" }}
						className="border-[#414141] text-[#c6c6c6] hover:bg-[#414141] text-[11px] font-semibold uppercase"
					>
						<Search size={11} />
						{detecting ? t("settings.detecting") : t("settings.detect")}
					</Button>

					<Button
						onClick={handleSave}
						disabled={!modsFolder}
						size="sm"
						style={{ padding: "6px 14px", height: "auto" }}
						className="text-[11px] font-bold uppercase"
					>
						{saved ? t("common.saved") : t("common.save")}
					</Button>
				</div>

				{detectMsg && (
					<p
						style={{
							marginTop: "10px",
							fontSize: "11px",
							color: detectMsg.includes("Não") ? "#e57373" : "#81c784",
						}}
					>
						{detectMsg}
					</p>
				)}
			</div>

			{/* Section: Mods Instalados */}
			<div
				style={{
					backgroundColor: C.darkerGrey,
					border: `1px solid ${C.borderGrey}`,
					borderRadius: "6px",
					padding: "20px",
					maxWidth: "600px",
				}}
			>
				<h3
					style={{
						fontSize: "12px",
						fontWeight: 700,
						color: C.yellow,
						textTransform: "uppercase",
						letterSpacing: "1px",
						marginBottom: "6px",
					}}
				>
					{t("settings.installed_mods")}
				</h3>
				<p
					style={{
						fontSize: "12px",
						color: C.metaGrey,
						marginBottom: "16px",
						lineHeight: "1.5",
					}}
				>
					{t("settings.installed_desc")}
					{t("settings.installed_desc2")}
				</p>

				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<Button
						onClick={handleScan}
						disabled={scanning || !modsFolder}
						size="sm"
						style={{ padding: "6px 14px", height: "auto" }}
						className="text-[11px] font-bold uppercase"
					>
						<ScanSearch size={12} />
						{scanning ? t("settings.scanning") : t("settings.scan")}
					</Button>
				</div>

				{scanMsg && (
					<p
						style={{
							marginTop: "10px",
							fontSize: "11px",
							color:
								scanMsg.includes("Error") || scanMsg.includes("Erro")
									? "#e57373"
									: "#81c784",
						}}
					>
						{scanMsg}
					</p>
				)}
			</div>
		</div>
	);
}

import { invoke } from "@tauri-apps/api/core";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import {
	Check,
	Download,
	FolderOpen,
	Globe,
	Plus,
	ScanSearch,
	Search,
	Trash2,
	Upload,
	User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/types/profile";

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

const LANGUAGES = ["pt-BR", "en", "zh-CN"];

interface SettingsProps {
	activeProfile?: Profile | null;
	onProfilesChanged?: () => void;
}

export function Settings({ activeProfile, onProfilesChanged }: SettingsProps) {
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
	const [gameVersion, setGameVersion] = useState("");
	const [gameVersionSaved, setGameVersionSaved] = useState(false);
	const [detectingVersion, setDetectingVersion] = useState(false);
	const [gameVersionMsg, setGameVersionMsg] = useState<string | null>(null);
	const [profiles, setProfiles] = useState<Profile[]>([]);
	const [importing, setImporting] = useState(false);

	async function loadProfiles() {
		try {
			const result = await invoke<Profile[]>("get_profiles");
			setProfiles(result);
		} catch (_) {}
	}

	useEffect(() => {
		loadProfiles();
	}, []);

	useEffect(() => {
		invoke<string | null>("get_setting", { key: "mods_folder" }).then((v) => {
			if (v) setModsFolder(v);
		});
		invoke<string | null>("get_setting", { key: "game_version" }).then((v) => {
			if (v) setGameVersion(v);
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

	async function handleDetectGameVersion() {
		setDetectingVersion(true);
		setGameVersionMsg(null);
		try {
			const result = await invoke<string | null>("detect_game_version");
			if (result) {
				setGameVersion(result);
				setGameVersionMsg(t("settings.version_found"));
			} else {
				setGameVersionMsg(t("settings.version_not_found"));
			}
		} catch (_) {
			setGameVersionMsg(t("settings.version_not_found"));
		} finally {
			setDetectingVersion(false);
		}
	}

	async function handleSaveGameVersion() {
		await invoke("set_setting", { key: "game_version", value: gameVersion });
		setGameVersionSaved(true);
		setTimeout(() => setGameVersionSaved(false), 2500);
	}

	async function handleImport() {
		const code = window.prompt(t("profile.import_prompt"));
		if (!code?.trim()) return;
		setImporting(true);
		try {
			await invoke<{ profile: Profile; mods_installed: number }>(
				"import_profile",
				{ data: code.trim() },
			);
			await loadProfiles();
			if (onProfilesChanged) onProfilesChanged();
		} catch (e) {
			alert(String(e));
		} finally {
			setImporting(false);
		}
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

			{/* Game Version section */}
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
					{t("settings.game_version")}
				</h3>
				<p
					style={{
						fontSize: "12px",
						color: C.metaGrey,
						marginBottom: "16px",
						lineHeight: "1.5",
					}}
				>
					{t("settings.game_version_desc")}
				</p>

				<div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
					<input
						type="text"
						value={gameVersion}
						onChange={(e) => {
							setGameVersion(e.target.value);
							setGameVersionSaved(false);
							setGameVersionMsg(null);
						}}
						placeholder={t("settings.game_version_placeholder")}
						style={{
							flex: 1,
							padding: "6px 10px",
							fontSize: "12px",
							backgroundColor: C.grey,
							border: `1px solid ${C.borderGrey}`,
							borderRadius: "4px",
							color: C.white,
							outline: "none",
						}}
					/>
					<Button
						onClick={handleDetectGameVersion}
						disabled={detectingVersion}
						variant="outline"
						size="sm"
						style={{ padding: "6px 14px", height: "auto" }}
						className="border-[#414141] text-[#c6c6c6] hover:bg-[#414141] text-[11px] font-semibold uppercase"
					>
						<Search size={11} />
						{detectingVersion ? t("common.detecting") : t("settings.detect")}
					</Button>
				</div>

				<div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
					<Button
						onClick={handleSaveGameVersion}
						disabled={!gameVersion}
						size="sm"
						style={{ padding: "6px 14px", height: "auto" }}
						className="text-[11px] font-bold uppercase"
					>
						{gameVersionSaved ? t("common.saved") : t("common.save")}
					</Button>
				</div>

				{gameVersionMsg && (
					<p
						style={{
							marginTop: "10px",
							fontSize: "11px",
							color:
								gameVersionMsg.includes("encontrado") ||
								gameVersionMsg.includes("found")
									? "#81c784"
									: "#e57373",
						}}
					>
						{gameVersionMsg}
					</p>
				)}
			</div>

			{/* Profile section */}
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
					{t("profile.title")}
				</h3>
				<p
					style={{
						fontSize: "12px",
						color: C.metaGrey,
						marginBottom: "16px",
						lineHeight: "1.5",
					}}
				>
					{t("profile.settings_desc")}
				</p>

				{profiles.length === 0 ? (
					<p
						style={{
							fontSize: "12px",
							color: C.metaGrey,
							marginBottom: "12px",
						}}
					>
						{t("profile.select_desc")}
					</p>
				) : (
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "8px",
							marginBottom: "16px",
							maxHeight: "210px",
							overflowY: "auto",
						}}
					>
						{profiles.map((p) => {
							const isActive = activeProfile?.id === p.id;
							return (
								<div
									key={p.id}
									style={{
										display: "flex",
										alignItems: "center",
										gap: "10px",
										backgroundColor: C.grey,
										border: `1px solid ${isActive ? C.yellow : C.borderGrey}`,
										borderRadius: "6px",
										padding: "12px 14px",
									}}
								>
									<User
										size={16}
										style={{
											color: isActive ? C.yellow : C.metaGrey,
											flexShrink: 0,
										}}
									/>
									<div style={{ flex: 1, minWidth: 0 }}>
										<div
											style={{
												fontSize: "13px",
												fontWeight: 600,
												color: C.white,
											}}
										>
											{p.name}
											{p.is_default && (
												<span
													style={{
														fontSize: "10px",
														color: C.yellow,
														marginLeft: "8px",
														fontWeight: 700,
														textTransform: "uppercase",
													}}
												>
													{t("profile.default")}
												</span>
											)}
											{isActive && (
												<span
													style={{
														fontSize: "10px",
														color: "#81c784",
														marginLeft: "8px",
														fontWeight: 700,
													}}
												>
													{t("profile.current")}
												</span>
											)}
										</div>
										<div
											style={{
												fontSize: "11px",
												color: C.metaGrey,
												marginTop: "2px",
											}}
										>
											{t("profile.mod_count", { count: p.mod_count })}
										</div>
									</div>
									<div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
										{!isActive && (
											<Button
												onClick={async () => {
													try {
														await invoke("switch_profile", { profileId: p.id });
														await loadProfiles();
														if (onProfilesChanged) onProfilesChanged();
													} catch (e) {
														alert(String(e));
													}
												}}
												size="sm"
												variant="outline"
												style={{
													padding: "4px 10px",
													height: "auto",
													fontSize: "10px",
												}}
												className="border-[#414141] text-[#c6c6c6] hover:bg-[#414141] font-semibold uppercase"
											>
												{t("profile.select")}
											</Button>
										)}
										{!p.is_default && (
											<Button
												onClick={async () => {
													try {
														await invoke("set_default_profile", {
															profileId: p.id,
														});
														await loadProfiles();
														if (onProfilesChanged) onProfilesChanged();
													} catch (e) {
														console.error(e);
													}
												}}
												size="sm"
												variant="outline"
												style={{
													padding: "4px 8px",
													height: "auto",
													fontSize: "10px",
												}}
												className="border-[#414141] text-[#c6c6c6] hover:bg-[#414141] font-semibold uppercase"
												title={t("profile.set_default")}
											>
												<Check size={10} />
											</Button>
										)}
										<Button
											onClick={async () => {
												try {
													const code = await invoke<string>("export_profile", {
														profileId: p.id,
													});
													await writeText(code);
													alert(t("profile.export_copied"));
												} catch (e) {
													alert(String(e));
												}
											}}
											size="sm"
											variant="outline"
											style={{
												padding: "4px 8px",
												height: "auto",
												fontSize: "10px",
											}}
											className="border-[#414141] text-[#c6c6c6] hover:bg-[#414141] font-semibold uppercase"
											title={t("profile.export_btn")}
										>
											<Download size={10} />
										</Button>
										{!p.is_default && !isActive && (
											<Button
												onClick={async () => {
													if (!window.confirm(t("profile.delete_confirm")))
														return;
													try {
														await invoke("delete_profile", { profileId: p.id });
														await loadProfiles();
														if (onProfilesChanged) onProfilesChanged();
													} catch (e) {
														alert(String(e));
													}
												}}
												size="sm"
												variant="outline"
												style={{
													padding: "4px 8px",
													height: "auto",
													fontSize: "10px",
												}}
												className="border-[#414141] text-[#e57373] hover:bg-[#414141] font-semibold uppercase"
												title={t("profile.delete")}
											>
												<Trash2 size={10} />
											</Button>
										)}
									</div>
								</div>
							);
						})}
					</div>
				)}

				<div
					style={{
						display: "flex",
						gap: "8px",
						flexWrap: "wrap",
						alignItems: "center",
					}}
				>
					<Button
						onClick={async () => {
							const name = window.prompt(t("profile.name_placeholder"));
							if (!name?.trim()) return;
							try {
								await invoke("create_profile", { name: name.trim() });
								await loadProfiles();
								if (onProfilesChanged) onProfilesChanged();
							} catch (e) {
								console.error(e);
							}
						}}
						size="sm"
						variant="outline"
						style={{ padding: "6px 14px", height: "auto" }}
						className="border-[#414141] text-[#c6c6c6] hover:bg-[#414141] text-[11px] font-semibold uppercase"
					>
						<Plus size={11} />
						{t("profile.create_new")}
					</Button>
					<Button
						onClick={handleImport}
						disabled={importing}
						size="sm"
						variant="outline"
						style={{ padding: "6px 14px", height: "auto" }}
						className="border-[#414141] text-[#c6c6c6] hover:bg-[#414141] text-[11px] font-semibold uppercase"
					>
						<Upload size={11} />
						{importing ? t("profile.importing") : t("profile.import_btn")}
					</Button>
				</div>
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

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { FolderOpen, Search, ScanSearch, Globe } from "lucide-react";

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

  useEffect(() => {
    invoke<string | null>("get_setting", { key: "mods_folder" }).then((v) => {
      if (v) setModsFolder(v);
    });
    invoke<string | null>("get_setting", { key: "language" }).then((v) => {
      if (v) { setLanguage(v); i18n.changeLanguage(v); }
    });
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

  return (
    <div style={{
      flex: 1,
      overflowY: "auto",
      padding: "32px",
      backgroundColor: "#2f2f2f",
      color: C.white,
    }}>
      <h2 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "24px", color: C.lighterGrey, textTransform: "uppercase", letterSpacing: "1px" }}>
        {t("settings.title")}
      </h2>

      {/* Language section */}
      <div style={{
        backgroundColor: C.darkerGrey,
        border: `1px solid ${C.borderGrey}`,
        borderRadius: "6px",
        padding: "20px",
        maxWidth: "600px",
        marginBottom: "16px",
      }}>
        <h3 style={{ fontSize: "12px", fontWeight: 700, color: C.yellow, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
          {t("settings.language")}
        </h3>
        <p style={{ fontSize: "12px", color: C.metaGrey, marginBottom: "16px", lineHeight: "1.5" }}>
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
              <option key={l} value={l} style={{ backgroundColor: C.grey, color: C.white }}>
                {t("settings.lang_" + l)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Section: Localização dos Mods */}
      <div style={{
        backgroundColor: C.darkerGrey,
        border: `1px solid ${C.borderGrey}`,
        borderRadius: "6px",
        padding: "20px",
        maxWidth: "600px",
        marginBottom: "16px",
      }}>
        <h3 style={{ fontSize: "12px", fontWeight: 700, color: C.yellow, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
          {t("settings.localization")}
        </h3>
        <p style={{ fontSize: "12px", color: C.metaGrey, marginBottom: "16px", lineHeight: "1.5" }}>
          {t("settings.localization_desc")}
          {os && (
            <span style={{ display: "block", marginTop: "4px", color: C.lighterGrey }}>
              {t("settings.detected_os")} <strong style={{ color: C.yellow }}>{OS_LABELS[os] ?? os}</strong>
            </span>
          )}
        </p>

        <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
          <input
            type="text"
            value={modsFolder}
            onChange={(e) => { setModsFolder(e.target.value); setSaved(false); setDetectMsg(null); }}
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
          <button
            onClick={handleBrowse}
            title={t("settings.folder_title")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "6px 12px",
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              backgroundColor: C.grey,
              color: C.lighterGrey,
              border: `1px solid ${C.borderGrey}`,
              borderRadius: "4px",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <FolderOpen size={13} />
            {t("settings.browse")}
          </button>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={handleDetect}
            disabled={detecting}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "5px 12px",
              fontSize: "11px",
              fontWeight: 600,
              textTransform: "uppercase",
              backgroundColor: "transparent",
              color: detecting ? C.metaGrey : C.lighterGrey,
              border: `1px solid ${C.grey}`,
              borderRadius: "4px",
              cursor: detecting ? "default" : "pointer",
            }}
          >
            <Search size={11} />
            {detecting ? t("settings.detecting") : t("settings.detect")}
          </button>

          <button
            onClick={handleSave}
            disabled={!modsFolder}
            style={{
              padding: "5px 16px",
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              backgroundColor: modsFolder ? C.yellow : C.grey,
              color: modsFolder ? C.borderGrey : C.metaGrey,
              border: "none",
              borderRadius: "4px",
              cursor: modsFolder ? "pointer" : "default",
            }}
          >
            {saved ? t("common.saved") : t("common.save")}
          </button>
        </div>

        {detectMsg && (
          <p style={{ marginTop: "10px", fontSize: "11px", color: detectMsg.includes("Não") ? "#e57373" : "#81c784" }}>
            {detectMsg}
          </p>
        )}
      </div>

      {/* Section: Mods Instalados */}
      <div style={{
        backgroundColor: C.darkerGrey,
        border: `1px solid ${C.borderGrey}`,
        borderRadius: "6px",
        padding: "20px",
        maxWidth: "600px",
      }}>
        <h3 style={{ fontSize: "12px", fontWeight: 700, color: C.yellow, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
          {t("settings.installed_mods")}
        </h3>
        <p style={{ fontSize: "12px", color: C.metaGrey, marginBottom: "16px", lineHeight: "1.5" }}>
          {t("settings.installed_desc")}
          {t("settings.installed_desc2")}
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={handleScan}
            disabled={scanning || !modsFolder}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "5px 14px",
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              backgroundColor: modsFolder ? C.yellow : C.grey,
              color: modsFolder ? C.borderGrey : C.metaGrey,
              border: "none",
              borderRadius: "4px",
              cursor: (scanning || !modsFolder) ? "default" : "pointer",
              opacity: scanning ? 0.7 : 1,
            }}
          >
            <ScanSearch size={12} />
            {scanning ? t("settings.scanning") : t("settings.scan")}
          </button>
        </div>

        {scanMsg && (
          <p style={{ marginTop: "10px", fontSize: "11px", color: scanMsg.includes("Error") || scanMsg.includes("Erro") ? "#e57373" : "#81c784" }}>
            {scanMsg}
          </p>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { FolderOpen, Search, ScanSearch } from "lucide-react";

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

export function Settings() {
  const [modsFolder, setModsFolder] = useState("");
  const [saved, setSaved] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [detectMsg, setDetectMsg] = useState<string | null>(null);
  const [scanMsg, setScanMsg] = useState<string | null>(null);
  const [os, setOs] = useState<string>("");

  useEffect(() => {
    invoke<string | null>("get_setting", { key: "mods_folder" }).then((v) => {
      if (v) setModsFolder(v);
    });
    // Detect OS from Tauri
    invoke<string>("detect_os").catch(() => {
      // fallback: try to infer from path separator
    });
    // Use navigator platform as best-effort OS hint
    const p = navigator.platform.toLowerCase();
    if (p.includes("win")) setOs("windows");
    else if (p.includes("linux")) setOs("linux");
    else if (p.includes("mac")) setOs("macos");
  }, []);

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
        setDetectMsg("Pasta encontrada automaticamente.");
        setSaved(false);
      } else {
        setDetectMsg("Não foi possível detectar automaticamente. Selecione manualmente.");
      }
    } finally {
      setDetecting(false);
    }
  }

  async function handleSave() {
    await invoke("set_setting", { key: "mods_folder", value: modsFolder });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    // Auto-scan após salvar
    handleScan();
  }

  async function handleScan() {
    setScanning(true);
    setScanMsg(null);
    try {
      const count = await invoke<number>("scan_installed_mods");
      setScanMsg(`${count} mod${count !== 1 ? "s" : ""} instalado${count !== 1 ? "s" : ""} detectado${count !== 1 ? "s" : ""}.`);
    } catch (e) {
      setScanMsg(`Erro ao verificar: ${e}`);
    } finally {
      setScanning(false);
    }
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
        Configurações
      </h2>

      {/* Seção: Localização dos Mods */}
      <div style={{
        backgroundColor: C.darkerGrey,
        border: `1px solid ${C.borderGrey}`,
        borderRadius: "6px",
        padding: "20px",
        maxWidth: "600px",
      }}>
        <h3 style={{ fontSize: "12px", fontWeight: 700, color: C.yellow, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
          Localização dos Mods
        </h3>
        <p style={{ fontSize: "12px", color: C.metaGrey, marginBottom: "16px", lineHeight: "1.5" }}>
          Caminho da pasta onde o Captain of Industry armazena os mods instalados.
          {os && (
            <span style={{ display: "block", marginTop: "4px", color: C.lighterGrey }}>
              Sistema detectado: <strong style={{ color: C.yellow }}>{OS_LABELS[os] ?? os}</strong>
            </span>
          )}
        </p>

        {/* Input + botão procurar */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
          <input
            type="text"
            value={modsFolder}
            onChange={(e) => { setModsFolder(e.target.value); setSaved(false); setDetectMsg(null); }}
            placeholder="Caminho da pasta de mods..."
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
            title="Selecionar pasta"
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
            Procurar
          </button>
        </div>

        {/* Botão detectar + salvar */}
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
            {detecting ? "Detectando..." : "Detectar automaticamente"}
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
            {saved ? "Salvo!" : "Salvar"}
          </button>
        </div>

        {/* Mensagem feedback detecção */}
        {detectMsg && (
          <p style={{ marginTop: "10px", fontSize: "11px", color: detectMsg.includes("Não") ? "#e57373" : "#81c784" }}>
            {detectMsg}
          </p>
        )}
      </div>

      {/* Seção: Mods Instalados */}
      <div style={{
        backgroundColor: C.darkerGrey,
        border: `1px solid ${C.borderGrey}`,
        borderRadius: "6px",
        padding: "20px",
        maxWidth: "600px",
        marginTop: "16px",
      }}>
        <h3 style={{ fontSize: "12px", fontWeight: 700, color: C.yellow, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
          Mods Instalados
        </h3>
        <p style={{ fontSize: "12px", color: C.metaGrey, marginBottom: "16px", lineHeight: "1.5" }}>
          Verifica a pasta de mods e atualiza o status de instalação na lista.
          Requer a pasta configurada e salva acima.
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
            {scanning ? "Verificando..." : "Verificar mods instalados"}
          </button>
        </div>

        {scanMsg && (
          <p style={{ marginTop: "10px", fontSize: "11px", color: scanMsg.includes("Erro") ? "#e57373" : "#81c784" }}>
            {scanMsg}
          </p>
        )}
      </div>
    </div>
  );
}

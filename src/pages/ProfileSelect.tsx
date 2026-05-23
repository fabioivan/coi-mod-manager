import { useState } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { Profile, ImportResult } from "@/types/profile";
import { Check, Plus, Trash2, Upload, Download } from "lucide-react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

const C = {
  darkerGrey: "#292929",
  borderGrey: "#222222",
  grey: "#414141",
  metaGrey: "#a0a0a0",
  lighterGrey: "#c6c6c6",
  yellow: "#e5ca5f",
  white: "#f8f8f8",
  green: "#4caf50",
};

interface ProfileSelectProps {
  profiles: Profile[];
  onProfileSelected: (profile: Profile) => void;
  onProfilesChanged: () => void;
}

export function ProfileSelect({ profiles, onProfileSelected, onProfilesChanged }: ProfileSelectProps) {
  const { t } = useTranslation();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setError(null);
    try {
      const profile = await invoke<Profile>("create_profile", { name });
      setCreating(false);
      setNewName("");
      onProfilesChanged();
      onProfileSelected(profile);
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleSetDefault(profileId: string) {
    try {
      await invoke("set_default_profile", { profileId });
      onProfilesChanged();
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleExport(profileId: string) {
    try {
      const code = await invoke<string>("export_profile", { profileId });
      await writeText(code);
      setError(null);
      alert(t("profile.export_copied"));
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleImport() {
    const code = window.prompt(t("profile.import_prompt"));
    if (!code?.trim()) return;
    setImporting(true);
    setImportMsg(null);
    try {
      const result = await invoke<ImportResult>("import_profile", { data: code.trim() });
      setImportMsg(t("profile.import_done", { name: result.profile.name, count: result.mods_installed }));
      onProfilesChanged();
      if (window.confirm(t("profile.import_activate", { name: result.profile.name }))) {
        const refreshed = await invoke<Profile[]>("get_profiles");
        const imported = refreshed.find((p) => p.id === result.profile.id);
        if (imported) onProfileSelected(imported);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setImporting(false);
    }
  }

  async function handleDelete(profileId: string) {
    try {
      await invoke("delete_profile", { profileId });
      onProfilesChanged();
    } catch (e) {
      setError(String(e));
    }
  }

  if (profiles.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          backgroundColor: "#2f2f2f",
          color: C.white,
        }}
      >
        <div
          style={{
            backgroundColor: C.darkerGrey,
            border: `1px solid ${C.borderGrey}`,
            borderRadius: "8px",
            padding: "32px",
            maxWidth: "400px",
            width: "90%",
          }}
        >
          <h2
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: C.yellow,
              marginBottom: "8px",
              textAlign: "center",
            }}
          >
            {t("profile.create_title")}
          </h2>
          <p
            style={{
              fontSize: "12px",
              color: C.metaGrey,
              marginBottom: "20px",
              textAlign: "center",
              lineHeight: "1.5",
            }}
          >
            {t("profile.create_desc")}
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder={t("profile.name_placeholder")}
              autoFocus
              style={{
                flex: 1,
                padding: "10px 12px",
                fontSize: "13px",
                backgroundColor: C.grey,
                border: `1px solid ${C.borderGrey}`,
                borderRadius: "4px",
                color: C.white,
                outline: "none",
              }}
            />
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              style={{
                padding: "10px 20px",
                fontSize: "12px",
                fontWeight: 700,
                backgroundColor: C.yellow,
                border: "none",
                borderRadius: "4px",
                color: "#1a1a1a",
                cursor: newName.trim() ? "pointer" : "not-allowed",
                opacity: newName.trim() ? 1 : 0.5,
              }}
            >
              {t("profile.create")}
            </button>
          </div>
          {error && (
            <p style={{ marginTop: "12px", fontSize: "11px", color: "#e57373" }}>{error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        backgroundColor: "#2f2f2f",
        color: C.white,
      }}
    >
      <div
        style={{
          backgroundColor: C.darkerGrey,
          border: `1px solid ${C.borderGrey}`,
          borderRadius: "8px",
          padding: "32px",
          maxWidth: "500px",
          width: "90%",
        }}
      >
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 700,
            color: C.yellow,
            marginBottom: "4px",
            textAlign: "center",
          }}
        >
          {t("profile.select_title")}
        </h2>
        <p
          style={{
            fontSize: "12px",
            color: C.metaGrey,
            marginBottom: "20px",
            textAlign: "center",
          }}
        >
          {t("profile.select_desc")}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
          {profiles.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                backgroundColor: C.grey,
                border: `1px solid ${p.is_default ? C.yellow : C.borderGrey}`,
                borderRadius: "6px",
                padding: "12px 14px",
              }}
            >
              <div style={{ flex: 1 }}>
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
                </div>
                <div style={{ fontSize: "11px", color: C.metaGrey, marginTop: "2px" }}>
                  {t("profile.mod_count", { count: p.mod_count })}
                </div>
              </div>
              <button
                onClick={() => onProfileSelected(p)}
                style={{
                  padding: "6px 14px",
                  fontSize: "11px",
                  fontWeight: 700,
                  backgroundColor: C.green,
                  border: "none",
                  borderRadius: "4px",
                  color: "#fff",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {t("profile.select")}
              </button>
              <button
                onClick={() => handleExport(p.id)}
                title={t("profile.export_btn")}
                style={{
                  padding: "6px",
                  fontSize: "11px",
                  backgroundColor: "transparent",
                  border: `1px solid ${C.metaGrey}`,
                  borderRadius: "4px",
                  color: C.metaGrey,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Download size={12} />
              </button>
              {!p.is_default && (
                <button
                  onClick={() => handleSetDefault(p.id)}
                  title={t("profile.set_default")}
                  style={{
                    padding: "6px",
                    fontSize: "11px",
                    backgroundColor: "transparent",
                    border: `1px solid ${C.metaGrey}`,
                    borderRadius: "4px",
                    color: C.metaGrey,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Check size={12} />
                </button>
              )}
              <button
                onClick={() => handleDelete(p.id)}
                title={t("profile.delete")}
                style={{
                  padding: "6px",
                  fontSize: "11px",
                  backgroundColor: "transparent",
                  border: `1px solid "#6e2020"`,
                  borderRadius: "4px",
                  color: "#e57373",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>

        {creating ? (
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder={t("profile.name_placeholder")}
              autoFocus
              style={{
                flex: 1,
                padding: "8px 10px",
                fontSize: "12px",
                backgroundColor: C.grey,
                border: `1px solid ${C.borderGrey}`,
                borderRadius: "4px",
                color: C.white,
                outline: "none",
              }}
            />
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              style={{
                padding: "8px 16px",
                fontSize: "12px",
                fontWeight: 700,
                backgroundColor: C.yellow,
                border: "none",
                borderRadius: "4px",
                color: "#1a1a1a",
                cursor: newName.trim() ? "pointer" : "not-allowed",
                opacity: newName.trim() ? 1 : 0.5,
              }}
            >
              {t("profile.create")}
            </button>
            <button
              onClick={() => { setCreating(false); setNewName(""); }}
              style={{
                padding: "8px 12px",
                fontSize: "12px",
                backgroundColor: C.grey,
                border: `1px solid ${C.borderGrey}`,
                borderRadius: "4px",
                color: C.metaGrey,
                cursor: "pointer",
              }}
            >
              {t("common.cancel")}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              fontSize: "12px",
              fontWeight: 600,
              backgroundColor: "transparent",
              border: `1px dashed ${C.metaGrey}`,
              borderRadius: "4px",
              color: C.metaGrey,
              cursor: "pointer",
              width: "100%",
              justifyContent: "center",
            }}
          >
            <Plus size={14} />
            {t("profile.create_new")}
          </button>
        )}

        {importing && (
          <div style={{ marginTop: "12px", padding: "10px", backgroundColor: C.grey, borderRadius: "4px", fontSize: "12px", color: C.yellow, textAlign: "center" }}>
            {t("profile.importing")}
          </div>
        )}

        {!importing && (
          <button
            onClick={handleImport}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              marginTop: "8px",
              padding: "8px 16px",
              fontSize: "12px",
              fontWeight: 600,
              backgroundColor: "transparent",
              border: `1px dashed ${C.yellow}`,
              borderRadius: "4px",
              color: C.yellow,
              cursor: "pointer",
              width: "100%",
            }}
          >
            <Upload size={14} />
            {t("profile.import_btn")}
          </button>
        )}

        {error && (
          <p style={{ marginTop: "12px", fontSize: "11px", color: "#e57373" }}>{error}</p>
        )}
        {importMsg && (
          <p style={{ marginTop: "8px", fontSize: "11px", color: "#81c784", lineHeight: "1.4" }}>{importMsg}</p>
        )}
      </div>
    </div>
  );
}

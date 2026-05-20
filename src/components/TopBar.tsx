import { useTranslation } from "react-i18next";
import { RefreshCw, Settings, ArrowLeft, Download } from "lucide-react";

interface UpdateInfo {
  version: string;
  notes?: string;
}

interface TopBarProps {
  outdatedCount: number;
  onRefresh: () => void;
  onUpdateAll: () => void;
  loading: boolean;
  view: "mods" | "settings" | "details";
  onViewChange: (v: "mods" | "settings" | "details") => void;
  appUpdate?: UpdateInfo | null;
  onInstallUpdate?: () => void;
}

const C = {
  darkerGrey: "#292929",
  borderGrey: "#222222",
  metaGrey: "#a0a0a0",
  yellow: "#e5ca5f",
};

export function TopBar({ outdatedCount, onRefresh, onUpdateAll, loading, view, onViewChange, appUpdate, onInstallUpdate }: TopBarProps) {
  const { t } = useTranslation();
  return (
    <div style={{
      height: "42px",
      borderBottom: `1px solid ${C.borderGrey}`,
      padding: "0 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: C.darkerGrey,
      flexShrink: 0,
      position: "relative",
    }}>
      {/* Barra de progresso amarela no topo quando sincronizando */}
      {loading && <div className="sync-progress-bar" />}

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {appUpdate && (
          <>
            <span style={{ fontSize: "12px", color: "#81c784", fontWeight: 600 }}>
              {t("topBar.app_update_available", { version: appUpdate.version })}
            </span>
            <button
              onClick={onInstallUpdate}
              style={{
                display: "flex", alignItems: "center", gap: "4px",
                fontSize: "11px", backgroundColor: "#2e7d32", color: "#e8f5e9",
                fontWeight: 700, padding: "2px 10px", borderRadius: "2px",
                border: "none", cursor: "pointer", textTransform: "uppercase",
              }}
            >
              <Download size={10} />
              {t("topBar.btn_install_update")}
            </button>
          </>
        )}
        {outdatedCount > 0 && (
          <>
            <span style={{ fontSize: "12px", color: C.yellow, fontWeight: 600 }}>
              {t("topBar.outdated_count", { count: outdatedCount })}
            </span>
            <button
              onClick={onUpdateAll}
              style={{
                fontSize: "11px",
                backgroundColor: C.yellow,
                color: C.borderGrey,
                fontWeight: 700,
                padding: "2px 10px",
                borderRadius: "2px",
                border: "none",
                cursor: "pointer",
                textTransform: "uppercase",
              }}
            >
              {t("topBar.btn_update_all")}
            </button>
          </>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {view === "mods" && (
          <button
            onClick={onRefresh}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              color: C.metaGrey,
              background: "none",
              border: "none",
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.7 : 1,
              textTransform: "uppercase",
              fontWeight: 600,
              letterSpacing: "0.5px",
            }}
          >
            <RefreshCw
              size={12}
              style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }}
            />
            {loading ? t("topBar.btn_syncing") : t("topBar.btn_sync")}
          </button>
        )}
        <button
          onClick={() => onViewChange(view === "settings" ? "mods" : "settings")}
          title={view === "settings" ? t("topBar.tooltip_back") : t("topBar.tooltip_settings")}
          style={{
            display: "flex",
            alignItems: "center",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: view === "settings" ? C.yellow : C.metaGrey,
            padding: "2px",
          }}
        >
          {view === "settings" ? <ArrowLeft size={15} /> : <Settings size={15} />}
        </button>
      </div>
    </div>
  );
}

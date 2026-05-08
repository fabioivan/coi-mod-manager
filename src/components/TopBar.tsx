import { RefreshCw } from "lucide-react";

interface TopBarProps {
  outdatedCount: number;
  onRefresh: () => void;
  onUpdateAll: () => void;
  loading: boolean;
}

const C = {
  darkerGrey: "#292929",
  borderGrey: "#222222",
  metaGrey: "#a0a0a0",
  yellow: "#e5ca5f",
};

export function TopBar({ outdatedCount, onRefresh, onUpdateAll, loading }: TopBarProps) {
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
        {outdatedCount > 0 && (
          <>
            <span style={{ fontSize: "12px", color: C.yellow, fontWeight: 600 }}>
              {outdatedCount} mod{outdatedCount > 1 ? "s" : ""} para atualizar
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
              Atualizar tudo
            </button>
          </>
        )}
      </div>

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
        {loading ? "Sincronizando..." : "Sincronizar"}
      </button>
    </div>
  );
}

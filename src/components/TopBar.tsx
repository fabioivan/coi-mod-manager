import { RefreshCw, Bell } from "lucide-react";

interface TopBarProps {
  outdatedCount: number;
  onRefresh: () => void;
  onUpdateAll: () => void;
  loading: boolean;
}

export function TopBar({ outdatedCount, onRefresh, onUpdateAll, loading }: TopBarProps) {
  return (
    <div className="h-14 border-b border-zinc-800 px-5 flex items-center justify-between bg-zinc-950 shrink-0">
      <div className="flex items-center gap-2">
        {outdatedCount > 0 && (
          <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-md px-3 py-1.5">
            <Bell size={14} className="text-yellow-400" />
            <span className="text-xs text-yellow-300 font-medium">
              {outdatedCount} mod{outdatedCount > 1 ? "s" : ""} para atualizar
            </span>
            <button
              onClick={onUpdateAll}
              className="ml-2 text-xs bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-2 py-0.5 rounded transition-colors"
            >
              Atualizar tudo
            </button>
          </div>
        )}
      </div>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-100 transition-colors disabled:opacity-50"
      >
        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        {loading ? "Atualizando..." : "Verificar atualizações"}
      </button>
    </div>
  );
}

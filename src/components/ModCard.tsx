import { Mod, getModStatus } from "@/types/mod";
import { cn } from "@/lib/utils";
import { Download, RefreshCw, CheckCircle } from "lucide-react";

interface ModCardProps {
  mod: Mod;
  onUpdate: (mod: Mod) => void;
  onInstall: (mod: Mod) => void;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  installed: { label: "Instalado", color: "text-green-400" },
  outdated: { label: "Atualização disponível", color: "text-yellow-400" },
  not_installed: { label: "Não instalado", color: "text-zinc-500" },
};

export function ModCard({ mod, onUpdate, onInstall }: ModCardProps) {
  const status = getModStatus(mod);
  const { label, color } = STATUS_LABEL[status];

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 flex gap-4 items-start hover:border-zinc-500 transition-colors">
      {mod.thumbnail ? (
        <img src={mod.thumbnail} alt={mod.name} className="w-16 h-16 rounded object-cover shrink-0 bg-zinc-700" />
      ) : (
        <div className="w-16 h-16 rounded bg-zinc-700 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-zinc-100 truncate">{mod.name}</h3>
        <p className="text-xs text-zinc-500 mt-0.5">{mod.category}</p>
        <div className="flex items-center gap-3 mt-2">
          <span className={cn("text-xs", color)}>{label}</span>
          <span className="text-xs text-zinc-600">v{mod.version_available}</span>
          {status === "outdated" && (
            <span className="text-xs text-zinc-600">instalado: v{mod.version_installed}</span>
          )}
        </div>
      </div>
      <div className="shrink-0">
        {status === "outdated" && (
          <button
            onClick={() => onUpdate(mod)}
            className="flex items-center gap-1.5 text-xs bg-yellow-500 hover:bg-yellow-400 text-black font-medium px-3 py-1.5 rounded transition-colors"
          >
            <RefreshCw size={12} />
            Atualizar
          </button>
        )}
        {status === "not_installed" && (
          <button
            onClick={() => onInstall(mod)}
            className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium px-3 py-1.5 rounded transition-colors"
          >
            <Download size={12} />
            Instalar
          </button>
        )}
        {status === "installed" && (
          <CheckCircle size={18} className="text-green-500" />
        )}
      </div>
    </div>
  );
}

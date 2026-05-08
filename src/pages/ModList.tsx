import { useState, useMemo } from "react";
import { Mod, getModStatus } from "@/types/mod";
import { ModCard } from "@/components/ModCard";
import { Search } from "lucide-react";

interface ModListProps {
  mods: Mod[];
  selectedCategory: string | null;
  onUpdate: (mod: Mod) => void;
  onInstall: (mod: Mod) => void;
}

export function ModList({ mods, selectedCategory, onUpdate, onInstall }: ModListProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "installed" | "outdated">("all");

  const filtered = useMemo(() => {
    return mods.filter((mod) => {
      if (selectedCategory && mod.category !== selectedCategory) return false;
      if (search && !mod.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter === "installed") return mod.is_installed;
      if (filter === "outdated") return getModStatus(mod) === "outdated";
      return true;
    });
  }, [mods, selectedCategory, search, filter]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-5 py-3 flex gap-3 items-center border-b border-zinc-800 bg-zinc-950">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar mod..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "installed", "outdated"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded transition-colors ${
                filter === f
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {{ all: "Todos", installed: "Instalados", outdated: "Desatualizados" }[f]}
            </button>
          ))}
        </div>
        <span className="text-xs text-zinc-600 ml-auto">{filtered.length} mods</span>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-zinc-600 text-sm">
            Nenhum mod encontrado
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((mod) => (
              <ModCard key={mod.id} mod={mod} onUpdate={onUpdate} onInstall={onInstall} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils";

interface SidebarProps {
  categories: string[];
  selected: string | null;
  onSelect: (category: string | null) => void;
  counts: Record<string, number>;
}

export function Sidebar({ categories, selected, onSelect, counts }: SidebarProps) {
  return (
    <aside className="w-52 shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col">
      <div className="px-4 py-5 border-b border-zinc-800">
        <h1 className="text-sm font-bold text-zinc-100 tracking-wide">CoI Mod Manager</h1>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        <button
          onClick={() => onSelect(null)}
          className={cn(
            "w-full text-left px-4 py-2 text-sm flex justify-between items-center rounded-none transition-colors",
            selected === null
              ? "bg-zinc-700 text-white"
              : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          )}
        >
          <span>Todos</span>
          <span className="text-xs text-zinc-500">{Object.values(counts).reduce((a, b) => a + b, 0)}</span>
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className={cn(
              "w-full text-left px-4 py-2 text-sm flex justify-between items-center transition-colors",
              selected === cat
                ? "bg-zinc-700 text-white"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            )}
          >
            <span className="truncate">{cat}</span>
            <span className="text-xs text-zinc-500 ml-1">{counts[cat] ?? 0}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

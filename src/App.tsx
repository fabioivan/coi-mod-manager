import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { ModList } from "@/pages/ModList";
import { Settings } from "@/pages/Settings";
import { Mod } from "@/types/mod";
import { SidebarFilters, SORT_OPTIONS } from "@/types/filters";

function splitTags(category: string): string[] {
  return category.split(",").map((t) => t.trim()).filter(Boolean);
}

export default function App() {
  const [mods, setMods] = useState<Mod[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [installingIds, setInstallingIds] = useState<Set<string>>(new Set());
  const [view, setView] = useState<"mods" | "settings">("mods");
  const [appUpdate, setAppUpdate] = useState<{ version: string; notes?: string } | null>(null);
  const [filters, setFilters] = useState<SidebarFilters>({
    sortBy: "updated",
    timeRange: "all-time",
    selectedTag: null,
    devstates: [],
    gameVersion: "",
  });

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    async function init() {
      try {
        const result = await invoke<Mod[]>("get_mods");
        setMods(result);
        if (result.length === 0) setSyncing(true);
      } catch (e) {
        console.error("Erro ao carregar mods:", e);
      }

      unlisten = await listen("mods-updated", async () => {
        const result = await invoke<Mod[]>("get_mods");
        setMods(result);
        setSyncing(false);
      });

      await listen<{ version: string; notes?: string }>("update-available", (e) => {
        setAppUpdate(e.payload);
      });
    }

    init();
    return () => { unlisten?.(); };
  }, []);

  async function loadMods() {
    try {
      const result = await invoke<Mod[]>("get_mods");
      setMods(result);
    } catch (e) {
      console.error("Erro ao carregar mods:", e);
    }
  }

  async function handleRefresh() {
    setSyncing(true);
    const option = SORT_OPTIONS.find((o) => o.value === filters.sortBy);
    const orderBy = option?.apiValue ?? "updated";
    try {
      await invoke("sync_mods", { orderBy, timeRange: filters.timeRange });
    } catch (e) {
      console.error("Erro ao sincronizar:", e);
      setSyncing(false);
    }
  }

  async function handleUpdateAll() {
    setSyncing(true);
    try {
      await invoke("update_all_mods");
      await loadMods();
    } catch (e) {
      console.error("Erro ao atualizar:", e);
    } finally {
      setSyncing(false);
    }
  }

  async function handleUpdate(mod: Mod) {
    setInstallingIds((prev) => new Set([...prev, mod.id]));
    try {
      await invoke("update_mod", { modId: mod.id });
      await loadMods();
    } catch (e) {
      console.error("Erro ao atualizar mod:", e);
    } finally {
      setInstallingIds((prev) => { const s = new Set(prev); s.delete(mod.id); return s; });
    }
  }

  async function handleInstall(mod: Mod) {
    setInstallingIds((prev) => new Set([...prev, mod.id]));
    try {
      await invoke("install_mod", { modId: mod.id });
      await loadMods();
    } catch (e) {
      console.error("Erro ao instalar mod:", e);
    } finally {
      setInstallingIds((prev) => { const s = new Set(prev); s.delete(mod.id); return s; });
    }
  }

  const tags = useMemo(() => {
    const set = new Set<string>();
    mods.forEach((m) => splitTags(m.category).forEach((t) => set.add(t)));
    return [...set].sort();
  }, [mods]);

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    mods.forEach((m) =>
      splitTags(m.category).forEach((t) => {
        counts[t] = (counts[t] ?? 0) + 1;
      })
    );
    return counts;
  }, [mods]);

  const gameVersions = useMemo(() => {
    const set = new Set<string>();
    mods.forEach((m) => { if (m.game_version) set.add(m.game_version); });
    return [...set].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  }, [mods]);

  const outdatedCount = useMemo(
    () => mods.filter((m) => m.is_installed && m.version_installed !== m.version_available).length,
    [mods]
  );

  const sortedMods = useMemo(() => {
    const arr = [...mods];
    switch (filters.sortBy) {
      case "updated":
        arr.sort((a, b) => {
          if (!a.updated_at && !b.updated_at) return 0;
          if (!a.updated_at) return 1;
          if (!b.updated_at) return -1;
          return b.updated_at.localeCompare(a.updated_at);
        });
        break;
      case "popularity":
        arr.sort((a, b) => a.scrape_rank - b.scrape_rank);
        break;
      case "name_asc":
        arr.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name_desc":
        arr.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "game_version":
        arr.sort((a, b) => b.game_version.localeCompare(a.game_version, undefined, { numeric: true }));
        break;
    }
    return arr;
  }, [mods, filters.sortBy]);

  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#2f2f2f", color: "#f8f8f8", overflow: "hidden" }}>
      <Sidebar
        tags={tags}
        counts={tagCounts}
        total={mods.length}
        gameVersions={gameVersions}
        filters={filters}
        onFiltersChange={setFilters}
      />
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
        <TopBar
          outdatedCount={outdatedCount}
          onRefresh={handleRefresh}
          onUpdateAll={handleUpdateAll}
          loading={syncing}
          view={view}
          onViewChange={setView}
          appUpdate={appUpdate}
          onInstallUpdate={async () => {
            setSyncing(true);
            try { await invoke("install_update"); }
            catch (e) { console.error("Erro ao instalar update:", e); setSyncing(false); }
          }}
        />
        {view === "mods" ? (
          <ModList
            mods={sortedMods}
            filters={filters}
            onUpdate={handleUpdate}
            onInstall={handleInstall}
            syncing={syncing}
            installingIds={installingIds}
          />
        ) : (
          <Settings />
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { ModList } from "@/pages/ModList";
import { Mod } from "@/types/mod";

export default function App() {
  const [mods, setMods] = useState<Mod[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMods();
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
    setLoading(true);
    try {
      await invoke("sync_mods");
      await loadMods();
    } catch (e) {
      console.error("Erro ao sincronizar:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateAll() {
    setLoading(true);
    try {
      await invoke("update_all_mods");
      await loadMods();
    } catch (e) {
      console.error("Erro ao atualizar:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(mod: Mod) {
    await invoke("update_mod", { modId: mod.id });
    await loadMods();
  }

  async function handleInstall(mod: Mod) {
    await invoke("install_mod", { modId: mod.id });
    await loadMods();
  }

  const categories = useMemo(() => {
    const cats = [...new Set(mods.map((m) => m.category))].sort();
    return cats;
  }, [mods]);

  const categoryCounts = useMemo(() => {
    return mods.reduce<Record<string, number>>((acc, mod) => {
      acc[mod.category] = (acc[mod.category] ?? 0) + 1;
      return acc;
    }, {});
  }, [mods]);

  const outdatedCount = useMemo(() => {
    return mods.filter((m) => m.is_installed && m.version_installed !== m.version_available).length;
  }, [mods]);

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      <Sidebar
        categories={categories}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
        counts={categoryCounts}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar
          outdatedCount={outdatedCount}
          onRefresh={handleRefresh}
          onUpdateAll={handleUpdateAll}
          loading={loading}
        />
        <ModList
          mods={mods}
          selectedCategory={selectedCategory}
          onUpdate={handleUpdate}
          onInstall={handleInstall}
        />
      </div>
    </div>
  );
}

import { ChevronUp, Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ModCard } from "@/components/ModCard";
import { Button } from "@/components/ui/button";
import type { SidebarFilters } from "@/types/filters";
import { getModStatus, type Mod } from "@/types/mod";

interface ModListProps {
	mods: Mod[];
	filters: SidebarFilters;
	onUpdate: (mod: Mod) => void;
	onInstall: (mod: Mod, version?: string, versionDownloadUrl?: string) => void;
	onUninstall: (mod: Mod) => void;
	onSelectMod?: (id: string) => void;
	syncing?: boolean;
	installingIds?: Set<string>;
}

const C = {
	darkerGrey: "#292929",
	borderGrey: "#222222",
	grey: "#414141",
	metaGrey: "#a0a0a0",
	lighterGrey: "#c6c6c6",
	yellow: "#e5ca5f",
};

type StatusFilter = "all" | "installed" | "outdated";

export function ModList({
	mods,
	filters,
	onUpdate,
	onInstall,
	onUninstall,
	onSelectMod,
	syncing,
	installingIds,
}: ModListProps) {
	const { t } = useTranslation();
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const [showScrollTop, setShowScrollTop] = useState(false);
	const scrollRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		const onScroll = () => setShowScrollTop(el.scrollTop > 400);
		el.addEventListener("scroll", onScroll, { passive: true });
		return () => el.removeEventListener("scroll", onScroll);
	}, []);

	function scrollToTop() {
		scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
	}

	const filtered = useMemo(() => {
		return mods.filter((mod) => {
			// Categoria (sidebar)
			if (filters.selectedTag) {
				const tags = mod.category.split(",").map((t) => t.trim());
				if (!tags.includes(filters.selectedTag)) return false;
			}
			// Devstate (sidebar)
			if (
				filters.devstates.length > 0 &&
				!filters.devstates.includes(mod.devstate)
			)
				return false;
			// Versão do jogo (sidebar)
			if (filters.gameVersion && mod.game_version !== filters.gameVersion)
				return false;
			// Busca por nome
			if (search && !mod.name.toLowerCase().includes(search.toLowerCase()))
				return false;
			// Status (toolbar)
			if (statusFilter === "installed") return mod.is_installed;
			if (statusFilter === "outdated") return getModStatus(mod) === "outdated";
			return true;
		});
	}, [mods, filters, search, statusFilter]);

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				flex: 1,
				minHeight: 0,
			}}
		>
			{/* Toolbar */}
			<div
				style={{
					padding: "8px 16px",
					display: "flex",
					gap: "10px",
					alignItems: "center",
					borderBottom: `1px solid ${C.borderGrey}`,
					backgroundColor: C.darkerGrey,
					flexShrink: 0,
				}}
			>
				<div style={{ position: "relative", flex: "1", maxWidth: "320px" }}>
					<Search
						size={13}
						style={{
							position: "absolute",
							left: "8px",
							top: "50%",
							transform: "translateY(-50%)",
							color: C.metaGrey,
							pointerEvents: "none",
						}}
					/>
					<input
						type="text"
						placeholder={t("modList.search_placeholder")}
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						style={{
							width: "100%",
							paddingLeft: "28px",
							paddingRight: "10px",
							paddingTop: "5px",
							paddingBottom: "5px",
							fontSize: "12px",
							backgroundColor: C.grey,
							border: `1px solid ${C.borderGrey}`,
							borderRadius: "4px",
							color: "#f8f8f8",
							outline: "none",
							boxSizing: "border-box",
						}}
					/>
				</div>

				<div style={{ display: "flex", gap: "4px" }}>
					{(["all", "installed", "outdated"] as const).map((f) => (
						<Button
							key={f}
							onClick={() => setStatusFilter(f)}
							variant={statusFilter === f ? "default" : "outline"}
							size="sm"
							style={{ padding: "6px 16px", height: "auto" }}
							className={`text-[11px] font-semibold uppercase rounded-full ${
								statusFilter === f
									? ""
									: "border-[#414141] text-[#c6c6c6] hover:bg-[#414141]"
							}`}
						>
							{t(`modList.filter_${f}`)}
						</Button>
					))}
				</div>

				<span
					style={{ fontSize: "12px", color: C.metaGrey, marginLeft: "auto" }}
				>
					{t("common.mods_count", { count: filtered.length })}
				</span>
			</div>

			{/* Grid */}
			<div
				ref={scrollRef}
				style={{
					flex: 1,
					overflowY: "auto",
					padding: "16px",
					position: "relative",
				}}
			>
				{/* Overlay quando re-sincronizando com mods já carregados */}
				{syncing && mods.length > 0 && (
					<div
						style={{
							position: "absolute",
							inset: 0,
							backgroundColor: "rgba(41,41,41,0.55)",
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							justifyContent: "center",
							gap: "12px",
							zIndex: 5,
							backdropFilter: "blur(1px)",
						}}
					>
						<Loader2
							size={32}
							style={{
								animation: "spin 0.8s linear infinite",
								color: "#e5ca5f",
							}}
						/>
						<span
							style={{ color: "#c6c6c6", fontSize: "14px", fontWeight: 600 }}
						>
							{t("common.syncing")}
						</span>
					</div>
				)}
				{syncing && mods.length === 0 ? (
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							justifyContent: "center",
							height: "192px",
							gap: "12px",
							color: C.metaGrey,
							fontSize: "14px",
						}}
					>
						<Loader2
							size={28}
							style={{
								animation: "spin 0.8s linear infinite",
								color: C.lighterGrey,
							}}
						/>
						<span>{t("common.syncing_mods")}</span>
					</div>
				) : filtered.length === 0 ? (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							height: "128px",
							color: C.metaGrey,
							fontSize: "14px",
						}}
					>
						{t("common.no_mods_found")}
					</div>
				) : (
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
							gap: "12px",
						}}
					>
						{filtered.map((mod) => (
							<ModCard
								key={mod.id}
								mod={mod}
								onUpdate={onUpdate}
								onInstall={onInstall}
								onUninstall={onUninstall}
								onSelectMod={onSelectMod}
								installing={installingIds?.has(mod.id) ?? false}
								showUninstall={statusFilter === "installed"}
							/>
						))}
					</div>
				)}

				{showScrollTop && (
					<Button
						onClick={scrollToTop}
						size="icon"
						className="fixed bottom-6 right-6 w-10 h-10 rounded-full shadow-lg z-100"
						title={t("modList.back_to_top")}
					>
						<ChevronUp size={20} />
					</Button>
				)}
			</div>
		</div>
	);
}

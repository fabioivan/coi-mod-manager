import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BlueprintCard } from "@/components/BlueprintCard";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { Blueprint } from "@/types/blueprint";

interface BlueprintListProps {
	blueprints: Blueprint[];
}

export function BlueprintList({ blueprints }: BlueprintListProps) {
	const { t } = useTranslation();
	const [search, setSearch] = useState("");
	const [sortBy, setSortBy] = useState("updated");

	const filtered = useMemo(() => {
		let list = blueprints;

		if (search) {
			const q = search.toLowerCase();
			list = list.filter((bp) => bp.name.toLowerCase().includes(q));
		}

		list = [...list];
		switch (sortBy) {
			case "downloads":
				list.sort((a, b) => b.downloads - a.downloads);
				break;
			case "favorites":
				list.sort((a, b) => b.favorites - a.favorites);
				break;
			case "approval":
				list.sort((a, b) => b.approval_pct - a.approval_pct);
				break;
			default:
				list.sort((a, b) => {
					if (!a.updated_at || !b.updated_at) return 0;
					return (
						new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
					);
				});
		}

		return list;
	}, [blueprints, search, sortBy]);

	return (
		<div className="flex flex-col flex-1 min-h-0">
			<div
				className="flex items-stretch border-b border-[#1a1a1a] flex-shrink-0"
				style={{ background: "#2a2a2a", height: "44px" }}
			>
				{/* Sort dropdown — estilo site: texto dourado uppercase */}
				<Select value={sortBy} onValueChange={setSortBy}>
					<SelectTrigger
						className="rounded-none border-0 border-r border-[#1a1a1a] h-full text-xs font-bold uppercase tracking-wider px-4 gap-2 w-44 focus:ring-0 shadow-none"
						style={{ color: "#e5ca5f" }}
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="updated">{t("common.updated")}</SelectItem>
						<SelectItem value="downloads">{t("common.downloads")}</SelectItem>
						<SelectItem value="favorites">{t("common.favorites")}</SelectItem>
						<SelectItem value="approval">{t("common.approval")}</SelectItem>
					</SelectContent>
				</Select>

				{/* Campo de busca — ocupa o restante, ícone à direita */}
				<div className="relative flex-1 flex items-center">
					<input
						placeholder={t("blueprintList.search_placeholder")}
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="w-full h-full bg-transparent text-sm px-4 outline-none"
						style={{ color: "#c6c6c6" }}
					/>
					<Search
						size={15}
						className="absolute right-4 text-muted-foreground pointer-events-none"
					/>
				</div>

				{/* Contador */}
				<div className="flex items-center px-4 border-l border-[#1a1a1a] text-xs text-muted-foreground whitespace-nowrap">
					{t("blueprintList.blueprints_count", { count: filtered.length })}
				</div>
			</div>

			<div className="flex-1 overflow-y-auto p-3">
				{filtered.length === 0 ? (
					<div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
						{t("blueprintList.no_blueprints")}
					</div>
				) : (
					<div className="grid grid-cols-3 gap-3">
						{filtered.map((bp) => (
							<BlueprintCard key={bp.id} blueprint={bp} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}

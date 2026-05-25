import { ArrowUpDown, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BlueprintCard } from "@/components/BlueprintCard";
import { Input } from "@/components/ui/input";
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
			<div className="flex gap-2 p-3 items-center border-b border-[#222] bg-[#292929] flex-shrink-0">
				<div className="relative flex-1 max-w-xs">
					<Search
						size={13}
						className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
					/>
					<Input
						placeholder={t("blueprintList.search_placeholder")}
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="h-8 text-xs"
						style={{ paddingLeft: "1.75rem" }}
					/>
				</div>
				<Select value={sortBy} onValueChange={setSortBy}>
					<SelectTrigger className="w-44 h-8 text-xs gap-1.5">
						<ArrowUpDown size={11} className="text-muted-foreground flex-shrink-0" />
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="updated">{t("common.updated")}</SelectItem>
						<SelectItem value="downloads">{t("common.downloads")}</SelectItem>
						<SelectItem value="favorites">{t("common.favorites")}</SelectItem>
						<SelectItem value="approval">{t("common.approval")}</SelectItem>
					</SelectContent>
				</Select>
				<span className="text-xs text-muted-foreground ml-auto">
					{t("blueprintList.blueprints_count", {
						count: filtered.length,
					})}
				</span>
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

import { ChevronDown, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BlueprintCard } from "@/components/BlueprintCard";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import type { Blueprint } from "@/types/blueprint";

interface BlueprintListProps {
	blueprints: Blueprint[];
}

const SORT_OPTIONS = [
	{ value: "updated", labelKey: "common.updated" },
	{ value: "downloads", labelKey: "common.downloads" },
	{ value: "favorites", labelKey: "common.favorites" },
	{ value: "approval", labelKey: "common.approval" },
] as const;

const TOOLBAR: React.CSSProperties = {
	display: "flex",
	alignItems: "stretch",
	height: "44px",
	background: "#272727",
	borderBottom: "1px solid #1a1a1a",
	flexShrink: 0,
};

const SORT_TRIGGER: React.CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: "8px",
	height: "100%",
	padding: "0 14px",
	background: "transparent",
	border: "none",
	borderRight: "1px solid #1a1a1a",
	color: "#e5ca5f",
	fontSize: "11px",
	fontWeight: 700,
	letterSpacing: "0.08em",
	textTransform: "uppercase",
	cursor: "pointer",
	outline: "none",
	minWidth: "160px",
	whiteSpace: "nowrap",
};

const SEARCH_INPUT: React.CSSProperties = {
	flex: 1,
	height: "100%",
	background: "transparent",
	border: "none",
	padding: "0 2.5rem 0 1rem",
	color: "#c6c6c6",
	fontSize: "13px",
	outline: "none",
};

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

	const currentLabel = SORT_OPTIONS.find((o) => o.value === sortBy);

	return (
		<div className="flex flex-col flex-1 min-h-0">
			{/* Toolbar — estilo hub.coigame.com */}
			<div style={TOOLBAR}>
				{/* Dropdown de ordenação: texto dourado uppercase, sem bordas arredondadas */}
				<Select value={sortBy} onValueChange={setSortBy}>
					<SelectTrigger asChild>
						<button type="button" style={SORT_TRIGGER}>
							<span>{currentLabel ? t(currentLabel.labelKey) : ""}</span>
							<ChevronDown size={12} color="#e5ca5f" />
						</button>
					</SelectTrigger>
					<SelectContent>
						{SORT_OPTIONS.map((o) => (
							<SelectItem key={o.value} value={o.value}>
								{t(o.labelKey)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{/* Campo de busca: ocupa o restante, ícone à direita */}
				<div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center" }}>
					<input
						placeholder={t("blueprintList.search_placeholder")}
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						style={SEARCH_INPUT}
					/>
					<Search
						size={15}
						color="#555"
						style={{ position: "absolute", right: "1rem", pointerEvents: "none" }}
					/>
				</div>

				{/* Contador */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						padding: "0 14px",
						borderLeft: "1px solid #1a1a1a",
						fontSize: "11px",
						color: "#666",
						whiteSpace: "nowrap",
					}}
				>
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

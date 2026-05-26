import { ChevronDown, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BlueprintCard } from "@/components/BlueprintCard";
import { ScrollTopButton } from "@/components/ScrollTopButton";
import { useScrollTop } from "@/hooks/useScrollTop";
import type { Blueprint } from "@/types/blueprint";

export interface BlueprintListFilters {
	search: string;
	orderBy: BlueprintOrderValue;
	timeRange: BlueprintTimeValue;
	author: string | null;
}

interface BlueprintListProps {
	blueprints: Blueprint[];
	onSelectBlueprint?: (id: string) => void;
	filters: BlueprintListFilters;
	onFiltersChange: (filters: BlueprintListFilters) => void;
}

const PAGE_SIZE = 30;

const ORDER_OPTIONS = [
	{ value: "popularity", labelKey: "filters.popularity" },
	{ value: "score", labelKey: "filters.score" },
	{ value: "latest", labelKey: "filters.latest" },
	{ value: "updated", labelKey: "filters.updated" },
	{ value: "downloads", labelKey: "filters.downloads" },
	{ value: "favorites", labelKey: "filters.favorites" },
] as const;

const TIME_OPTIONS = [
	{ value: "all-time", labelKey: "filters.time_all" },
	{ value: "past-week", labelKey: "filters.time_week" },
	{ value: "past-month", labelKey: "filters.time_month" },
	{ value: "past-year", labelKey: "filters.time_year" },
] as const;

export type BlueprintOrderValue = (typeof ORDER_OPTIONS)[number]["value"];
export type BlueprintTimeValue = (typeof TIME_OPTIONS)[number]["value"];

// keep local aliases for internal use
type OrderValue = BlueprintOrderValue;
type TimeValue = BlueprintTimeValue;

function applyTimeFilter(list: Blueprint[], timeRange: TimeValue): Blueprint[] {
	if (timeRange === "all-time") return list;
	const now = Date.now();
	const cutoffs: Record<TimeValue, number> = {
		"all-time": 0,
		"past-week": 7 * 24 * 60 * 60 * 1000,
		"past-month": 30 * 24 * 60 * 60 * 1000,
		"past-year": 365 * 24 * 60 * 60 * 1000,
	};
	const cutoff = now - cutoffs[timeRange];
	return list.filter((bp) => {
		if (!bp.updated_at) return false;
		return new Date(bp.updated_at).getTime() >= cutoff;
	});
}

function applySort(list: Blueprint[], orderBy: OrderValue): Blueprint[] {
	const sorted = [...list];
	switch (orderBy) {
		case "popularity":
		case "downloads":
			sorted.sort((a, b) => b.downloads - a.downloads);
			break;
		case "score":
			sorted.sort((a, b) => b.approval_pct - a.approval_pct);
			break;
		case "favorites":
			sorted.sort((a, b) => b.favorites - a.favorites);
			break;
		case "latest":
		case "updated":
		default:
			sorted.sort((a, b) => {
				if (!a.updated_at || !b.updated_at) return 0;
				return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
			});
	}
	return sorted;
}

const SELECT_STYLE: React.CSSProperties = {
	height: "100%",
	padding: "0 2rem 0 12px",
	background: "transparent",
	border: "none",
	color: "#e5ca5f",
	fontSize: "11px",
	fontWeight: 700,
	letterSpacing: "0.06em",
	textTransform: "uppercase",
	cursor: "pointer",
	appearance: "none",
	outline: "none",
	minWidth: "130px",
};

export function BlueprintList({
	blueprints,
	onSelectBlueprint,
	filters,
	onFiltersChange,
}: BlueprintListProps) {
	const { t, i18n } = useTranslation();
	const { search, orderBy, timeRange, author } = filters;
	const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

	const setSearch = (v: string) => { setVisibleCount(PAGE_SIZE); onFiltersChange({ ...filters, search: v }); };
	const setOrderBy = (v: OrderValue) => { setVisibleCount(PAGE_SIZE); onFiltersChange({ ...filters, orderBy: v }); };
	const setTimeRange = (v: TimeValue) => { setVisibleCount(PAGE_SIZE); onFiltersChange({ ...filters, timeRange: v }); };
	const clearAuthor = () => { setVisibleCount(PAGE_SIZE); onFiltersChange({ ...filters, author: null }); };
	const sentinelRef = useRef<HTMLDivElement>(null);
	const { scrollRef, show: showScrollTop, scrollToTop } = useScrollTop();

	const handleSelect = useCallback((id: string) => {
		onSelectBlueprint?.(id);
	}, [onSelectBlueprint]);

	const authorLabel = t("blueprintCard.by_author");
	const noDateLabel = t("blueprintCard.no_date");

	const filtered = useMemo(() => {
		let list = blueprints;
		if (author) {
			const a = author.toLowerCase();
			list = list.filter((bp) => bp.author?.toLowerCase() === a);
		}
		if (search) {
			const q = search.toLowerCase();
			list = list.filter((bp) => bp.name.toLowerCase().includes(q));
		}
		list = applyTimeFilter(list, timeRange);
		list = applySort(list, orderBy);
		return list;
	}, [blueprints, search, orderBy, timeRange, author]);

	const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
	const hasMore = visibleCount < filtered.length;

	// IntersectionObserver: carrega mais quando sentinel entra na viewport
	useEffect(() => {
		const sentinel = sentinelRef.current;
		if (!sentinel || !hasMore) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					setVisibleCount((n) => n + PAGE_SIZE);
				}
			},
			{ root: scrollRef.current, rootMargin: "200px" },
		);

		observer.observe(sentinel);
		return () => observer.disconnect();
	}, [hasMore, scrollRef]);

	return (
		<div className="flex flex-col flex-1 min-h-0">
			<div
				style={{
					display: "flex",
					alignItems: "stretch",
					height: "44px",
					background: "#272727",
					borderBottom: "1px solid #1a1a1a",
					flexShrink: 0,
				}}
			>
				{/* Dropdown 1: Ordenação */}
				<div
					style={{
						position: "relative",
						display: "flex",
						alignItems: "center",
						borderRight: "1px solid #1a1a1a",
					}}
				>
					<select
						value={orderBy}
						onChange={(e) => setOrderBy(e.target.value as OrderValue)}
						style={SELECT_STYLE}
					>
						{ORDER_OPTIONS.map((o) => (
							<option key={o.value} value={o.value}>
								{t(o.labelKey)}
							</option>
						))}
					</select>
					<ChevronDown
						size={11}
						color="#e5ca5f"
						style={{ position: "absolute", right: "8px", pointerEvents: "none" }}
					/>
				</div>

				{/* Dropdown 2: Período */}
				<div
					style={{
						position: "relative",
						display: "flex",
						alignItems: "center",
						borderRight: "1px solid #1a1a1a",
					}}
				>
					<select
						value={timeRange}
						onChange={(e) => setTimeRange(e.target.value as TimeValue)}
						style={SELECT_STYLE}
					>
						{TIME_OPTIONS.map((o) => (
							<option key={o.value} value={o.value}>
								{t(o.labelKey)}
							</option>
						))}
					</select>
					<ChevronDown
						size={11}
						color="#e5ca5f"
						style={{ position: "absolute", right: "8px", pointerEvents: "none" }}
					/>
				</div>

				{/* Campo de busca */}
				<div
					style={{
						flex: 1,
						position: "relative",
						display: "flex",
						alignItems: "center",
					}}
				>
					<input
						placeholder={t("blueprintList.search_placeholder")}
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						style={{
							width: "100%",
							height: "100%",
							background: "transparent",
							border: "none",
							padding: "0 2.5rem 0 1rem",
							color: "#c6c6c6",
							fontSize: "13px",
							outline: "none",
						}}
					/>
					<Search
						size={15}
						color="#555"
						style={{ position: "absolute", right: "1rem", pointerEvents: "none" }}
					/>
				</div>

				{/* Chip de autor ativo */}
				{author && (
					<div style={{
						display: "flex",
						alignItems: "center",
						gap: "6px",
						padding: "0 10px",
						borderLeft: "1px solid #1a1a1a",
						fontSize: "11px",
						color: "#e5ca5f",
						whiteSpace: "nowrap",
					}}>
						<span>{author}</span>
						<button
							type="button"
							onClick={clearAuthor}
							style={{
								background: "none",
								border: "none",
								color: "#a0a0a0",
								cursor: "pointer",
								padding: "0",
								fontSize: "14px",
								lineHeight: 1,
								display: "flex",
								alignItems: "center",
							}}
							title={t("blueprintList.clear_author")}
						>
							×
						</button>
					</div>
				)}

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

			<div
				ref={scrollRef}
				className="flex-1 overflow-y-auto p-3"
				style={{ position: "relative" }}
			>
				{filtered.length === 0 ? (
					<div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
						{t("blueprintList.no_blueprints")}
					</div>
				) : (
					<>
						<div className="grid grid-cols-3 gap-3">
							{visible.map((bp) => (
								<BlueprintCard
									key={bp.id}
									blueprint={bp}
									onSelect={handleSelect}
									locale={i18n.language}
									authorLabel={authorLabel}
									noDateLabel={noDateLabel}
								/>
							))}
						</div>

						{/* Sentinel para infinite scroll */}
						{hasMore && (
							<div
								ref={sentinelRef}
								style={{ height: "1px", marginTop: "32px" }}
							/>
						)}
					</>
				)}

				<ScrollTopButton show={showScrollTop} onClick={scrollToTop} />
			</div>
		</div>
	);
}

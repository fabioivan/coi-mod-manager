import { useTranslation } from "react-i18next";
import {
	type SidebarFilters,
	SORT_OPTIONS,
	TIME_RANGE_OPTIONS,
} from "@/types/filters";
import { DEVSTATE_LABELS, DEVSTATE_STYLES } from "@/types/mod";

interface SidebarProps {
	tags: string[];
	counts: Record<string, number>;
	total: number;
	gameVersions: string[];
	filters: SidebarFilters;
	onFiltersChange: (f: SidebarFilters) => void;
	detectedGameVersion?: string | null;
}

const C = {
	darkerGrey: "#292929",
	borderGrey: "#222222",
	grey: "#414141",
	yellow: "#e5ca5f",
	metaGrey: "#a0a0a0",
	lighterGrey: "#c6c6c6",
	white: "#ffffff",
	lightGrey: "#f8f8f8",
};

// Matches .form-select from site.css exactly:
// bg #414141, no border, yellow uppercase text, yellow SVG chevron
const selectStyle: React.CSSProperties = {
	width: "100%",
	backgroundColor: C.grey,
	border: "none",
	borderRadius: "4px",
	color: C.yellow,
	fontWeight: 700,
	fontSize: "12px",
	textTransform: "uppercase",
	padding: "4px 28px 4px 8px",
	outline: "none",
	cursor: "pointer",
	appearance: "none",
	WebkitAppearance: "none",
	backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="none" stroke="%23e5ca5f" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m2 5 6 6 6-6"/></svg>')`,
	backgroundRepeat: "no-repeat",
	backgroundPosition: "right 8px center",
	backgroundSize: "12px",
};

const sectionH6: React.CSSProperties = {
	color: C.yellow,
	textTransform: "uppercase",
	fontSize: "11px",
	fontWeight: 700,
	letterSpacing: "1px",
	marginBottom: "8px",
	paddingBottom: "4px",
	borderBottom: `1px solid ${C.borderGrey}`,
};

const filterItem: React.CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: "6px",
	padding: "3px 0",
	fontSize: "12px",
	color: C.lighterGrey,
	cursor: "pointer",
	userSelect: "none",
};

function CustomCheckbox({
	checked,
	onChange,
	label,
	badge,
}: {
	checked: boolean;
	onChange: () => void;
	label: string;
	badge?: { bg: string; color: string };
}) {
	return (
		<div
			style={filterItem}
			onClick={onChange}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onChange();
				}
			}}
			role="checkbox"
			aria-checked={checked}
			tabIndex={0}
		>
			<div
				style={{
					width: "14px",
					height: "14px",
					flexShrink: 0,
					border: `2px solid ${checked ? C.yellow : C.metaGrey}`,
					borderRadius: "3px",
					backgroundColor: checked ? C.yellow : "transparent",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				{checked && (
					<svg width="8" height="8" viewBox="0 0 8 8" aria-label={label}>
						<polyline
							points="1,4 3,6 7,2"
							stroke={C.borderGrey}
							strokeWidth="1.5"
							fill="none"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				)}
			</div>
			{badge ? (
				<span
					style={{
						fontSize: "11px",
						fontWeight: 600,
						backgroundColor: badge.bg,
						color: badge.color,
						padding: "1px 7px",
						borderRadius: "3px",
					}}
				>
					{label}
				</span>
			) : (
				<span
					style={{
						flex: 1,
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap",
					}}
				>
					{label}
				</span>
			)}
		</div>
	);
}

export function Sidebar({
	tags,
	counts,
	total,
	gameVersions,
	filters,
	onFiltersChange,
	detectedGameVersion,
}: SidebarProps) {
	const { t } = useTranslation();

	const SORT_LABELS: Record<string, string> = {
		popularity: t("filters.popularity"),
		score: t("filters.score"),
		latest: t("filters.latest"),
		updated: t("filters.updated"),
		downloads: t("filters.downloads"),
		favorites: t("filters.favorites"),
		name_asc: t("filters.name_asc"),
		name_desc: t("filters.name_desc"),
		game_version: t("filters.game_version"),
	};

	const TIME_LABELS: Record<string, string> = {
		"all-time": t("filters.time_all"),
		"past-week": t("filters.time_week"),
		"past-month": t("filters.time_month"),
		"past-year": t("filters.time_year"),
	};

	function update(patch: Partial<SidebarFilters>) {
		if (
			"gameVersion" in patch &&
			patch.gameVersion !== undefined &&
			patch.gameVersion !== "" &&
			detectedGameVersion &&
			patch.gameVersion !== detectedGameVersion
		) {
			const confirmed = window.confirm(
				t("sidebar.game_version_warning", {
					detected: detectedGameVersion,
					selected: patch.gameVersion,
				}),
			);
			if (!confirmed) return;
		}
		onFiltersChange({ ...filters, ...patch });
	}

	function toggleDevstate(ds: number) {
		const cur = filters.devstates;
		const next = cur.includes(ds) ? cur.filter((x) => x !== ds) : [...cur, ds];
		update({ devstates: next });
	}

	return (
		<aside
			style={{
				width: "200px",
				minWidth: "200px",
				backgroundColor: C.darkerGrey,
				borderRight: `1px solid ${C.borderGrey}`,
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
			}}
		>
			<div style={{ padding: "16px", overflowY: "auto", flex: 1 }}>
				<div style={{ marginBottom: "20px" }}>
					<h6 style={sectionH6}>{t("sidebar.sort_by")}</h6>
					<select
						style={selectStyle}
						value={filters.sortBy}
						onChange={(e) =>
							update({ sortBy: e.target.value as SidebarFilters["sortBy"] })
						}
					>
						{SORT_OPTIONS.map((o) => (
							<option
								key={o.value}
								value={o.value}
								style={{
									backgroundColor: C.grey,
									color: C.lightGrey,
									textTransform: "uppercase",
								}}
							>
								{SORT_LABELS[o.value]}
							</option>
						))}
					</select>
					<div style={{ marginTop: "6px" }}>
						<select
							style={selectStyle}
							value={filters.timeRange}
							onChange={(e) =>
								update({
									timeRange: e.target.value as SidebarFilters["timeRange"],
								})
							}
						>
							{TIME_RANGE_OPTIONS.map((o) => (
								<option
									key={o.value}
									value={o.value}
									style={{
										backgroundColor: C.grey,
										color: C.lightGrey,
										textTransform: "uppercase",
									}}
								>
									{TIME_LABELS[o.value]}
								</option>
							))}
						</select>
					</div>
				</div>

				<div style={{ marginBottom: "20px" }}>
					<h6 style={sectionH6}>{t("sidebar.categories")}</h6>
					<div
						role="button"
						tabIndex={0}
						style={{
							...filterItem,
							color: filters.selectedTag === null ? C.white : C.lighterGrey,
							fontWeight: filters.selectedTag === null ? 700 : 400,
						}}
						onClick={() => update({ selectedTag: null })}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								update({ selectedTag: null });
							}
						}}
					>
						<span style={{ flex: 1 }}>{t("sidebar.all")}</span>
						<span style={{ fontSize: "11px", color: C.metaGrey }}>{total}</span>
					</div>
					{tags.map((tag) => (
						<div
							key={tag}
							role="button"
							tabIndex={0}
							style={{
								...filterItem,
								color: filters.selectedTag === tag ? C.white : C.lighterGrey,
								fontWeight: filters.selectedTag === tag ? 700 : 400,
							}}
							onClick={() =>
								update({
									selectedTag: filters.selectedTag === tag ? null : tag,
								})
							}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									update({
										selectedTag: filters.selectedTag === tag ? null : tag,
									});
								}
							}}
						>
							<span
								style={{
									flex: 1,
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
								}}
							>
								{tag}
							</span>
							<span
								style={{ fontSize: "11px", color: C.metaGrey, flexShrink: 0 }}
							>
								{counts[tag] ?? 0}
							</span>
						</div>
					))}
				</div>

				<div style={{ marginBottom: "20px" }}>
					<h6 style={sectionH6}>{t("sidebar.state")}</h6>
					{([1, 2, 3, 4] as const).map((ds) => (
						<CustomCheckbox
							key={ds}
							checked={filters.devstates.includes(ds)}
							onChange={() => toggleDevstate(ds)}
							label={t(`mod.${DEVSTATE_LABELS[ds]}`)}
							badge={DEVSTATE_STYLES[ds]}
						/>
					))}
				</div>

				{gameVersions.length > 0 && (
					<div style={{ marginBottom: "20px" }}>
						<h6 style={sectionH6}>{t("sidebar.game_version")}</h6>
						<select
							style={selectStyle}
							value={filters.gameVersion}
							onChange={(e) => update({ gameVersion: e.target.value })}
						>
							<option
								value=""
								style={{ backgroundColor: C.grey, color: C.lightGrey }}
							>
								{t("sidebar.any_version")}
							</option>
							{gameVersions.map((v) => (
								<option
									key={v}
									value={v}
									style={{ backgroundColor: C.grey, color: C.lightGrey }}
								>
									{v}
								</option>
							))}
						</select>
						{detectedGameVersion && (
							<p
								style={{
									marginTop: "6px",
									fontSize: "10px",
									color: C.metaGrey,
								}}
							>
								{t("sidebar.detected_version", {
									version: detectedGameVersion,
								})}
							</p>
						)}
					</div>
				)}
			</div>
		</aside>
	);
}

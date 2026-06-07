import { Download, Heart, MessageCircle, ThumbsUp } from "lucide-react";
import { memo } from "react";
import type { MapItem } from "@/types/map";

interface MapCardProps {
	map: MapItem;
	onSelect?: (id: string) => void;
	locale: string;
	authorLabel: string;
	noDateLabel: string;
}

function formatDate(iso: string, locale: string): string {
	try {
		return new Date(iso).toLocaleDateString(locale, {
			day: "numeric",
			month: "short",
			year: "numeric",
		});
	} catch {
		return iso;
	}
}

export const MapCard = memo(function MapCard({
	map,
	onSelect,
	locale,
	authorLabel,
	noDateLabel,
}: MapCardProps) {
	const subline = map.author
		? `${authorLabel.replace("{{author}}", map.author)}${
				map.updated_at ? ` · ${formatDate(map.updated_at, locale)}` : ""
			}`
		: map.updated_at
			? formatDate(map.updated_at, locale)
			: noDateLabel;

	return (
		<div
			role={onSelect ? "button" : undefined}
			tabIndex={onSelect ? 0 : undefined}
			onClick={() => onSelect?.(map.id)}
			onKeyDown={(e) => {
				if (onSelect && (e.key === "Enter" || e.key === " ")) onSelect(map.id);
			}}
			style={{
				background: "#282828",
				border: "1px solid #1e1e1e",
				borderRadius: "8px",
				overflow: "hidden",
				display: "flex",
				flexDirection: "column",
				cursor: onSelect ? "pointer" : "default",
				contentVisibility: "auto",
				containIntrinsicSize: "0 260px",
			}}
		>
			<div style={{ aspectRatio: "16/9", background: "#1a1a1a", overflow: "hidden" }}>
				{map.thumbnail ? (
					<img
						src={map.thumbnail}
						alt={map.name}
						loading="lazy"
						decoding="async"
						style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
					/>
				) : (
					<div
						style={{
							width: "100%",
							height: "100%",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							color: "#555",
							fontSize: "11px",
						}}
					>
						—
					</div>
				)}
			</div>

			<div style={{ padding: "10px 12px 6px" }}>
				<h3
					style={{
						fontWeight: 700,
						fontSize: "13px",
						color: "#e8e8e8",
						margin: 0,
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap",
					}}
				>
					{map.name}
				</h3>
				<p
					style={{
						fontSize: "11px",
						color: "#888",
						margin: "3px 0 0",
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap",
					}}
				>
					{subline}
				</p>
			</div>

			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "14px",
					padding: "7px 12px 10px",
					borderTop: "1px solid #222",
					marginTop: "4px",
				}}
			>
				{map.downloads > 0 && (
					<span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#999" }}>
						<Download size={13} />
						{map.downloads.toLocaleString()}
					</span>
				)}
				<span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#999" }}>
					<MessageCircle size={13} />
					{map.comment_count.toLocaleString()}
				</span>
				<span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#999" }}>
					<Heart size={13} />
					{map.favorites.toLocaleString()}
				</span>
				{map.approval_pct >= 0 && (
					<span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#999", marginLeft: "auto" }}>
						<ThumbsUp size={13} />
						{map.approval_pct}%
					</span>
				)}
			</div>
		</div>
	);
});

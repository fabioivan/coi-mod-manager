import { Download, MessageCircle, ThumbsUp } from "lucide-react";
import { memo } from "react";
import type { Blueprint } from "@/types/blueprint";

interface BlueprintCardProps {
	blueprint: Blueprint;
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

export const BlueprintCard = memo(function BlueprintCard({
	blueprint,
	onSelect,
	locale,
	authorLabel,
	noDateLabel,
}: BlueprintCardProps) {
	const subline = blueprint.author
		? `${authorLabel.replace("{{author}}", blueprint.author)}${
				blueprint.updated_at ? ` · ${formatDate(blueprint.updated_at, locale)}` : ""
			}`
		: blueprint.updated_at
			? formatDate(blueprint.updated_at, locale)
			: noDateLabel;

	return (
		<div
			role={onSelect ? "button" : undefined}
			tabIndex={onSelect ? 0 : undefined}
			onClick={() => onSelect?.(blueprint.id)}
			onKeyDown={(e) => {
				if (onSelect && (e.key === "Enter" || e.key === " ")) onSelect(blueprint.id);
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
			{/* Thumbnail */}
			<div style={{ aspectRatio: "16/9", background: "#1a1a1a", overflow: "hidden" }}>
				{blueprint.thumbnail ? (
					<img
						src={blueprint.thumbnail}
						alt={blueprint.name}
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

			{/* Info */}
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
					{blueprint.name}
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

			{/* Stats */}
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
				{blueprint.downloads > 0 && (
					<span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#999" }}>
						<Download size={13} />
						{blueprint.downloads.toLocaleString()}
					</span>
				)}
				{blueprint.favorites > 0 && (
					<span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#999" }}>
						<MessageCircle size={13} />
						{blueprint.favorites}
					</span>
				)}
				{blueprint.approval_pct >= 0 && (
					<span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#999", marginLeft: "auto" }}>
						<ThumbsUp size={13} />
						{blueprint.approval_pct}%
					</span>
				)}
			</div>
		</div>
	);
});

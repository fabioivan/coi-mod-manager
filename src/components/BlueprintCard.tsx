import { Download, MessageCircle, ThumbsUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import type { Blueprint } from "@/types/blueprint";

interface BlueprintCardProps {
	blueprint: Blueprint;
	onSelect?: (id: string) => void;
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

export function BlueprintCard({ blueprint, onSelect }: BlueprintCardProps) {
	const { t, i18n } = useTranslation();

	return (
		<Card
			onClick={() => onSelect?.(blueprint.id)}
			style={{
				background: "#282828",
				border: "1px solid #1e1e1e",
				borderRadius: "8px",
				overflow: "hidden",
				display: "flex",
				flexDirection: "column",
				cursor: onSelect ? "pointer" : "default",
				transition: "border-color 0.15s",
			}}
		>
			{/* Thumbnail */}
			<div
				style={{
					aspectRatio: "16/9",
					background: "#1a1a1a",
					overflow: "hidden",
				}}
			>
				{blueprint.thumbnail ? (
					<img
						src={blueprint.thumbnail}
						alt={blueprint.name}
						style={{
							width: "100%",
							height: "100%",
							objectFit: "cover",
							display: "block",
						}}
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
					{blueprint.author
						? `${t("blueprintCard.by_author", { author: blueprint.author })}${
								blueprint.updated_at
									? ` on ${formatDate(blueprint.updated_at, i18n.language)}`
									: ""
							}`
						: blueprint.updated_at
							? formatDate(blueprint.updated_at, i18n.language)
							: t("blueprintCard.no_date")}
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
					<StatItem
						icon={<Download size={13} />}
						value={blueprint.downloads.toLocaleString()}
					/>
				)}
				{blueprint.favorites > 0 && (
					<StatItem
						icon={<MessageCircle size={13} />}
						value={String(blueprint.favorites)}
					/>
				)}
				{blueprint.approval_pct >= 0 && (
					<StatItem
						icon={<ThumbsUp size={13} />}
						value={`${blueprint.approval_pct}%`}
						style={{ marginLeft: "auto" }}
					/>
				)}
			</div>
		</Card>
	);
}

function StatItem({
	icon,
	value,
	style,
}: {
	icon: React.ReactNode;
	value: string;
	style?: React.CSSProperties;
}) {
	return (
		<span
			style={{
				display: "flex",
				alignItems: "center",
				gap: "4px",
				fontSize: "11px",
				color: "#999",
				...style,
			}}
		>
			{icon}
			{value}
		</span>
	);
}

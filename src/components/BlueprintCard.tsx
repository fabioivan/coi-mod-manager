import { Download, Heart, ThumbsUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Blueprint } from "@/types/blueprint";

interface BlueprintCardProps {
	blueprint: Blueprint;
}

function timeAgo(
	iso: string,
	t: (key: string, options?: Record<string, unknown>) => string,
): string {
	const diff = Date.now() - new Date(iso).getTime();
	const m = Math.floor(diff / 60000);
	if (m < 1) return t("blueprintCard.time_now");
	if (m < 60) return t("blueprintCard.time_m_ago", { count: m });
	const h = Math.floor(m / 60);
	if (h < 24) return t("blueprintCard.time_h_ago", { count: h });
	const d = Math.floor(h / 24);
	if (d < 30) return t("blueprintCard.time_d_ago", { count: d });
	const mo = Math.floor(d / 30);
	if (mo < 12) return t("blueprintCard.time_mo_ago", { count: mo });
	return t("blueprintCard.time_y_ago", { count: Math.floor(mo / 12) });
}

export function BlueprintCard({ blueprint }: BlueprintCardProps) {
	const { t } = useTranslation();

	return (
		<Card className="bg-[#292929] border-[#222222] overflow-hidden cursor-default">
			<div>
				<div className="aspect-video relative overflow-hidden bg-[#222]">
					{blueprint.thumbnail ? (
						<img
							src={blueprint.thumbnail}
							alt={blueprint.name}
							className="object-cover w-full h-full"
						/>
					) : (
						<div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
							—
						</div>
					)}
				</div>
			</div>
			<div className="p-3 space-y-1">
				<h3 className="font-semibold text-sm truncate text-foreground">
					{blueprint.name}
				</h3>
				{blueprint.author && (
					<p className="text-xs text-muted-foreground truncate">
						{t("blueprintCard.by_author", { author: blueprint.author })}
					</p>
				)}
				<p className="text-xs text-muted-foreground">
					{blueprint.updated_at
						? timeAgo(blueprint.updated_at, t)
						: t("blueprintCard.no_date")}
				</p>
			</div>
			<div className="p-3 pt-0 flex justify-between items-center gap-2">
				<div className="flex gap-3 text-xs text-muted-foreground">
					{blueprint.downloads > 0 && (
						<span className="flex items-center gap-1">
							<Download size={11} />
							{blueprint.downloads.toLocaleString()}
						</span>
					)}
					{blueprint.favorites > 0 && (
						<span className="flex items-center gap-1">
							<Heart size={11} />
							{blueprint.favorites}
						</span>
					)}
				</div>
				{blueprint.approval_pct >= 0 && (
					<Badge
						variant="secondary"
						className="flex items-center gap-1 text-[11px]"
					>
						<ThumbsUp size={10} />
						{blueprint.approval_pct}%
					</Badge>
				)}
			</div>
		</Card>
	);
}

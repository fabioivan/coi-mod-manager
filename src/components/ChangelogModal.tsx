import { invoke } from "@tauri-apps/api/core";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const C = {
	overlay: "rgba(0, 0, 0, 0.7)",
	bg: "#1e1e1e",
	border: "#333",
	text: "#c6c6c6",
	meta: "#a0a0a0",
	accent: "#e5ca5f",
};

interface ChangelogModalProps {
	onClose: () => void;
}

export function ChangelogModal({ onClose }: ChangelogModalProps) {
	const { t } = useTranslation();
	const [content, setContent] = useState("");
	const [error, setError] = useState(false);

	useEffect(() => {
		invoke<string>("get_changelog")
			.then((c) => setContent(c))
			.catch(() => setError(true));
	}, []);

	return (
		<div
			onClick={onClose}
			role="presentation"
			style={{
				position: "fixed",
				inset: 0,
				zIndex: 1000,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: C.overlay,
			}}
		>
			<div
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				style={{
					backgroundColor: C.bg,
					border: "1px solid " + C.border,
					borderRadius: "8px",
					padding: "24px",
					maxWidth: "600px",
					width: "90%",
					maxHeight: "80vh",
					display: "flex",
					flexDirection: "column",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: "16px",
					}}
				>
					<h2
						style={{
							fontSize: "14px",
							fontWeight: 700,
							color: C.accent,
							textTransform: "uppercase",
							letterSpacing: "1px",
							margin: 0,
						}}
					>
						Changelog
					</h2>
					<Button
						onClick={onClose}
						variant="ghost"
						size="icon"
						style={{ color: C.meta }}
					>
						<X size={16} />
					</Button>
				</div>

				<ScrollArea
					style={{
						flex: 1,
						fontSize: "12px",
						color: C.text,
						lineHeight: "1.6",
						padding: "8px",
						backgroundColor: "#141414",
						borderRadius: "4px",
					}}
				>
					{error ? (
						t("error.failed_to_load_mod", "Failed to load changelog.")
					) : content ? (
						<div
							className="changelog-content"
							dangerouslySetInnerHTML={{ __html: content }}
						/>
					) : (
						t("common.loading")
					)}
					<style>{`
						.changelog-content h1,
						.changelog-content h2 {
							font-size: 14px;
							font-weight: 700;
							color: ${C.accent};
							margin: 12px 0 6px;
							text-transform: uppercase;
							letter-spacing: 0.5px;
						}
						.changelog-content h3 {
							font-size: 12px;
							font-weight: 600;
							color: ${C.text};
							margin: 8px 0 4px;
						}
						.changelog-content ul {
							padding-left: 16px;
							margin: 4px 0 8px;
						}
						.changelog-content li {
							margin-bottom: 2px;
						}
						.changelog-content a {
							color: #81c784;
						}
						.changelog-content code {
							background-color: #333;
							padding: 1px 4px;
							border-radius: 3px;
							font-size: 11px;
						}
						.changelog-content p {
							margin: 4px 0;
						}
					`}</style>
				</ScrollArea>

				<div
					style={{
						display: "flex",
						justifyContent: "flex-end",
						marginTop: "16px",
					}}
				>
					<Button
						onClick={onClose}
						variant="outline"
						size="sm"
						style={{ padding: "6px 14px", height: "auto" }}
						className="border-[#414141] text-[#c6c6c6] hover:bg-[#414141] text-[11px] font-semibold uppercase"
					>
						{t("updateModal.btn_close")}
					</Button>
				</div>
			</div>
		</div>
	);
}

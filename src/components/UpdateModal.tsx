import { invoke } from "@tauri-apps/api/core";
import { Download, X } from "lucide-react";
import { useState } from "react";
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

interface UpdateModalProps {
	version: string;
	notes?: string;
	currentVersion: string;
	onClose: () => void;
}

export function UpdateModal({
	version,
	notes,
	currentVersion,
	onClose,
}: UpdateModalProps) {
	const { t } = useTranslation();
	const [installing, setInstalling] = useState(false);

	async function handleInstall() {
		setInstalling(true);
		try {
			await invoke("install_update");
		} catch (e) {
			console.error("Update failed:", e);
			setInstalling(false);
		}
	}

	return (
		<div
			onClick={onClose}
			onKeyDown={(e) => {
				if (e.key === "Escape") onClose();
			}}
			role="button"
			tabIndex={0}
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
				onKeyDown={(e) => e.stopPropagation()}
				role="dialog"
				style={{
					backgroundColor: C.bg,
					border: "1px solid " + C.border,
					borderRadius: "8px",
					padding: "24px",
					maxWidth: "480px",
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
						{t("updateModal.title")}
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

				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "10px",
						marginBottom: "16px",
					}}
				>
					<div style={{ display: "flex", gap: "8px", fontSize: "12px" }}>
						<span style={{ color: C.meta, minWidth: "100px" }}>
							{t("updateModal.current_version")}
						</span>
						<span style={{ color: C.text, fontWeight: 600 }}>
							v{currentVersion}
						</span>
					</div>
					<div style={{ display: "flex", gap: "8px", fontSize: "12px" }}>
						<span style={{ color: C.meta, minWidth: "100px" }}>
							{t("updateModal.new_version")}
						</span>
						<span style={{ color: "#81c784", fontWeight: 700 }}>
							v{version}
						</span>
					</div>
				</div>

				{(notes || "").trim() ? (
					<>
						<h3
							style={{
								fontSize: "11px",
								fontWeight: 600,
								color: C.meta,
								textTransform: "uppercase",
								margin: "0 0 8px",
							}}
						>
							{t("updateModal.notes")}
						</h3>
						<ScrollArea
							style={{
								fontSize: "12px",
								color: C.text,
								lineHeight: "1.5",
								maxHeight: "200px",
								marginBottom: "16px",
								padding: "8px",
								backgroundColor: "#141414",
								borderRadius: "4px",
								whiteSpace: "pre-wrap",
							}}
						>
							{notes}
						</ScrollArea>
					</>
				) : (
					<p
						style={{
							fontSize: "12px",
							color: C.meta,
							marginBottom: "16px",
						}}
					>
						{t("updateModal.no_notes")}
					</p>
				)}

				<div
					style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}
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
					<Button
						onClick={handleInstall}
						disabled={installing}
						size="sm"
						style={{ padding: "6px 14px", height: "auto" }}
						className="bg-[#2e7d32] text-[#e8f5e9] hover:bg-[#2e7d32]/90 text-[11px] font-bold uppercase"
					>
						<Download size={10} />
						{installing
							? t("updateModal.checking")
							: t("updateModal.btn_update")}
					</Button>
				</div>
			</div>
		</div>
	);
}

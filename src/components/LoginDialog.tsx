import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onOpenBrowser: () => Promise<void>;
	onSubmit: (link: string) => Promise<boolean>;
}

const C = {
	dialogBg: "#1a1a1a",
	border: "#333",
	overlay: "rgba(0,0,0,0.6)",
	text: "#e0e0e0",
	inputBg: "#222",
	accent: "#5b9aff",
};

export function LoginDialog({ open, onOpenChange, onOpenBrowser, onSubmit }: Props) {
	const { t } = useTranslation();
	const [link, setLink] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [step, setStep] = useState<"browser" | "paste">("browser");

	if (!open) return null;

	const handleOpenBrowser = async () => {
		try {
			await onOpenBrowser();
		} catch {
			// ignore — browser may or may not open
		}
		setStep("paste");
	};

	const handleSubmit = async () => {
		if (!link.trim()) return;
		setLoading(true);
		setError("");
		const ok = await onSubmit(link.trim());
		setLoading(false);
		if (ok) {
			setLink("");
			setStep("browser");
			onOpenChange(false);
		} else {
			setError(t("login.error"));
		}
	};

	const handleClose = () => {
		setLink("");
		setError("");
		setStep("browser");
		onOpenChange(false);
	};

	return (
		<div
			onClick={handleClose}
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
				style={{
					backgroundColor: C.dialogBg,
					border: `1px solid ${C.border}`,
					borderRadius: "8px",
					padding: "24px",
					minWidth: "420px",
					maxWidth: "90vw",
					color: C.text,
				}}
			>
				{step === "browser" ? (
					<>
						<h2 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
							{t("login.sign_in")}
						</h2>
						<p style={{ fontSize: "13px", color: "#aaa", margin: "8px 0 0" }}>
							{t("login.open_login")}
						</p>
						<ol
							style={{
								fontSize: "13px",
								color: "#ccc",
								margin: "12px 0",
								paddingLeft: "18px",
								lineHeight: "1.7",
							}}
						>
							<li>{t("login.step_open")}</li>
							<li>{t("login.step_email")}</li>
							<li>{t("login.step_paste")}</li>
						</ol>
						<div
							style={{
								display: "flex",
								gap: "8px",
								justifyContent: "flex-end",
								marginTop: "16px",
							}}
						>
							<Button variant="ghost" onClick={handleClose}>
								{t("common.cancel")}
							</Button>
							<Button onClick={handleOpenBrowser}>
								{t("login.open_login")}
							</Button>
						</div>
					</>
				) : (
					<>
						<h2 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
							{t("login.paste_magic_link")}
						</h2>
						<p style={{ fontSize: "13px", color: "#aaa", margin: "8px 0 16px" }}>
							{t("login.paste_here")}
						</p>
						<input
							autoFocus
							value={link}
							onChange={(e) => setLink(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
							placeholder="https://coigame.com/Account/MagicLogin?token=..."
							style={{
								width: "100%",
								padding: "8px 10px",
								background: C.inputBg,
								border: `1px solid ${C.border}`,
								borderRadius: "4px",
								color: C.text,
								fontSize: "13px",
								outline: "none",
								boxSizing: "border-box",
							}}
						/>
						{error && (
							<p style={{ fontSize: "12px", color: "#e57373", marginTop: "6px" }}>
								{error}
							</p>
						)}
						<div
							style={{
								display: "flex",
								gap: "8px",
								justifyContent: "flex-end",
								marginTop: "16px",
							}}
						>
							<Button
								variant="ghost"
								onClick={() => setStep("browser")}
								disabled={loading}
							>
								{t("common.back")}
							</Button>
							<Button onClick={handleSubmit} disabled={loading || !link.trim()}>
								{loading ? t("common.loading") : t("login.go")}
							</Button>
						</div>
					</>
				)}
			</div>
		</div>
	);
}

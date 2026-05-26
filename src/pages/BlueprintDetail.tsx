import { invoke } from "@tauri-apps/api/core";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import {
	ArrowLeft,
	ChevronLeft,
	ChevronRight,
	Copy,
	Download,
	ExternalLink,
	Eye,
	Loader2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Blueprint, BlueprintDetails } from "@/types/blueprint";

interface BlueprintDetailProps {
	blueprintId: string;
	onBack: () => void;
	allBlueprints: Blueprint[];
}

const C = {
	grey: "#414141",
	darkGrey: "#2f2f2f",
	darkerGrey: "#292929",
	borderGrey: "#222222",
	metaGrey: "#a0a0a0",
	lightGrey: "#f8f8f8",
	lighterGrey: "#c6c6c6",
	yellow: "#e5ca5f",
};

export function BlueprintDetail({
	blueprintId,
	onBack,
	allBlueprints,
}: BlueprintDetailProps) {
	const { t, i18n } = useTranslation();
	const [details, setDetails] = useState<BlueprintDetails | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [lightboxImage, setLightboxImage] = useState<string | null>(null);
	const [activeIndex, setActiveIndex] = useState(0);
	const thumbRowRef = useRef<HTMLDivElement>(null);
	const [downloading, setDownloading] = useState(false);
	const [downloadPath, setDownloadPath] = useState<string | null>(null);

	const localBlueprint = allBlueprints.find((bp) => bp.id === blueprintId);
	const bpUrl = localBlueprint?.url;

	useEffect(() => {
		if (!bpUrl) return;
		async function fetchDetails() {
			setLoading(true);
			setError(null);
			try {
				const data = await invoke<BlueprintDetails>("get_blueprint_details", {
					url: bpUrl,
				});
				setDetails(data);
			} catch (err) {
				console.error("Erro ao carregar detalhes do blueprint:", err);
				setError(String(err));
			} finally {
				setLoading(false);
			}
		}
		fetchDetails();
	}, [bpUrl]);

	const fallbackBp = details ?? localBlueprint;

	if (error) {
		return (
			<div
				style={{
					flex: 1,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					color: C.metaGrey,
					fontSize: "13px",
				}}
			>
				{error}
			</div>
		);
	}

	if (!fallbackBp) {
		return (
			<div
				style={{
					flex: 1,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					color: C.metaGrey,
				}}
			>
				{t("common.error_loading")}
			</div>
		);
	}

	const formattedDate = fallbackBp.updated_at
		? new Date(fallbackBp.updated_at).toLocaleDateString(i18n.language, {
				day: "numeric",
				month: "short",
				year: "numeric",
			})
		: null;

	const screenshots = details?.screenshots ?? [];

	const handleDownload = async () => {
		if (!bpUrl || !localBlueprint || !details?.blueprint_data) return;
		setDownloading(true);
		setDownloadPath(null);
		try {
			const path = await invoke<string>("download_blueprint", {
				blueprintId: localBlueprint.id,
				blueprintName: localBlueprint.name,
				blueprintData: details.blueprint_data,
			});
			setDownloadPath(path);
		} catch (err) {
			console.error("Erro ao baixar blueprint:", err);
			setError(String(err));
		} finally {
			setDownloading(false);
		}
	};

	const goTo = (i: number) => {
		const next = Math.max(0, Math.min(i, screenshots.length - 1));
		setActiveIndex(next);
		if (thumbRowRef.current) {
			const thumb = thumbRowRef.current.children[next] as
				| HTMLElement
				| undefined;
			thumb?.scrollIntoView({
				behavior: "smooth",
				inline: "center",
				block: "nearest",
			});
		}
	};

	return (
		<div
			style={{
				flex: 1,
				display: "flex",
				flexDirection: "column",
				minHeight: 0,
			}}
		>
			<div style={{ overflowY: "auto", flex: 1 }}>
				{loading && (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "8px",
							padding: "12px",
							color: C.metaGrey,
							fontSize: "13px",
						}}
					>
						<Loader2 size={14} className="animate-spin" />
						{t("common.loading")}
					</div>
				)}

				<div style={{ padding: "24px", paddingTop: loading ? "0" : "24px" }}>
					<button
						type="button"
						onClick={onBack}
						style={{
							display: "flex",
							alignItems: "center",
							gap: "6px",
							background: "none",
							border: "none",
							color: C.metaGrey,
							cursor: "pointer",
							fontSize: "13px",
							padding: "0 0 16px",
						}}
					>
						<ArrowLeft size={15} />
						{t("common.btn_back")}
					</button>

					<div style={{ display: "flex", gap: "24px", marginBottom: "20px" }}>
						<div style={{ width: "360px", flexShrink: 0 }}>
							<div
								style={{
									aspectRatio: "16/9",
									background: "#1a1a1a",
									borderRadius: "8px",
									overflow: "hidden",
									border: `1px solid ${C.borderGrey}`,
								}}
							>
								{fallbackBp.thumbnail ? (
									<img
										src={fallbackBp.thumbnail}
										alt={fallbackBp.name}
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
											fontSize: "13px",
										}}
									>
										—
									</div>
								)}
							</div>
						</div>

						<div
							style={{
								flex: 1,
								display: "flex",
								flexDirection: "column",
								gap: "12px",
							}}
						>
							<h1
								style={{
									fontSize: "22px",
									fontWeight: 700,
									color: C.lightGrey,
									margin: 0,
								}}
							>
								{fallbackBp.name}
							</h1>

							<div
								style={{
									display: "grid",
									gridTemplateColumns: "repeat(3, 1fr)",
									gap: "12px",
									background: C.darkerGrey,
									border: `1px solid ${C.borderGrey}`,
									borderRadius: "8px",
									padding: "16px",
								}}
							>
								<MetaItem
									label={t("blueprintDetail.author")}
									value={fallbackBp.author}
								/>
								<MetaItem
									label={t("blueprintDetail.downloads")}
									value={fallbackBp.downloads.toLocaleString()}
								/>
								<MetaItem
									label={t("blueprintDetail.vote_score")}
									value={
										fallbackBp.approval_pct >= 0
											? `${fallbackBp.approval_pct}%`
											: "—"
									}
								/>
								<MetaItem
									label={t("blueprintDetail.favorites")}
									value={fallbackBp.favorites.toLocaleString()}
								/>
								<MetaItem
									label={t("blueprintDetail.updated")}
									value={formattedDate ?? "—"}
								/>
							</div>

							<div
								style={{ display: "flex", gap: "8px", alignItems: "center" }}
							>
								<a
									href={fallbackBp.url}
									target="_blank"
									rel="noopener noreferrer"
									style={{
										display: "inline-flex",
										alignItems: "center",
										gap: "6px",
										padding: "8px 16px",
										background: C.yellow,
										color: C.darkGrey,
										fontSize: "12px",
										fontWeight: 700,
										borderRadius: "6px",
										textDecoration: "none",
										width: "fit-content",
										textTransform: "uppercase",
									}}
								>
									<ExternalLink size={14} />
									{t("blueprintDetail.view_on_hub")}
								</a>

								<button
									type="button"
									disabled={downloading || !details?.blueprint_data}
									onClick={handleDownload}
									style={{
										display: "inline-flex",
										alignItems: "center",
										gap: "6px",
										padding: "8px 16px",
										background: downloading
											? C.grey
											: downloadPath
												? "#2d7d46"
												: C.yellow,
										color: downloading || downloadPath ? "#fff" : C.darkGrey,
										fontSize: "12px",
										fontWeight: 700,
										borderRadius: "6px",
										border: "none",
										cursor: downloading ? "default" : "pointer",
										textTransform: "uppercase",
									}}
								>
									{downloading ? (
										<Loader2 size={14} className="animate-spin" />
									) : (
										<Download size={14} />
									)}
									{downloading
										? t("common.loading")
										: downloadPath
											? t("blueprintDetail.downloaded")
											: t("blueprintDetail.download")}
								</button>

								{downloadPath && (
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "6px",
											fontSize: "11px",
											color: C.metaGrey,
											maxWidth: "300px",
										}}
									>
										<span
											style={{
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
												direction: "rtl",
												textAlign: "left",
											}}
											title={downloadPath}
										>
											{downloadPath}
										</span>
										<button
											type="button"
											title="Copy path"
											onClick={() => writeText(downloadPath)}
											style={{
												background: "none",
												border: "none",
												cursor: "pointer",
												color: C.metaGrey,
												padding: "2px",
												flexShrink: 0,
											}}
										>
											<Copy size={12} />
										</button>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Gallery Carousel */}
					{screenshots.length > 0 && (
						<div
							style={{
								background: C.darkerGrey,
								border: `1px solid ${C.borderGrey}`,
								borderRadius: "8px",
								padding: "16px",
								marginBottom: "16px",
							}}
						>
							<h3
								style={{
									fontSize: "14px",
									fontWeight: 700,
									color: C.yellow,
									marginBottom: "12px",
									textTransform: "uppercase",
									display: "flex",
									alignItems: "center",
									gap: "6px",
								}}
							>
								<Eye size={14} />
								Gallery
							</h3>

							{/* Main image */}
							<div
								style={{
									position: "relative",
									borderRadius: "6px",
									overflow: "hidden",
									border: `1px solid ${C.grey}`,
									aspectRatio: "16/9",
									background: "#1a1a1a",
									marginBottom: "10px",
								}}
							>
								<img
									src={screenshots[activeIndex]}
									alt={`Screenshot ${activeIndex + 1} of ${screenshots.length}`}
									style={{
										width: "100%",
										height: "100%",
										objectFit: "contain",
										display: "block",
										cursor: "zoom-in",
									}}
									onClick={() => setLightboxImage(screenshots[activeIndex])}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											setLightboxImage(screenshots[activeIndex]);
										}
									}}
								/>

								{/* Left arrow */}
								{screenshots.length > 1 && (
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											goTo(activeIndex - 1);
										}}
										style={{
											position: "absolute",
											left: "8px",
											top: "50%",
											transform: "translateY(-50%)",
											background: "rgba(0,0,0,0.55)",
											border: "none",
											borderRadius: "50%",
											width: "36px",
											height: "36px",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											cursor: "pointer",
											color: "#fff",
											opacity: 0.7,
											transition: "opacity 0.15s",
										}}
										onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
										onMouseLeave={(e) =>
											(e.currentTarget.style.opacity = "0.7")
										}
									>
										<ChevronLeft size={22} />
									</button>
								)}

								{/* Right arrow */}
								{screenshots.length > 1 && (
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											goTo(activeIndex + 1);
										}}
										style={{
											position: "absolute",
											right: "8px",
											top: "50%",
											transform: "translateY(-50%)",
											background: "rgba(0,0,0,0.55)",
											border: "none",
											borderRadius: "50%",
											width: "36px",
											height: "36px",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											cursor: "pointer",
											color: "#fff",
											opacity: 0.7,
											transition: "opacity 0.15s",
										}}
										onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
										onMouseLeave={(e) =>
											(e.currentTarget.style.opacity = "0.7")
										}
									>
										<ChevronRight size={22} />
									</button>
								)}

								{/* Counter */}
								{screenshots.length > 1 && (
									<div
										style={{
											position: "absolute",
											bottom: "10px",
											right: "12px",
											background: "rgba(0,0,0,0.6)",
											color: "#ccc",
											fontSize: "12px",
											fontWeight: 600,
											padding: "3px 10px",
											borderRadius: "4px",
										}}
									>
										{activeIndex + 1} / {screenshots.length}
									</div>
								)}
							</div>

							{/* Thumbnails strip */}
							{screenshots.length > 1 && (
								<div style={{ position: "relative" }}>
									<div
										ref={thumbRowRef}
										style={{
											display: "flex",
											gap: "6px",
											overflowX: "auto",
											scrollbarWidth: "thin",
											scrollBehavior: "smooth",
											paddingBottom: "4px",
										}}
									>
										{screenshots.map((src, i) => (
											<div
												key={src}
												onClick={() => goTo(i)}
												role="button"
												tabIndex={0}
												onKeyDown={(e) => {
													if (e.key === "Enter" || e.key === " ") {
														e.preventDefault();
														goTo(i);
													}
												}}
												style={{
													flex: "0 0 auto",
													width: "100px",
													height: "56px",
													borderRadius: "4px",
													overflow: "hidden",
													cursor: "pointer",
													border:
														i === activeIndex
															? `2px solid ${C.yellow}`
															: `2px solid transparent`,
													opacity: i === activeIndex ? 1 : 0.5,
													transition: "border-color 0.15s, opacity 0.15s",
													background: "#1a1a1a",
												}}
											>
												<img
													src={src}
													alt=""
													style={{
														width: "100%",
														height: "100%",
														objectFit: "cover",
														display: "block",
													}}
												/>
											</div>
										))}
									</div>
								</div>
							)}
						</div>
					)}

					{/* Description */}
					<div
						style={{
							background: C.darkerGrey,
							border: `1px solid ${C.borderGrey}`,
							borderRadius: "8px",
							padding: "20px",
						}}
					>
						<h2
							style={{
								fontSize: "16px",
								fontWeight: 700,
								color: C.lightGrey,
								margin: "0 0 12px",
							}}
						>
							{t("blueprintDetail.description")}
						</h2>
						{details?.description_html ? (
							<div
								className="bp-description"
								dangerouslySetInnerHTML={{ __html: details.description_html }}
								style={{
									color: C.lighterGrey,
									fontSize: "14px",
									lineHeight: 1.6,
								}}
							/>
						) : (
							<p
								style={{
									color: C.metaGrey,
									fontSize: "13px",
									margin: 0,
									whiteSpace: "pre-wrap",
								}}
							>
								{"description" in fallbackBp
									? (fallbackBp as Blueprint).description ||
										t("blueprintDetail.no_description")
									: t("blueprintDetail.no_description")}
							</p>
						)}
					</div>
				</div>
			</div>

			{/* Lightbox */}
			{lightboxImage && (
				<div
					role="button"
					tabIndex={0}
					onClick={() => setLightboxImage(null)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
							e.preventDefault();
							setLightboxImage(null);
						}
					}}
					style={{
						position: "fixed",
						inset: 0,
						backgroundColor: "rgba(0,0,0,0.9)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						zIndex: 1000,
						backdropFilter: "blur(4px)",
						cursor: "zoom-out",
					}}
				>
					<img
						src={lightboxImage}
						alt="Full screenshot"
						style={{
							maxWidth: "92%",
							maxHeight: "92%",
							borderRadius: "6px",
							boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
							border: "1px solid #444",
							display: "block",
						}}
					/>
					<button
						type="button"
						onClick={() => setLightboxImage(null)}
						style={{
							position: "absolute",
							top: "20px",
							right: "20px",
							backgroundColor: C.darkerGrey,
							border: `1px solid ${C.grey}`,
							color: "#fff",
							fontSize: "24px",
							width: "44px",
							height: "44px",
							borderRadius: "50%",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						&times;
					</button>
				</div>
			)}
		</div>
	);
}

function MetaItem({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<div
				style={{
					fontSize: "11px",
					color: C.metaGrey,
					marginBottom: "4px",
					fontWeight: 600,
				}}
			>
				{label}
			</div>
			<div style={{ fontSize: "14px", color: C.lightGrey, fontWeight: 700 }}>
				{value}
			</div>
		</div>
	);
}

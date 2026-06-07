import { invoke } from "@tauri-apps/api/core";
import {
	ArrowLeft,
	ChevronLeft,
	ChevronRight,
	ClipboardCopy,
	ClipboardCheck,
	ExternalLink,
	Eye,
	Heart,
	Loader2,
	ThumbsDown,
	ThumbsUp,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollTopButton } from "@/components/ScrollTopButton";
import { useScrollTop } from "@/hooks/useScrollTop";
import type { Blueprint, BlueprintDetails } from "@/types/blueprint";

interface BlueprintDetailProps {
	blueprintId: string;
	onBack: () => void;
	onSelectAuthor: (author: string) => void;
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
	const [voteLoading, setVoteLoading] = useState<string | null>(null);
	const [favLoading, setFavLoading] = useState(false);
	const { scrollRef, show: showScrollTop, scrollToTop } = useScrollTop();

	const localBlueprint = useMemo(
		() => allBlueprints.find((bp) => bp.id === blueprintId),
		[allBlueprints, blueprintId],
	);
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

	const formattedDate = useMemo(
		() =>
			fallbackBp?.updated_at
				? new Date(fallbackBp.updated_at).toLocaleDateString(i18n.language, {
						day: "numeric",
						month: "short",
						year: "numeric",
					})
				: null,
		[fallbackBp?.updated_at, i18n.language],
	);

	const screenshots = useMemo(() => details?.screenshots ?? [], [details?.screenshots]);

	const handleDownload = async () => {
		if (!bpUrl || !localBlueprint || !details?.blueprint_data) return;
		setDownloading(true);
		setDownloadPath(null);
		try {
			await invoke<string>("download_blueprint", {
				blueprintId: localBlueprint.id,
				blueprintName: localBlueprint.name,
				blueprintData: details.blueprint_data,
			});
			setDownloadPath("copied");
			setTimeout(() => setDownloadPath(null), 2500);
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

	const handleVote = async (rating: number) => {
		if (!details) return;
		const key = `vote-${rating}`;
		setVoteLoading(key);
		try {
			await invoke("vote_blueprint", { blueprintUrl: details.url, rating });
		} catch (err) {
			console.error("Vote failed:", err);
		}
		setVoteLoading(null);
	};

	const handleFavorite = async () => {
		if (!details) return;
		setFavLoading(true);
		try {
			await invoke("favorite_blueprint", { blueprintUrl: details.url });
		} catch (err) {
			console.error("Favorite failed:", err);
		}
		setFavLoading(false);
	};

	return (
		<div
			style={{
				flex: 1,
				display: "flex",
				flexDirection: "column",
				minHeight: 0,
				position: "relative",
				backgroundImage: "url(/background.jpg)",
				backgroundSize: "cover",
				backgroundAttachment: "fixed",
				backgroundPosition: "center center",
			}}
		>
			{loading && (
				<div
					style={{
						position: "absolute",
						inset: 0,
						backgroundColor: "rgba(41, 41, 41, 0.5)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						flexDirection: "column",
						gap: "12px",
						color: C.lightGrey,
						fontSize: "13px",
						zIndex: 10,
					}}
				>
					<Loader2 size={24} className="animate-spin" />
					{t("common.loading")}
				</div>
			)}
			<div ref={scrollRef} style={{ overflowY: "auto", flex: 1 }}>
				<div style={{ maxWidth: "1140px", margin: "0 auto", padding: "24px", backgroundColor: "#2f2f2f", borderRadius: "8px" }}>
					<button
						type="button"
						onClick={onBack}
						style={{
							display: "flex",
							alignItems: "center",
							gap: "6px",
							background: "none",
							border: "none",
							color: C.yellow,
							cursor: "pointer",
							fontSize: "13px",
							padding: "0 0 16px",
						}}
					>
						<ArrowLeft size={15} />
						{t("common.btn_back")}
					</button>

					<div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px", backgroundColor: C.darkerGrey, border: `1px solid ${C.borderGrey}`, borderRadius: "8px", padding: "20px" }}>
						<div style={{ display: "flex", gap: "24px" }}>
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
									display: "flex",
									flexWrap: "wrap",
									gap: "6px",
									alignItems: "stretch",
								}}
							>
								<a
									href={fallbackBp.url}
									target="_blank"
									rel="noopener noreferrer"
									style={{
										display: "inline-flex",
										alignItems: "center",
										justifyContent: "center",
										gap: "6px",
										padding: "8px 16px",
										background: C.yellow,
										color: C.darkGrey,
										fontSize: "12px",
										fontWeight: 700,
										borderRadius: "6px",
										textDecoration: "none",
										minWidth: "110px",
										flex: "1 0 auto",
									}}
								>
									<ExternalLink size={14} />
									{t("blueprintDetail.view_on_hub")}
								</a>

								<button
									type="button"
									disabled={downloading || !details?.blueprint_data}
									onClick={handleDownload}
									title={t("blueprintDetail.copy_tooltip")}
									style={{
										display: "inline-flex",
										alignItems: "center",
										justifyContent: "center",
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
										minWidth: "110px",
										flex: "1 0 auto",
									}}
								>
									{downloading ? (
										<Loader2 size={14} className="animate-spin" />
									) : downloadPath ? (
										<ClipboardCheck size={14} />
									) : (
										<ClipboardCopy size={14} />
									)}
									{downloading
										? t("common.loading")
										: downloadPath
											? t("blueprintDetail.copied")
											: t("blueprintDetail.copy")}
								</button>


							</div>
						</div>
						</div>

						{/* Meta Bar — Downloads, Vote %, Favorites, Updated + Vote/Favorite compound buttons */}
						<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px", borderTop: `1px solid ${C.grey}`, paddingTop: "12px" }}>
							<span style={{ fontSize: "12px", color: C.metaGrey }}>{t("blueprintDetail.downloads")}: <strong style={{ color: C.lightGrey }}>{fallbackBp.downloads.toLocaleString()}</strong></span>
							<span style={{ fontSize: "12px", color: C.metaGrey }}>{t("blueprintDetail.vote_score")}: <strong style={{ color: C.lightGrey }}>{fallbackBp.approval_pct >= 0 ? `${fallbackBp.approval_pct}%` : "—"}</strong></span>
							<span style={{ fontSize: "12px", color: C.metaGrey }}>{t("blueprintDetail.favorites")}: <strong style={{ color: C.lightGrey }}>{fallbackBp.favorites.toLocaleString()}</strong></span>
							<span style={{ fontSize: "12px", color: C.metaGrey }}>{t("blueprintDetail.updated")}: <strong style={{ color: C.lightGrey }}>{formattedDate ?? "—"}</strong></span>

							<div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
								{/* Vote compound button */}
								<div style={{ display: "flex", alignItems: "center", borderRadius: "4px", overflow: "hidden" }}>
									<button type="button" onClick={() => handleVote(1)} disabled={voteLoading === "vote-1"} title="Upvote blueprint"
										style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "6px 10px", background: C.yellow, color: C.darkGrey, fontSize: "11px", border: "none", cursor: voteLoading === "vote-1" ? "default" : "pointer" }}>
										{voteLoading === "vote-1" ? <Loader2 size={12} className="animate-spin" /> : <ThumbsUp size={12} />}
									</button>
									<button type="button" onClick={() => handleVote(0)} disabled={voteLoading === "vote-0"} title="Downvote blueprint"
										style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "6px 10px", background: C.yellow, color: C.darkGrey, fontSize: "11px", border: "none", borderLeft: `1px solid ${C.darkGrey}`, cursor: voteLoading === "vote-0" ? "default" : "pointer" }}>
										{voteLoading === "vote-0" ? <Loader2 size={12} className="animate-spin" /> : <ThumbsDown size={12} />}
									</button>
									<span style={{ display: "inline-flex", alignItems: "center", padding: "6px 10px", background: C.grey, color: C.lightGrey, fontSize: "11px", fontWeight: 700, minWidth: "36px", justifyContent: "center" }}>
										{fallbackBp.approval_pct >= 0 ? `${fallbackBp.approval_pct}%` : "—"}
									</span>
								</div>

								{/* Favorite compound button */}
								<div style={{ display: "flex", alignItems: "center", borderRadius: "4px", overflow: "hidden" }}>
									<button type="button" onClick={handleFavorite} disabled={favLoading} title="Add to favorites"
										style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "6px 10px", background: C.yellow, color: C.darkGrey, fontSize: "11px", border: "none", cursor: favLoading ? "default" : "pointer" }}>
										{favLoading ? <Loader2 size={12} className="animate-spin" /> : <Heart size={12} />}
									</button>
									<span style={{ display: "inline-flex", alignItems: "center", padding: "6px 10px", background: C.grey, color: C.lightGrey, fontSize: "11px", fontWeight: 700, minWidth: "36px", justifyContent: "center" }}>
										{fallbackBp.favorites.toLocaleString()}
									</span>
								</div>
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
				<ScrollTopButton show={showScrollTop} onClick={scrollToTop} />
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
							width: "100%",
							height: "100%",
							objectFit: "contain",
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



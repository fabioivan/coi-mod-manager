import { invoke } from "@tauri-apps/api/core";
import {
	ArrowLeft,
	ChevronLeft,
	ChevronRight,
	Copy,
	Download,
	ExternalLink,
	Eye,
	Heart,
	Loader2,
	MessageSquare,
	ThumbsDown,
	ThumbsUp,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollTopButton } from "@/components/ScrollTopButton";
import { useScrollTop } from "@/hooks/useScrollTop";
import type { MapDetails, MapItem } from "@/types/map";

interface MapDetailProps {
	mapId: string;
	onBack: () => void;
	onSelectAuthor: (author: string) => void;
	allMaps: MapItem[];
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

export function MapDetail({
	mapId,
	onBack,
	onSelectAuthor,
	allMaps,
}: MapDetailProps) {
	const { t, i18n } = useTranslation();
	const [details, setDetails] = useState<MapDetails | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [lightboxImage, setLightboxImage] = useState<string | null>(null);
	const [activeIndex, setActiveIndex] = useState(0);
	const thumbRowRef = useRef<HTMLDivElement>(null);
	const [downloading, setDownloading] = useState(false);
	const [downloadPath, setDownloadPath] = useState<string | null>(null);
	const [downloadError, setDownloadError] = useState<string | null>(null);
	const [versionDownloading, setVersionDownloading] = useState<string | null>(null);
	const [voteLoading, setVoteLoading] = useState<string | null>(null);
	const [favLoading, setFavLoading] = useState(false);
	const { scrollRef, show: showScrollTop, scrollToTop } = useScrollTop();

	const localMap = useMemo(
		() => allMaps.find((m) => m.id === mapId),
		[allMaps, mapId],
	);
	const mapUrl = localMap?.url;

	useEffect(() => {
		if (!mapUrl) return;
		async function fetchDetails() {
			setLoading(true);
			setError(null);
			try {
				const data = await invoke<MapDetails>("get_map_details", {
					url: mapUrl,
				});
				setDetails(data);
			} catch (err) {
				console.error("Erro ao carregar detalhes do mapa:", err);
				setError(String(err));
			} finally {
				setLoading(false);
			}
		}
		fetchDetails();
	}, [mapUrl]);

	const fallbackMap = details ?? localMap;

	const formattedDate = useMemo(
		() =>
			fallbackMap?.updated_at
				? new Date(fallbackMap.updated_at).toLocaleDateString(i18n.language, {
						day: "numeric",
						month: "short",
						year: "numeric",
					})
				: null,
		[fallbackMap?.updated_at, i18n.language],
	);

	const formattedCreatedDate = useMemo(
		() =>
			details?.created_at
				? new Date(details.created_at).toLocaleDateString(i18n.language, {
						day: "numeric",
						month: "short",
						year: "numeric",
					})
				: null,
		[details?.created_at, i18n.language],
	);

	const screenshots = useMemo(
		() => details?.screenshots ?? [],
		[details?.screenshots],
	);

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

	if (!fallbackMap) {
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

	const handleDownload = async () => {
		if (!details?.download_url) return;
		setDownloading(true);
		setDownloadPath(null);
		try {
			const path = await invoke<string>("download_map", {
				mapId: localMap?.id ?? mapId,
				downloadUrl: details.download_url,
				mapName: fallbackMap.name,
			});
			setDownloadPath(path);
			setDownloadError(null);
			setTimeout(() => setDownloadPath(null), 2500);
		} catch (err) {
			console.error("Erro ao baixar mapa:", err);
			setDownloadError(String(err));
			setTimeout(() => setDownloadError(null), 4000);
		} finally {
			setDownloading(false);
		}
	};

	const handleVote = async (rating: number) => {
		if (!details) return;
		const key = `vote-${rating}`;
		setVoteLoading(key);
		try {
			await invoke("vote_map", { mapUrl: details.url, rating });
		} catch (err) {
			console.error("Vote failed:", err);
		}
		setVoteLoading(null);
	};

	const handleFavorite = async () => {
		if (!details) return;
		setFavLoading(true);
		try {
			await invoke("favorite_map", { mapUrl: details.url });
		} catch (err) {
			console.error("Favorite failed:", err);
		}
		setFavLoading(false);
	};

	const handleVersionDownload = async (versionLabel: string, url: string) => {
		setVersionDownloading(versionLabel);
		setDownloadError(null);
		try {
			await invoke("download_map", {
				mapId: localMap?.id ?? mapId,
				downloadUrl: url,
				mapName: fallbackMap.name,
			});
		} catch (err) {
			console.error("Erro ao baixar versão:", err);
			setDownloadError(String(err));
			setTimeout(() => setDownloadError(null), 4000);
		} finally {
			setVersionDownloading(null);
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
				position: "relative",
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
				<div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px" }}>
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
								{fallbackMap.thumbnail ? (
									<img
										src={fallbackMap.thumbnail}
										alt={fallbackMap.name}
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
								{fallbackMap.name}
							</h1>

							<div
								style={{
									display: "grid",
									gridTemplateColumns: "repeat(4, 1fr)",
									gap: "12px",
									background: C.darkerGrey,
									border: `1px solid ${C.borderGrey}`,
									borderRadius: "8px",
									padding: "16px",
								}}
							>
								<MetaItem
									label={t("mapDetail.author")}
									value={fallbackMap.author}
									onValueClick={
										fallbackMap.author
											? () => {
													onSelectAuthor(fallbackMap.author!);
													onBack();
												}
											: undefined
									}
								/>
								<MetaItem
									label={t("mapDetail.downloads")}
									value={fallbackMap.downloads.toLocaleString()}
								/>
								<MetaItem
									label={t("mapDetail.vote_score")}
									value={
										fallbackMap.approval_pct >= 0
											? `${fallbackMap.approval_pct}%`
											: "—"
									}
								/>
								<MetaItem
									label={t("mapDetail.votes")}
									value={
										details?.vote_count !== undefined && details.vote_count > 0
											? details.vote_count.toLocaleString()
											: "—"
									}
								/>
								<MetaItem
									label={t("mapDetail.favorites")}
									value={fallbackMap.favorites.toLocaleString()}
								/>
								<MetaItem
									label={t("mapDetail.updated")}
									value={formattedDate ?? "—"}
								/>
								{formattedCreatedDate && (
									<MetaItem
										label={t("mapDetail.created")}
										value={formattedCreatedDate}
									/>
								)}
								{details?.map_size && (
									<MetaItem
										label={t("mapDetail.map_size")}
										value={details.map_size}
									/>
								)}
							</div>

							<div
								style={{
									display: "flex",
									flexWrap: "wrap",
									gap: "6px",
									alignItems: "stretch",
								}}
							>
								<a
									href={fallbackMap.url}
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
									{t("mapDetail.view_on_hub")}
								</a>

								<button
									type="button"
									disabled={downloading || !details?.download_url}
									onClick={handleDownload}
									title={t("mapDetail.download_tooltip")}
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
										<Download size={14} />
									) : (
										<Download size={14} />
									)}
									{downloading
										? t("common.loading")
										: downloadPath
											? t("mapDetail.downloaded")
											: t("mapDetail.download")}
								</button>

								<div
									style={{
										display: "flex",
										gap: "6px",
										flex: "1 0 auto",
									}}
								>
									<button
										type="button"
										onClick={() => handleVote(1)}
										disabled={voteLoading === "vote-1"}
										title="Upvote map"
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
											border: "none",
											cursor: voteLoading === "vote-1" ? "default" : "pointer",
											flex: 1,
										}}
									>
										{voteLoading === "vote-1" ? (
											<Loader2 size={14} className="animate-spin" />
										) : (
											<ThumbsUp size={14} />
										)}
									</button>
									<button
										type="button"
										onClick={() => handleVote(0)}
										disabled={voteLoading === "vote-0"}
										title="Downvote map"
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
											border: "none",
											cursor: voteLoading === "vote-0" ? "default" : "pointer",
											flex: 1,
										}}
									>
										{voteLoading === "vote-0" ? (
											<Loader2 size={14} className="animate-spin" />
										) : (
											<ThumbsDown size={14} />
										)}
									</button>
								</div>

								<button
									type="button"
									onClick={handleFavorite}
									disabled={favLoading}
									title="Add to favorites"
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
										border: "none",
										cursor: favLoading ? "default" : "pointer",
										minWidth: "60px",
										flex: "1 0 auto",
									}}
								>
									{favLoading ? (
										<Loader2 size={14} className="animate-spin" />
									) : (
										<Heart size={14} />
									)}
								</button>
							</div>

							{downloadError && (
								<div
									style={{
										fontSize: "12px",
										color: "#e74c3c",
										padding: "6px 10px",
										background: "rgba(231,76,60,0.1)",
										borderRadius: "4px",
										marginTop: "6px",
									}}
								>
									{downloadError}
								</div>
							)}
						</div>
					</div>

					{/* Two-column: Gallery (left) + Map Details & Resources (right) */}
					<div
						style={{
							display: "flex",
							gap: "16px",
							marginBottom: "16px",
						}}
					>
						<div
							style={{
								flex: 1,
								minWidth: 0,
							}}
						>
							{screenshots.length > 0 && (
								<div
									style={{
										background: C.darkerGrey,
										border: `1px solid ${C.borderGrey}`,
										borderRadius: "8px",
										padding: "16px",
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
										{t("mapDetail.gallery")}
									</h3>

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
						</div>

						{details && (details.map_size || details.resources.length > 0) && (
							<div
								style={{
									width: "280px",
									flexShrink: 0,
									display: "flex",
									flexDirection: "column",
									gap: "12px",
								}}
							>
								{details.map_size && (
									<div
										style={{
											background: C.darkerGrey,
											border: `1px solid ${C.borderGrey}`,
											borderRadius: "8px",
											padding: "12px",
										}}
									>
										<h4
											style={{
												fontSize: "12px",
												fontWeight: 700,
												color: C.metaGrey,
												textTransform: "uppercase",
												textAlign: "center",
												margin: "0 0 8px",
												paddingBottom: "8px",
												borderBottom: `1px solid ${C.borderGrey}`,
											}}
										>
											{t("mapDetail.map_details")}
										</h4>
										<div
											style={{
												display: "flex",
												justifyContent: "space-between",
												fontSize: "13px",
												padding: "4px 0",
											}}
										>
											<span style={{ color: C.metaGrey }}>
												{t("mapDetail.map_size")}:
											</span>
											<span style={{ color: C.lightGrey, fontWeight: 600 }}>
												{details.map_size}
											</span>
										</div>
									</div>
								)}

								{details.resources.length > 0 && (
									<div
										style={{
											background: C.darkerGrey,
											border: `1px solid ${C.borderGrey}`,
											borderRadius: "8px",
											padding: "12px",
											flex: 1,
										}}
									>
										<h4
											style={{
												fontSize: "12px",
												fontWeight: 700,
												color: C.metaGrey,
												textTransform: "uppercase",
												textAlign: "center",
												margin: "0 0 8px",
												paddingBottom: "8px",
												borderBottom: `1px solid ${C.borderGrey}`,
											}}
										>
											{t("mapDetail.resources")}
										</h4>
										<div style={{ overflowX: "auto" }}>
											<table
												style={{
													width: "100%",
													borderCollapse: "collapse",
													fontSize: "12px",
												}}
											>
												<tbody>
													{details.resources.map((r) => (
														<tr
															key={r.name}
															style={{
																borderBottom: `1px solid ${C.borderGrey}`,
															}}
														>
															<td
																style={{
																	padding: "3px 6px",
																	color: C.lighterGrey,
																}}
															>
																{r.name}
															</td>
															<td
																style={{
																	padding: "3px 6px",
																	textAlign: "right",
																	color: C.lightGrey,
																	fontWeight: 600,
																}}
															>
																{r.amount}
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									</div>
								)}
							</div>
						)}
					</div>

					{/* Install instructions */}
					<div
						style={{
							background: "#1a3a4a",
							border: `1px solid ${C.grey}`,
							borderRadius: "8px",
							padding: "12px 16px",
							marginBottom: "16px",
							display: "flex",
							alignItems: "center",
							gap: "8px",
						}}
					>
						<div style={{ flex: 1, fontSize: "13px", color: C.lighterGrey, display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
							<strong>{t("mapDetail.install_instructions")}</strong>
							<code
								onClick={() => {
									navigator.clipboard.writeText(t("mapDetail.install_path"));
								}}
								style={{
									background: "rgba(0,0,0,0.3)",
									color: C.yellow,
									padding: "4px 8px",
									borderRadius: "4px",
									fontSize: "12px",
									cursor: "pointer",
									userSelect: "all",
									display: "inline-flex",
									alignItems: "center",
									gap: "6px",
									whiteSpace: "nowrap",
								}}
								title="Click to copy"
							>
								{t("mapDetail.install_path")}
								<Copy size={12} />
							</code>
						</div>
					</div>

					{/* Starting locations */}
					{details && details.starting_locations.length > 0 && (
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
								}}
							>
								{t("mapDetail.starting_locations")}
							</h3>
							{details.starting_locations.map((sl, i) => (
								<div
									key={i}
									style={{
										marginBottom: "8px",
										padding: "8px",
										background: "rgba(0,0,0,0.2)",
										borderRadius: "6px",
									}}
								>
									<div
										style={{
											fontWeight: 700,
											fontSize: "13px",
											color: C.yellow,
											marginBottom: "4px",
										}}
									>
										{sl.difficulty}
									</div>
									<div style={{ fontSize: "12px", color: C.metaGrey }}>
										{sl.description}
									</div>
								</div>
							))}
						</div>
					)}

					{/* Description */}
					<div
						style={{
							background: C.darkerGrey,
							border: `1px solid ${C.borderGrey}`,
							borderRadius: "8px",
							padding: "20px",
							marginBottom: "16px",
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
							{t("mapDetail.description")}
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
								{"description" in fallbackMap
									? (fallbackMap as MapItem).description ||
										t("mapDetail.no_description")
									: t("mapDetail.no_description")}
							</p>
						)}
					</div>

					{/* Earlier Versions */}
					{details && details.versions.length > 0 && (
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
								}}
							>
								{t("mapDetail.versions")}
							</h3>
							<div style={{ overflowX: "auto" }}>
								<table
									style={{
										width: "100%",
										borderCollapse: "collapse",
										fontSize: "13px",
									}}
								>
									<thead>
										<tr
											style={{
												borderBottom: `1px solid ${C.borderGrey}`,
												color: C.metaGrey,
												fontSize: "11px",
												textTransform: "uppercase",
											}}
										>
											<th
												style={{ padding: "6px 8px", textAlign: "center" }}
											>
												{t("mapDetail.version")}
											</th>
											<th
												style={{ padding: "6px 8px", textAlign: "center" }}
											>
												{t("mapDetail.release_date")}
											</th>
											<th
												style={{ padding: "6px 8px", textAlign: "center" }}
											>
												{t("mapDetail.downloads_short")}
											</th>
											<th
												style={{ padding: "6px 8px", textAlign: "center" }}
											>
												<Download size={12} />
											</th>
										</tr>
									</thead>
									<tbody>
										{details.versions.map((v, i) => (
											<tr
												key={i}
												style={{
													borderBottom: `1px solid ${C.borderGrey}`,
													background: v.is_current
														? "rgba(229,202,95,0.08)"
														: "transparent",
												}}
											>
												<td
													style={{
														padding: "6px 8px",
														textAlign: "center",
														color: v.is_current ? C.yellow : C.lighterGrey,
														fontWeight: v.is_current ? 700 : 400,
													}}
												>
													{v.version}{" "}
													{v.is_current
														? `(${t("mapDetail.current")})`
														: ""}
												</td>
												<td
													style={{
														padding: "6px 8px",
														textAlign: "center",
														color: C.metaGrey,
													}}
												>
													{v.release_date}
												</td>
												<td
													style={{
														padding: "6px 8px",
														textAlign: "center",
														color: C.lighterGrey,
													}}
												>
													{v.downloads.toLocaleString()}
												</td>
												<td
													style={{
														padding: "6px 8px",
														textAlign: "center",
													}}
												>
													{v.download_url && (
														<button
															type="button"
															disabled={versionDownloading === `${v.version}-${i}`}
															onClick={() =>
																handleVersionDownload(
																	v.version,
																	v.download_url,
																)
															}
															title={t("mapDetail.download_tooltip")}
															style={{
																background: "none",
																border: `1px solid ${C.grey}`,
																borderRadius: "4px",
																color: C.yellow,
																cursor: "pointer",
																padding: "4px 8px",
																display: "inline-flex",
																alignItems: "center",
																gap: "4px",
																fontSize: "11px",
															}}
														>
															{versionDownloading === `${v.version}-${i}` ? (
																<Loader2 size={12} className="animate-spin" />
															) : (
																<Download size={12} />
															)}
														</button>
													)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* Comments */}
					{details && details.comments.length > 0 && (
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
								<MessageSquare size={14} />
								{t("mapDetail.comments")} ({details.comments.length})
							</h3>
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									gap: "8px",
								}}
							>
								{details.comments.map((c, i) => (
									<div
										key={i}
										style={{
											padding: "10px",
											background: "rgba(0,0,0,0.15)",
											borderRadius: "6px",
											border: `1px solid ${C.borderGrey}`,
										}}
									>
										<div
											style={{
												display: "flex",
												alignItems: "center",
												gap: "8px",
												marginBottom: "6px",
											}}
										>
											<span
												style={{
													fontWeight: 700,
													fontSize: "13px",
													color: C.yellow,
												}}
											>
												{c.author}
											</span>
											<span
												style={{
													fontSize: "11px",
													color: C.metaGrey,
												}}
											>
												{c.created_ago}
											</span>
										</div>
										<div
											style={{
												fontSize: "13px",
												color: C.lighterGrey,
												lineHeight: 1.5,
											}}
											dangerouslySetInnerHTML={{ __html: c.text }}
										/>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
				<ScrollTopButton show={showScrollTop} onClick={scrollToTop} />
			</div>

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

function MetaItem({
	label,
	value,
	onValueClick,
}: {
	label: string;
	value: string;
	onValueClick?: () => void;
}) {
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
			{onValueClick ? (
				<button
					type="button"
					onClick={onValueClick}
					style={{
						fontSize: "14px",
						color: C.yellow,
						fontWeight: 700,
						background: "none",
						border: "none",
						padding: 0,
						cursor: "pointer",
						textDecoration: "underline",
						textUnderlineOffset: "3px",
					}}
				>
					{value}
				</button>
			) : (
				<div style={{ fontSize: "14px", color: C.lightGrey, fontWeight: 700 }}>
					{value}
				</div>
			)}
		</div>
	);
}

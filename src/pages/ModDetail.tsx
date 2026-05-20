import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import { ModDetails, Mod, getModStatus } from "@/types/mod";
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Trash2,
  CheckCircle,
  Calendar,
  Cpu,
  ExternalLink,
  FileText,
  Heart,
  Info,
  ShieldAlert,
  ThumbsUp,
  Loader2,
  Lock,
  Code,
  Eye
} from "lucide-react";

interface ModDetailProps {
  modId: string;
  onBack: () => void;
  onUpdate: (mod: Mod) => void;
  onInstall: (mod: Mod) => void;
  onUninstall: (mod: Mod) => void;
  installingIds: Set<string>;
  allMods: Mod[];
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

export function ModDetail({
  modId,
  onBack,
  onUpdate,
  onInstall,
  onUninstall,
  installingIds,
  allMods,
}: ModDetailProps) {
  const { t } = useTranslation();
  const [details, setDetails] = useState<ModDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "announcements" | "versions" | "changelog" | "dependencies">("info");
  const [selectedVersionIndex, setSelectedVersionIndex] = useState<number>(0);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Encontra o mod correspondente na lista local para sincronizar estados de instalação
  const localMod = useMemo(() => {
    return allMods.find((m) => m.id === modId);
  }, [allMods, modId]);

  const isInstalling = installingIds.has(modId);
  const localStatus = localMod ? getModStatus(localMod) : "not_installed";

  useEffect(() => {
    async function fetchDetails() {
      setLoading(true);
      setError(null);
      try {
        const data = await invoke<ModDetails>("get_mod_details", { modId });
        setDetails(data);
        // Reset vertical selection when details changes
        setSelectedVersionIndex(0);
      } catch (err) {
        console.error("Erro ao carregar detalhes do mod:", err);
        setError(String(err));
      } finally {
        setLoading(false);
      }
    }
    fetchDetails();
  }, [modId]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, alignItems: "center", justifyContent: "center", gap: "16px", color: C.metaGrey }}>
        <Loader2 size={36} style={{ animation: "spin 0.8s linear infinite", color: C.yellow }} />
        <span>{t("common.loading_details", "Carregando detalhes...")}</span>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, alignItems: "center", justifyContent: "center", gap: "16px", padding: "20px" }}>
        <ShieldAlert size={48} style={{ color: "#ef5350" }} />
        <h3 style={{ color: C.lightGrey, fontSize: "18px", fontWeight: 600 }}>{t("common.error_loading", "Erro ao carregar")}</h3>
        <p style={{ color: C.metaGrey, fontSize: "14px", textAlign: "center", maxWidth: "480px" }}>{error || t("common.unknown_error", "Erro desconhecido")}</p>
        <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
          <button
            onClick={onBack}
            style={{
              display: "flex", alignItems: "center", gap: "6px", fontSize: "13px",
              backgroundColor: C.grey, color: C.lightGrey, padding: "8px 16px",
              borderRadius: "4px", border: "none", cursor: "pointer", fontWeight: 600
            }}
          >
            <ArrowLeft size={14} />
            {t("common.btn_back", "Voltar")}
          </button>
          <button
            onClick={async () => {
              setLoading(true);
              setError(null);
              try {
                const data = await invoke<ModDetails>("get_mod_details", { modId });
                setDetails(data);
              } catch (err) {
                setError(String(err));
              } finally {
                setLoading(false);
              }
            }}
            style={{
              fontSize: "13px", backgroundColor: C.yellow, color: C.borderGrey,
              padding: "8px 16px", borderRadius: "4px", border: "none", cursor: "pointer", fontWeight: 700
            }}
          >
            {t("common.btn_retry", "Tentar Novamente")}
          </button>
        </div>
      </div>
    );
  }

  const selectedVersion = details.versions[selectedVersionIndex];

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, backgroundColor: "#2f2f2f" }}>
      {/* Estilos injetados para a descrição HTML scraped */}
      <style>{`
        .mod-desc-content h1, .mod-desc-content h2, .mod-desc-content h3 {
          color: #e5ca5f;
          margin-top: 20px;
          margin-bottom: 10px;
          font-weight: 600;
        }
        .mod-desc-content h1 { font-size: 1.6em; border-bottom: 1px solid #414141; padding-bottom: 6px; }
        .mod-desc-content h2 { font-size: 1.35em; border-bottom: 1px dashed #3a3a3a; padding-bottom: 4px; }
        .mod-desc-content h3 { font-size: 1.15em; }
        .mod-desc-content p {
          margin-bottom: 14px;
          line-height: 1.6;
          color: #e0e0e0;
        }
        .mod-desc-content ul, .mod-desc-content ol {
          margin-bottom: 14px;
          padding-left: 24px;
        }
        .mod-desc-content li {
          margin-bottom: 6px;
          line-height: 1.5;
        }
        .mod-desc-content a {
          color: #e5ca5f;
          text-decoration: underline;
          transition: color 0.2s;
        }
        .mod-desc-content a:hover {
          color: #ffffff;
        }
        .mod-desc-content img {
          max-width: 100%;
          height: auto;
          border-radius: 6px;
          margin: 12px auto;
          display: block;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        }
        .mod-desc-content pre, .mod-desc-content code {
          background-color: #222;
          padding: 3px 6px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.9em;
          color: #e5ca5f;
        }
        .mod-desc-content pre {
          padding: 12px;
          overflow-x: auto;
          margin-bottom: 14px;
          border: 1px solid #333;
        }
        .mod-desc-content table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 18px;
        }
        .mod-desc-content th, .mod-desc-content td {
          border: 1px solid #414141;
          padding: 10px;
          text-align: left;
          font-size: 13px;
        }
        .mod-desc-content th {
          background-color: #292929;
          color: #e5ca5f;
          font-weight: 600;
        }
        .mod-desc-content tr:nth-child(even) td {
          background-color: rgba(255,255,255,0.02);
        }
      `}</style>

      {/* Header com botão de voltar */}
      <div style={{
        padding: "12px 20px",
        borderBottom: `1px solid ${C.borderGrey}`,
        backgroundColor: C.darkerGrey,
        display: "flex",
        alignItems: "center",
        gap: "12px",
        flexShrink: 0
      }}>
        <button
          onClick={onBack}
          style={{
            display: "flex", alignItems: "center", gap: "6px", fontSize: "12px",
            backgroundColor: C.grey, color: C.lighterGrey, padding: "5px 12px",
            borderRadius: "4px", border: `1px solid ${C.borderGrey}`, cursor: "pointer",
            fontWeight: 600, textTransform: "uppercase", transition: "all 0.2s"
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#4f4f4f"; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = C.grey; e.currentTarget.style.color = C.lighterGrey; }}
        >
          <ArrowLeft size={13} />
          {t("common.btn_back", "Voltar")}
        </button>
        <span style={{ color: C.metaGrey, fontSize: "13px" }}>
          / {t("modDetail.path_details", "Detalhes do Mod")}
        </span>
      </div>

      {/* Main Container Rolável */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        
        {/* Mod Meta Hero Header */}
        <div style={{
          display: "flex", gap: "20px", marginBottom: "20px",
          backgroundColor: C.darkerGrey, padding: "20px", borderRadius: "10px",
          boxShadow: "0 4px 10px rgba(0,0,0,0.35)", position: "relative"
        }}>
          {/* Thumbnail */}
          <div style={{ flexShrink: 0 }}>
            {localMod?.thumbnail ? (
              <img
                src={localMod.thumbnail}
                alt={details.name}
                style={{ width: "140px", height: "140px", borderRadius: "8px", objectFit: "cover", display: "block" }}
              />
            ) : (
              <div style={{ width: "140px", height: "140px", borderRadius: "8px", backgroundColor: C.grey, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.5 }}>
                <Cpu size={48} style={{ color: C.metaGrey }} />
              </div>
            )}
          </div>

          {/* Header text + info */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
              <h1 style={{ fontSize: "24px", fontWeight: 800, color: C.lightGrey, margin: 0, lineHeight: 1.1 }}>
                {details.name}
              </h1>
              {details.version_available && (
                <span style={{
                  fontSize: "11px", fontWeight: 700, backgroundColor: C.borderGrey,
                  color: C.yellow, padding: "2px 8px", borderRadius: "4px", border: `1px solid ${C.yellow}33`
                }}>
                  v{details.version_available}
                </span>
              )}
            </div>

            <div style={{ fontSize: "13px", color: C.metaGrey }}>
              {t("modCard.by_author", "por {{author}}", { author: details.author })}
            </div>

            <div style={{ fontSize: "14px", color: C.lighterGrey, lineHeight: "1.4", margin: "4px 0 8px 0" }}>
              {details.short_description}
            </div>

            {/* Tags e Links secundários */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
              {details.license && (
                <span title="Licença" style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", color: C.metaGrey, backgroundColor: "#222", padding: "3px 8px", borderRadius: "4px" }}>
                  <Lock size={10} />
                  {details.license}
                </span>
              )}
              {details.source_code_url && (
                <a
                  href={details.source_code_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", color: C.yellow, textDecoration: "none", backgroundColor: "#222", padding: "3px 8px", borderRadius: "4px", border: "1px solid transparent" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.yellow; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; }}
                >
                  <Code size={10} />
                  {t("modDetail.source_code", "Código Fonte")}
                  <ExternalLink size={8} />
                </a>
              )}
              {details.tags.map((tg) => (
                <span key={tg} style={{ fontSize: "11px", color: C.metaGrey, backgroundColor: C.grey, padding: "2px 7px", borderRadius: "3px" }}>
                  {tg}
                </span>
              ))}
            </div>
          </div>

          {/* Action Trigger Box (Painel lateral de instalação) */}
          <div style={{
            width: "240px", flexShrink: 0, display: "flex", flexDirection: "column",
            justifyContent: "center", borderLeft: `1px solid ${C.grey}`, paddingLeft: "20px", gap: "10px"
          }}>
            {/* Status Visual */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
              {localStatus === "installed" ? (
                <>
                  <CheckCircle size={15} style={{ color: "#a3e4bc" }} />
                  <span style={{ color: "#a3e4bc", fontWeight: 600 }}>
                    {t("modDetail.status_installed", "Instalado (v{{version}})", { version: localMod?.version_installed })}
                  </span>
                </>
              ) : localStatus === "outdated" ? (
                <>
                  <RefreshCw size={15} style={{ color: "#ffe08a" }} />
                  <span style={{ color: "#ffe08a", fontWeight: 600 }}>
                    {t("modDetail.status_outdated", "Atualização Disponível (Instalado: v{{installed}})", { installed: localMod?.version_installed })}
                  </span>
                </>
              ) : (
                <>
                  <Info size={15} style={{ color: C.metaGrey }} />
                  <span style={{ color: C.lighterGrey }}>
                    {t("modDetail.status_not_installed", "Não Instalado")}
                  </span>
                </>
              )}
            </div>

            {/* Botões de Ação */}
            <div style={{ display: "flex", gap: "8px" }}>
              {isInstalling ? (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  fontSize: "13px", color: C.yellow, fontWeight: 700, flex: 1,
                  backgroundColor: C.grey, height: "36px", borderRadius: "4px"
                }}>
                  <Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} />
                  {localStatus === "outdated" ? t("modCard.updating", "Atualizando...") : t("modCard.installing", "Instalando...")}
                </div>
              ) : (
                <>
                  {/* Instalar */}
                  {localStatus === "not_installed" && (
                    <button
                      onClick={() => localMod && onInstall(localMod)}
                      disabled={!localMod}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                        fontSize: "13px", backgroundColor: C.yellow, color: C.borderGrey,
                        fontWeight: 700, padding: "8px 16px", borderRadius: "4px", border: "none",
                        cursor: localMod ? "pointer" : "default", flex: 1, textTransform: "uppercase",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                      }}
                    >
                      <Download size={14} />
                      {t("modCard.btn_install", "Instalar")}
                    </button>
                  )}

                  {/* Atualizar */}
                  {localStatus === "outdated" && (
                    <button
                      onClick={() => localMod && onUpdate(localMod)}
                      disabled={!localMod}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                        fontSize: "13px", backgroundColor: C.yellow, color: C.borderGrey,
                        fontWeight: 700, padding: "8px 16px", borderRadius: "4px", border: "none",
                        cursor: localMod ? "pointer" : "default", flex: 1, textTransform: "uppercase",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                      }}
                    >
                      <RefreshCw size={14} />
                      {t("modCard.btn_update", "Atualizar")}
                    </button>
                  )}

                  {/* Desinstalar */}
                  {localMod?.is_installed && (
                    <button
                      onClick={() => onUninstall(localMod)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                        fontSize: "13px", backgroundColor: "#6e2020", color: "#f5b7b7",
                        fontWeight: 700, padding: "8px 16px", borderRadius: "4px", border: "none",
                        cursor: "pointer", flex: localStatus === "outdated" ? "none" : 1, textTransform: "uppercase"
                      }}
                      title={t("modCard.btn_uninstall", "Desinstalar")}
                    >
                      <Trash2 size={14} />
                      {localStatus === "installed" && t("modCard.btn_uninstall", "Desinstalar")}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Compatibilidade de saves */}
            <div style={{
              marginTop: "4px", borderTop: `1px solid ${C.grey}`, paddingTop: "8px",
              display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px", color: C.metaGrey
            }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{t("modDetail.save_add", "Adicionar ao Save:")}</span>
                <span style={{ color: details.save_game_add_ok ? "#a3e4bc" : "#ef5350", fontWeight: 700 }}>
                  {details.save_game_add_ok ? t("modDetail.save_ok", "Compatível ✓") : t("modDetail.save_no", "Não recomendado ✗")}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{t("modDetail.save_remove", "Remover do Save:")}</span>
                <span style={{ color: details.save_game_remove_ok ? "#a3e4bc" : "#ef5350", fontWeight: 700 }}>
                  {details.save_game_remove_ok ? t("modDetail.save_ok", "Compatível ✓") : t("modDetail.save_no", "Não recomendado ✗")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bar de Informações e Métricas (Stats Bar) */}
        <div style={{
          display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: "10px",
          backgroundColor: C.darkerGrey, padding: "12px", borderRadius: "8px",
          marginBottom: "20px", border: `1px solid ${C.borderGrey}`, boxShadow: "inset 0 2px 4px rgba(0,0,0,0.2)"
        }}>
          {/* Downloads */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: "10px", color: C.metaGrey, textTransform: "uppercase" }}>{t("common.downloads", "Downloads")}</span>
            <span style={{ fontSize: "15px", fontWeight: 700, color: C.lightGrey, display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
              <Download size={13} style={{ color: C.yellow }} />
              {details.downloads.toLocaleString()}
            </span>
          </div>

          {/* Favorites */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: "10px", color: C.metaGrey, textTransform: "uppercase" }}>{t("common.favorites", "Favoritos")}</span>
            <span style={{ fontSize: "15px", fontWeight: 700, color: C.lightGrey, display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
              <Heart size={13} style={{ color: "#ef5350", fill: "#ef5350" }} />
              {details.favorites.toLocaleString()}
            </span>
          </div>

          {/* Aprovação */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: "10px", color: C.metaGrey, textTransform: "uppercase" }}>{t("common.approval", "Aprovação")}</span>
            <span style={{ fontSize: "15px", fontWeight: 700, color: C.lightGrey, display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
              <ThumbsUp size={13} style={{ color: "#81c784" }} />
              {details.approval_pct >= 0 ? `${details.approval_pct}%` : "---"}
            </span>
          </div>

          {/* Atualizado */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: "10px", color: C.metaGrey, textTransform: "uppercase" }}>{t("common.updated", "Atualizado em")}</span>
            <span style={{ fontSize: "14px", fontWeight: 600, color: C.lightGrey, display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
              <Calendar size={13} style={{ color: C.metaGrey }} />
              {details.updated_at ? new Date(details.updated_at).toLocaleDateString() : "---"}
            </span>
          </div>

          {/* Tamanho do Arquivo */}
          {details.zip_file_size && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: "10px", color: C.metaGrey, textTransform: "uppercase" }}>{t("modDetail.size", "Tamanho ZIP")}</span>
              <span style={{ fontSize: "14px", fontWeight: 600, color: C.lightGrey, display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                <FileText size={13} style={{ color: C.metaGrey }} />
                {details.zip_file_size}
              </span>
            </div>
          )}

          {/* Versões de Jogo */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: "10px", color: C.metaGrey, textTransform: "uppercase" }}>{t("modCard.game_version_title", "Versões do Jogo")}</span>
            <span style={{ fontSize: "14px", fontWeight: 600, color: C.lightGrey, display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
              <Cpu size={13} style={{ color: C.metaGrey }} />
              {details.game_versions || "---"}
            </span>
          </div>
        </div>

        {/* Tab Switcher Headers */}
        <div style={{
          display: "flex", borderBottom: `1px solid ${C.grey}`, marginBottom: "20px", gap: "4px"
        }}>
          {([
            { id: "info", label: t("modDetail.tab_info", "Informações") },
            { id: "announcements", label: t("modDetail.tab_announcements", "Anúncios") + ` (${details.announcements.length})` },
            { id: "versions", label: t("modDetail.tab_versions", "Versões") + ` (${details.versions.length})` },
            { id: "changelog", label: t("modDetail.tab_changelog", "Histórico de Alterações") },
            { id: "dependencies", label: t("modDetail.tab_dependencies", "Dependências") }
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "10px 16px", fontSize: "13px", fontWeight: activeTab === tab.id ? 700 : 500,
                color: activeTab === tab.id ? C.yellow : C.lighterGrey,
                backgroundColor: activeTab === tab.id ? C.darkerGrey : "transparent",
                border: "none", borderBottom: `2px solid ${activeTab === tab.id ? C.yellow : "transparent"}`,
                borderTopLeftRadius: "6px", borderTopRightRadius: "6px", cursor: "pointer", transition: "all 0.15s"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Rendering */}
        <div style={{ minHeight: "260px" }}>
          
          {/* TAB 1: Informações */}
          {activeTab === "info" && (
            <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
              {/* Coluna Esquerda: Descrição Scraped HTML */}
              <div style={{ flex: 1, minWidth: 0, backgroundColor: C.darkerGrey, padding: "20px", borderRadius: "8px", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}>
                <div
                  className="mod-desc-content"
                  dangerouslySetInnerHTML={{ __html: details.description_html || `<p>${details.short_description}</p>` }}
                />
              </div>

              {/* Coluna Direita: Screenshots, Websites, Capabilities */}
              <div style={{ width: "280px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "20px" }}>
                
                {/* Screenshot Gallery Grid */}
                {details.screenshots.length > 0 && (
                  <div style={{ backgroundColor: C.darkerGrey, padding: "16px", borderRadius: "8px", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: 700, color: C.yellow, marginBottom: "12px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Eye size={14} />
                      {t("modDetail.gallery", "Galeria")}
                    </h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                      {details.screenshots.map((src, i) => (
                        <div
                          key={i}
                          onClick={() => setLightboxImage(src)}
                          style={{
                            borderRadius: "4px", overflow: "hidden", cursor: "zoom-in",
                            aspectRatio: "16/10", border: `1px solid ${C.grey}`, position: "relative"
                          }}
                        >
                          <img
                            src={src}
                            alt={`Screenshot ${i + 1}`}
                            style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.2s" }}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.08)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* websites & links table */}
                {details.websites.length > 0 && (
                  <div style={{ backgroundColor: C.darkerGrey, padding: "16px", borderRadius: "8px", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: 700, color: C.yellow, marginBottom: "12px", textTransform: "uppercase" }}>
                      {t("modDetail.websites", "Sites do Mod")}
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {details.websites.map((url, i) => {
                        let label = t("modDetail.link_website", "Website Oficial");
                        if (url.includes("github.com")) label = "GitHub Repository";
                        else if (url.includes("gitlab.com")) label = "GitLab Repository";
                        else if (url.includes("discord")) label = "Discord Server";
                        
                        return (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              fontSize: "12px", color: C.lightGrey, textDecoration: "none",
                              backgroundColor: C.grey, padding: "8px 10px", borderRadius: "4px",
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                              border: "1px solid transparent", transition: "all 0.15s"
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.yellow; e.currentTarget.style.backgroundColor = "#4f4f4f"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.backgroundColor = C.grey; }}
                          >
                            <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", marginRight: "6px" }}>{label}</span>
                            <ExternalLink size={11} style={{ flexShrink: 0, color: C.metaGrey }} />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Capabilities Alert column */}
                {details.capabilities.length > 0 && (
                  <div style={{ backgroundColor: C.darkerGrey, padding: "16px", borderRadius: "8px", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: 700, color: C.yellow, marginBottom: "12px", textTransform: "uppercase" }}>
                      {t("modDetail.capabilities", "Capacidades do Mod")}
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {details.capabilities.map((cap, i) => {
                        const bg = cap.severity === "concerning" ? "#6e2020" : cap.severity === "notable" ? "#7a5a00" : "#222";
                        const border = cap.severity === "concerning" ? "#ef5350" : cap.severity === "notable" ? "#ffe08a" : "#444";
                        const col = cap.severity === "concerning" ? "#f5b7b7" : cap.severity === "notable" ? "#ffe08a" : C.lighterGrey;
                        
                        return (
                          <div
                            key={i}
                            style={{
                              backgroundColor: bg, border: `1px solid ${border}`,
                              borderRadius: "6px", padding: "10px", display: "flex", flexDirection: "column", gap: "4px"
                            }}
                          >
                            <span style={{ fontSize: "11px", fontWeight: 800, color: col, textTransform: "uppercase", display: "flex", alignItems: "center", gap: "4px" }}>
                              {cap.severity === "concerning" || cap.severity === "notable" ? <ShieldAlert size={11} /> : <Info size={11} />}
                              {cap.name}
                            </span>
                            <span style={{ fontSize: "12px", color: C.lightGrey, lineHeight: 1.3 }}>
                              {cap.description}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Anúncios */}
          {activeTab === "announcements" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {details.announcements.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: C.metaGrey, backgroundColor: C.darkerGrey, borderRadius: "8px" }}>
                  {t("modDetail.no_announcements", "Nenhum anúncio feito para este mod.")}
                </div>
              ) : (
                details.announcements.map((ann, i) => (
                  <div key={i} style={{ backgroundColor: C.darkerGrey, padding: "20px", borderRadius: "8px", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px", borderBottom: `1px solid ${C.grey}`, paddingBottom: "8px" }}>
                      <h4 style={{ fontSize: "16px", fontWeight: 700, color: C.yellow, margin: 0 }}>
                        {ann.title}
                      </h4>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {ann.version && (
                          <span style={{ fontSize: "11px", color: C.borderGrey, backgroundColor: C.yellow, padding: "2px 7px", borderRadius: "4px", fontWeight: 700 }}>
                            {ann.version}
                          </span>
                        )}
                        <span style={{ fontSize: "12px", color: C.metaGrey }}>
                          {ann.date}
                        </span>
                      </div>
                    </div>
                    <div className="mod-desc-content" dangerouslySetInnerHTML={{ __html: ann.content_html }} />
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: Versões (Split-pane layout vertical) */}
          {activeTab === "versions" && (
            <div style={{ display: "flex", gap: "20px", alignItems: "stretch", minHeight: "360px" }}>
              {/* Painel Esquerdo: Lista de Versões */}
              <div style={{ width: "240px", flexShrink: 0, backgroundColor: C.darkerGrey, borderRadius: "8px", padding: "10px", display: "flex", flexDirection: "column", gap: "6px", overflowY: "auto", maxHeight: "400px" }}>
                {details.versions.map((ver, idx) => (
                  <button
                    key={ver.version}
                    onClick={() => setSelectedVersionIndex(idx)}
                    style={{
                      padding: "10px 12px", border: "none", borderRadius: "6px", cursor: "pointer",
                      display: "flex", flexDirection: "column", gap: "3px", textAlign: "left", transition: "all 0.15s",
                      backgroundColor: selectedVersionIndex === idx ? C.yellow : "transparent",
                      color: selectedVersionIndex === idx ? C.borderGrey : C.lightGrey
                    }}
                    onMouseEnter={(e) => {
                      if (selectedVersionIndex !== idx) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)";
                    }}
                    onMouseLeave={(e) => {
                      if (selectedVersionIndex !== idx) e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <span style={{ fontSize: "13px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                      {ver.version}
                      {ver.latest && (
                        <span style={{
                          fontSize: "9px", padding: "1px 5px", borderRadius: "3px", fontWeight: 800,
                          backgroundColor: selectedVersionIndex === idx ? C.borderGrey : C.yellow,
                          color: selectedVersionIndex === idx ? C.yellow : C.borderGrey
                        }}>
                          LATEST
                        </span>
                      )}
                    </span>
                    <span style={{ fontSize: "11px", opacity: 0.8 }}>
                      {ver.released_date || t("common.no_date", "Sem data")}
                    </span>
                  </button>
                ))}
              </div>

              {/* Painel Direito: Detalhes da Versão Selecionada */}
              {selectedVersion ? (
                <div style={{ flex: 1, backgroundColor: C.darkerGrey, borderRadius: "8px", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ borderBottom: `1px solid ${C.grey}`, paddingBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h4 style={{ fontSize: "18px", fontWeight: 700, color: C.yellow, margin: 0 }}>
                      {t("modDetail.version_title", "Versão {{version}}", { version: selectedVersion.version })}
                    </h4>
                    {selectedVersion.download_url && localMod && (
                      <button
                        onClick={() => onInstall(localMod)}
                        style={{
                          display: "flex", alignItems: "center", gap: "6px", fontSize: "12px",
                          backgroundColor: C.yellow, color: C.borderGrey, padding: "5px 12px",
                          borderRadius: "4px", border: "none", cursor: "pointer", fontWeight: 700
                        }}
                      >
                        <Download size={12} />
                        {t("modDetail.download_this", "Baixar esta Versão")}
                      </button>
                    )}
                  </div>

                  {/* Tabela de Meta de Versão */}
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", color: C.lightGrey }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: "6px 0", color: C.metaGrey, width: "130px" }}>{t("modCard.game_version_title", "Versão do Jogo:")}</td>
                        <td style={{ padding: "6px 0", fontWeight: 600 }}>{selectedVersion.game_version || "---"}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "6px 0", color: C.metaGrey }}>{t("common.released", "Lançado em:")}</td>
                        <td style={{ padding: "6px 0" }}>{selectedVersion.released_date || "---"}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "6px 0", color: C.metaGrey }}>{t("modDetail.size", "Tamanho do arquivo:")}</td>
                        <td style={{ padding: "6px 0" }}>{selectedVersion.file_size || "---"}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "6px 0", color: C.metaGrey }}>{t("modDetail.license", "Licença:")}</td>
                        <td style={{ padding: "6px 0" }}>{selectedVersion.license || "---"}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "6px 0", color: C.metaGrey }}>{t("common.downloads", "Downloads:")}</td>
                        <td style={{ padding: "6px 0" }}>{selectedVersion.downloads?.toLocaleString() || 0}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Notas da Versão */}
                  <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                    <h5 style={{ fontSize: "12px", color: C.metaGrey, textTransform: "uppercase", margin: 0 }}>
                      {t("modDetail.release_notes", "Notas de Versão / Mudanças")}
                    </h5>
                    <div style={{
                      flex: 1, overflowY: "auto", backgroundColor: "#222", padding: "12px",
                      borderRadius: "6px", border: "1px solid #333", maxHeight: "200px"
                    }}>
                      <pre style={{
                        margin: 0, whiteSpace: "pre-wrap", fontFamily: "monospace",
                        fontSize: "12.5px", color: C.lightGrey, lineHeight: 1.5
                      }}>
                        {selectedVersion.changelog || t("modDetail.no_release_notes", "Nenhuma nota de versão provida.")}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.metaGrey, backgroundColor: C.darkerGrey, borderRadius: "8px" }}>
                  {t("modDetail.select_version", "Selecione uma versão para ver detalhes")}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Histórico de Alterações */}
          {activeTab === "changelog" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {details.changelogs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: C.metaGrey, backgroundColor: C.darkerGrey, borderRadius: "8px" }}>
                  {t("modDetail.no_changelogs", "Nenhum histórico de alterações disponível.")}
                </div>
              ) : (
                details.changelogs.map((ch, i) => (
                  <div key={i} style={{ backgroundColor: C.darkerGrey, padding: "20px", borderRadius: "8px", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${C.grey}`, paddingBottom: "6px", marginBottom: "10px" }}>
                      <h4 style={{ fontSize: "15px", fontWeight: 700, color: C.yellow, margin: 0 }}>
                        {t("modDetail.version_title", "Versão {{version}}", { version: ch.version })}
                      </h4>
                      <span style={{ fontSize: "12px", color: C.metaGrey }}>
                        {ch.date}
                      </span>
                    </div>
                    <pre style={{
                      margin: 0, whiteSpace: "pre-wrap", fontFamily: "monospace",
                      fontSize: "12.5px", color: C.lightGrey, lineHeight: 1.5, backgroundColor: "#222", padding: "12px", borderRadius: "6px", border: "1px solid #333"
                    }}>
                      {ch.text}
                    </pre>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 5: Dependências */}
          {activeTab === "dependencies" && (
            <div style={{
              backgroundColor: C.darkerGrey, padding: "24px", borderRadius: "8px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)", border: `1px solid ${C.grey}`
            }}>
              <h4 style={{ fontSize: "16px", fontWeight: 700, color: C.yellow, marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <ShieldAlert size={16} />
                {t("modDetail.tab_dependencies", "Dependências e Requisitos")}
              </h4>
              <p style={{
                margin: 0, color: C.lightGrey, fontSize: "13.5px", lineHeight: "1.6",
                whiteSpace: "pre-wrap", backgroundColor: "#222", padding: "16px", borderRadius: "6px", border: "1px solid #333"
              }}>
                {details.dependencies || t("modDetail.no_dependencies", "Este mod não tem dependências de outros mods listados no Hub.")}
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Screen Lightbox (Screenshot Ampliado) */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
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
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          <img
            src={lightboxImage}
            alt="Full Screenshot"
            style={{
              maxWidth: "92%",
              maxHeight: "92%",
              borderRadius: "6px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
              border: "1px solid #444",
              display: "block"
            }}
          />
          <button
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
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#fff"; e.currentTarget.style.color = "#000"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = C.darkerGrey; e.currentTarget.style.color = "#fff"; }}
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}

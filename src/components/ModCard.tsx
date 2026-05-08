import { Mod, getModStatus, DEVSTATE_LABELS, DEVSTATE_STYLES } from "@/types/mod";
import { Download, RefreshCw, CheckCircle, Cpu, Loader2 } from "lucide-react";

interface ModCardProps {
  mod: Mod;
  onUpdate: (mod: Mod) => void;
  onInstall: (mod: Mod) => void;
  installing?: boolean;
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

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}m atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d atrás`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo atrás`;
  return `${Math.floor(mo / 12)}a atrás`;
}

const tag: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: C.metaGrey,
  backgroundColor: C.borderGrey,
  padding: "2px 7px",
  borderRadius: "3px",
  whiteSpace: "nowrap",
  flexShrink: 0,
};

export function ModCard({ mod, onUpdate, onInstall, installing = false }: ModCardProps) {
  const status = getModStatus(mod);
  const tags = mod.category ? mod.category.split(",").map((t) => t.trim()).filter(Boolean) : [];
  const devstyle = DEVSTATE_STYLES[mod.devstate];
  const devlabel = DEVSTATE_LABELS[mod.devstate];

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      backgroundColor: C.grey,
      borderRadius: "10px",
      overflow: "hidden",
      boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
      minHeight: "210px",
    }}>
      {/* Content area: icon + right column */}
      <div style={{
        display: "flex",
        flexDirection: "row",
        flex: 1,
        overflow: "hidden",
      }}>
        {/* Thumbnail */}
        <div style={{ flexShrink: 0 }}>
          {mod.thumbnail ? (
            <img
              src={mod.thumbnail}
              alt={mod.name}
              style={{
                width: "128px",
                height: "128px",
                borderRadius: "6px",
                objectFit: "cover",
                margin: "10px",
                display: "block",
              }}
            />
          ) : (
            <div style={{
              width: "128px",
              height: "128px",
              borderRadius: "6px",
              backgroundColor: C.darkerGrey,
              margin: "10px",
              opacity: 0.5,
            }} />
          )}
        </div>

        {/* Right column */}
        <div style={{
          flex: 1,
          minWidth: 0,
          padding: "10px 12px 10px 0",
          display: "flex",
          flexDirection: "column",
          gap: "5px",
          overflow: "hidden",
        }}>
          {/* Name */}
          <div style={{
            fontSize: "16px",
            fontWeight: 700,
            color: C.lightGrey,
            lineHeight: 1.2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {mod.name}
          </div>

          {/* Author */}
          {mod.author && (
            <div style={{
              fontSize: "12px",
              color: C.metaGrey,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              by {mod.author}
            </div>
          )}

          {/* Description */}
          {mod.description && (
            <div style={{
              fontSize: "12px",
              color: C.lighterGrey,
              lineHeight: "1.4",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              flex: "none",
            }}>
              {mod.description}
            </div>
          )}

          {/* Badges row: devstate + game version + install status */}
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "4px",
            marginTop: "2px",
          }}>
            {devstyle && devlabel && (
              <span style={{ ...tag, backgroundColor: devstyle.bg, color: devstyle.color }}>
                {devlabel}
              </span>
            )}
            {mod.game_version && (
              <span style={{
                ...tag,
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
              }}>
                <Cpu size={10} />
                Jogo v{mod.game_version}
              </span>
            )}
            {status === "installed" && (
              <span style={{ ...tag, backgroundColor: "#1e6e3e", color: "#a3e4bc" }}>
                Instalado
              </span>
            )}
            {status === "outdated" && (
              <span style={{ ...tag, backgroundColor: "#7a5a00", color: "#ffe08a" }}>
                Atualização disponível
              </span>
            )}
          </div>

          {/* Category tags */}
          {tags.length > 0 && (
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "4px",
            }}>
              {tags.map((t) => (
                <span key={t} style={tag}>{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats bar — igual ao site */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "6px 12px",
        backgroundColor: C.borderGrey,
        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)",
        flexShrink: 0,
        fontSize: "12px",
        color: C.metaGrey,
      }}>
        {/* Esquerda: ícone relógio + tempo */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="m13.1 1a10.927 10.927 0 0 0 -10.534 8.223l-.732-1.107a1 1 0 1 0 -1.668 1.1l2.2 3.334a1.084 1.084 0 0 0 .634.425 1.024 1.024 0 0 0 .756-.145l3.3-2.223a1 1 0 1 0 -1.115-1.659l-1.501 1.012a8.909 8.909 0 1 1 8.66 11.04 8.892 8.892 0 0 1 -7.281-3.822 1 1 0 1 0 -1.64 1.143 10.881 10.881 0 0 0 19.821-6.321 10.963 10.963 0 0 0 -10.9-11z"/>
            <path d="m13 5.95a1 1 0 0 0 -1 1v5.05a1.04 1.04 0 0 0 .293.707l3 3.027a1.013 1.013 0 0 0 1.414.007 1 1 0 0 0 .006-1.414l-2.713-2.738v-4.639a1 1 0 0 0 -1-1z"/>
          </svg>
          <span>{mod.updated_at ? timeAgo(mod.updated_at) : "—"}</span>
        </div>

        {/* Direita: downloads + favorites + approval + botão ação */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Downloads */}
          {mod.downloads > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                <path stroke="none" d="m9 9.114l1.85-1.943a.52.52 0 0 1 .77 0c.214.228.214.6 0 .829l-1.95 2.05a1.552 1.552 0 0 1-2.31 0L5.41 8a.617.617 0 0 1 0-.829a.52.52 0 0 1 .77 0L8 9.082V.556C8 .249 8.224 0 8.5 0s.5.249.5.556z"/>
                <path stroke="none" d="M16 13.006V10h-1v3.006a.995.995 0 0 1-.994.994H3.01a.995.995 0 0 1-.994-.994V10h-1v3.006c0 1.1.892 1.994 1.994 1.994h10.996c1.1 0 1.994-.893 1.994-1.994"/>
              </svg>
              <span>{mod.downloads.toLocaleString()}</span>
            </div>
          )}
          {/* Favorites */}
          {mod.favorites > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 656.2 628.8" fill="currentColor">
                <path d="M155.2 628.8c-2.4 0-4.8-.2-7.4-.6-15.3-2.6-28.8-12.4-36-26.1-8.3-15.9-5-31.7.1-55.5l30.5-143.9-109.2-98.5c-18.1-16.3-30-27.1-32.7-44.9-2.3-15.4 2.9-31.2 13.7-42.3 12.6-12.9 28.6-14.5 52.8-17.1l146.3-15.4 59.9-134.4 30.4 13.6-30.4-13.6c9.9-22.2 16.5-36.9 32.6-44.9 13.9-6.9 30.5-6.9 44.4 0 16.1 8 22.7 22.7 32.6 44.9l59.9 134.4L589 199.9c24.2 2.6 40.2 4.2 52.8 17.1 10.9 11.1 16 26.9 13.7 42.3-2.6 17.8-14.6 28.6-32.6 44.9l-109.3 98.5 30.5 143.9c5.1 23.8 8.4 39.6 0 55.5-7.2 13.8-20.6 23.5-36 26.1-17.7 3-31.7-5-52.8-17.2l-127.5-73.5L200.6 611c-18.1 10.5-30.9 17.8-45.4 17.8zm18.3-48.6zm-23.8-17.3zM88.9 264.7l101 91.1c5.4 4.9 10.2 9.2 14.1 16 3.5 6.1 5.7 12.8 6.4 19.8.8 7.9-.5 14.1-2 21.2l-28.2 133.1 117.8-68c6.3-3.7 11.8-6.8 19.6-8.5 6.9-1.5 13.9-1.5 20.8 0 7.8 1.7 13.3 4.8 19.6 8.5l117.8 68-28.2-133.1c-1.5-7.2-2.8-13.4-2-21.3.7-7 2.9-13.6 6.4-19.7 4-6.9 8.7-11.1 14.1-16l101.1-91.1L432 250.4c-7.3-.8-13.6-1.4-20.8-4.7-6.5-2.9-12.1-7-16.8-12.2-5.3-5.9-7.9-11.6-10.8-18.3L328.1 90.9l-55.4 124.2c-3 6.7-5.6 12.5-10.9 18.4-4.7 5.2-10.4 9.3-16.8 12.2-7.2 3.2-13.5 3.9-20.8 4.7L88.9 264.7z"/>
              </svg>
              <span>{mod.favorites}</span>
            </div>
          )}
          {/* Approval % */}
          {mod.approval_pct >= 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 471.1 474" fill="currentColor">
                <path d="M471.1 209c0-44.2-41.2-61.8-64.8-61.8h-64.8c11.8-29.4 20.6-64.8 14.7-91.3C341.5 2.9 297.4 0 282.6 0h-2.9c-11.8 0-17.7 5.9-23.6 14.7l-29.4 82.4-79.5 79.5H0v265h147.2v-29.4c5.9 0 20.6 8.8 35.3 17.7C217.9 447.5 267.9 474 315 474c70.7 0 94.2-8.8 111.9-38.3 8.8-17.7 8.8-32.4 8.8-41.2 5.9-5.9 14.7-14.7 17.7-29.4 2.9-14.7 2.9-23.6 0-32.4 5.9-8.8 11.8-20.6 14.7-38.3 0-14.7-2.9-26.5-5.9-35.3 3-11.8 8.9-26.5 8.9-50.1zM73.6 397.5c-17.7 0-29.4-11.8-29.4-29.4s11.8-29.4 29.4-29.4S103 350.3 103 368s-11.7 29.5-29.4 29.5zm359.2-129.6s5.9 5.9 5.9 20.6c0 17.7-11.8 26.5-11.8 26.5l-8.8 8.8 5.9 8.8s5.9 8.8 0 20.6c-2.9 11.8-14.7 20.6-14.7 20.6l-8.8 8.8 5.9 11.8s5.9 11.8-2.9 26.5c-5.9 11.8-11.8 20.6-85.4 20.6-41.2 0-88.3-23.6-120.7-41.2-23.6-11.8-38.3-17.7-50-17.7V206.1h2.9c5.9 0 11.8-2.9 17.7-5.9l82.4-82.4c2.9-2.9 2.9-5.9 5.9-8.8l29.4-79.5c14.7 0 35.3 5.9 41.2 32.4 2.9 17.7-2.9 47.1-17.7 82.4-2.9 8.8-2.9 14.7 2.9 23.6 2.9 5.9 11.8 8.8 20.6 8.8h73.6c2.9 0 35.3 5.9 35.3 32.4 0 23.6-8.8 35.3-8.8 35.3l-8.8 11.8c0-.1 8.8 11.7 8.8 11.7z"/>
              </svg>
              <span>{mod.approval_pct}%</span>
            </div>
          )}
          {/* Botão de ação — separador visual */}
          {(status === "installed" || status === "outdated" || status === "not_installed") && (
            <div style={{ width: "1px", height: "14px", backgroundColor: C.grey, flexShrink: 0 }} />
          )}
          {status === "installed" && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#a3e4bc" }}>
              <CheckCircle size={13} />
            </div>
          )}
          {installing && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px", color: C.yellow, fontSize: "11px", fontWeight: 600 }}>
              <Loader2 size={11} style={{ animation: "spin 0.8s linear infinite" }} />
              {status === "outdated" ? "Atualizando..." : "Instalando..."}
            </div>
          )}
          {!installing && status === "outdated" && (
            <button
              style={{
                display: "flex", alignItems: "center", gap: "4px",
                fontSize: "11px", backgroundColor: C.yellow, color: C.borderGrey,
                fontWeight: 700, padding: "2px 8px", borderRadius: "2px",
                border: "none", cursor: "pointer", textTransform: "uppercase",
              }}
              onClick={() => onUpdate(mod)}
            >
              <RefreshCw size={10} />
              Atualizar
            </button>
          )}
          {!installing && status === "not_installed" && (
            <button
              style={{
                display: "flex", alignItems: "center", gap: "4px",
                fontSize: "11px", backgroundColor: C.yellow, color: C.borderGrey,
                fontWeight: 700, padding: "2px 8px", borderRadius: "2px",
                border: "none", cursor: "pointer", textTransform: "uppercase",
              }}
              onClick={() => onInstall(mod)}
            >
              <Download size={10} />
              Instalar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

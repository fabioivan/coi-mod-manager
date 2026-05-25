import { Map, Package, Settings } from "lucide-react";

type TabView = "blueprints" | "mods" | "settings" | "details";

interface NavSidebarProps {
  view: TabView;
  onViewChange: (v: TabView) => void;
}

const NAV_ITEMS: {
  id: "blueprints" | "mods" | "settings";
  icon: React.ElementType;
  label: string;
  activeColor: string;
}[] = [
  { id: "blueprints", icon: Map, label: "BPs", activeColor: "#7ed3f6" },
  { id: "mods", icon: Package, label: "Mods", activeColor: "#6eb660" },
  { id: "settings", icon: Settings, label: "Set", activeColor: "#c6c6c6" },
];

export function NavSidebar({ view, onViewChange }: NavSidebarProps) {
  const activeView = view === "details" ? "mods" : view;

  return (
    <div
      style={{
        width: "48px",
        background: "#1e1e1e",
        borderRight: "1px solid #2a2a2a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "8px 0",
        gap: "4px",
        flexShrink: 0,
      }}
    >
      {NAV_ITEMS.map(({ id, icon: Icon, label, activeColor }) => {
        const isActive = activeView === id;
        return (
          <button
            key={id}
            onClick={() => onViewChange(id)}
            title={label}
            style={{
              width: "38px",
              height: "38px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "2px",
              borderRadius: "6px",
              border: "none",
              borderLeft: isActive
                ? `3px solid ${activeColor}`
                : "3px solid transparent",
              background: isActive ? "#2a2a2a" : "transparent",
              color: isActive ? activeColor : "#888",
              cursor: "pointer",
              transition: "background 0.15s, color 0.15s",
              padding: 0,
            }}
          >
            <Icon size={16} />
            <span style={{ fontSize: "7px", lineHeight: 1 }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

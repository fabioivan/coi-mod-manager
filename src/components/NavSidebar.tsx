import { Map, MapIcon, Package } from "lucide-react";
import { useState, type ElementType } from "react";

export type TabView =
	| "blueprints"
	| "mods"
	| "maps"
	| "settings"
	| "details"
	| "blueprint-details"
	| "map-details";

interface NavSidebarProps {
	view: TabView;
	onViewChange: (v: TabView) => void;
}

const NAV_ITEMS: {
	id: "blueprints" | "mods" | "maps";
	icon: ElementType;
	label: string;
	short: string;
	activeColor: string;
}[] = [
	{ id: "blueprints", icon: Map, label: "Blueprints", short: "BPs", activeColor: "#7ed3f6" },
	{ id: "maps", icon: MapIcon, label: "Mapas", short: "Mapas", activeColor: "#f5a623" },
	{ id: "mods", icon: Package, label: "Mods", short: "Mods", activeColor: "#6eb660" },
];

export function NavSidebar({ view, onViewChange }: NavSidebarProps) {
	const [hovered, setHovered] = useState(false);
	const activeView =
		view === "details"
			? "mods"
			: view === "blueprint-details"
				? "blueprints"
				: view === "map-details"
					? "maps"
					: view;

	return (
		<div
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				position: "absolute",
				left: 0,
				top: 0,
				bottom: 0,
				width: hovered ? "160px" : "48px",
				background: "#1e1e1e",
				display: "flex",
				flexDirection: "column",
				alignItems: hovered ? "stretch" : "center",
				padding: "8px",
				gap: "4px",
				overflow: "hidden",
				whiteSpace: "nowrap",
				transition: "width 0.2s ease",
				zIndex: 10,
			}}
		>
			{NAV_ITEMS.map(({ id, icon: Icon, label, short, activeColor }) => {
				const isActive = activeView === id;
				return (
					<button
						key={id}
						onClick={() => onViewChange(id)}
						title={label}
						style={{
							height: "44px",
							width: "100%",
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
						<Icon size={18} />
						<span style={{
							fontSize: hovered ? "13px" : "7px",
							fontWeight: hovered ? 600 : 400,
							lineHeight: 1,
							transition: "font-size 0.15s ease",
						}}>{hovered ? label : short}</span>
					</button>
				);
			})}
		</div>
	);
}

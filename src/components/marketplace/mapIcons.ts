import L from "leaflet";

const categoryColorMap: Record<string, string> = {
  builder: "#3b82f6",
  electrician: "#eab308",
  plumber: "#06b6d4",
  painter: "#f97316",
  tiler: "#8b5cf6",
  carpenter: "#92400e",
  architect: "#ec4899",
  roofer: "#ef4444",
  landscaper: "#22c55e",
  other: "#6b7280",
};

// SVG path icons per category (24x24 viewBox)
const categorySvgMap: Record<string, string> = {
  // Hammer
  builder: `<path d="M15.7 3.3a1 1 0 0 0-1.4 0L11 6.6 9.4 5 6.1 8.3a1 1 0 0 0 0 1.4l1.4 1.4-5.2 5.2a2 2 0 1 0 2.8 2.8l5.2-5.2 1.4 1.4a1 1 0 0 0 1.4 0L16.4 12l-1.6-1.6 3.3-3.3a1 1 0 0 0 0-1.4z" fill="white"/>`,
  // Lightning bolt
  electrician: `<path d="M13 2L4.5 12.5h5L8 22l9.5-12h-5z" fill="white" stroke="white" stroke-width=".5" stroke-linejoin="round"/>`,
  // Wrench / pipe
  plumber: `<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l2-2a4 4 0 0 0-5.6-5.6l-2 2a1 1 0 0 0 0 1.4l1.6 1.6zM3 17l4-4 4 4-4 4zm6.3-8.7L7 6l-4 4 2.3 2.3z" fill="white"/>`,
  // Paint roller
  painter: `<path d="M18 4h-1V3a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V6h1v3H9v1h3v8a1 1 0 0 0 2 0v-8h3a1 1 0 0 0 1-1z" fill="white"/>`,
  // Grid / tiles
  tiler: `<path d="M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z" fill="none" stroke="white" stroke-width="2" stroke-linejoin="round"/>`,
  // Saw
  carpenter: `<path d="M7.3 10.7L3 21l10.3-4.3zm2.1-2.1L20.7 3.3a1 1 0 0 1 1.4 0l.6.6-12 8z" fill="white"/><path d="M4 4l2 2m2-4l2 2M4 8l2 2" stroke="white" stroke-width="1.5" stroke-linecap="round"/>`,
  // Compass / drafting
  architect: `<path d="M12 2L9.5 9h5zm-3 10l-5 10h2l1.5-3h9l1.5 3h2l-5-10zm-1.5 5L12 12l4.5 5z" fill="white"/>`,
  // House roof
  roofer: `<path d="M3 12l9-8 9 8M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  // Tree / leaf
  landscaper: `<path d="M12 22V12m0 0c-3-1-5-4-5-7a5 5 0 0 1 10 0c0 3-2 6-5 7z" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 17c-2 0-4 1-4 3h14c0-2-2-3-4-3" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  // Wrench generic
  other: `<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l2.6-2.6a5 5 0 0 0-6.2-6.2L11.5 3l3.2 3.3zm-5.4 5.4l-6 6a2 2 0 1 0 2.8 2.8l6-6z" fill="white"/>`,
};

export function getCategoryColor(category: string): string {
  return categoryColorMap[category] || categoryColorMap.other;
}

export function createCategoryIcon(category: string): L.DivIcon {
  const color = getCategoryColor(category);
  const svg = categorySvgMap[category] || categorySvgMap.other;

  return L.divIcon({
    className: "",
    html: `<div style="
      width:36px;height:36px;border-radius:50%;
      background:${color};
      display:flex;align-items:center;justify-content:center;
      border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);
    "><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">${svg}</svg></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}

import { useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import { useTranslation } from "react-i18next";
import { createCategoryIcon } from "./mapIcons";
import { PROFESSIONAL_CATEGORIES } from "@/lib/professionalCategories";
import "leaflet/dist/leaflet.css";

interface Professional {
  id: string;
  name: string;
  company_name: string | null;
  contractor_category: string | null;
  company_city: string | null;
  company_description: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface ProfessionalsMapProps {
  professionals: Professional[];
  onSelectProfile: (id: string) => void;
}

function MapBounds({ professionals }: { professionals: Professional[] }) {
  const map = useMap();

  useEffect(() => {
    const withCoords = professionals.filter(p => p.latitude && p.longitude);
    if (withCoords.length === 0) return;

    if (withCoords.length === 1) {
      map.setView([withCoords[0].latitude!, withCoords[0].longitude!], 10);
    } else {
      const bounds = withCoords.map(p => [p.latitude!, p.longitude!] as [number, number]);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [professionals, map]);

  return null;
}

export function ProfessionalsMap({ professionals, onSelectProfile }: ProfessionalsMapProps) {
  const { t } = useTranslation();
  const withCoords = professionals.filter(p => p.latitude != null && p.longitude != null);

  return (
    <div className="professionals-map h-[500px] rounded-lg overflow-hidden border">
      <MapContainer
        center={[62, 16]}
        zoom={5}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBounds professionals={withCoords} />
        {withCoords.map(pro => {
          const catLabel = PROFESSIONAL_CATEGORIES.find(c => c.value === pro.contractor_category)?.labelKey;
          const label = pro.company_name || pro.name;
          const subtitle = catLabel ? t(catLabel) : "";
          const city = pro.company_city ? ` — ${pro.company_city}` : "";
          return (
            <Marker
              key={pro.id}
              position={[pro.latitude!, pro.longitude!]}
              icon={createCategoryIcon(pro.contractor_category || "other")}
              eventHandlers={{
                click: () => onSelectProfile(pro.id),
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                <div style={{ textAlign: "center", lineHeight: 1.4 }}>
                  <strong style={{ fontSize: 13 }}>{label}</strong>
                  {subtitle && <div style={{ fontSize: 11, color: "#666" }}>{subtitle}</div>}
                  {pro.company_city && <div style={{ fontSize: 11, color: "#888" }}>{pro.company_city}</div>}
                </div>
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

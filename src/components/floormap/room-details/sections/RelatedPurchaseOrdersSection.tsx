import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface Material {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  status: string;
  vendor_name: string | null;
}

const ALL_STATUSES = [
  "submitted",
  "declined",
  "approved",
  "billed",
  "paid",
  "paused",
] as const;

const DEFAULT_HIDDEN = new Set(["paid"]);

const getStatusColor = (status: string) => {
  switch (status) {
    case "submitted":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "approved":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "declined":
      return "bg-red-100 text-red-700 border-red-200";
    case "billed":
      return "bg-purple-100 text-purple-700 border-purple-200";
    case "paid":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "paused":
      return "bg-gray-100 text-gray-500 border-gray-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

interface RelatedPurchaseOrdersSectionProps {
  roomId: string;
  projectId: string;
}

export function RelatedPurchaseOrdersSection({ roomId, projectId }: RelatedPurchaseOrdersSectionProps) {
  const { t } = useTranslation();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatuses, setActiveStatuses] = useState<Set<string>>(
    () => new Set(ALL_STATUSES.filter((s) => !DEFAULT_HIDDEN.has(s)))
  );

  useEffect(() => {
    async function fetchMaterials() {
      setLoading(true);
      const { data, error } = await supabase
        .from("materials")
        .select("id, name, quantity, unit, status, vendor_name")
        .eq("room_id", roomId);

      if (error) {
        console.error("Failed to load materials:", error);
      } else {
        setMaterials((data as Material[]) ?? []);
      }
      setLoading(false);
    }
    fetchMaterials();
  }, [roomId]);

  const toggleStatus = (status: string) => {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };

  const filtered = useMemo(
    () => materials.filter((m) => activeStatuses.has(m.status)),
    [materials, activeStatuses]
  );

  if (loading) {
    return <p className="text-sm text-muted-foreground py-2">{t('rooms.loadingPurchaseOrders')}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => toggleStatus(s)}
            className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
              activeStatuses.has(s)
                ? getStatusColor(s)
                : "bg-transparent text-muted-foreground border-dashed border-muted-foreground/40"
            }`}
          >
            {t(`materialStatuses.${s}`)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          {materials.length === 0
            ? t('rooms.noPOsForRoom')
            : t('rooms.noPOsMatchFilter')}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {filtered.map((m) => (
            <li key={m.id} className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className={`text-[10px] shrink-0 ${getStatusColor(m.status)}`}>
                {t(`materialStatuses.${m.status}`)}
              </Badge>
              <span className="truncate font-medium">{m.name}</span>
              {m.quantity != null && (
                <span className="text-muted-foreground text-xs shrink-0">
                  {m.quantity} {m.unit ?? t('rooms.pieces')}
                </span>
              )}
              {m.vendor_name && (
                <span className="text-muted-foreground text-xs ml-auto shrink-0">
                  {m.vendor_name}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

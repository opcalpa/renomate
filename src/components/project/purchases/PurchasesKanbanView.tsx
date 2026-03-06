import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { GripVertical, Store, Pencil, Paperclip } from "lucide-react";
import { KANBAN_STATUS_ORDER } from "./purchasesTypes";

interface Material {
  id: string;
  name: string;
  description?: string | null;
  quantity: number;
  unit: string;
  price_per_unit: number | null;
  price_total: number | null;
  ordered_amount: number | null;
  paid_amount: number | null;
  vendor_name: string | null;
  vendor_link: string | null;
  status: string;
  exclude_from_budget: boolean;
  created_at: string;
  task_id: string | null;
  room_id: string | null;
  created_by_user_id: string | null;
  assigned_to_user_id: string | null;
  creator?: { name: string } | null;
  assigned_to?: { name: string } | null;
  task?: { title: string } | null;
  room?: { name: string } | null;
  hasAttachment?: boolean;
  attachmentCount?: number;
}

export interface PurchasesKanbanViewProps {
  materials: Material[];
  projectId: string;
  currency?: string | null;
  isReadOnly?: boolean;
  onMaterialClick: (material: Material) => void;
  onMaterialUpdated: () => void;
  getStatusColor: (status: string) => string;
}

export function PurchasesKanbanView({
  materials,
  projectId,
  currency,
  isReadOnly,
  onMaterialClick,
  onMaterialUpdated,
  getStatusColor,
}: PurchasesKanbanViewProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  // Column order (persisted)
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem(`purchases-kanban-order-${projectId}`);
    return saved ? JSON.parse(saved) : [...KANBAN_STATUS_ORDER];
  });

  // Hide empty columns preference
  const [hideEmpty, setHideEmpty] = useState<boolean>(() => {
    const saved = localStorage.getItem(`purchases-kanban-hide-empty-${projectId}`);
    return saved ? JSON.parse(saved) : false;
  });

  // Column drag state
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);

  // Card drag state
  const [draggedCard, setDraggedCard] = useState<Material | null>(null);

  // Group materials by status
  const grouped: Record<string, Material[]> = {};
  for (const status of columnOrder) {
    grouped[status] = [];
  }
  for (const m of materials) {
    if (grouped[m.status]) {
      grouped[m.status].push(m);
    } else {
      grouped[m.status] = [m];
    }
  }

  // Find statuses not in columnOrder
  const unknownStatuses = Object.keys(grouped).filter(
    (s) => !columnOrder.includes(s)
  );

  // Column drag handlers
  const handleColumnDragStart = (status: string) => {
    setDraggedColumn(status);
  };

  const handleColumnDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleColumnDrop = (targetStatus: string) => {
    if (!draggedColumn || draggedColumn === targetStatus) {
      setDraggedColumn(null);
      return;
    }
    setColumnOrder((prev) => {
      const reordered = prev.filter((s) => s !== draggedColumn);
      const targetIdx = reordered.indexOf(targetStatus);
      reordered.splice(targetIdx, 0, draggedColumn);
      localStorage.setItem(
        `purchases-kanban-order-${projectId}`,
        JSON.stringify(reordered)
      );
      return reordered;
    });
    setDraggedColumn(null);
  };

  // Card drag handlers
  const handleCardDragStart = (material: Material) => {
    if (isReadOnly) return;
    setDraggedCard(material);
  };

  const handleCardDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleCardDrop = useCallback(
    async (targetStatus: string) => {
      if (!draggedCard || draggedCard.status === targetStatus || isReadOnly) {
        setDraggedCard(null);
        return;
      }

      const { error } = await supabase
        .from("materials")
        .update({ status: targetStatus })
        .eq("id", draggedCard.id);

      if (error) {
        toast({
          title: t("common.error"),
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: t("purchases.statusUpdated"),
          description: t("purchases.statusChangedTo", { status: t(`materialStatuses.${targetStatus}`, targetStatus) }),
        });
        onMaterialUpdated();
      }
      setDraggedCard(null);
    },
    [draggedCard, isReadOnly, onMaterialUpdated, t, toast]
  );

  const toggleHideEmpty = () => {
    const next = !hideEmpty;
    setHideEmpty(next);
    localStorage.setItem(
      `purchases-kanban-hide-empty-${projectId}`,
      JSON.stringify(next)
    );
  };

  const statusLabels: Record<string, string> = {
    submitted: t("materialStatuses.submitted"),
    approved: t("materialStatuses.approved"),
    billed: t("materialStatuses.billed"),
    paid: t("materialStatuses.paid"),
    paused: t("materialStatuses.paused"),
    declined: t("materialStatuses.declined"),
  };

  return (
    <div className="space-y-2">
      {/* Hide empty toggle */}
      <div className="flex justify-end">
        <button
          onClick={toggleHideEmpty}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {hideEmpty
            ? t("purchasesTable.showEmptyColumns", "Show empty columns")
            : t("purchasesTable.hideEmptyColumns")}
        </button>
      </div>

      <div className="overflow-x-auto pb-4 snap-x snap-mandatory">
        <div className="flex gap-4 min-w-min p-2">
          {[...columnOrder, ...unknownStatuses].map((status) => {
            const items = grouped[status] || [];
            const isEmpty = items.length === 0;
            const label = statusLabels[status] || status;

            if (hideEmpty && isEmpty) return null;

            return (
              <div
                key={status}
                draggable
                onDragStart={() => handleColumnDragStart(status)}
                onDragOver={handleColumnDragOver}
                onDrop={(e) => {
                  e.stopPropagation();
                  if (draggedColumn) {
                    handleColumnDrop(status);
                  } else {
                    handleCardDrop(status);
                  }
                }}
                onDragEnd={() => setDraggedColumn(null)}
                className={cn(
                  "flex-shrink-0 bg-muted/30 rounded-lg p-3 transition-all snap-center",
                  isEmpty ? "w-auto min-w-[120px]" : "w-[85vw] md:w-80",
                  draggedColumn === status && "opacity-50",
                  "cursor-grab active:cursor-grabbing"
                )}
              >
                {/* Column header */}
                <div className="mb-3 flex items-center justify-between bg-background/50 rounded-md px-3 py-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <h4 className="text-sm font-semibold whitespace-nowrap">
                      {label}
                    </h4>
                  </div>
                  <Badge variant="secondary" className="text-xs ml-2 flex-shrink-0">
                    {items.length}
                  </Badge>
                </div>

                {/* Cards drop zone */}
                <div
                  className="space-y-3 min-h-[100px]"
                  onDragOver={handleCardDragOver}
                  onDrop={(e) => {
                    e.stopPropagation();
                    handleCardDrop(status);
                  }}
                >
                  {isEmpty ? (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      {t("purchasesTable.dropPurchasesHere")}
                    </div>
                  ) : (
                    items.map((material) => (
                      <PurchaseCard
                        key={material.id}
                        material={material}
                        currency={currency}
                        isReadOnly={isReadOnly}
                        getStatusColor={getStatusColor}
                        onDragStart={() => handleCardDragStart(material)}
                        onClick={() => onMaterialClick(material)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PurchaseCard({
  material,
  currency,
  isReadOnly,
  onDragStart,
  onClick,
}: {
  material: Material;
  currency?: string | null;
  isReadOnly?: boolean;
  getStatusColor: (status: string) => string;
  onDragStart: () => void;
  onClick: () => void;
}) {
  return (
    <div
      draggable={!isReadOnly}
      onDragStart={(e) => {
        e.stopPropagation();
        onDragStart();
      }}
      onClick={onClick}
      className="bg-background border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
    >
      {/* Name + ÄTA */}
      <div className="flex items-start justify-between gap-1">
        <span className="font-medium text-sm leading-tight flex items-center gap-1.5 flex-1">
          {material.name}
          {material.exclude_from_budget && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 text-orange-600 border-orange-300 shrink-0">
              ÄTA
            </Badge>
          )}
        </span>
        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
      </div>

      {/* Price total */}
      {material.price_total != null && (
        <div className="mt-1 text-sm font-semibold">
          {formatCurrency(material.price_total, currency, { decimals: 2 })}
        </div>
      )}

      {/* Meta row */}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {material.vendor_name && (
          <span className="flex items-center gap-1">
            <Store className="h-3 w-3" />
            {material.vendor_name}
          </span>
        )}
        {material.room?.name && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {material.room.name}
          </Badge>
        )}
        {material.hasAttachment && (
          <Paperclip className="h-3 w-3" />
        )}
      </div>
    </div>
  );
}

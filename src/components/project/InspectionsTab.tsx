/**
 * InspectionsTab — KMA / Egenkontroller
 * Quality control checklists with photo evidence.
 * Contractor-only feature.
 */

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuthSession";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Plus,
  ClipboardCheck,
  CheckCircle,
  XCircle,
  Clock,
  Camera,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CheckItem {
  id: string;
  title: string;
  checked: boolean;
  note: string | null;
  photoUrl: string | null;
}

interface Inspection {
  id: string;
  title: string;
  category: string;
  status: string;
  items: CheckItem[];
  notes: string | null;
  inspector_name: string | null;
  inspected_at: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  room_id: string | null;
  task_id: string | null;
  photos: Array<{ id: string; url: string; caption: string | null }>;
  created_at: string;
}

interface InspectionsTabProps {
  projectId: string;
  rooms: Array<{ id: string; name: string }>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES = [
  { value: "moisture", labelKey: "inspections.catMoisture" },
  { value: "electrical", labelKey: "inspections.catElectrical" },
  { value: "plumbing", labelKey: "inspections.catPlumbing" },
  { value: "fire_safety", labelKey: "inspections.catFireSafety" },
  { value: "structural", labelKey: "inspections.catStructural" },
  { value: "painting", labelKey: "inspections.catPainting" },
  { value: "tiling", labelKey: "inspections.catTiling" },
  { value: "general", labelKey: "inspections.catGeneral" },
] as const;

const DEFAULT_ITEMS: Record<string, string[]> = {
  moisture: [
    "Fuktmätning utförd (RBK-metod)",
    "Godkänt mätvärde dokumenterat",
    "Tätskikt applicerat enligt branschregler",
    "Vägganslutning och golvbrunn kontrollerade",
  ],
  electrical: [
    "Jordning kontrollerad",
    "Isolationsresistans mätt",
    "Gruppsäkringar rätt dimensionerade",
    "Elschema uppdaterat",
  ],
  plumbing: [
    "Täthetsprovning utförd",
    "Tryckprovning godkänd",
    "Avlopp spolat och kontrollerat",
    "Ventiler och kopplingar åtdragna",
  ],
  fire_safety: [
    "Brandtätning utförd vid genomföringar",
    "Brandklassade material använda",
    "Utrymningsvägar fria",
    "Brandvarnare monterade",
  ],
  structural: [
    "Armering kontrollerad före gjutning",
    "Betongkvalitet verifierad",
    "Isolering korrekt monterad",
    "Ångspärr kontrollerad",
  ],
  painting: [
    "Underbehandling utförd",
    "Spackling slipat och godkänt",
    "Rätt kulör applicerad (NCS-kod)",
    "Slutstrykning utan anmärkning",
  ],
  tiling: [
    "Tätskikt godkänt (fuktkontroll)",
    "Fix och fog rätt blandade",
    "Plattor raka och jämna",
    "Fogar tätade och rena",
  ],
  general: [
    "Arbetsområde städat",
    "Material levererat enligt specifikation",
    "Slutbesiktning utan anmärkning",
  ],
};

const STATUS_BADGE: Record<string, { color: string; icon: typeof Clock }> = {
  pending: { color: "bg-gray-100 text-gray-700", icon: Clock },
  in_progress: { color: "bg-blue-100 text-blue-700", icon: ClipboardCheck },
  approved: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  failed: { color: "bg-red-100 text-red-700", icon: XCircle },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InspectionsTab({ projectId, rooms }: InspectionsTabProps) {
  const { t } = useTranslation();
  const { user } = useAuthSession();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Create form
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [newRoomId, setNewRoomId] = useState<string | null>(null);

  const fetchInspections = useCallback(async () => {
    const { data } = await supabase
      .from("inspections")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setInspections((data || []) as Inspection[]);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  const handleCreate = async () => {
    if (!newTitle.trim() || !user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, name")
      .eq("user_id", user.id)
      .single();
    if (!profile) return;

    const items: CheckItem[] = (DEFAULT_ITEMS[newCategory] || DEFAULT_ITEMS.general).map((title) => ({
      id: crypto.randomUUID(),
      title,
      checked: false,
      note: null,
      photoUrl: null,
    }));

    const { error } = await supabase.from("inspections").insert({
      project_id: projectId,
      title: newTitle.trim(),
      category: newCategory,
      room_id: newRoomId,
      items,
      inspector_name: profile.name,
      inspector_id: profile.id,
      created_by_user_id: profile.id,
      status: "pending",
    });

    if (error) {
      toast.error(t("common.error"));
      return;
    }

    toast.success(t("inspections.created", "Egenkontroll skapad"));
    setCreateOpen(false);
    setNewTitle("");
    setNewCategory("general");
    setNewRoomId(null);
    fetchInspections();
  };

  const toggleItem = async (inspectionId: string, itemId: string) => {
    const inspection = inspections.find((i) => i.id === inspectionId);
    if (!inspection) return;

    const updatedItems = inspection.items.map((item) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    const allChecked = updatedItems.every((i) => i.checked);
    const anyChecked = updatedItems.some((i) => i.checked);

    await supabase
      .from("inspections")
      .update({
        items: updatedItems,
        status: allChecked ? "approved" : anyChecked ? "in_progress" : "pending",
        ...(allChecked ? { inspected_at: new Date().toISOString() } : {}),
      })
      .eq("id", inspectionId);

    setInspections((prev) =>
      prev.map((i) =>
        i.id === inspectionId
          ? { ...i, items: updatedItems, status: allChecked ? "approved" : anyChecked ? "in_progress" : "pending" }
          : i
      )
    );
  };

  const deleteInspection = async (id: string) => {
    await supabase.from("inspections").delete().eq("id", id);
    setInspections((prev) => prev.filter((i) => i.id !== id));
    toast.success(t("inspections.deleted", "Egenkontroll raderad"));
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t("inspections.title", "Egenkontroller")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("inspections.description", "Dokumentera kvalitetskontroller med checklista och foto")}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          {t("inspections.create", "Ny kontroll")}
        </Button>
      </div>

      {/* Empty state */}
      {inspections.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{t("inspections.empty", "Inga egenkontroller ännu")}</p>
          <p className="text-sm mt-1">{t("inspections.emptyHint", "Skapa en kontroll för att dokumentera kvalitet")}</p>
        </div>
      )}

      {/* Inspection cards */}
      {inspections.map((inspection) => {
        const isExpanded = expandedId === inspection.id;
        const checkedCount = inspection.items.filter((i) => i.checked).length;
        const totalCount = inspection.items.length;
        const pct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;
        const StatusIcon = STATUS_BADGE[inspection.status]?.icon || Clock;
        const roomName = rooms.find((r) => r.id === inspection.room_id)?.name;

        return (
          <Card key={inspection.id}>
            <CardContent className="p-0">
              {/* Header row — clickable */}
              <button
                type="button"
                className="w-full p-4 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : inspection.id)}
              >
                <StatusIcon className={cn("h-5 w-5 shrink-0", inspection.status === "approved" ? "text-green-600" : inspection.status === "failed" ? "text-red-600" : "text-muted-foreground")} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{inspection.title}</span>
                    <Badge variant="outline" className={cn("text-[10px] shrink-0", STATUS_BADGE[inspection.status]?.color)}>
                      {t(`inspections.status_${inspection.status}`, inspection.status)}
                    </Badge>
                    {roomName && (
                      <span className="text-xs text-muted-foreground">· {roomName}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={pct} className="h-1 flex-1 max-w-[120px]" />
                    <span className="text-xs text-muted-foreground">{checkedCount}/{totalCount}</span>
                  </div>
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>

              {/* Expanded: checklist + actions */}
              {isExpanded && (
                <div className="border-t px-4 pb-4 space-y-3">
                  {/* Checklist items */}
                  <div className="space-y-2 pt-3">
                    {inspection.items.map((item) => (
                      <label
                        key={item.id}
                        className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/30 cursor-pointer"
                      >
                        <Checkbox
                          checked={item.checked}
                          onCheckedChange={() => toggleItem(inspection.id, item.id)}
                          className="mt-0.5"
                        />
                        <span className={cn("text-sm flex-1", item.checked && "line-through text-muted-foreground")}>
                          {item.title}
                        </span>
                      </label>
                    ))}
                  </div>

                  {/* Inspector info */}
                  {inspection.inspector_name && (
                    <p className="text-xs text-muted-foreground">
                      {t("inspections.inspectedBy", "Kontrollerad av")}: {inspection.inspector_name}
                      {inspection.inspected_at && ` · ${new Date(inspection.inspected_at).toLocaleDateString("sv-SE")}`}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteInspection(inspection.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      {t("common.delete")}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("inspections.create", "Ny egenkontroll")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("inspections.name", "Benämning")} *</label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={t("inspections.namePlaceholder", "T.ex. Fuktkontroll badrum")}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("inspections.category", "Kategori")}</label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {t(cat.labelKey, cat.value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {rooms.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("inspections.room", "Rum")}</label>
                <Select value={newRoomId || "__none__"} onValueChange={(v) => setNewRoomId(v === "__none__" ? null : v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("inspections.noRoom", "Inget rum")}</SelectItem>
                    {rooms.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {t("inspections.defaultItemsHint", "Standardpunkter fylls i baserat på kategori. Du kan redigera efteråt.")}
            </p>
            <Button onClick={handleCreate} disabled={!newTitle.trim()} className="w-full">
              <ClipboardCheck className="h-4 w-4 mr-1" />
              {t("inspections.create", "Ny kontroll")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

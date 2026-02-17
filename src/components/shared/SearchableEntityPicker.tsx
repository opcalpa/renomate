import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, CheckCircle2, FileText, Package } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

export interface SelectedEntity {
  type: "task" | "material";
  id: string;
  name: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  budget: number | null;
  room_id: string | null;
  room?: { name: string } | null;
}

interface Material {
  id: string;
  name: string;
  status: string;
  price_total: number | null;
  room_id: string | null;
  room?: { name: string } | null;
}

interface SearchableEntityPickerProps {
  projectId: string;
  documentType: "receipt" | "invoice";
  currency?: string | null;
  onSelect: (entity: SelectedEntity | null) => void;
  selectedEntity?: SelectedEntity | null;
}

export function SearchableEntityPicker({
  projectId,
  documentType,
  currency,
  onSelect,
  selectedEntity,
}: SearchableEntityPickerProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);

  useEffect(() => {
    fetchEntities();
  }, [projectId]);

  const fetchEntities = async () => {
    setLoading(true);
    try {
      if (documentType === "invoice") {
        // Fetch tasks for invoices
        const { data, error } = await supabase
          .from("tasks")
          .select("id, title, status, budget, room_id, rooms:room_id(name)")
          .eq("project_id", projectId)
          .order("title");

        if (error) throw error;
        setTasks(
          (data || []).map((t) => ({
            ...t,
            room: t.rooms as { name: string } | null,
          }))
        );
      } else {
        // Fetch materials for receipts
        const { data, error } = await supabase
          .from("materials")
          .select("id, name, status, price_total, room_id, rooms:room_id(name)")
          .eq("project_id", projectId)
          .order("name");

        if (error) throw error;
        setMaterials(
          (data || []).map((m) => ({
            ...m,
            room: m.rooms as { name: string } | null,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch entities:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter entities based on search query
  const filteredEntities = useMemo(() => {
    const query = searchQuery.toLowerCase();
    if (documentType === "invoice") {
      return tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.room?.name?.toLowerCase().includes(query)
      );
    } else {
      return materials.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.room?.name?.toLowerCase().includes(query)
      );
    }
  }, [searchQuery, tasks, materials, documentType]);

  // Group by room
  const groupedEntities = useMemo(() => {
    const groups: Record<string, (Task | Material)[]> = {};
    const noRoom = t("common.noRoom");

    for (const entity of filteredEntities) {
      const roomName = entity.room?.name || noRoom;
      if (!groups[roomName]) {
        groups[roomName] = [];
      }
      groups[roomName].push(entity);
    }

    return groups;
  }, [filteredEntities, t]);

  const handleSelect = (entity: Task | Material) => {
    const type = documentType === "invoice" ? "task" : "material";
    const name = "title" in entity ? entity.title : entity.name;

    // Toggle selection
    if (selectedEntity?.id === entity.id) {
      onSelect(null);
    } else {
      onSelect({ type, id: entity.id, name });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "paid":
        return "bg-emerald-100 text-emerald-700";
      case "in_progress":
      case "approved":
        return "bg-blue-100 text-blue-700";
      case "to_do":
      case "submitted":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("document.searchEntity")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <ScrollArea className="h-[250px] rounded-md border">
        {filteredEntities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <p className="text-sm">
              {documentType === "invoice"
                ? t("document.noTasksFound", "No tasks found")
                : t("document.noMaterialsFound", "No materials found")}
            </p>
          </div>
        ) : (
          <div className="p-2">
            {Object.entries(groupedEntities).map(([roomName, entities]) => (
              <div key={roomName} className="mb-4 last:mb-0">
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {roomName}
                </div>
                <div className="space-y-1">
                  {entities.map((entity) => {
                    const isTask = "title" in entity;
                    const name = isTask ? entity.title : entity.name;
                    const amount = isTask ? entity.budget : entity.price_total;
                    const isSelected = selectedEntity?.id === entity.id;

                    return (
                      <button
                        key={entity.id}
                        type="button"
                        onClick={() => handleSelect(entity)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                          isSelected
                            ? "bg-primary/10 border border-primary"
                            : "hover:bg-muted border border-transparent"
                        }`}
                      >
                        {isTask ? (
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{name}</span>
                            {isSelected && (
                              <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge
                              variant="secondary"
                              className={`text-xs ${getStatusColor(entity.status)}`}
                            >
                              {t(`statuses.${entity.status}`, entity.status)}
                            </Badge>
                            {amount != null && amount > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {formatCurrency(amount, currency)}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {selectedEntity && (
        <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-md">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <span className="text-sm">
            {t("document.linkedTo")}: <strong>{selectedEntity.name}</strong>
          </span>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FileText, Hammer, Package, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface CreateQuoteDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TaskItem {
  id: string;
  title: string;
  room_id: string | null;
  roomName: string | null;
}

interface MaterialItem {
  id: string;
  name: string;
  room_id: string | null;
  roomName: string | null;
}

interface ProjectData {
  tasks: TaskItem[];
  materials: MaterialItem[];
  loading: boolean;
}

export function CreateQuoteDialog({
  projectId,
  open,
  onOpenChange,
}: CreateQuoteDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [data, setData] = useState<ProjectData>({
    tasks: [],
    materials: [],
    loading: true,
  });

  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<string>>(new Set());
  const [groupByType, setGroupByType] = useState<"mixed" | "grouped" | "byRoom">("grouped");
  const [applyRot, setApplyRot] = useState(true);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [materialsOpen, setMaterialsOpen] = useState(false);

  // Fetch tasks and materials when dialog opens
  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      setData((prev) => ({ ...prev, loading: true }));

      const [tasksRes, materialsRes] = await Promise.all([
        supabase
          .from("tasks")
          .select("id, title, room_id, rooms(name)")
          .eq("project_id", projectId)
          .order("created_at"),
        supabase
          .from("materials")
          .select("id, name, room_id, rooms(name)")
          .eq("project_id", projectId)
          .order("created_at"),
      ]);

      const tasks: TaskItem[] = (tasksRes.data || []).map((t) => ({
        id: t.id,
        title: t.title,
        room_id: t.room_id,
        roomName: (t.rooms as { name: string } | null)?.name || null,
      }));

      const materials: MaterialItem[] = (materialsRes.data || []).map((m) => ({
        id: m.id,
        name: m.name,
        room_id: m.room_id,
        roomName: (m.rooms as { name: string } | null)?.name || null,
      }));

      setData({ tasks, materials, loading: false });

      // Select all by default
      setSelectedTaskIds(new Set(tasks.map((t) => t.id)));
      setSelectedMaterialIds(new Set(materials.map((m) => m.id)));
    };

    fetchData();
  }, [open, projectId]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setTasksOpen(false);
      setMaterialsOpen(false);
    }
  }, [open]);

  const toggleTask = (id: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleMaterial = (id: string) => {
    setSelectedMaterialIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllTasks = () => setSelectedTaskIds(new Set(data.tasks.map((t) => t.id)));
  const deselectAllTasks = () => setSelectedTaskIds(new Set());
  const selectAllMaterials = () => setSelectedMaterialIds(new Set(data.materials.map((m) => m.id)));
  const deselectAllMaterials = () => setSelectedMaterialIds(new Set());

  const handleCreate = () => {
    const params = new URLSearchParams({
      projectId,
      prepopulate: "true",
      groupByType,
      applyRot: applyRot.toString(),
    });

    // Pass selected IDs as comma-separated strings
    if (selectedTaskIds.size > 0) {
      params.set("taskIds", Array.from(selectedTaskIds).join(","));
    }
    if (selectedMaterialIds.size > 0) {
      params.set("materialIds", Array.from(selectedMaterialIds).join(","));
    }

    navigate(`/quotes/new?${params.toString()}`);
    onOpenChange(false);
  };

  const handleCreateEmpty = () => {
    navigate(`/quotes/new?projectId=${projectId}`);
    onOpenChange(false);
  };

  const hasData = data.tasks.length > 0 || data.materials.length > 0;
  const willImportAnything = selectedTaskIds.size > 0 || selectedMaterialIds.size > 0;

  // Check if any item has a room for "by room" option relevance
  const hasRooms = useMemo(() => {
    return data.tasks.some((t) => t.room_id) || data.materials.some((m) => m.room_id);
  }, [data.tasks, data.materials]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t("quotes.createFromProject")}
          </DialogTitle>
          <DialogDescription>
            {data.loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("common.loading")}
              </span>
            ) : hasData ? (
              t("quotes.projectContains", {
                tasks: data.tasks.length,
                materials: data.materials.length,
              })
            ) : (
              t("quotes.projectEmpty")
            )}
          </DialogDescription>
        </DialogHeader>

        {hasData && !data.loading && (
          <div className="space-y-4 py-2">
            {/* What to include */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                {t("quotes.whatToInclude")}
              </Label>

              {/* Tasks section */}
              {data.tasks.length > 0 && (
                <Collapsible open={tasksOpen} onOpenChange={setTasksOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between px-3 py-2 h-auto font-normal hover:bg-muted/50"
                    >
                      <span className="flex items-center gap-2">
                        {tasksOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <Hammer className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {t("quotes.tasksAsLabor", { count: data.tasks.length })}
                        </span>
                      </span>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        selectedTaskIds.size === data.tasks.length
                          ? "bg-primary/10 text-primary"
                          : selectedTaskIds.size === 0
                          ? "bg-muted text-muted-foreground"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      )}>
                        {selectedTaskIds.size}/{data.tasks.length}
                      </span>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-6 mt-2 space-y-2 border-l-2 border-muted pl-4">
                      <div className="flex gap-2 mb-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={selectAllTasks}
                        >
                          {t("quotes.selectAll")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={deselectAllTasks}
                        >
                          {t("quotes.deselectAll")}
                        </Button>
                      </div>
                      {data.tasks.map((task) => (
                        <div key={task.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`task-${task.id}`}
                            checked={selectedTaskIds.has(task.id)}
                            onCheckedChange={() => toggleTask(task.id)}
                          />
                          <Label
                            htmlFor={`task-${task.id}`}
                            className="text-sm font-normal cursor-pointer flex-1"
                          >
                            {task.title}
                            {task.roomName && (
                              <span className="text-muted-foreground ml-1">
                                ({task.roomName})
                              </span>
                            )}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Materials section */}
              {data.materials.length > 0 && (
                <Collapsible open={materialsOpen} onOpenChange={setMaterialsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between px-3 py-2 h-auto font-normal hover:bg-muted/50"
                    >
                      <span className="flex items-center gap-2">
                        {materialsOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {t("quotes.materialsAsMaterials", { count: data.materials.length })}
                        </span>
                      </span>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        selectedMaterialIds.size === data.materials.length
                          ? "bg-primary/10 text-primary"
                          : selectedMaterialIds.size === 0
                          ? "bg-muted text-muted-foreground"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      )}>
                        {selectedMaterialIds.size}/{data.materials.length}
                      </span>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-6 mt-2 space-y-2 border-l-2 border-muted pl-4">
                      <div className="flex gap-2 mb-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={selectAllMaterials}
                        >
                          {t("quotes.selectAll")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={deselectAllMaterials}
                        >
                          {t("quotes.deselectAll")}
                        </Button>
                      </div>
                      {data.materials.map((material) => (
                        <div key={material.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`material-${material.id}`}
                            checked={selectedMaterialIds.has(material.id)}
                            onCheckedChange={() => toggleMaterial(material.id)}
                          />
                          <Label
                            htmlFor={`material-${material.id}`}
                            className="text-sm font-normal cursor-pointer flex-1"
                          >
                            {material.name}
                            {material.roomName && (
                              <span className="text-muted-foreground ml-1">
                                ({material.roomName})
                              </span>
                            )}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>

            <Separator />

            {/* Presentation */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                {t("quotes.presentation")}
              </Label>

              <RadioGroup
                value={groupByType}
                onValueChange={(value) => setGroupByType(value as "mixed" | "grouped" | "byRoom")}
                className="space-y-2"
              >
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="grouped" id="grouped" />
                  <Label htmlFor="grouped" className="text-sm font-normal cursor-pointer">
                    {t("quotes.groupedByType")}
                  </Label>
                </div>
                {hasRooms && (
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="byRoom" id="byRoom" />
                    <Label htmlFor="byRoom" className="text-sm font-normal cursor-pointer">
                      {t("quotes.groupedByRoom")}
                    </Label>
                  </div>
                )}
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="mixed" id="mixed" />
                  <Label htmlFor="mixed" className="text-sm font-normal cursor-pointer">
                    {t("quotes.mixedList")}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            {/* ROT */}
            <div className="flex items-center space-x-3">
              <Checkbox
                id="applyRot"
                checked={applyRot}
                onCheckedChange={(checked) => setApplyRot(checked === true)}
              />
              <Label
                htmlFor="applyRot"
                className="text-sm font-normal cursor-pointer"
              >
                {t("quotes.applyRotDeduction")}
              </Label>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button variant="secondary" onClick={handleCreateEmpty}>
            {t("quotes.emptyQuote")}
          </Button>
          {hasData && (
            <Button onClick={handleCreate} disabled={!willImportAnything}>
              {t("quotes.createWithItems")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useRef } from "react";
import {
  Home,
  Layers,
  Square,
  Zap,
  Image as ImageIcon,
  ClipboardList,
  ShoppingCart,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  ListChecks,
  Plus,
  Trash2,
  X,
  Pencil,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { VisionSection } from "./sections/VisionSection";
import { InternalNotesSection } from "./sections/InternalNotesSection";
import { IdentitySection } from "./sections/IdentitySection";
import { HorizontalSection } from "./sections/HorizontalSection";
import { VerticalSection } from "./sections/VerticalSection";
import { TechnicalSection } from "./sections/TechnicalSection";
import { QuickInfoSection } from "./sections/QuickInfoSection";
import { CanvasSettingsPopover } from "./CanvasSettingsPopover";
import { PhotoSection } from "./PhotoSection";
import { RelatedTasksSection } from "./sections/RelatedTasksSection";
import { RelatedPurchaseOrdersSection } from "./sections/RelatedPurchaseOrdersSection";
import { FilledIndicator } from "./components/FilledIndicator";
import { countFilledFields } from "./utils/countFilledFields";
import { useTranslation } from "react-i18next";
import type { RoomFormData, Room, Checklist, ChecklistItem } from "./types";

interface RoomDetailFormProps {
  room: Room | null;
  projectId: string;
  formData: RoomFormData;
  updateFormData: (updates: Partial<RoomFormData>) => void;
  updateSpec: <K extends keyof RoomFormData>(
    specKey: K,
    updates: Partial<RoomFormData[K]>
  ) => void;
  showPinterest?: boolean;
}

export function RoomDetailForm({
  room,
  projectId,
  formData,
  updateFormData,
  updateSpec,
  showPinterest,
}: RoomDetailFormProps) {
  const { t } = useTranslation();
  const isNewRoom = !room;
  const areaSqm = room?.dimensions?.area_sqm;
  const perimeterMm = room?.dimensions?.perimeter_mm;

  // Inline-editable title
  const [editingName, setEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Track which accordion sections are open
  const [openSections, setOpenSections] = useState<string[]>(["tasks"]);

  // Track collapsible sections
  const [photosExpanded, setPhotosExpanded] = useState(true);
  const [tasksExpanded, setTasksExpanded] = useState(true);
  const [checklistsExpanded, setChecklistsExpanded] = useState(true);
  const [purchasesExpanded, setPurchasesExpanded] = useState(true);
  const [commentsExpanded, setCommentsExpanded] = useState(true);

  // Calculate filled field counts for indicators
  const filledCounts = countFilledFields(formData);

  // Status badge helper
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "to_be_renovated":
        return "default";
      case "new_construction":
        return "secondary";
      default:
        return "outline";
    }
  };


  return (
    <div className="space-y-4">
      {/* Header with name, status, area and canvas settings */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {editingName ? (
            <input
              ref={nameInputRef}
              type="text"
              value={formData.name}
              onChange={(e) => updateFormData({ name: e.target.value })}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape") {
                  setEditingName(false);
                }
              }}
              className="text-xl font-semibold bg-transparent border-b-2 border-primary outline-none min-w-[120px] max-w-full"
              autoFocus
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditingName(true);
                setTimeout(() => nameInputRef.current?.select(), 0);
              }}
              className="text-xl font-semibold hover:text-primary transition-colors cursor-text group flex items-center gap-1.5 truncate"
              title={t("rooms.clickToRename", "Click to rename")}
            >
              <span className="truncate">{formData.name || t("rooms.unnamed", "Unnamed room")}</span>
              <Pencil className="h-3.5 w-3.5 opacity-0 group-hover:opacity-50 shrink-0" />
            </button>
          )}
          <Badge variant={getStatusBadgeVariant(formData.status)} className="shrink-0">
            {t(`roomStatuses.${formData.status === "to_be_renovated" ? "toBeRenovated" : formData.status === "new_construction" ? "newConstruction" : formData.status}`)}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          {(formData.area_sqm ?? areaSqm) ? <span>{(formData.area_sqm ?? areaSqm)?.toFixed(1)} m²</span> : null}
          {(formData.area_sqm ?? areaSqm) ? <span className="text-slate-300">·</span> : null}
          <span>
            {(formData.ceiling_height_mm / 1000).toFixed(2)} m{" "}
            {t("rooms.ceilingHeightShort", "h")}
          </span>
          <CanvasSettingsPopover
            roomId={room?.id ?? null}
            color={formData.color}
            onColorChange={(color) => updateFormData({ color })}
          />
        </div>
      </div>

      {/* Single column — wider dialog handles the extra space */}
      <VisionSection formData={formData} updateFormData={updateFormData} />

      <InternalNotesSection formData={formData} updateFormData={updateFormData} />

      <Accordion
        type="multiple"
        value={openSections}
        onValueChange={setOpenSections}
        className="w-full"
      >
        {/* Egenskaper (Identity) — moved above specs */}
        <AccordionItem value="identity" data-section="identity">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full pr-2">
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-blue-600" />
                <span>{t("rooms.identity", "Identitet")}</span>
              </div>
              <FilledIndicator
                filled={filledCounts.identity.filled}
                total={filledCounts.identity.total}
              />
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <IdentitySection
              formData={formData}
              updateFormData={updateFormData}
              updateSpec={updateSpec}
              areaSqm={areaSqm}
              perimeterMm={perimeterMm}
              createdAt={room?.created_at}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <QuickInfoSection
        formData={formData}
        updateFormData={updateFormData}
        areaSqm={areaSqm}
        perimeterMm={perimeterMm}
      />

      <Accordion
        type="multiple"
        value={openSections}
        onValueChange={setOpenSections}
        className="w-full"
      >
        <AccordionItem value="floor-ceiling" data-section="floor-ceiling">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full pr-2">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-green-600" />
                <span>{t("rooms.floorAndCeiling", "Golv & Tak")}</span>
              </div>
              <FilledIndicator
                filled={filledCounts.floorCeiling.filled}
                total={filledCounts.floorCeiling.total}
              />
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <HorizontalSection
              formData={formData}
              updateFormData={updateFormData}
              updateSpec={updateSpec}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="walls-joinery" data-section="walls-joinery">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full pr-2">
              <div className="flex items-center gap-2">
                <Square className="h-4 w-4 text-orange-600" />
                <span>{t("rooms.wallsAndJoinery", "Väggar & Snickerier")}</span>
              </div>
              <FilledIndicator
                filled={filledCounts.wallsJoinery.filled}
                total={filledCounts.wallsJoinery.total}
              />
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <VerticalSection
              formData={formData}
              updateFormData={updateFormData}
              updateSpec={updateSpec}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="electrical-heating" data-section="electrical-heating">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full pr-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-600" />
                <span>{t("rooms.electricalAndHeating", "El & Värme")}</span>
              </div>
              <FilledIndicator
                filled={filledCounts.electricalHeating.filled}
                total={filledCounts.electricalHeating.total}
              />
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <TechnicalSection
              formData={formData}
              updateFormData={updateFormData}
              updateSpec={updateSpec}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Photos, Tasks, Purchases, Comments — grouped collapsible sections */}
      {!isNewRoom && (
        <div className="border rounded-lg">
          <button
            type="button"
            onClick={() => setPhotosExpanded(!photosExpanded)}
            className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-t-lg"
          >
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-pink-600" />
              <span className="font-medium text-sm">
                {t("rooms.photos", "Foton")}
              </span>
            </div>
            {photosExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {photosExpanded && (
            <div className="px-4 pb-4">
              <PhotoSection roomId={room!.id} showPinterest={showPinterest} />
            </div>
          )}
        </div>
      )}

      {!isNewRoom && (
        <div className="border rounded-lg">
          <button
            type="button"
            onClick={() => setTasksExpanded(!tasksExpanded)}
            className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-t-lg"
          >
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-indigo-600" />
              <span className="font-medium text-sm">
                {t("rooms.relatedTasks", "Kopplade uppgifter")}
              </span>
            </div>
            {tasksExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {tasksExpanded && (
            <div className="px-4 pb-4">
              <RelatedTasksSection roomId={room!.id} projectId={projectId} />
            </div>
          )}
        </div>
      )}

      {/* Checklists */}
      {!isNewRoom && (
        <div className="border rounded-lg">
          <button
            type="button"
            onClick={() => setChecklistsExpanded(!checklistsExpanded)}
            className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-t-lg"
          >
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-emerald-600" />
              <span className="font-medium text-sm">
                {t("rooms.checklists", "Checklists")} {(formData.checklists || []).length > 0 && `(${(formData.checklists || []).length})`}
              </span>
            </div>
            {checklistsExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {checklistsExpanded && (
            <div className="px-4 pb-4 space-y-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const newChecklist: Checklist = {
                    id: crypto.randomUUID(),
                    title: t("rooms.checklist", "Checklist"),
                    items: [],
                  };
                  updateFormData({ checklists: [...(formData.checklists || []), newChecklist] });
                }}
              >
                <Plus className="h-3 w-3 mr-1" />
                {t("rooms.addChecklist", "Add checklist")}
              </Button>
              {(formData.checklists || []).map((checklist, clIdx) => {
                const completedCount = checklist.items.filter((i: ChecklistItem) => i.completed).length;
                const totalCount = checklist.items.length;
                const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                return (
                  <div key={checklist.id} className="border rounded-lg">
                    <Collapsible defaultOpen>
                      <div className="flex items-center gap-2 px-3 py-2">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </CollapsibleTrigger>
                        <Input
                          value={checklist.title}
                          onChange={(e) => {
                            const updated = [...(formData.checklists || [])];
                            updated[clIdx] = { ...updated[clIdx], title: e.target.value };
                            updateFormData({ checklists: updated });
                          }}
                          className="h-7 text-sm font-medium border-none shadow-none px-1 focus-visible:ring-1"
                        />
                        {totalCount > 0 && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{completedCount}/{totalCount}</span>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            const updated = (formData.checklists || []).filter((_: Checklist, i: number) => i !== clIdx);
                            updateFormData({ checklists: updated });
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      {totalCount > 0 && (
                        <div className="px-3 pb-1"><Progress value={progressPct} className="h-1.5" /></div>
                      )}
                      <CollapsibleContent>
                        <div className="px-3 pb-3 space-y-1">
                          {checklist.items.map((item: ChecklistItem, itemIdx: number) => (
                            <div key={item.id} className="flex items-center gap-2 group">
                              <Checkbox
                                checked={item.completed}
                                onCheckedChange={(checked) => {
                                  const updated = [...(formData.checklists || [])];
                                  const newItems = [...checklist.items];
                                  newItems[itemIdx] = { ...newItems[itemIdx], completed: !!checked };
                                  updated[clIdx] = { ...updated[clIdx], items: newItems };
                                  updateFormData({ checklists: updated });
                                }}
                              />
                              <Input
                                value={item.title}
                                onChange={(e) => {
                                  const updated = [...(formData.checklists || [])];
                                  const newItems = [...checklist.items];
                                  newItems[itemIdx] = { ...newItems[itemIdx], title: e.target.value };
                                  updated[clIdx] = { ...updated[clIdx], items: newItems };
                                  updateFormData({ checklists: updated });
                                }}
                                className={`h-7 text-sm border-none shadow-none px-1 focus-visible:ring-1 ${item.completed ? "line-through text-muted-foreground" : ""}`}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                  const updated = [...(formData.checklists || [])];
                                  const newItems = checklist.items.filter((_: ChecklistItem, i: number) => i !== itemIdx);
                                  updated[clIdx] = { ...updated[clIdx], items: newItems };
                                  updateFormData({ checklists: updated });
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                          <Input
                            placeholder={t("rooms.addItem", "Add item...")}
                            className="h-7 text-sm mt-1"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const val = (e.target as HTMLInputElement).value.trim();
                                if (val) {
                                  const updated = [...(formData.checklists || [])];
                                  const newItem: ChecklistItem = { id: crypto.randomUUID(), title: val, completed: false };
                                  updated[clIdx] = { ...updated[clIdx], items: [...checklist.items, newItem] };
                                  updateFormData({ checklists: updated });
                                  (e.target as HTMLInputElement).value = "";
                                }
                              }
                            }}
                          />
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Related Purchases */}
      {!isNewRoom && (
        <div className="border rounded-lg">
          <button
            type="button"
            onClick={() => setPurchasesExpanded(!purchasesExpanded)}
            className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-t-lg"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-teal-600" />
              <span className="font-medium text-sm">
                {t("rooms.relatedPurchases", "Kopplade inköp")}
              </span>
            </div>
            {purchasesExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {purchasesExpanded && (
            <div className="px-4 pb-4">
              <RelatedPurchaseOrdersSection roomId={room!.id} projectId={projectId} />
            </div>
          )}
        </div>
      )}

      {/* Comments */}
      {!isNewRoom && (
        <div className="border rounded-lg">
          <button
            type="button"
            onClick={() => setCommentsExpanded(!commentsExpanded)}
            className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-t-lg"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-gray-600" />
              <span className="font-medium text-sm">
                {t("rooms.comments", "Kommentarer")}
              </span>
            </div>
            {commentsExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {commentsExpanded && (
            <div className="px-4 pb-4">
              <CommentsSection
                entityId={room!.id}
                entityType="room"
                projectId={projectId}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

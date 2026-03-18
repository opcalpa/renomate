import { useState, useRef } from "react";
import {
  Layers,
  Square,
  Zap,
  Image as ImageIcon,
  Link2,
  Calculator,
  BookOpen,
  MessageSquare,
  ChevronDown,
  ListChecks,
  Plus,
  Trash2,
  X,
  Pencil,
  Lightbulb,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROOM_STATUS_OPTIONS, PRIORITY_OPTIONS } from "./constants";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { VisionSection } from "./sections/VisionSection";
import { IdentitySection } from "./sections/IdentitySection";
import { HorizontalSection } from "./sections/HorizontalSection";
import { VerticalSection } from "./sections/VerticalSection";
import { TechnicalSection } from "./sections/TechnicalSection";
import { CalculationsSection } from "./sections/CalculationsSection";
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
  const [openSections, setOpenSections] = useState<string[]>(["identity"]);
  const [openInstructions, setOpenInstructions] = useState<string[]>([]);

  // Track collapsible sections

  // Calculate filled field counts for indicators
  const filledCounts = countFilledFields(formData);

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
          {/* Inline status select */}
          <Select value={formData.status} onValueChange={(v) => updateFormData({ status: v })}>
            <SelectTrigger className="h-6 px-2 text-xs rounded-full border w-auto gap-1 focus:ring-0 shrink-0 [&>svg]:h-3 [&>svg]:w-3">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROOM_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-sm">
                  {t(opt.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Inline priority select */}
          <Select value={formData.priority} onValueChange={(v) => updateFormData({ priority: v })}>
            <SelectTrigger className="h-6 px-2 text-xs rounded-full border w-auto gap-1 focus:ring-0 shrink-0 [&>svg]:h-3 [&>svg]:w-3">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-sm">
                  {t(opt.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      {/* Always-visible: notes + dimensions */}
      <div className="space-y-3">
        <Textarea
          value={formData.notes || ""}
          onChange={(e) => updateFormData({ notes: e.target.value })}
          placeholder={t("rooms.internalNotesPlaceholder", "Interna anteckningar...")}
          rows={2}
          className="resize-none text-sm"
        />
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            {t("rooms.dimensions", "Dimensioner")}
          </p>
          <IdentitySection
            formData={formData}
            updateFormData={updateFormData}
            updateSpec={updateSpec}
            areaSqm={areaSqm}
            perimeterMm={perimeterMm}
            createdAt={room?.created_at}
          />
        </div>
      </div>

      <Accordion
        type="multiple"
        value={openSections}
        onValueChange={setOpenSections}
        className="w-full"
      >
        {/* Instruktioner — groups floor/ceiling, walls, electrical, client wishes */}

        {/* Instruktioner — groups floor/ceiling, walls, electrical, client wishes */}
        <AccordionItem value="instructions">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-sky-600" />
              <span>{t("rooms.instructions", "Instruktioner")}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-0">
            <Accordion
              type="multiple"
              value={openInstructions}
              onValueChange={setOpenInstructions}
              className="w-full"
            >
              <AccordionItem value="vision" className="border-x-0 border-b border-t-0 first:border-t-0">
                <AccordionTrigger className="hover:no-underline py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                    <span>{t("rooms.visionTitle", "Kundens önskemål")}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <VisionSection formData={formData} updateFormData={updateFormData} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="floor-ceiling" className="border-x-0">
                <AccordionTrigger className="hover:no-underline py-2 text-sm">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-2">
                      <Layers className="h-3.5 w-3.5 text-green-600" />
                      <span>{t("rooms.floorAndCeiling", "Golv & Tak")}</span>
                    </div>
                    <FilledIndicator filled={filledCounts.floorCeiling.filled} total={filledCounts.floorCeiling.total} />
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <HorizontalSection formData={formData} updateFormData={updateFormData} updateSpec={updateSpec} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="walls-joinery" className="border-x-0">
                <AccordionTrigger className="hover:no-underline py-2 text-sm">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-2">
                      <Square className="h-3.5 w-3.5 text-orange-600" />
                      <span>{t("rooms.wallsAndJoinery", "Väggar & Snickerier")}</span>
                    </div>
                    <FilledIndicator filled={filledCounts.wallsJoinery.filled} total={filledCounts.wallsJoinery.total} />
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <VerticalSection formData={formData} updateFormData={updateFormData} updateSpec={updateSpec} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="electrical-heating" className="border-x-0 border-b-0">
                <AccordionTrigger className="hover:no-underline py-2 text-sm">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-3.5 w-3.5 text-yellow-600" />
                      <span>{t("rooms.electricalAndHeating", "El & Värme")}</span>
                    </div>
                    <FilledIndicator filled={filledCounts.electricalHeating.filled} total={filledCounts.electricalHeating.total} />
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <TechnicalSection formData={formData} updateFormData={updateFormData} updateSpec={updateSpec} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </AccordionContent>
        </AccordionItem>

        {/* Materialkalkyl */}
        <AccordionItem value="calculations">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-violet-600" />
              <span>{t("rooms.materialCalculation", "Materialkalkyl")}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <CalculationsSection formData={formData} areaSqm={areaSqm} perimeterMm={perimeterMm} />
          </AccordionContent>
        </AccordionItem>


        {/* Kopplingar — only for existing rooms */}
        {!isNewRoom && (
          <AccordionItem value="kopplingar">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-indigo-600" />
                <span>{t("rooms.kopplingar", "Kopplingar")}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t("rooms.tasks", "Arbeten")}
                </p>
                <RelatedTasksSection roomId={room!.id} projectId={projectId} />
                <div className="border-t pt-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pb-1">
                    {t("rooms.purchases", "Inköp")}
                  </p>
                </div>
                <RelatedPurchaseOrdersSection roomId={room!.id} projectId={projectId} />
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Foton — only for existing rooms */}
        {!isNewRoom && (
          <AccordionItem value="photos">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-pink-600" />
                <span>{t("rooms.photos", "Foton")}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <PhotoSection roomId={room!.id} showPinterest={showPinterest} />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Checklistor — only for existing rooms */}
        {!isNewRoom && (
          <AccordionItem value="checklists">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-emerald-600" />
                <span>
                  {t("rooms.checklists", "Checklistor")}
                  {(formData.checklists || []).length > 0 && ` (${(formData.checklists || []).length})`}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
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
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Kommentarer — only for existing rooms */}
        {!isNewRoom && (
          <AccordionItem value="comments">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-gray-600" />
                <span>{t("rooms.comments", "Kommentarer")}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <CommentsSection
                entityId={room!.id}
                entityType="room"
                projectId={projectId}
              />
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      {/* Created date — discrete metadata at the bottom */}
      {room?.created_at && (
        <p className="text-xs text-muted-foreground/50 text-center pt-1">
          {t('rooms.createdOn', 'Skapad')}{" "}
          {new Date(room.created_at).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      )}
    </div>
  );
}

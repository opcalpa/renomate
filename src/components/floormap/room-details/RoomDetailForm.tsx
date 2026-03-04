import { useState } from "react";
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
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
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
import type { RoomFormData, Room } from "./types";

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

  // Track which accordion sections are open
  const [openSections, setOpenSections] = useState<string[]>(["tasks"]);

  // Track collapsible sections
  const [photosExpanded, setPhotosExpanded] = useState(true);
  const [tasksExpanded, setTasksExpanded] = useState(true);
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
        <div className="flex items-center gap-3">
          <div className="text-xl font-semibold">
            {formData.name || t("rooms.unnamed", "Unnamed room")}
          </div>
          <Badge variant={getStatusBadgeVariant(formData.status)}>
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

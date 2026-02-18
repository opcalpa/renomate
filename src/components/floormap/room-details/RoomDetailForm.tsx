import { useState } from "react";
import {
  Home,
  Layers,
  Square,
  Zap,
  Image as ImageIcon,
  ClipboardList,
  ShoppingCart,
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
import { SpecSummarySection } from "./sections/SpecSummarySection";
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
}

export function RoomDetailForm({
  room,
  projectId,
  formData,
  updateFormData,
  updateSpec,
}: RoomDetailFormProps) {
  const { t } = useTranslation();
  const isNewRoom = !room;
  const areaSqm = room?.dimensions?.area_sqm;
  const perimeterMm = room?.dimensions?.perimeter_mm;

  // Track which accordion sections are open
  const [openSections, setOpenSections] = useState<string[]>(["tasks"]);

  // Track collapsible sections for tasks and purchases
  const [tasksExpanded, setTasksExpanded] = useState(true);
  const [purchasesExpanded, setPurchasesExpanded] = useState(true);

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

  // Handle clicking summary items to expand sections
  const handleExpandSection = (sectionId: string) => {
    if (!openSections.includes(sectionId)) {
      setOpenSections([...openSections, sectionId]);
    }
    // Scroll to section after a short delay
    setTimeout(() => {
      const element = document.querySelector(`[data-section="${sectionId}"]`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
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
          {areaSqm && <span>{areaSqm.toFixed(1)} m²</span>}
          {areaSqm && <span className="text-slate-300">·</span>}
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

      {/* 1. Client requirements - ALWAYS visible and prominent */}
      <VisionSection formData={formData} updateFormData={updateFormData} />

      {/* 2. Specification Summary - Quick overview of what's been specified */}
      <SpecSummarySection
        formData={formData}
        onExpandSection={handleExpandSection}
      />

      {/* 3. Photos - Visual documentation for the room */}
      {!isNewRoom && (
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon className="h-4 w-4 text-pink-600" />
            <span className="font-medium text-sm">
              {t("rooms.photos", "Foton")}
            </span>
          </div>
          <PhotoSection roomId={room!.id} />
        </div>
      )}

      {/* 4. Internal notes - For builders/project managers */}
      <InternalNotesSection formData={formData} updateFormData={updateFormData} />

      {/* 5. Related Tasks - High priority for project managers */}
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

      {/* 6. Related Purchases - Right after tasks for consistency */}
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

      {/* 7. Material estimates - Auto-calculated values */}
      <QuickInfoSection
        formData={formData}
        updateFormData={updateFormData}
        areaSqm={areaSqm}
        perimeterMm={perimeterMm}
      />

      {/* 8. Detailed Accordion sections */}
      <Accordion
        type="multiple"
        value={openSections}
        onValueChange={setOpenSections}
        className="w-full"
      >
        {/* Section: Identity */}
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
              createdAt={room?.created_at}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Section: Floor & Ceiling */}
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

        {/* Section: Walls & Joinery */}
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

        {/* Section: Electrical & Heating */}
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

      {/* 9. Comments Section - Standalone at bottom for discussion */}
      {!isNewRoom && (
        <div className="border rounded-lg p-4">
          <CommentsSection
            entityId={room!.id}
            entityType="room"
            projectId={projectId}
          />
        </div>
      )}
    </div>
  );
}

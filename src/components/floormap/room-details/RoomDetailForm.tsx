import {
  Home,
  Layers,
  Square,
  Zap,
  BarChart3,
  Image as ImageIcon,
  ClipboardList,
  ShoppingCart,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { IdentitySection } from "./sections/IdentitySection";
import { HorizontalSection } from "./sections/HorizontalSection";
import { VerticalSection } from "./sections/VerticalSection";
import { TechnicalSection } from "./sections/TechnicalSection";
import { SmartDataSection } from "./sections/SmartDataSection";
import { QuickInfoSection } from "./sections/QuickInfoSection";
import { CanvasSettingsPopover } from "./CanvasSettingsPopover";
import { PhotoSection } from "./PhotoSection";
import { RelatedTasksSection } from "./sections/RelatedTasksSection";
import { RelatedPurchaseOrdersSection } from "./sections/RelatedPurchaseOrdersSection";
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
          {areaSqm && <span>{areaSqm.toFixed(1)} m²</span>}
          {areaSqm && <span className="text-slate-300">•</span>}
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

      {/* Quick Info - always visible */}
      <QuickInfoSection
        formData={formData}
        updateFormData={updateFormData}
        areaSqm={areaSqm}
        perimeterMm={perimeterMm}
      />

      {/* Accordion sections */}
      <Accordion
        type="multiple"
        defaultValue={["identity"]}
        className="w-full"
      >
        {/* Section 1: Identity */}
        <AccordionItem value="identity">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-blue-600" />
              <span>{t("rooms.identity", "Identity")}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <IdentitySection
              formData={formData}
              updateFormData={updateFormData}
              updateSpec={updateSpec}
              areaSqm={areaSqm}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Section 2: Floor & Ceiling */}
        <AccordionItem value="floor-ceiling">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-green-600" />
              <span>{t("rooms.floorAndCeiling", "Floor & Ceiling")}</span>
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

        {/* Section 3: Walls & Joinery */}
        <AccordionItem value="walls-joinery">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Square className="h-4 w-4 text-orange-600" />
              <span>{t("rooms.wallsAndJoinery", "Walls & Joinery")}</span>
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

        {/* Section 4: Electrical & Heating */}
        <AccordionItem value="electrical-heating">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-600" />
              <span>{t("rooms.electricalAndHeating", "Electrical & Heating")}</span>
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

        {/* Section 5: Project Data */}
        <AccordionItem value="project-data">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-600" />
              <span>{t("rooms.projectData", "Project Data")}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <SmartDataSection
              formData={formData}
              updateFormData={updateFormData}
              updateSpec={updateSpec}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Tasks Section - only for existing rooms */}
        {!isNewRoom && (
          <AccordionItem value="tasks">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-indigo-600" />
                <span>{t("rooms.relatedTasks", "Related Tasks")}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <RelatedTasksSection roomId={room!.id} projectId={projectId} />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Purchase Orders Section - only for existing rooms */}
        {!isNewRoom && (
          <AccordionItem value="purchases">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-teal-600" />
                <span>{t("rooms.relatedPurchaseOrders", "Purchase Orders")}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <RelatedPurchaseOrdersSection roomId={room!.id} projectId={projectId} />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Media & Comments Section - only for existing rooms */}
        {!isNewRoom && (
          <AccordionItem value="media">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-pink-600" />
                <span>{t("rooms.mediaAndComments", "Media & Comments")}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <PhotoSection roomId={room!.id} />
              <div className="border-t my-4" />
              <CommentsSection
                entityId={room!.id}
                entityType="room"
                projectId={projectId}
              />
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}

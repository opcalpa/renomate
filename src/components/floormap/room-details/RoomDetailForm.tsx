import {
  Home,
  Layers,
  Square,
  Zap,
  BarChart3,
  Image as ImageIcon,
  MessageSquare,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { IdentitySection } from "./sections/IdentitySection";
import { HorizontalSection } from "./sections/HorizontalSection";
import { VerticalSection } from "./sections/VerticalSection";
import { TechnicalSection } from "./sections/TechnicalSection";
import { SmartDataSection } from "./sections/SmartDataSection";
import { PhotoSection } from "./PhotoSection";
import type { RoomFormData, Room } from "./types";

interface RoomDetailFormProps {
  room: Room;
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
  const areaSqm = room.dimensions?.area_sqm;
  const perimeterMm = room.dimensions?.perimeter_mm;

  return (
    <div className="space-y-4">
      <Accordion
        type="multiple"
        defaultValue={["identity", "photos"]}
        className="w-full"
      >
        {/* Section 1: Identity & Geometry */}
        <AccordionItem value="identity">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-blue-600" />
              <span>Grundidentitet & Geometri</span>
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

        {/* Section 2: Horizontal Surfaces (Floor & Ceiling) */}
        <AccordionItem value="horizontal">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-green-600" />
              <span>Horisontella Ytor</span>
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

        {/* Section 3: Vertical Surfaces (Walls & Joinery) */}
        <AccordionItem value="vertical">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Square className="h-4 w-4 text-orange-600" />
              <span>Vertikala Ytor</span>
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

        {/* Section 4: Technical & Installations */}
        <AccordionItem value="technical">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-600" />
              <span>Teknik & Installationer</span>
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

        {/* Section 5: Smart Data */}
        <AccordionItem value="smartdata">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-600" />
              <span>Smart Data</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <SmartDataSection
              formData={formData}
              updateFormData={updateFormData}
              updateSpec={updateSpec}
              areaSqm={areaSqm}
              perimeterMm={perimeterMm}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Photos Section */}
        <AccordionItem value="photos">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-pink-600" />
              <span>Bilder</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <PhotoSection roomId={room.id} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Separator />

      {/* Comments Section (outside accordion) */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="h-4 w-4 text-gray-600" />
          <Label className="text-sm font-medium">Kommentarer & Diskussion</Label>
        </div>
        <CommentsSection
          entityId={room.id}
          entityType="room"
          projectId={projectId}
        />
      </div>
    </div>
  );
}

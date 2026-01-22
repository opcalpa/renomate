import { useState, useEffect } from "react";
import { X, Ruler, FileText, Edit2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { toast } from "sonner";
import { DrawnObject } from "./types";

interface ObjectPropertiesPanelProps {
  object: DrawnObject | null;
  projectId: string;
  onClose: () => void;
  onUpdateNotes: (objectId: string, notes: string) => void;
  onUpdateDimensions?: (objectId: string, newLengthM: number) => void;
  onUpdateName?: (objectId: string, name: string) => void;
}

export const ObjectPropertiesPanel = ({
  object,
  projectId,
  onClose,
  onUpdateNotes,
  onUpdateDimensions,
  onUpdateName
}: ObjectPropertiesPanelProps) => {
  const [notes, setNotes] = useState("");
  const [isEditingDimensions, setIsEditingDimensions] = useState(false);
  const [editLengthM, setEditLengthM] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editName, setEditName] = useState("");

  // Scale: 1:100 means 100 pixels = 1 meter in real life
  const PIXELS_PER_METER = 100; // 100 pixels = 1 meter at 1:100 scale

  // Calculate dimensions
  const calculateLength = () => {
    if (!object) return 0;
    let totalLength = 0;
    for (let i = 0; i < object.points.length - 1; i++) {
      const p1 = object.points[i];
      const p2 = object.points[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      totalLength += Math.sqrt(dx * dx + dy * dy);
    }
    return totalLength;
  };

  useEffect(() => {
    if (object) {
      setNotes(object.notes || "");
      setEditName(object.name || "");
      // Calculate length in pixels and convert to meters
      const lengthPixels = calculateLength();
      const lengthM = lengthPixels / PIXELS_PER_METER;
      setEditLengthM(lengthM.toFixed(2));
    }
  }, [object?.id]);

  if (!object) return null;

  // Calculate in correct units: pixels -> meters -> cm -> mm
  const lengthPixels = calculateLength();
  const lengthM = lengthPixels / PIXELS_PER_METER; // Convert pixels to meters
  const lengthCM = lengthM * 100; // Convert meters to cm
  const lengthMM = lengthM * 1000; // Convert meters to mm

  const handleSaveNotes = () => {
    onUpdateNotes(object.id, notes);
  };

  const handleSaveDimensions = () => {
    if (!onUpdateDimensions || !object) return;
    
    const newLengthM = parseFloat(editLengthM);
    if (isNaN(newLengthM) || newLengthM <= 0) {
      toast.error("Ogiltig längd. Ange ett positivt tal.");
      return;
    }

    onUpdateDimensions(object.id, newLengthM);
    setIsEditingDimensions(false);
    toast.success("Dimensioner uppdaterade!");
  };

  const handleCancelEdit = () => {
    setIsEditingDimensions(false);
    const lengthPixels = calculateLength();
    const lengthM = lengthPixels / PIXELS_PER_METER;
    setEditLengthM(lengthM.toFixed(2));
  };

  // Auto-save notes after 1 second of no typing
  useEffect(() => {
    if (!object) return;
    
    const timeoutId = setTimeout(() => {
      if (notes !== object.notes) {
        onUpdateNotes(object.id, notes);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [notes, object?.id]);

  return (
    <div className="fixed top-0 right-0 h-screen w-96 bg-white border-l border-gray-200 shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-lg">Objektdetaljer</h3>
        </div>
        <div className="flex items-center gap-2">
          {isEditMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Cancel editing - reset values
                  setEditName(object?.name || "");
                  setNotes(object?.notes || "");
                  setIsEditingDimensions(false);
                  const lengthPixels = calculateLength();
                  const lengthM = lengthPixels / PIXELS_PER_METER;
                  setEditLengthM(lengthM.toFixed(2));
                  setIsEditMode(false);
                }}
              >
                Avbryt
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  // Save changes
                  if (onUpdateName && object) {
                    onUpdateName(object.id, editName);
                  }
                  if (onUpdateNotes && object) {
                    onUpdateNotes(object.id, notes);
                  }
                  setIsEditMode(false);
                }}
              >
                Spara
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditMode(true)}
            >
              Redigera
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Type & Name (same row) */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <Label className="text-sm font-medium text-gray-700">Typ</Label>
            <div className="mt-2">
              <Badge variant={object.type === 'wall' ? 'default' : object.type === 'room' ? 'default' : 'secondary'}>
                {object.type === 'wall' ? 'Vägg' : object.type === 'room' ? 'Rum' : 'Frihandslinje'}
              </Badge>
            </div>
          </div>

          {object.type === 'room' && (
            <div className="flex-1">
              <Label className="text-sm font-medium text-gray-700">Namn</Label>
              <div className="mt-2">
                {isEditMode ? (
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Ange rumsnamn..."
                    className="w-full"
                  />
                ) : (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <span className="font-semibold text-gray-800">
                      {object.name || 'Namnlöst rum'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <Separator />

        <Separator />

        {/* Dimensions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4 text-gray-600" />
              <Label className="text-sm font-medium text-gray-700">Dimensioner</Label>
            </div>
            {!isEditingDimensions && onUpdateDimensions && object.type !== 'room' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingDimensions(true)}
                className="h-7 px-2"
              >
                <Edit2 className="h-3 w-3 mr-1" />
                Ändra
              </Button>
            )}
          </div>
          
          <div className="space-y-2 bg-gray-50 rounded-lg p-3">
            {object.type === 'room' ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Yta (m²):</span>
                  <span className="font-semibold text-blue-600">
                    {object.area?.toFixed(2) || '0.00'} m²
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Omkrets (m):</span>
                  <span className="font-medium">
                    {(lengthM || 0).toFixed(2)} m
                  </span>
                </div>
              </>
            ) : isEditingDimensions ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-length" className="text-xs text-gray-600">
                    Längd (meter):
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="edit-length"
                      type="number"
                      step="0.01"
                      value={editLengthM}
                      onChange={(e) => setEditLengthM(e.target.value)}
                      className="h-8"
                    />
                    <Button
                      size="sm"
                      onClick={handleSaveDimensions}
                      className="h-8 px-2"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelEdit}
                      className="h-8 px-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Objektet kommer att skalas proportionellt
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Längd (meter):</span>
                  <span className="font-semibold text-blue-600">
                    {lengthM.toFixed(2)} m
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Längd (cm):</span>
                  <span className="font-medium">
                    {lengthCM.toFixed(1)} cm
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Längd (mm):</span>
                  <span className="font-medium text-gray-500">
                    {lengthMM.toFixed(0)} mm
                  </span>
                </div>
              </>
            )}
            
            <Separator className="my-2" />
            
            {object.type !== 'room' && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tjocklek:</span>
                <span className="font-medium">
                  {object.thickness}px
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Antal punkter:</span>
              <span className="font-medium">
                {object.points.length}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Notes */}
        <div>
          <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
            Beskrivning & Anteckningar
          </Label>
          <p className="text-xs text-gray-500 mt-1 mb-2">
            Lägg till instruktioner, material eller andra viktiga detaljer
          </p>
          {isEditMode ? (
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="T.ex. Vägg ska rivas, 10cm tjocklek, isolering behövs..."
              className="min-h-[120px] resize-y"
            />
          ) : (
            <div className="bg-gray-50 rounded-lg p-3 min-h-[120px]">
              <span className="text-gray-800 whitespace-pre-wrap">
                {notes || 'Inga anteckningar än...'}
              </span>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-1">
            Sparas automatiskt
          </p>
        </div>

        <Separator />

        {/* Comments Section */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-3 block">
            Kommentarer & Diskussion
          </Label>
          <CommentsSection
            entityId={object.id}
            entityType="drawing_object"
            projectId={projectId}
          />
        </div>
      </div>
    </div>
  );
};

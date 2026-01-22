import { memo } from "react";
import { X, Ruler, AlignVerticalJustifyCenter, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { FloorMapShape, LineCoordinates, RectangleCoordinates } from "./types";
import { useFloorMapStore } from "./store";
import { toast } from "sonner";

interface ModernPropertyPanelProps {
  shape: FloorMapShape;
  onClose: () => void;
}

const MM_PER_PIXEL = 10; // 1px = 10mm

export const ModernPropertyPanel = memo(({ shape, onClose }: ModernPropertyPanelProps) => {
  const { updateShape } = useFloorMapStore();

  const getDimensions = () => {
    if (shape.type === 'line' || shape.type === 'wall') {
      const coords = shape.coordinates as LineCoordinates;
      const lengthPx = Math.sqrt(
        Math.pow(coords.x2 - coords.x1, 2) + Math.pow(coords.y2 - coords.y1, 2)
      );
      const lengthMM = lengthPx * MM_PER_PIXEL;
      const thicknessMM = shape.thicknessMM || 150;
      return { length: lengthMM, width: thicknessMM };
    } else if (shape.type === 'rectangle') {
      const coords = shape.coordinates as RectangleCoordinates;
      return {
        length: coords.width * MM_PER_PIXEL,
        width: coords.height * MM_PER_PIXEL
      };
    }
    return null;
  };

  const dimensions = getDimensions();
  const isWall = shape.type === 'wall' || shape.type === 'line';

  const handleThicknessChange = (value: string) => {
    const thickness = parseInt(value);
    if (!isNaN(thickness) && thickness > 0) {
      updateShape(shape.id, { thicknessMM: thickness });
      toast.success("Thickness updated");
    }
  };

  const handleHeightChange = (value: string) => {
    const height = parseInt(value);
    if (!isNaN(height) && height > 0) {
      updateShape(shape.id, { heightMM: height });
      toast.success("Height updated");
    }
  };

  const handleNotesChange = (value: string) => {
    updateShape(shape.id, { notes: value });
  };

  // Prevent keyboard events from propagating to canvas
  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="fixed right-0 top-14 bottom-0 w-80 bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
            <Ruler className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {isWall ? 'Wall Properties' : 'Object Properties'}
            </h3>
            <p className="text-xs text-gray-500">Edit dimensions and details</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 rounded-full hover:bg-white/80"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Dimensions Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Ruler className="w-4 h-4" />
            <span>Dimensions</span>
          </div>
          
          {dimensions && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600">Length</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={Math.round(dimensions.length)}
                    readOnly
                    className="pr-12 bg-gray-50 border-gray-200 font-mono text-sm"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                    mm
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {(dimensions.length / 1000).toFixed(2)}m
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600">
                  {isWall ? 'Thickness' : 'Width'}
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={Math.round(dimensions.width)}
                    onChange={(e) => isWall && handleThicknessChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    readOnly={!isWall}
                    className="pr-12 border-gray-200 font-mono text-sm"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                    mm
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {(dimensions.width / 1000).toFixed(2)}m
                </p>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Height Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <AlignVerticalJustifyCenter className="w-4 h-4" />
            <span>Height</span>
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-600">Wall Height</Label>
            <div className="relative">
              <Input
                type="number"
                value={shape.heightMM || 2400}
                onChange={(e) => handleHeightChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pr-12 border-gray-200 font-mono text-sm"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                mm
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {((shape.heightMM || 2400) / 1000).toFixed(2)}m
            </p>
          </div>
        </div>

        <Separator />

        {/* Worker Instructions */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <FileText className="w-4 h-4" />
            <span>Worker Instructions</span>
          </div>
          
          <Textarea
            placeholder="Add notes or instructions for construction workers..."
            value={shape.notes || ''}
            onChange={(e) => handleNotesChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[120px] resize-none border-gray-200 text-sm"
          />
          <p className="text-xs text-gray-500">
            These notes will be included in the exported plans
          </p>
        </div>

        {/* Quick Info Card */}
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-xs font-medium text-blue-900 mb-1">Quick Reference</p>
          <div className="space-y-1 text-xs text-blue-700">
            <div className="flex justify-between">
              <span>Scale:</span>
              <span className="font-mono font-semibold">1px = 10mm</span>
            </div>
            <div className="flex justify-between">
              <span>Default Wall:</span>
              <span className="font-mono">150mm</span>
            </div>
            <div className="flex justify-between">
              <span>Default Height:</span>
              <span className="font-mono">2400mm</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <Button
          onClick={onClose}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
        >
          Done
        </Button>
      </div>
    </div>
  );
});

ModernPropertyPanel.displayName = "ModernPropertyPanel";

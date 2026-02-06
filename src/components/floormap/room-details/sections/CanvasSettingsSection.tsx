import { useTranslation } from "react-i18next";
import { Palette, Check, Layers, ArrowUp, ArrowDown, ArrowUpToLine, ArrowDownToLine } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ROOM_COLOR_OPTIONS } from "../constants";
import { useState, useEffect, useMemo } from "react";
import { useFloorMapStore } from "../../store";

// Helper function to get darker version for stroke (70% darker)
const getDarkerColor = (rgbaColor: string): string => {
  const match = rgbaColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (match) {
    const r = Math.floor(parseInt(match[1]) * 0.7);
    const g = Math.floor(parseInt(match[2]) * 0.7);
    const b = Math.floor(parseInt(match[3]) * 0.7);
    return `rgba(${r}, ${g}, ${b}, 0.8)`;
  }
  return rgbaColor;
};

// Parse opacity from RGBA color string
const parseOpacity = (rgbaColor: string): number => {
  const match = rgbaColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (match && match[4]) {
    return parseFloat(match[4]);
  }
  return 0.2; // Default opacity
};

// Update opacity in RGBA color string
const setOpacityInColor = (rgbaColor: string, opacity: number): string => {
  const match = rgbaColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (match) {
    return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${opacity})`;
  }
  return rgbaColor;
};

// Get the base color (RGB) from RGBA
const getBaseColor = (rgbaColor: string): string => {
  const match = rgbaColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (match) {
    return `rgba(${match[1]}, ${match[2]}, ${match[3]}, 1)`;
  }
  return rgbaColor;
};

interface CanvasSettingsSectionProps {
  roomId: string | null;
  color: string;
  onColorChange: (color: string) => void;
}

export function CanvasSettingsSection({
  roomId,
  color,
  onColorChange,
}: CanvasSettingsSectionProps) {
  const { t } = useTranslation();
  const [colorPopoverOpen, setColorPopoverOpen] = useState(false);
  const [tempColor, setTempColor] = useState(color);

  // Parse current opacity from color
  const currentOpacity = useMemo(() => parseOpacity(color), [color]);
  const [opacity, setOpacity] = useState(currentOpacity);

  // Get shape and store actions
  const { shapes, updateShape, bringForward, sendBackward, bringToFront, sendToBack } = useFloorMapStore();

  // Find the room shape
  const roomShape = useMemo(() => {
    if (!roomId) return null;
    return shapes.find(s => s.roomId === roomId && s.type === 'room');
  }, [shapes, roomId]);

  const shapeZIndex = roomShape?.zIndex ?? 0;

  // Update local opacity when color changes
  useEffect(() => {
    setOpacity(parseOpacity(color));
  }, [color]);

  // Handle opacity change
  const handleOpacityChange = (values: number[]) => {
    const newOpacity = values[0];
    setOpacity(newOpacity);

    // Update color with new opacity
    const newColor = setOpacityInColor(color, newOpacity);
    onColorChange(newColor);

    // Also update the shape immediately for visual feedback
    if (roomShape) {
      updateShape(roomShape.id, {
        color: newColor,
        strokeColor: getDarkerColor(newColor),
      });
    }
  };

  // Layer ordering handlers
  const handleBringForward = () => {
    if (roomShape) {
      bringForward(roomShape.id);
    }
  };

  const handleSendBackward = () => {
    if (roomShape) {
      sendBackward(roomShape.id);
    }
  };

  const handleBringToFront = () => {
    if (roomShape) {
      bringToFront(roomShape.id);
    }
  };

  const handleSendToBack = () => {
    if (roomShape) {
      sendToBack(roomShape.id);
    }
  };

  // Apply color selection
  const applyColorSelection = () => {
    const colorWithOpacity = setOpacityInColor(tempColor, opacity);
    onColorChange(colorWithOpacity);

    // Update shape immediately
    if (roomShape) {
      updateShape(roomShape.id, {
        color: colorWithOpacity,
        strokeColor: getDarkerColor(colorWithOpacity),
      });
    }

    setColorPopoverOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Room color picker */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-gray-600" />
          <Label>{t('canvasSettings.roomColor', 'Room Color on Canvas')}</Label>
        </div>

        <Popover
          open={colorPopoverOpen}
          onOpenChange={(open) => {
            setColorPopoverOpen(open);
            if (open) {
              setTempColor(color);
            }
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className="w-full h-16 rounded-lg border-2 border-gray-300 hover:border-gray-400 transition-all flex items-center gap-3 px-4"
            >
              <div
                className="w-12 h-12 rounded-lg border-2"
                style={{
                  backgroundColor: color,
                  borderColor: getDarkerColor(color),
                }}
              />
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">{t('identitySection.selectedColor', 'Selected color')}</div>
                <div className="text-xs text-gray-500">{t('identitySection.clickToChange', 'Click to change')}</div>
              </div>
              <Palette className="h-5 w-5 text-gray-400" />
            </button>
          </PopoverTrigger>

          <PopoverContent className="w-80" align="start">
            <div className="space-y-3">
              <div className="font-medium text-sm">{t('identitySection.chooseRoomColor', 'Choose room color')}</div>

              <div className="grid grid-cols-4 gap-2">
                {ROOM_COLOR_OPTIONS.map((colorOption) => {
                  // Apply current opacity to the preview colors
                  const previewColor = setOpacityInColor(colorOption.color, opacity);
                  const isSelected = getBaseColor(tempColor) === getBaseColor(colorOption.color);

                  return (
                    <button
                      key={colorOption.hex}
                      type="button"
                      onClick={() => setTempColor(setOpacityInColor(colorOption.color, opacity))}
                      className={`
                        relative h-16 rounded-lg border-2 transition-all hover:scale-105
                        ${isSelected ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-300"}
                      `}
                      style={{ backgroundColor: previewColor }}
                    >
                      <div
                        className="absolute inset-0 rounded-lg border-4 pointer-events-none"
                        style={{ borderColor: getDarkerColor(previewColor) }}
                      />
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <Check className="h-6 w-6 text-blue-600 bg-white rounded-full p-1" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-white/90 text-xs py-0.5 text-center rounded-b-lg pointer-events-none">
                        {t(colorOption.nameKey)}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTempColor(color);
                    setColorPopoverOpen(false);
                  }}
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={applyColorSelection}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-1" />
                  {t('identitySection.useColor', 'Use color')}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Opacity/Transparency slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>{t('canvasSettings.transparency', 'Transparency')}</Label>
          <span className="text-sm text-muted-foreground">
            {Math.round(opacity * 100)}%
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-16">{t('canvasSettings.transparent', 'Transparent')}</span>
          <Slider
            value={[opacity]}
            onValueChange={handleOpacityChange}
            min={0.05}
            max={0.8}
            step={0.05}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-12">{t('canvasSettings.solid', 'Solid')}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('canvasSettings.transparencyHelp', 'Lower transparency makes it easier to see objects inside the room')}
        </p>
      </div>

      {/* Layer ordering */}
      {roomId && roomShape && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-gray-600" />
            <Label>{t('canvasSettings.layerOrder', 'Layer Order')}</Label>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg space-y-3">
            <p className="text-xs text-muted-foreground">
              {t('canvasSettings.layerOrderHelp', 'Send room to back to easily select and move objects placed inside the room (furniture, appliances, etc.)')}
            </p>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSendToBack}
                className="flex-1 min-w-[120px]"
              >
                <ArrowDownToLine className="h-4 w-4 mr-1" />
                {t('canvasSettings.sendToBack', 'Send to Back')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSendBackward}
                className="flex-1 min-w-[120px]"
              >
                <ArrowDown className="h-4 w-4 mr-1" />
                {t('canvasSettings.sendBackward', 'Send Backward')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleBringForward}
                className="flex-1 min-w-[120px]"
              >
                <ArrowUp className="h-4 w-4 mr-1" />
                {t('canvasSettings.bringForward', 'Bring Forward')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleBringToFront}
                className="flex-1 min-w-[120px]"
              >
                <ArrowUpToLine className="h-4 w-4 mr-1" />
                {t('canvasSettings.bringToFront', 'Bring to Front')}
              </Button>
            </div>

            <div className="text-xs text-center text-muted-foreground pt-1">
              {t('canvasSettings.currentLayer', 'Current layer')}: {shapeZIndex}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

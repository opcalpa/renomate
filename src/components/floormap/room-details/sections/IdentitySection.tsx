import { Home, Ruler, Palette, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ComboboxFretext } from "../fields/ComboboxFretext";
import {
  ROOM_NAME_SUGGESTIONS,
  ROOM_STATUS_OPTIONS,
  ROOM_COLOR_OPTIONS,
} from "../constants";
import type { IdentitySectionProps } from "../types";
import { useState } from "react";

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

export function IdentitySection({
  formData,
  updateFormData,
  areaSqm,
}: IdentitySectionProps) {
  const [colorPopoverOpen, setColorPopoverOpen] = useState(false);
  const [tempColor, setTempColor] = useState(formData.color);

  return (
    <div className="space-y-4">
      {/* Room name with combobox */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Home className="h-4 w-4 text-gray-600" />
          <Label htmlFor="room-name">Rumsnamn *</Label>
        </div>
        <ComboboxFretext
          id="room-name"
          suggestions={ROOM_NAME_SUGGESTIONS}
          value={formData.name}
          onChange={(value) => updateFormData({ name: value })}
          placeholder="Välj eller skriv rumsnamn..."
          searchPlaceholder="Sök eller skriv..."
        />
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label htmlFor="room-status">Status</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => updateFormData({ status: value })}
        >
          <SelectTrigger id="room-status">
            <SelectValue placeholder="Välj status" />
          </SelectTrigger>
          <SelectContent>
            {ROOM_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Area (read-only) */}
      {areaSqm !== undefined && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Ruler className="h-4 w-4 text-gray-600" />
            <Label>Area</Label>
          </div>
          <div className="h-10 flex items-center px-3 bg-gray-50 border rounded-md">
            <span className="font-semibold text-blue-600">
              {areaSqm.toFixed(2)} m²
            </span>
          </div>
        </div>
      )}

      {/* Ceiling height */}
      <div className="space-y-2">
        <Label htmlFor="ceiling-height">Takhöjd (mm)</Label>
        <Input
          id="ceiling-height"
          type="number"
          min={1000}
          max={10000}
          step={100}
          value={formData.ceiling_height_mm}
          onChange={(e) =>
            updateFormData({ ceiling_height_mm: parseInt(e.target.value) || 2400 })
          }
        />
      </div>

      {/* Room color picker */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-gray-600" />
          <Label>Rumsfärg på ritning</Label>
        </div>

        <Popover
          open={colorPopoverOpen}
          onOpenChange={(open) => {
            setColorPopoverOpen(open);
            if (open) {
              setTempColor(formData.color);
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
                  backgroundColor: formData.color,
                  borderColor: getDarkerColor(formData.color),
                }}
              />
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">Vald färg</div>
                <div className="text-xs text-gray-500">Klicka för att ändra</div>
              </div>
              <Palette className="h-5 w-5 text-gray-400" />
            </button>
          </PopoverTrigger>

          <PopoverContent className="w-80" align="start">
            <div className="space-y-3">
              <div className="font-medium text-sm">Välj rumsfärg</div>

              <div className="grid grid-cols-4 gap-2">
                {ROOM_COLOR_OPTIONS.map((colorOption) => (
                  <button
                    key={colorOption.hex}
                    type="button"
                    onClick={() => setTempColor(colorOption.color)}
                    className={`
                      relative h-16 rounded-lg border-2 transition-all hover:scale-105
                      ${tempColor === colorOption.color ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-300"}
                    `}
                    style={{ backgroundColor: colorOption.color }}
                  >
                    <div
                      className="absolute inset-0 rounded-lg border-4 pointer-events-none"
                      style={{ borderColor: getDarkerColor(colorOption.color) }}
                    />
                    {tempColor === colorOption.color && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Check className="h-6 w-6 text-blue-600 bg-white rounded-full p-1" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-white/90 text-xs py-0.5 text-center rounded-b-lg pointer-events-none">
                      {colorOption.name}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTempColor(formData.color);
                    setColorPopoverOpen(false);
                  }}
                  className="flex-1"
                >
                  Avbryt
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    updateFormData({ color: tempColor });
                    setColorPopoverOpen(false);
                  }}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Använd färg
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

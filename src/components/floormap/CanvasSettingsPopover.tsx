/**
 * Canvas Settings Popover
 * Centralized workspace environment configuration
 * Separated from drawing tools to reduce cognitive load
 */

import { Settings, Grid3x3, Ruler, Eye, EyeOff, Magnet, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useFloorMapStore } from "./store";
import { Scale, Unit } from "./utils/formatting";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";

export const CanvasSettingsPopover = () => {
  const {
    projectSettings,
    setScale,
    setUnit,
    setGridInterval,
    toggleGrid,
    toggleSnap,
    toggleDimensions,
    toggleAreaLabels,
    setCanvasSize,
  } = useFloorMapStore();

  const gridIntervalOptions = [
    { value: 50, label: '5cm (Fine)' },
    { value: 100, label: '10cm' },
    { value: 250, label: '25cm' },
    { value: 500, label: '50cm (Standard)' },
    { value: 1000, label: '1m' },
    { value: 2000, label: '2m (Coarse)' },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          title="Canvas Settings"
        >
          <Settings className="h-4 w-4" />
          <span className="hidden md:inline">Canvas</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 max-h-[85vh] overflow-y-auto" align="start">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Canvas Settings
            </h4>
            <p className="text-xs text-muted-foreground mb-4">
              Configure workspace environment without affecting actual measurements
            </p>
          </div>

          <Separator />

          {/* Scale Selector */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Ruler className="h-3.5 w-3.5" />
              Drawing Scale
            </Label>
            <Select
              value={projectSettings.scale}
              onValueChange={(value) => setScale(value as Scale)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1:20">1:20 (Detailed)</SelectItem>
                <SelectItem value="1:50">1:50 (Standard Detail)</SelectItem>
                <SelectItem value="1:100">1:100 (Default)</SelectItem>
                <SelectItem value="1:500">1:500 (Overview)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Affects visual density, line weights, and label sizes
            </p>
          </div>

          <Separator />

          {/* Unit Toggle */}
          <div className="space-y-2">
            <Label>Display Unit</Label>
            <div className="flex gap-2">
              {(['mm', 'cm', 'm'] as Unit[]).map((unit) => (
                <Button
                  key={unit}
                  variant={projectSettings.unit === unit ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUnit(unit)}
                  className="flex-1"
                >
                  {unit}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              How measurements are displayed (storage always in mm)
            </p>
          </div>

          <Separator />

          {/* Grid Settings */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Grid3x3 className="h-3.5 w-3.5" />
              Grid Configuration
            </Label>

            {/* Grid Visibility */}
            <div className="flex items-center justify-between">
              <Label htmlFor="grid-visible" className="text-sm font-normal">
                Show Grid
              </Label>
              <Switch
                id="grid-visible"
                checked={projectSettings.gridVisible}
                onCheckedChange={toggleGrid}
              />
            </div>

            {/* Grid Interval */}
            <div className="space-y-2">
              <Label className="text-sm">Grid Spacing</Label>
              <Select
                value={projectSettings.gridInterval.toString()}
                onValueChange={(value) => setGridInterval(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {gridIntervalOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Snap to Grid */}
            <div className="flex items-center justify-between">
              <Label htmlFor="snap-enabled" className="text-sm font-normal flex items-center gap-2">
                <Magnet className="h-3.5 w-3.5" />
                Snap to Grid
              </Label>
              <Switch
                id="snap-enabled"
                checked={projectSettings.snapEnabled}
                onCheckedChange={toggleSnap}
              />
            </div>
          </div>

          <Separator />

          {/* Canvas Size */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Maximize2 className="h-3.5 w-3.5" />
              Arbetsyta Storlek
            </Label>
            <p className="text-xs text-muted-foreground">
              Ritningsyta täckt med gridlines
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="canvas-width" className="text-xs">
                  Bredd (m)
                </Label>
                <Input
                  id="canvas-width"
                  type="number"
                  min="10"
                  max="200"
                  step="5"
                  value={projectSettings.canvasWidthMeters}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 30;
                    setCanvasSize(value, projectSettings.canvasHeightMeters);
                  }}
                  className="h-8"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="canvas-height" className="text-xs">
                  Höjd (m)
                </Label>
                <Input
                  id="canvas-height"
                  type="number"
                  min="10"
                  max="200"
                  step="5"
                  value={projectSettings.canvasHeightMeters}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 30;
                    setCanvasSize(projectSettings.canvasWidthMeters, value);
                  }}
                  className="h-8"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 flex-1"
                onClick={() => setCanvasSize(20, 20)}
              >
                20×20m
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 flex-1"
                onClick={() => setCanvasSize(30, 30)}
              >
                30×30m
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 flex-1"
                onClick={() => setCanvasSize(50, 50)}
              >
                50×50m
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Standard: 30×30m (lägenhet/villa) · 50×50m (större projekt)
            </p>
          </div>

          <Separator />

          {/* Display Options */}
          <div className="space-y-3">
            <Label>Display Options</Label>

            {/* Show Dimensions */}
            <div className="flex items-center justify-between">
              <Label htmlFor="show-dimensions" className="text-sm font-normal">
                Visa mått på väggar
              </Label>
              <Switch
                id="show-dimensions"
                checked={projectSettings.showDimensions}
                onCheckedChange={toggleDimensions}
              />
            </div>
            <p className="text-xs text-muted-foreground -mt-1">
              Längdmått visas i vald måttenhet ({projectSettings.unit})
            </p>

            {/* Show Area Labels */}
            <div className="flex items-center justify-between">
              <Label htmlFor="show-area" className="text-sm font-normal">
                Visa rumsareor
              </Label>
              <Switch
                id="show-area"
                checked={projectSettings.showAreaLabels}
                onCheckedChange={toggleAreaLabels}
              />
            </div>
          </div>

          {/* Current Settings Summary */}
          <div className="mt-4 p-3 bg-muted/50 rounded-md">
            <p className="text-xs font-medium mb-2">Aktiv Konfiguration:</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span>Skala: {projectSettings.scale}</span>
              <span>Enhet: {projectSettings.unit}</span>
              <span>Grid: {projectSettings.gridInterval}mm</span>
              <span>Snap: {projectSettings.snapEnabled ? 'PÅ' : 'AV'}</span>
              <span>Arbetsyta: {projectSettings.canvasWidthMeters}×{projectSettings.canvasHeightMeters}m</span>
              <span>Mått: {projectSettings.showDimensions ? 'Synliga' : 'Dolda'}</span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

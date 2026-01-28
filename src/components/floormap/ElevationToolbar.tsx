/**
 * ElevationToolbar - Drawing toolbar for elevation view
 *
 * Provides basic drawing tools for creating shapes in elevation mode.
 * Shapes created here are only visible in elevation view.
 */

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  MousePointer2,
  Pencil,
  Square,
  Circle,
  Type,
  Eraser,
  Undo,
  Redo,
  Trash2,
  ZoomIn,
  ZoomOut,
  LucideIcon,
  Minus,
  Ruler,
  Library,
  DoorOpen,
  Calculator,
} from "lucide-react";
import { useFloorMapStore } from "./store";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState } from "react";
import { ElevationSymbolGallery } from "./ElevationSymbolGallery";
import { ElevationSymbolDefinition } from "./ElevationSymbolLibrary";

interface ToolItem {
  id: string;
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  onClick: () => void;
}

interface ElevationToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  canUndo: boolean;
  canRedo: boolean;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onAddSymbol?: (symbol: ElevationSymbolDefinition) => void;
  onToggleSmartData?: () => void;
  smartDataOpen?: boolean;
}

export const ElevationToolbar = ({
  onUndo,
  onRedo,
  onDelete,
  canUndo,
  canRedo,
  zoom,
  onZoomIn,
  onZoomOut,
  onAddSymbol,
  onToggleSmartData,
  smartDataOpen,
}: ElevationToolbarProps) => {
  const { activeTool, setActiveTool, selectedShapeIds } = useFloorMapStore();
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);

  // Drawing tools for elevation mode
  const drawTools: ToolItem[] = [
    { id: 'rectangle', icon: Square, label: 'Rektangel', shortcut: 'R', onClick: () => setActiveTool('rectangle') },
    { id: 'circle', icon: Circle, label: 'Cirkel', shortcut: 'C', onClick: () => setActiveTool('circle') },
    { id: 'wall', icon: Minus, label: 'Linje', shortcut: 'L', onClick: () => setActiveTool('wall') },
    { id: 'freehand', icon: Pencil, label: 'Frihand', shortcut: 'P', onClick: () => setActiveTool('freehand') },
    { id: 'text', icon: Type, label: 'Text', shortcut: 'T', onClick: () => setActiveTool('text') },
  ];

  const isDrawActive = drawTools.some(t => t.id === activeTool);

  return (
    <div className="absolute left-4 top-16 bg-white/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg shadow-black/5 flex flex-col items-center py-3 gap-1.5 z-50">
      {/* Select Tool */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={activeTool === 'select' ? "default" : "ghost"}
            size="icon"
            onClick={() => setActiveTool('select')}
            className={cn("w-10 h-10", activeTool === 'select' && "bg-primary text-primary-foreground")}
          >
            <MousePointer2 className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Välj (V)</TooltipContent>
      </Tooltip>

      <Separator className="w-8 my-1" />

      {/* Drawing Tools */}
      <Popover open={openCategory === 'draw'} onOpenChange={(open) => setOpenCategory(open ? 'draw' : null)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant={isDrawActive ? "default" : "ghost"}
                size="icon"
                className={cn(
                  "w-10 h-10 relative",
                  isDrawActive && "bg-primary text-primary-foreground"
                )}
              >
                <Square className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">Rita former</TooltipContent>
        </Tooltip>

        <PopoverContent
          side="right"
          align="start"
          className="w-48 p-2 ml-2 bg-white/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-lg"
        >
          <div className="flex flex-col gap-1">
            <div className="px-2 py-1.5 text-sm font-semibold border-b border-border/50 mb-1 text-gray-700">
              Rita former (Elevation)
            </div>
            {drawTools.map((item) => {
              const ItemIcon = item.icon;
              const isActive = item.id === activeTool;
              return (
                <Button
                  key={item.id}
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "w-full justify-start gap-3 h-9 px-2",
                    "hover:bg-black/5",
                    isActive && "bg-primary/10 text-primary"
                  )}
                  onClick={() => {
                    item.onClick();
                    setOpenCategory(null);
                  }}
                >
                  <ItemIcon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
                  <span className="text-sm flex-1">{item.label}</span>
                  {item.shortcut && (
                    <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                      {item.shortcut}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* Eraser */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={activeTool === 'eraser' ? "default" : "ghost"}
            size="icon"
            onClick={() => setActiveTool('eraser')}
            className={cn("w-10 h-10", activeTool === 'eraser' && "bg-primary text-primary-foreground")}
          >
            <Eraser className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Suddgummi (E)</TooltipContent>
      </Tooltip>

      <Separator className="w-8 my-1" />

      {/* Symbol Gallery */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setGalleryOpen(true)}
            className="w-10 h-10 bg-gradient-to-br from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100"
          >
            <DoorOpen className="h-5 w-5 text-amber-600" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <div className="flex flex-col">
            <span className="font-medium">Symbolbibliotek</span>
            <span className="text-xs text-muted-foreground">Fönster, dörrar, el, kök mm.</span>
          </div>
        </TooltipContent>
      </Tooltip>

      {/* Smart Data */}
      {onToggleSmartData && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={smartDataOpen ? "default" : "ghost"}
              size="icon"
              onClick={onToggleSmartData}
              className={cn(
                "w-10 h-10",
                smartDataOpen && "bg-green-500 text-white hover:bg-green-600"
              )}
            >
              <Calculator className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <div className="flex flex-col">
              <span className="font-medium">Smarta uppgifter</span>
              <span className="text-xs text-muted-foreground">Ytberäkningar, materialåtgång</span>
            </div>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Measure/Ruler Tool */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={activeTool === 'measure' ? "default" : "ghost"}
            size="icon"
            onClick={() => setActiveTool('measure')}
            className={cn(
              "w-10 h-10",
              activeTool === 'measure' && "bg-red-500 text-white hover:bg-red-600"
            )}
          >
            <Ruler className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Mät avstånd (M)</TooltipContent>
      </Tooltip>

      <Separator className="w-8 my-1" />

      {/* Zoom */}
      <div className="flex flex-col items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onZoomIn} className="w-8 h-8">
              <ZoomIn className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Zooma in</TooltipContent>
        </Tooltip>
        <span className="text-[10px] text-muted-foreground">{Math.round(zoom * 100)}%</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onZoomOut} className="w-8 h-8">
              <ZoomOut className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Zooma ut</TooltipContent>
        </Tooltip>
      </div>

      <Separator className="w-8 my-1" />

      {/* Undo/Redo */}
      <div className="flex gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo} className="w-8 h-8">
              <Undo className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Ångra</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onRedo} disabled={!canRedo} className="w-8 h-8">
              <Redo className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Gör om</TooltipContent>
        </Tooltip>
      </div>

      {/* Delete */}
      {selectedShapeIds.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="w-10 h-10 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Ta bort ({selectedShapeIds.length})</TooltipContent>
        </Tooltip>
      )}

      {/* Info badge */}
      <div className="mt-2 px-2">
        <div className="text-[9px] text-muted-foreground text-center bg-amber-50 border border-amber-200 rounded px-1.5 py-1">
          Elevation-läge
        </div>
      </div>

      {/* Symbol Gallery Dialog */}
      <ElevationSymbolGallery
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        onSelectSymbol={(symbol) => {
          if (onAddSymbol) {
            onAddSymbol(symbol);
          }
          setGalleryOpen(false);
        }}
      />
    </div>
  );
};

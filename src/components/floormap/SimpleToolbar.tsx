import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  MousePointer2,
  Pencil,
  Minus,
  Eraser,
  Grid3x3,
  Magnet,
  Save,
  Undo,
  Redo,
  Trash2,
  ZoomIn,
  ZoomOut,
  Home,
  RectangleHorizontal,
  Type,
  Scissors,
  Link,
  Square,
  Circle,
  Triangle,
  ChevronRight,
  Ruler,
  Settings,
  Sparkles,
  Copy,
  Bookmark
} from "lucide-react";
import { toast } from "sonner";
import { CanvasSettingsPopover } from "./CanvasSettingsPopover";
import { AIFloorPlanImport } from "@/components/project/AIFloorPlanImport";
import { TemplateGallery } from "./TemplateGallery";
import { SaveTemplateDialog } from "./SaveTemplateDialog";


// Professional architectural icons following industry standard
const InnerWallIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="4" y1="12" x2="20" y2="12" strokeWidth="2" />
  </svg>
);

const OuterWallIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="4" y1="11" x2="20" y2="11" strokeWidth="2.5" />
    <line x1="4" y1="13" x2="20" y2="13" strokeWidth="2.5" />
  </svg>
);

const WindowIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="6" y="10" width="12" height="4" fill="none" />
    <line x1="6" y1="12" x2="18" y2="12" strokeWidth="1" />
  </svg>
);


const WallOpeningIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="4" y1="12" x2="8" y2="12" strokeWidth="2" />
    <line x1="16" y1="12" x2="20" y2="12" strokeWidth="2" />
    <line x1="8" y1="12" x2="16" y2="12" strokeWidth="1" strokeDasharray="2,2" />
  </svg>
);

const HalfStairsIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="6" y1="18" x2="18" y2="18" />
    <line x1="18" y1="18" x2="18" y2="14" />
    <line x1="18" y1="14" x2="12" y2="14" />
    <line x1="12" y1="14" x2="12" y2="10" />
    <line x1="12" y1="10" x2="6" y2="10" />
  </svg>
);

const SpiralStairsIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="7" fill="none" />
    <path d="M 12 5 Q 17 7 17 12" fill="none" />
    <path d="M 17 12 Q 17 17 12 17" fill="none" />
    <path d="M 12 17 Q 7 17 7 12" fill="none" />
  </svg>
);

const StraightStairsIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="6" y="6" width="12" height="12" fill="none" />
    <line x1="6" y1="10" x2="18" y2="10" />
    <line x1="6" y1="14" x2="18" y2="14" />
    <line x1="10" y1="6" x2="10" y2="18" strokeWidth="0.5" />
  </svg>
);

const BathtubIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M 6 14 L 6 11 L 18 11 L 18 14 Q 18 16 16 17 L 8 17 Q 6 16 6 14" fill="none" />
  </svg>
);

const ToiletIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <ellipse cx="12" cy="12" rx="4" ry="5" fill="none" />
    <line x1="8" y1="12" x2="16" y2="12" strokeWidth="0.5" />
  </svg>
);

const SinkIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="7" y="10" width="10" height="6" rx="1" fill="none" />
    <circle cx="12" cy="13" r="1.5" fill="currentColor" opacity="0.3" />
  </svg>
);

const StoveIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="7" y="8" width="10" height="10" rx="1" fill="none" />
    <circle cx="10" cy="11" r="1.5" />
    <circle cx="14" cy="11" r="1.5" />
    <circle cx="10" cy="15" r="1.5" />
    <circle cx="14" cy="15" r="1.5" />
  </svg>
);

const OutletIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="5" fill="none" />
    <circle cx="10" cy="12" r="0.8" fill="currentColor" />
    <circle cx="14" cy="12" r="0.8" fill="currentColor" />
  </svg>
);

const SwitchIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="9" y="9" width="6" height="6" rx="0.5" fill="none" />
    <line x1="11" y1="11" x2="11" y2="13" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const MirrorIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="7" y="7" width="10" height="10" rx="1" fill="none" />
    <line x1="9" y1="9" x2="11" y2="11" strokeWidth="1" opacity="0.5" />
  </svg>
);
import { useFloorMapStore } from "./store";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState, useRef } from "react";

interface SimpleToolbarProps {
  projectId: string;
  onSave: () => void;
  onDelete: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const SimpleToolbar = ({
  projectId,
  onSave,
  onDelete,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: SimpleToolbarProps) => {
  const { t } = useTranslation();
  const { activeTool, setActiveTool, gridSettings, setGridSettings, viewState, setViewState, projectSettings, selectedShapeIds } = useFloorMapStore();
  const [wallSubmenuOpen, setWallSubmenuOpen] = useState(false);
  const [aiImportOpen, setAiImportOpen] = useState(false);
  const [templateGalleryOpen, setTemplateGalleryOpen] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  
  // Detect if Mac for keyboard shortcuts display
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '⌘' : 'Ctrl';
  
  // Handle wall construction template creation
  const handleWallConstruction = (templateType: 'square2x2' | 'circle2m' | 'triangle' | 'outer_wall') => {
    if (templateType === 'outer_wall') {
      // For outer wall, activate wall tool with outer wall settings
      setActiveTool('wall');
      // Set outer wall properties in window for canvas to use
      (window as any).__wallType = 'outer';
      (window as any).__wallThickness = 300; // 300mm for outer wall
      toast.info('Yttervägg aktiverat (300mm tjocklek)');
    } else {
      // Set template type in global store for canvas to handle
      (window as any).__createTemplate = templateType;
      setActiveTool('select'); // Switch to select tool for placement
    }
    setWallSubmenuOpen(false);
  };


  const handleZoomIn = () => {
    const newZoom = Math.min(viewState.zoom * 1.2, 5);
    setViewState({ zoom: newZoom });
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(viewState.zoom / 1.2, 0.2);
    setViewState({ zoom: newZoom });
  };

  const handleResetZoom = () => {
    setViewState({ zoom: 1, panX: 0, panY: 0 });
  };

  const tools = [
    {
      id: 'select' as const,
      icon: MousePointer2,
      label: 'Markera',
      tooltip: 'Välj och flytta objekt',
    },
    {
      id: 'freehand' as const,
      icon: Pencil,
      label: 'Penna',
      tooltip: 'Rita frihandslinje',
    },
    {
      id: 'wall' as const,
      icon: Minus,
      label: 'Vägg',
      tooltip: 'Rita vägg',
    },
    {
      id: 'room' as const,
      icon: Home,
      label: 'Rum',
      tooltip: 'Markera rum genom att dra rektangel',
    },
    {
      id: 'eraser' as const,
      icon: Eraser,
      label: 'Sudd',
      tooltip: 'Radera objekt (E)',
    },
    {
      id: 'text' as const,
      icon: Type,
      label: 'Text',
      tooltip: 'Placera fri text (T)',
    },
    {
      id: 'scissors' as const,
      icon: Scissors,
      label: 'Sax',
      tooltip: 'Dela linje i två delar',
    },
    {
      id: 'glue' as const,
      icon: Link,
      label: 'Klistra',
      tooltip: 'Sätt ihop raka linjer som möter varandra',
    },
  ];

  return (
    <div className="fixed left-0 top-0 h-full w-16 bg-background border-r border-border flex flex-col items-center py-4 gap-2 z-50 overflow-y-auto overflow-x-hidden">
      {/* ===== GROUP A: CREATE TOOLS (Drawing) ===== */}
      <div className="w-full px-1 mb-1">
        <div className="text-[9px] text-muted-foreground text-center mb-2 font-medium uppercase tracking-wide">
          Create
        </div>
      </div>

      {/* AI Import Button - At the top of CREATE section */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setAiImportOpen(true)}
            className="w-12 h-12 bg-gradient-to-br from-purple-500/10 to-blue-500/10 hover:from-purple-500/20 hover:to-blue-500/20 border border-purple-500/20"
          >
            <Sparkles className="h-5 w-5 text-purple-600" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <div className="flex flex-col gap-1">
            <p className="font-semibold">AI Floor Plan Import</p>
            <p className="text-xs text-muted-foreground">Konvertera ritning till digital floorplan</p>
          </div>
        </TooltipContent>
      </Tooltip>

      <Separator className="w-10 my-2" />
      
      {/* Drawing tools */}
      <div className="flex flex-col gap-1">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;

          // Special handling for wall tool with submenu
          if (tool.id === 'wall') {
            return (
              <div key={tool.id} className="relative group">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      size="icon"
                      onClick={() => setActiveTool(tool.id)}
                      className={cn(
                        "w-12 h-12 relative",
                        isActive && "bg-primary text-primary-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {/* Small indicator that submenu exists */}
                      <ChevronRight className="h-2.5 w-2.5 absolute bottom-1 right-1 opacity-60" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <div className="flex flex-col gap-1">
                      <p className="font-semibold">{tool.tooltip}</p>
                      <p className="text-xs text-muted-foreground">Högerklicka för vägg-konstruktioner</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
                
                {/* Submenu trigger (right-click or hover on right edge) */}
                <Popover open={wallSubmenuOpen} onOpenChange={setWallSubmenuOpen}>
                  <PopoverTrigger asChild>
                    <div
                      className="absolute right-0 top-0 w-3 h-12 cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setWallSubmenuOpen(true);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setWallSubmenuOpen(!wallSubmenuOpen);
                      }}
                      style={{ 
                        background: 'linear-gradient(to right, transparent, rgba(0,0,0,0.1))'
                      }}
                    />
                  </PopoverTrigger>
                  
                  <PopoverContent side="right" align="start" className="w-56 p-2 ml-2">
                    <div className="flex flex-col gap-1">
                      <div className="px-2 py-1.5 text-sm font-semibold border-b border-border mb-1">
                        Vägg-konstruktioner
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-3 h-10"
                        onClick={() => handleWallConstruction('square2x2')}
                      >
                        <Square className="h-4 w-4" />
                        <div className="flex flex-col items-start">
                          <span className="text-sm">Fyrkant 2x2m</span>
                          <span className="text-xs text-muted-foreground">Rektangulär väggstruktur</span>
                        </div>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-3 h-10"
                        onClick={() => handleWallConstruction('circle2m')}
                      >
                        <Circle className="h-4 w-4" />
                        <div className="flex flex-col items-start">
                          <span className="text-sm">Cirkel ⌀2m</span>
                          <span className="text-xs text-muted-foreground">Cirkulär väggstruktur</span>
                        </div>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-3 h-10"
                        onClick={() => handleWallConstruction('triangle')}
                      >
                        <Triangle className="h-4 w-4" />
                        <div className="flex flex-col items-start">
                          <span className="text-sm">Triangel</span>
                          <span className="text-xs text-muted-foreground">Triangulär väggstruktur</span>
                        </div>
                      </Button>
                      
                      <Separator className="my-1" />
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-3 h-10"
                        onClick={() => handleWallConstruction('outer_wall')}
                      >
                        <OuterWallIcon className="h-4 w-4" />
                        <div className="flex flex-col items-start">
                          <span className="text-sm">Yttervägg</span>
                          <span className="text-xs text-muted-foreground">Tjock vägg 300mm</span>
                        </div>
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            );
          }

          // Door tool completely removed - all objects now in Template Gallery

          // Regular tools
          return (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setActiveTool(tool.id)}
                  className={cn(
                    "w-12 h-12",
                    isActive && "bg-primary text-primary-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{tool.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
        
        
        
        {/* Template Gallery - Browse saved templates */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTemplateGalleryOpen(true)}
              className="w-12 h-12"
            >
              <Copy className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <div className="flex flex-col gap-1">
              <p className="font-semibold">Mall-Galleri</p>
              <p className="text-xs text-muted-foreground">Placera sparade mallar</p>
            </div>
          </TooltipContent>
        </Tooltip>
        
        {/* Save as Template - Only visible when shapes selected */}
        {selectedShapeIds.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSaveTemplateOpen(true)}
                className="w-12 h-12 bg-blue-50 hover:bg-blue-100 border-2 border-blue-300"
              >
                <Bookmark className="h-5 w-5 text-blue-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <div className="flex flex-col gap-1">
                <p className="font-semibold">Spara som Mall</p>
                <p className="text-xs text-muted-foreground">
                  {selectedShapeIds.length} {selectedShapeIds.length === 1 ? 'objekt' : 'objekt'} markerat
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <Separator className="my-2" />

      {/* ===== GROUP B: MODIFY TOOLS (Edit & Navigate) ===== */}
      <div className="w-full px-1 mb-1">
        <div className="text-[9px] text-muted-foreground text-center mb-2 font-medium uppercase tracking-wide">
          Modify
        </div>
      </div>

      {/* Zoom controls */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              className="w-12 h-12"
            >
              <ZoomIn className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Zooma in ({modKey}++)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              className="w-12 h-12"
            >
              <ZoomOut className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Zooma ut ({modKey}+-)</p>
          </TooltipContent>
        </Tooltip>

      <div className="text-[10px] text-center text-muted-foreground px-1 leading-tight">
        <div>{Math.round(viewState.zoom * 100)}%</div>
      </div>

      <Separator className="my-2" />

        {/* Actions */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onUndo}
              disabled={!canUndo}
              className="w-12 h-12"
            >
              <Undo className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Ångra ({modKey}+Z)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRedo}
              disabled={!canRedo}
              className="w-12 h-12"
            >
              <Redo className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Gör om ({isMac ? '⌘+Shift+Z' : 'Ctrl+Y'})</p>
          </TooltipContent>
        </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="w-12 h-12"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Ta bort markerat (Delete)</p>
        </TooltipContent>
      </Tooltip>

      <div className="flex-1" />

        {/* ===== GROUP C: WORKSPACE (Environment Tools) ===== */}
        <div className="w-full px-1 mb-1">
          <Separator className="mb-2" />
          <div className="text-[9px] text-muted-foreground text-center mb-2 font-medium uppercase tracking-wide">
            Workspace
          </div>
        </div>

        {/* Canvas Settings - Centralized Configuration */}
        <div className="px-2 w-full">
          <CanvasSettingsPopover />
        </div>

        <Separator className="my-2" />

        {/* Save button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onSave}
              className="w-12 h-12"
            >
              <Save className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Spara ritning ({modKey}+S)</p>
          </TooltipContent>
        </Tooltip>

        {/* AI Import Dialog */}
        <AIFloorPlanImport
          projectId={projectId}
          open={aiImportOpen}
          onOpenChange={setAiImportOpen}
          onImportComplete={() => {
            setAiImportOpen(false);
            // User is already in Floor Plan view, shapes appear instantly
          }}
        />
        
        
        {/* Template Gallery */}
        <TemplateGallery
          open={templateGalleryOpen}
          onOpenChange={setTemplateGalleryOpen}
        />
        
        {/* Save Template Dialog */}
        <SaveTemplateDialog
          open={saveTemplateOpen}
          onOpenChange={setSaveTemplateOpen}
          selectedShapes={useFloorMapStore.getState().shapes.filter(s => 
            useFloorMapStore.getState().selectedShapeIds.includes(s.id)
          )}
          onSaveSuccess={() => {
            toast.success('Mall sparad!');
          }}
        />
    </div>
  );
};

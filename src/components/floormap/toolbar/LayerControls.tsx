import React from 'react';
import { ArrowUp, ArrowDown, ChevronsUp, ChevronsDown, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useFloorMapStore } from '../store';
import { toast } from 'sonner';

interface LayerControlsProps {
  className?: string;
}

export const LayerControls: React.FC<LayerControlsProps> = ({ className }) => {
  const selectedShapeIds = useFloorMapStore((state) => state.selectedShapeIds);
  const bringForward = useFloorMapStore((state) => state.bringForward);
  const sendBackward = useFloorMapStore((state) => state.sendBackward);
  const bringToFront = useFloorMapStore((state) => state.bringToFront);
  const sendToBack = useFloorMapStore((state) => state.sendToBack);

  const hasSelection = selectedShapeIds.length > 0;

  const handleBringForward = () => {
    if (!hasSelection) {
      toast.info('Markera ett objekt först');
      return;
    }
    selectedShapeIds.forEach(id => bringForward(id));
    toast.success('Flyttat framåt');
  };

  const handleSendBackward = () => {
    if (!hasSelection) {
      toast.info('Markera ett objekt först');
      return;
    }
    selectedShapeIds.forEach(id => sendBackward(id));
    toast.success('Flyttat bakåt');
  };

  const handleBringToFront = () => {
    if (!hasSelection) {
      toast.info('Markera ett objekt först');
      return;
    }
    selectedShapeIds.forEach(id => bringToFront(id));
    toast.success('Flyttat längst fram');
  };

  const handleSendToBack = () => {
    if (!hasSelection) {
      toast.info('Markera ett objekt först');
      return;
    }
    selectedShapeIds.forEach(id => sendToBack(id));
    toast.success('Flyttat längst bak');
  };

  // Detect if Mac for keyboard shortcuts display
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '⌘' : 'Ctrl';

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "w-12 h-12",
                !hasSelection && "opacity-50",
                className
              )}
            >
              <Layers className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">
          <div className="flex flex-col gap-1">
            <p className="font-semibold">Lager-ordning</p>
            <p className="text-xs text-muted-foreground">Ändra z-ordning för valda objekt</p>
          </div>
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        side="right"
        align="start"
        className={cn(
          "w-56 p-2 ml-2",
          "bg-white/95 backdrop-blur-xl",
          "border border-white/20",
          "rounded-xl shadow-lg shadow-black/10",
          "animate-in fade-in slide-in-from-left-2 duration-200"
        )}
      >
        <div className="flex flex-col gap-1">
          <div className="px-2 py-1.5 text-sm font-semibold border-b border-border/50 mb-1 text-gray-700 flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Lager-ordning
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 h-10 px-2 hover:bg-black/5"
            onClick={handleBringToFront}
            disabled={!hasSelection}
          >
            <ChevronsUp className="h-4 w-4" />
            <div className="flex flex-col items-start flex-1">
              <span className="text-sm">Längst fram</span>
            </div>
            <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
              {modKey}+]
            </span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 h-10 px-2 hover:bg-black/5"
            onClick={handleBringForward}
            disabled={!hasSelection}
          >
            <ArrowUp className="h-4 w-4" />
            <div className="flex flex-col items-start flex-1">
              <span className="text-sm">Framåt</span>
            </div>
            <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
              ]
            </span>
          </Button>

          <Separator className="my-1" />

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 h-10 px-2 hover:bg-black/5"
            onClick={handleSendBackward}
            disabled={!hasSelection}
          >
            <ArrowDown className="h-4 w-4" />
            <div className="flex flex-col items-start flex-1">
              <span className="text-sm">Bakåt</span>
            </div>
            <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
              [
            </span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 h-10 px-2 hover:bg-black/5"
            onClick={handleSendToBack}
            disabled={!hasSelection}
          >
            <ChevronsDown className="h-4 w-4" />
            <div className="flex flex-col items-start flex-1">
              <span className="text-sm">Längst bak</span>
            </div>
            <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
              {modKey}+[
            </span>
          </Button>

          {!hasSelection && (
            <div className="px-2 py-2 text-xs text-muted-foreground bg-muted/50 rounded-md mt-1">
              Markera ett objekt för att ändra lager-ordning
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

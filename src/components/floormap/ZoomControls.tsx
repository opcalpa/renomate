import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { useFloorMapStore } from "./store";

export const ZoomControls = () => {
  const { viewState, setViewState } = useFloorMapStore();

  const handleZoomIn = () => {
    const newZoom = Math.min(viewState.zoom * 1.2, 5);
    setViewState({ zoom: newZoom });
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(viewState.zoom / 1.2, 0.2);
    setViewState({ zoom: newZoom });
  };

  const handleResetView = () => {
    const centerX = window.innerWidth / 2;
    const centerY = (window.innerHeight - 70) / 2;
    setViewState({ zoom: 1, panX: centerX, panY: centerY });
  };

  return (
    <div className="absolute bottom-4 right-4 z-20 flex gap-2 bg-background/95 backdrop-blur-sm rounded-lg p-2 shadow-lg border border-border">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleZoomOut}
        title="Zoom Out (Ctrl + -)"
        className="h-8 w-8 hover:bg-accent transition-colors"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleResetView}
        title="Reset View (Ctrl + 0)"
        className="h-8 w-8 hover:bg-accent transition-colors"
      >
        <Maximize2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleZoomIn}
        title="Zoom In (Ctrl + +)"
        className="h-8 w-8 hover:bg-accent transition-colors"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      <div className="flex items-center px-2 text-xs font-mono text-muted-foreground min-w-[3rem] justify-center">
        {Math.round(viewState.zoom * 100)}%
      </div>
    </div>
  );
};

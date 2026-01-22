import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export const GettingStartedOverlay = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasSeenOverlay = localStorage.getItem("space-planner-seen-overlay");
    if (!hasSeenOverlay) {
      setIsVisible(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem("space-planner-seen-overlay", "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg max-w-2xl w-full p-6 relative animate-scale-in">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Welcome to Space Planner</h2>
            <p className="text-muted-foreground">
              A modern floorplanner inspired by BONI — create walls, rooms, and measurements with ease.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h3 className="font-medium">Drawing Tools</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li><kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">V</kbd> Select</li>
                <li><kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">W</kbd> Draw Wall</li>
                <li><kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">M</kbd> Measure</li>
                <li><kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Space</kbd> Pan Canvas</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Navigation</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li><kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">+/-</kbd> Zoom</li>
                <li><kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Shift+R</kbd> Reset View</li>
                <li><kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl+Z</kbd> Undo</li>
                <li><kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Delete</kbd> Remove</li>
              </ul>
            </div>
          </div>

          <div className="p-3 bg-muted/50 rounded text-sm text-muted-foreground">
            <strong>Quick Tip:</strong> Use the grid and snap features for precise measurements. 
            Double-click any shape to edit its properties directly.
          </div>

          <Button onClick={handleClose} className="w-full">
            Get Started
          </Button>
        </div>
      </div>
    </div>
  );
};

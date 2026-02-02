import { useState, useEffect, useCallback, useRef } from "react";
import { SimpleToolbar } from "./SimpleToolbar";
import { UnifiedKonvaCanvas } from "./UnifiedKonvaCanvas";
import { ElevationCanvas } from "./ElevationCanvas";
import { RoomDetailDialog } from "./RoomDetailDialog";
import { SpacePlannerTopBar } from "./SpacePlannerTopBar";
import { useFloorMapStore } from "./store";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { loadPlansFromDB, createPlanInDB } from "./utils/plans";
import { Box } from "lucide-react";

interface FloorMapEditorProps {
  projectId: string;
  projectName?: string;
  onBack?: () => void;
  isReadOnly?: boolean;
}

export const FloorMapEditor = ({ projectId, projectName, onBack, isReadOnly }: FloorMapEditorProps) => {
  const { t } = useTranslation();
  const {
    plans,
    currentPlanId,
    shapes,
    viewMode,
    setCurrentProjectId,
    setPlans,
    setCurrentPlanId,
  } = useFloorMapStore();

  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [canUndoState, setCanUndoState] = useState(false);
  const [canRedoState, setCanRedoState] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);

  // Update undo/redo state from canvas via event (replaces polling)
  useEffect(() => {
    const handleUndoRedoChange = (e: CustomEvent<{ canUndo: boolean; canRedo: boolean }>) => {
      setCanUndoState(e.detail.canUndo);
      setCanRedoState(e.detail.canRedo);
    };

    window.addEventListener('canvasUndoRedoStateChange', handleUndoRedoChange as EventListener);
    return () => window.removeEventListener('canvasUndoRedoStateChange', handleUndoRedoChange as EventListener);
  }, []);

  // Keyboard shortcuts - MINIMAL (most handled in UnifiedKonvaCanvas)
  useEffect(() => {
    // Detect OS for proper modifier key
    const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts that are specific to FloorMapEditor
      // All canvas shortcuts (Ctrl+Z/Y/C/V/D/A, Delete, etc.) are in UnifiedKonvaCanvas
      
      // Use Cmd on Mac, Ctrl on Windows - simplified
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      
      // Save - keep here as it's a top-level action
      // NOTE: Do NOT handle Z/Y here - those are canvas undo/redo
      if (modKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveShapes();
      }
      
      // Explicitly do NOT handle Z, Y (undo/redo) - let canvas handle those
      // Do NOT call e.preventDefault() or e.stopPropagation() for other keys
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initialize project context
  useEffect(() => {
    setCurrentProjectId(projectId);
  }, [projectId, setCurrentProjectId]);

  // Load plans on mount
  useEffect(() => {
    loadInitialData();
  }, [projectId]);

  const loadInitialData = async () => {
    // Load all plans for this project
    const loadedPlans = await loadPlansFromDB(projectId);
    if (loadedPlans.length === 0) {
      // Create a default plan if none exist
      const defaultPlan = await createPlanInDB(projectId, t("Floor Plan 1"));
      if (defaultPlan) {
        setPlans([defaultPlan]);
        setCurrentPlanId(defaultPlan.id);
      }
    } else {
      setPlans(loadedPlans);
      const defaultPlan = loadedPlans.find((p) => p.isDefault) || loadedPlans[0];
      setCurrentPlanId(defaultPlan.id);
    }
  };

  // Note: Auto-save is now handled by the canvas component itself

  const saveShapes = async () => {
    if (isSaving) return;

    setIsSaving(true);
    // Use canvas save function instead of plan save
    if ((window as any).__canvasSave) {
      const success = await (window as any).__canvasSave();
      if (success) {
        setHasUnsavedChanges(false);
        // toast.success is already shown in canvas save function
      }
    } else {
      toast.error('Canvas save function not available');
    }
    setIsSaving(false);
  };

  const handleManualSave = () => {
    saveShapes();
  };

  const handleDelete = () => {
    // Delete is handled in the canvas with Delete key
    toast.info(t("Press Delete or Backspace to remove the selected object"));
  };

  const handleUndo = () => {
    // Call canvas undo directly
    if ((window as any).__canvasUndo) {
      (window as any).__canvasUndo();
      toast.success(t("Undone"));
    }
  };

  const handleRedo = () => {
    // Call canvas redo directly
    if ((window as any).__canvasRedo) {
      (window as any).__canvasRedo();
      toast.success(t("Redone"));
    }
  };

  const handleRoomClick = (room: any) => {
    setSelectedRoom(room);
    setRoomDialogOpen(true);
  };

  const handleRoomUpdated = () => {
    // Refresh rooms list
    setSelectedRoom(null);
    // Increment trigger to notify canvas of room updates
    setRoomUpdateTrigger(prev => prev + 1);
  };

  const [roomUpdateTrigger, setRoomUpdateTrigger] = useState(0);

  return (
    <div className="flex flex-col h-full">
      {/* Top Bar with Plan Selector */}
      <SpacePlannerTopBar projectId={projectId} projectName={projectName} onBack={onBack} isReadOnly={isReadOnly} />
      
      <style dangerouslySetInnerHTML={{
        __html: `
          .canvas-scroll-area, .canvas-scrollable-container {
            scroll-behavior: smooth;
            touch-action: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: thin;
            scrollbar-color: rgba(0, 0, 0, 0.2) rgba(0, 0, 0, 0.05);
          }
          .canvas-scroll-area::-webkit-scrollbar,
          .canvas-scrollable-container::-webkit-scrollbar {
            width: 14px;
            height: 14px;
          }
          .canvas-scroll-area::-webkit-scrollbar-track,
          .canvas-scrollable-container::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.05);
          }
          .canvas-scroll-area::-webkit-scrollbar-thumb,
          .canvas-scrollable-container::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.3);
            border-radius: 0px;
            border: 2px solid rgba(0, 0, 0, 0.05);
            transition: background 0.2s ease;
          }
          .canvas-scroll-area::-webkit-scrollbar-thumb:hover,
          .canvas-scrollable-container::-webkit-scrollbar-thumb:hover {
            background: rgba(0, 0, 0, 0.4);
          }
          .canvas-scroll-area::-webkit-scrollbar-thumb:active,
          .canvas-scrollable-container::-webkit-scrollbar-thumb:active {
            background: rgba(0, 0, 0, 0.5);
          }
          .canvas-scroll-area::-webkit-scrollbar-corner,
          .canvas-scrollable-container::-webkit-scrollbar-corner {
            background: rgba(0, 0, 0, 0.05);
          }
        `
      }} />
      <div className="flex flex-1 relative pt-14"> {/* Padding for fixed TopBar */}
        {/* Left Toolbar - Only show in floor plan mode and when not read-only */}
        {viewMode === 'floor' && !isReadOnly && (
          <SimpleToolbar
            projectId={projectId}
            onSave={handleManualSave}
            onDelete={handleDelete}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={canUndoState}
            canRedo={canRedoState}
          />
        )}

        {/* Main Canvas Area - Switch based on viewMode */}
        {viewMode === 'floor' && (
          <main className="flex-1 overflow-auto canvas-scroll-area relative">
            <UnifiedKonvaCanvas
              onRoomCreated={() => setRoomUpdateTrigger(prev => prev + 1)}
              isReadOnly={isReadOnly}
            />
          </main>
        )}

        {viewMode === 'elevation' && (
          <main className="flex-1 overflow-hidden relative">
            <ElevationCanvas projectId={projectId} />
          </main>
        )}

        {viewMode === '3d' && (
          <main className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center text-muted-foreground">
              <Box className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-xl font-medium">3D-vy kommer snart</p>
              <p className="text-sm mt-2">Vi arbetar på att lägga till 3D-visualisering</p>
            </div>
          </main>
        )}

      </div>

      {/* Room Detail Dialog */}
      <RoomDetailDialog
        room={selectedRoom}
        projectId={projectId}
        open={roomDialogOpen}
        onOpenChange={setRoomDialogOpen}
        onRoomUpdated={handleRoomUpdated}
      />

      {/* Save indicator */}
      {isSaving && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg">
          {t("Saving...")}
        </div>
      )}
    </div>
  );
};

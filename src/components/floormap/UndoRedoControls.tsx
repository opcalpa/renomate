import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Undo2, Redo2 } from "lucide-react";

interface UndoRedoControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export const UndoRedoControls = ({ canUndo, canRedo, onUndo, onRedo }: UndoRedoControlsProps) => {
  const { t } = useTranslation();
  return (
    <div className="absolute bottom-4 left-4 z-20 flex gap-2 bg-background/90 backdrop-blur-sm rounded-lg p-2 shadow-lg border border-border">
      <Button
        variant="ghost"
        size="icon"
        onClick={onUndo}
        disabled={!canUndo}
        title={t('controls.undoShortcut')}
        className="h-8 w-8"
      >
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onRedo}
        disabled={!canRedo}
        title={t('controls.redoShortcut')}
        className="h-8 w-8"
      >
        <Redo2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

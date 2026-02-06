import { useTranslation } from "react-i18next";
import { X, MousePointer2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StepKey } from "@/hooks/useOnboarding";

interface CanvasHintProps {
  /** The current onboarding step key */
  currentStepKey: StepKey | null;
  /** The canvas hint translation key for this step */
  canvasHintKey?: string;
  /** Callback when hint is dismissed */
  onDismiss?: () => void;
  /** Additional class names */
  className?: string;
}

/**
 * A floating hint that appears on the canvas during onboarding
 * to guide users through drawing actions.
 */
export function CanvasHint({
  currentStepKey,
  canvasHintKey,
  onDismiss,
  className,
}: CanvasHintProps) {
  const { t } = useTranslation();

  // Only show for steps that have canvas hints
  if (!currentStepKey || !canvasHintKey) {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute bottom-6 left-1/2 -translate-x-1/2 z-50",
        "animate-in fade-in slide-in-from-bottom-4 duration-300",
        className
      )}
    >
      <div className="flex items-center gap-3 bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-lg">
        <div className="flex items-center gap-2">
          <MousePointer2 className="h-4 w-4 animate-bounce" />
          <span className="text-sm font-medium">{t(canvasHintKey)}</span>
        </div>
        {onDismiss && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 -mr-1 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
            onClick={onDismiss}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      {/* Arrow pointing up */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-primary" />
    </div>
  );
}

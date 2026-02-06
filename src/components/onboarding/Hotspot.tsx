import { useState, useEffect, useCallback, forwardRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { StepKey } from "@/hooks/useOnboarding";

type HotspotPosition = "top-right" | "top-left" | "bottom-right" | "bottom-left";

interface HotspotProps {
  /** Unique identifier for persisting dismissal state */
  id: string;
  /** Position relative to parent container */
  position?: HotspotPosition;
  /** Tooltip content (can be translation key or direct text) */
  content: string;
  /** Whether to use i18n for content */
  isTranslationKey?: boolean;
  /** Show only once per user (persists in localStorage) */
  showOnce?: boolean;
  /** Callback when hotspot is dismissed */
  onDismiss?: () => void;
  /** Additional class names */
  className?: string;
  /** Size of the hotspot dot */
  size?: "sm" | "md" | "lg";
  /** Onboarding step key - if set, only shows when this step is active */
  onboardingStepKey?: StepKey;
  /** Whether this onboarding step is currently active */
  isOnboardingStepActive?: boolean;
}

const STORAGE_KEY_PREFIX = "hotspot-dismissed-";

const positionClasses: Record<HotspotPosition, string> = {
  "top-right": "absolute -top-1 -right-1",
  "top-left": "absolute -top-1 -left-1",
  "bottom-right": "absolute -bottom-1 -right-1",
  "bottom-left": "absolute -bottom-1 -left-1",
};

const sizeClasses = {
  sm: "h-2.5 w-2.5",
  md: "h-3 w-3",
  lg: "h-4 w-4",
};

export function Hotspot({
  id,
  position = "top-right",
  content,
  isTranslationKey = true,
  showOnce = true,
  onDismiss,
  className,
  size = "md",
  onboardingStepKey,
  isOnboardingStepActive,
}: HotspotProps) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(true); // Start hidden, show after check
  const [open, setOpen] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    if (showOnce) {
      const isDismissed = localStorage.getItem(`${STORAGE_KEY_PREFIX}${id}`) === "true";
      setDismissed(isDismissed);
    } else {
      setDismissed(false);
    }
  }, [id, showOnce]);

  const handleDismiss = useCallback(() => {
    if (showOnce) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${id}`, "true");
    }
    setDismissed(true);
    setOpen(false);
    onDismiss?.();
  }, [id, showOnce, onDismiss]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    // Auto-dismiss when user closes the popover
    if (!isOpen && !dismissed) {
      handleDismiss();
    }
  };

  // If onboardingStepKey is set, only show when that step is active
  if (onboardingStepKey && !isOnboardingStepActive) {
    return null;
  }

  if (dismissed) {
    return null;
  }

  const displayContent = isTranslationKey ? t(content) : content;

  return (
    <div className={cn(positionClasses[position], className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            className="relative block focus:outline-none"
            aria-label="Help tip"
          >
            {/* Pulsing outer ring */}
            <span
              className={cn(
                "absolute inline-flex rounded-full bg-primary opacity-75 animate-ping",
                sizeClasses[size]
              )}
            />
            {/* Solid inner dot */}
            <span
              className={cn(
                "relative inline-flex rounded-full bg-primary",
                sizeClasses[size]
              )}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="max-w-[250px] text-sm"
          side={position.includes("top") ? "bottom" : "top"}
          align={position.includes("left") ? "start" : "end"}
        >
          {displayContent}
        </PopoverContent>
      </Popover>
    </div>
  );
}

/**
 * Wrapper component that adds a hotspot to any element
 * Uses forwardRef to work correctly with Radix UI components
 */
interface WithHotspotProps {
  children: React.ReactNode;
  hotspotId: string;
  hotspotContent: string;
  hotspotPosition?: HotspotPosition;
  showOnce?: boolean;
  className?: string;
  /** Onboarding step key - if set, only shows when this step is active */
  onboardingStepKey?: StepKey;
  /** Whether this onboarding step is currently active */
  isOnboardingStepActive?: boolean;
}

export const WithHotspot = forwardRef<HTMLDivElement, WithHotspotProps>(
  (
    {
      children,
      hotspotId,
      hotspotContent,
      hotspotPosition = "top-right",
      showOnce = true,
      className,
      onboardingStepKey,
      isOnboardingStepActive,
    },
    ref
  ) => {
    return (
      <div ref={ref} className={cn("relative", className)}>
        {children}
        <Hotspot
          id={hotspotId}
          position={hotspotPosition}
          content={hotspotContent}
          showOnce={showOnce}
          onboardingStepKey={onboardingStepKey}
          isOnboardingStepActive={isOnboardingStepActive}
        />
      </div>
    );
  }
);

WithHotspot.displayName = "WithHotspot";

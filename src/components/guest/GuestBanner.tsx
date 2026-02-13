/**
 * GuestBanner Component
 * Shows a banner for guest users indicating local storage mode with login CTA
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Cloud, AlertTriangle, HardDrive } from "lucide-react";
import { useGuestMode } from "@/hooks/useGuestMode";
import { cn } from "@/lib/utils";

interface GuestBannerProps {
  className?: string;
  compact?: boolean;
}

export function GuestBanner({ className, compact = false }: GuestBannerProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { storageUsage, refreshStorageUsage } = useGuestMode();

  // Refresh storage usage on mount
  useEffect(() => {
    refreshStorageUsage();
  }, [refreshStorageUsage]);

  const isNearLimit = storageUsage.percentage >= 80;

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (compact) {
    return (
      <div
        className={cn(
          "bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center justify-between gap-2 text-sm",
          className
        )}
      >
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
          <HardDrive className="h-4 w-4 shrink-0" />
          <span className="truncate">{t('guest.banner', 'Your project is saved locally. Sign in to save permanently.')}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 h-7 text-xs border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900"
          onClick={() => navigate("/auth")}
        >
          {t('guest.bannerAction', 'Sign in')}
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="bg-amber-100 dark:bg-amber-900/50 p-2 rounded-lg shrink-0">
            <HardDrive className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-medium text-amber-900 dark:text-amber-100">
              {t('guest.localStorageTitle', 'Guest Mode')}
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">
              {t('guest.banner', 'Your project is saved locally. Sign in to save permanently.')}
            </p>

            {/* Storage usage indicator */}
            <div className="mt-2 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
              <div className="flex-1 max-w-32 h-1.5 bg-amber-200 dark:bg-amber-800 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    isNearLimit ? "bg-red-500" : "bg-amber-500"
                  )}
                  style={{ width: `${Math.min(storageUsage.percentage, 100)}%` }}
                />
              </div>
              <span>
                {t('guest.storageUsage', '{{used}} of {{limit}} used', {
                  used: formatBytes(storageUsage.used),
                  limit: formatBytes(storageUsage.limit),
                })}
              </span>
            </div>

            {isNearLimit && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{t('guest.limitWarning', 'You\'re approaching the storage limit. Sign in for more space.')}</span>
              </div>
            )}
          </div>
        </div>

        <Button
          onClick={() => navigate("/auth")}
          className="shrink-0 gap-2"
        >
          <Cloud className="h-4 w-4" />
          {t('guest.bannerAction', 'Sign in')}
        </Button>
      </div>
    </div>
  );
}

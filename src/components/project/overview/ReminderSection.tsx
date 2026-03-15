/**
 * ReminderSection — Collapsible section for project reminders and contextual tips.
 *
 * Shows a compact header with reminder count. Expands to show individual
 * reminders (dismissable) and contextual tips. Can be collapsed entirely.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell, ChevronDown, ChevronUp, X, ArrowRight, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TipList } from "@/components/ui/TipCard";
import type { ProjectReminder } from "@/hooks/useProjectReminders";
import type { ContextualTip } from "@/lib/contextualTips";

interface ReminderSectionProps {
  reminders: ProjectReminder[];
  tips: ContextualTip[];
  onDismissReminder: (id: string) => void;
  onDismissAllReminders: () => void;
  onDismissTip: (id: string) => void;
  onAction: (target: string) => void;
}

export function ReminderSection({
  reminders,
  tips,
  onDismissReminder,
  onDismissAllReminders,
  onDismissTip,
  onAction,
}: ReminderSectionProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const totalCount = reminders.length + tips.length;

  if (totalCount === 0) return null;

  const warningCount = reminders.filter(r => r.severity === "warning").length;

  return (
    <div className="rounded-lg border bg-card">
      {/* Header — always visible */}
      <button
        className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-accent/50 transition-colors rounded-lg"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="h-4 w-4 text-muted-foreground" />
            {totalCount > 0 && (
              <span className={`absolute -top-1.5 -right-1.5 h-4 min-w-4 px-0.5 rounded-full text-white text-[10px] font-medium flex items-center justify-center ${warningCount > 0 ? "bg-orange-500" : "bg-blue-500"}`}>
                {totalCount}
              </span>
            )}
          </div>
          <span className="text-sm font-medium">
            {t("reminders.sectionTitle", "Reminders")}
          </span>
          <span className="text-xs text-muted-foreground">
            ({totalCount})
          </span>
        </div>
        <div className="flex items-center gap-1">
          {expanded && reminders.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onDismissAllReminders();
              }}
            >
              {t("reminders.dismissAll", "Clear all")}
            </Button>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Content — collapsible */}
      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {/* Project reminders */}
          {reminders.map((reminder) => (
            <div
              key={reminder.id}
              className={`flex items-start gap-3 rounded-md px-3 py-2.5 text-sm ${
                reminder.severity === "warning"
                  ? "bg-amber-50/50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/40"
                  : "bg-blue-50/50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-800/40"
              }`}
            >
              {reminder.severity === "warning" ? (
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              ) : (
                <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{t(reminder.titleKey)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t(reminder.bodyKey)}</p>
                {reminder.actionKey && reminder.actionTarget && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs mt-1.5"
                    onClick={() => onAction(reminder.actionTarget!)}
                  >
                    {t(reminder.actionKey)}
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => onDismissReminder(reminder.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          {/* Contextual tips (toned down — max 2, compact) */}
          {tips.length > 0 && (
            <TipList tips={tips} onDismiss={onDismissTip} onAction={onAction} maxTips={2} compact />
          )}
        </div>
      )}
    </div>
  );
}

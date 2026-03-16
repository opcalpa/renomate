/**
 * TipCard — Inline contextual tip component.
 *
 * Renders a dismissible card with icon, title, body, optional action button,
 * and optional "Read more" link. Supports both general tips (amber) and
 * next-step tips (blue).
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Lightbulb, X, ExternalLink, ChevronDown, ChevronUp, Rocket, Target, Users, Calendar, PiggyBank, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ContextualTip } from "@/lib/contextualTips";

const ICON_MAP = {
  rocket: Rocket,
  target: Target,
  users: Users,
  calendar: Calendar,
  piggybank: PiggyBank,
  zap: Zap,
} as const;

interface TipCardProps {
  tip: ContextualTip;
  onDismiss?: (tipId: string) => void;
  onAction?: (target: string) => void;
  compact?: boolean;
}

export function TipCard({ tip, onDismiss, onAction, compact = false }: TipCardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(!compact);

  const isNextStep = tip.category === "nextStep";
  const IconComponent = tip.icon && ICON_MAP[tip.icon] ? ICON_MAP[tip.icon] : Lightbulb;

  const borderClass = isNextStep
    ? "border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800/40"
    : "border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800/40";
  const iconClass = isNextStep ? "text-blue-500" : "text-amber-500";

  return (
    <div className={`relative rounded-lg border ${borderClass} px-4 py-3`}>
      <div className="flex items-start gap-3">
        <IconComponent className={`h-4 w-4 ${iconClass} mt-0.5 flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm font-medium text-foreground w-full text-left"
            onClick={() => setExpanded(!expanded)}
          >
            <span>{t(tip.titleKey)}</span>
            {compact && (
              expanded
                ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
          {expanded && (
            <div className="mt-1.5 space-y-2">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t(tip.bodyKey)}
              </p>
              {tip.actionKey && tip.actionTarget && onAction && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onAction(tip.actionTarget!)}
                >
                  {t(tip.actionKey)}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              )}
              {tip.linkUrl && (
                <a
                  href={tip.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  {t(tip.linkKey || "common.readMore", "Read more")}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
        </div>
        {tip.dismissible && onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground flex-shrink-0"
            onClick={() => onDismiss(tip.id)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * TipList — Renders multiple tips stacked vertically.
 * Shows at most `maxTips` tips (default 3) with "show more" toggle.
 */
interface TipListProps {
  tips: ContextualTip[];
  onDismiss?: (tipId: string) => void;
  onAction?: (target: string) => void;
  maxTips?: number;
  compact?: boolean;
}

export function TipList({ tips, onDismiss, onAction, maxTips = 3, compact = false }: TipListProps) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);

  if (tips.length === 0) return null;

  const visible = showAll ? tips : tips.slice(0, maxTips);
  const hasMore = tips.length > maxTips;

  return (
    <div className="space-y-2">
      {visible.map((tip) => (
        <TipCard
          key={tip.id}
          tip={tip}
          onDismiss={onDismiss}
          onAction={onAction}
          compact={compact}
        />
      ))}
      {hasMore && (
        <button
          className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center py-1"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll
            ? t("tips.showLess", "Show less")
            : t("tips.showMore", "Show {{count}} more", { count: tips.length - maxTips })}
        </button>
      )}
    </div>
  );
}

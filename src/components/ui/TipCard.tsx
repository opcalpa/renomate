/**
 * TipCard — Inline contextual tip component.
 *
 * Renders a dismissible card with a lightbulb icon, title, body, and
 * optional "Read more" link. Designed to be placed inline in any view.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Lightbulb, X, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ContextualTip } from "@/lib/contextualTips";

interface TipCardProps {
  tip: ContextualTip;
  onDismiss?: (tipId: string) => void;
  compact?: boolean;
}

export function TipCard({ tip, onDismiss, compact = false }: TipCardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(!compact);

  return (
    <div className="relative rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800/40 px-4 py-3">
      <div className="flex items-start gap-3">
        <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <button
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
 * Shows at most `maxTips` tips (default 2) to avoid clutter.
 */
interface TipListProps {
  tips: ContextualTip[];
  onDismiss?: (tipId: string) => void;
  maxTips?: number;
  compact?: boolean;
}

export function TipList({ tips, onDismiss, maxTips = 2, compact = false }: TipListProps) {
  if (tips.length === 0) return null;

  const visible = tips.slice(0, maxTips);

  return (
    <div className="space-y-2">
      {visible.map((tip) => (
        <TipCard
          key={tip.id}
          tip={tip}
          onDismiss={onDismiss}
          compact={compact}
        />
      ))}
    </div>
  );
}

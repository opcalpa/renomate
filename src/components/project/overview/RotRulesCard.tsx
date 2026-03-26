/**
 * RotRulesCard / RotRulesPopover
 * Read-only transparency view showing how Renomate calculates ROT.
 * RotRulesPopover: small info-icon that opens a popover with rules.
 * RotRulesCard: standalone collapsible (for use in Deklarationsunderlag).
 */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface RotRule {
  year: number;
  maxAmountPerPerson: number;
  subsidyPercent: number;
  combinedRotRutLimit: number;
  validFrom: string | null;
  validUntil: string | null;
  sourceUrl: string | null;
  notes: string | null;
}

function useRotRules() {
  const [rules, setRules] = useState<RotRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRules = async () => {
      const { data } = await supabase
        .from("rot_yearly_limits")
        .select("year, max_amount_per_person, subsidy_percent, combined_rot_rut_limit, valid_from, valid_until, source_url, notes")
        .order("year", { ascending: false });

      if (data) {
        setRules(
          data.map((r) => ({
            year: r.year,
            maxAmountPerPerson: r.max_amount_per_person,
            subsidyPercent: r.subsidy_percent,
            combinedRotRutLimit: r.combined_rot_rut_limit,
            validFrom: r.valid_from,
            validUntil: r.valid_until,
            sourceUrl: r.source_url,
            notes: r.notes,
          }))
        );
      }
      setLoading(false);
    };
    fetchRules();
  }, []);

  return { rules, loading };
}

function groupByYear(rules: RotRule[]) {
  const byYear = new Map<number, RotRule[]>();
  for (const r of rules) {
    const existing = byYear.get(r.year) || [];
    existing.push(r);
    byYear.set(r.year, existing);
  }
  return byYear;
}

const fmt = (n: number) => n.toLocaleString("sv-SE");
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });

// ---------------------------------------------------------------------------
// Shared rules content (used by both popover and collapsible)
// ---------------------------------------------------------------------------

function RotRulesContent({ rules }: { rules: RotRule[] }) {
  const { t } = useTranslation();
  const byYear = groupByYear(rules);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {t("rotRules.intro", "Beräkningarna baseras på Skatteverkets officiella regler.")}
      </p>

      {/* General rules */}
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("rotRules.materialRule", "Material")}</span>
          <span className="font-medium text-destructive">{t("rotRules.notEligible", "Ej ROT-berättigat")}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("rotRules.yearDeterminedBy", "ROT-år bestäms av")}</span>
          <span className="font-medium">{t("rotRules.paymentDate", "Betalningsdatum")}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("rotRules.executorRequirement", "Krav på utförare")}</span>
          <span className="font-medium">{t("rotRules.fTax", "F-skattsedel")}</span>
        </div>
      </div>

      {/* Per-year rules */}
      {Array.from(byYear.entries()).map(([year, yearRules]) => (
        <div key={year} className="space-y-1.5">
          <h4 className="text-xs font-semibold border-t pt-2">{year}</h4>
          {yearRules.map((rule, i) => (
            <div key={`${year}-${i}`} className="space-y-1 text-xs">
              {rule.notes && (
                <p className="text-muted-foreground italic text-[11px]">{rule.notes}</p>
              )}
              {rule.validFrom && rule.validUntil && yearRules.length > 1 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("rotRules.period", "Period")}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {fmtDate(rule.validFrom)} – {fmtDate(rule.validUntil)}
                  </Badge>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("rotRules.subsidyRate", "Subventionsgrad")}</span>
                <span className="font-medium">{rule.subsidyPercent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("rotRules.maxRot", "Max ROT")}</span>
                <span className="font-medium tabular-nums">{fmt(rule.maxAmountPerPerson)} kr/person</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("rotRules.combinedCap", "ROT+RUT tak")}</span>
                <span className="font-medium tabular-nums">{fmt(rule.combinedRotRutLimit)} kr</span>
              </div>
              {rule.sourceUrl && (
                <a
                  href={rule.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                  {t("rotRules.source", "Källa: Skatteverket")}
                </a>
              )}
            </div>
          ))}
        </div>
      ))}

      <p className="text-[10px] text-muted-foreground pt-1.5 border-t">
        {t("rotRules.disclaimer", "Renomate ansvarar inte för eventuella regeländringar. Kontrollera alltid aktuella regler på skatteverket.se.")}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RotRulesPopover — small info-icon next to heading
// ---------------------------------------------------------------------------

export function RotRulesPopover() {
  const { rules, loading } = useRotRules();
  if (loading || rules.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="text-muted-foreground hover:text-foreground transition-colors" title="Så beräknar vi ROT">
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-h-[400px] overflow-y-auto p-4" align="start">
        <RotRulesContent rules={rules} />
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// RotRulesCard — collapsible for standalone use (e.g. Deklarationsunderlag)
// ---------------------------------------------------------------------------

export function RotRulesCard() {
  const { t } = useTranslation();
  const { rules, loading } = useRotRules();
  if (loading || rules.length === 0) return null;

  return (
    <Collapsible>
      <CollapsibleTrigger className="w-full flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {t("rotRules.title", "Så beräknar vi ROT")}
          </span>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 rounded-lg border bg-card p-4">
        <RotRulesContent rules={rules} />
      </CollapsibleContent>
    </Collapsible>
  );
}

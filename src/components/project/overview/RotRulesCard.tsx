/**
 * RotRulesCard
 * Read-only transparency view showing how Renomate calculates ROT.
 * Fetches rot_yearly_limits from DB and displays rules with source URLs.
 * Users can verify our calculations against Skatteverket's official rules.
 */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Shield, ExternalLink, ChevronDown, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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

export function RotRulesCard() {
  const { t } = useTranslation();
  const [rules, setRules] = useState<RotRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
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
    fetch();
  }, []);

  if (loading) return null;

  // Group by year
  const byYear = new Map<number, RotRule[]>();
  for (const r of rules) {
    const existing = byYear.get(r.year) || [];
    existing.push(r);
    byYear.set(r.year, existing);
  }

  const fmt = (n: number) => n.toLocaleString("sv-SE");
  const fmtDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
  };

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

      <CollapsibleContent className="mt-2 rounded-lg border bg-card p-4 space-y-4">
        <p className="text-xs text-muted-foreground">
          {t("rotRules.intro", "Beräkningarna baseras på Skatteverkets officiella regler. Nedan ser du exakt vilka parametrar vi använder.")}
        </p>

        {/* General rules */}
        <div className="rounded-lg bg-muted/30 p-3 space-y-1.5 text-xs">
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
          <div key={year} className="space-y-2">
            <h4 className="text-sm font-semibold">{year}</h4>
            {yearRules.map((rule, i) => (
              <div key={`${year}-${i}`} className="rounded-lg bg-muted/30 p-3 space-y-1.5 text-xs">
                {rule.notes && (
                  <p className="text-muted-foreground italic mb-1">{rule.notes}</p>
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
                  <span className="text-muted-foreground">{t("rotRules.maxRot", "Max ROT per person")}</span>
                  <span className="font-medium tabular-nums">{fmt(rule.maxAmountPerPerson)} kr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("rotRules.combinedCap", "Gemensamt tak ROT+RUT")}</span>
                  <span className="font-medium tabular-nums">{fmt(rule.combinedRotRutLimit)} kr</span>
                </div>
                {rule.sourceUrl && (
                  <a
                    href={rule.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline mt-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {t("rotRules.source", "Källa: Skatteverket")}
                  </a>
                )}
              </div>
            ))}
          </div>
        ))}

        <p className="text-[10px] text-muted-foreground pt-2 border-t">
          {t("rotRules.disclaimer", "Renomate ansvarar inte för eventuella regeländringar. Kontrollera alltid aktuella regler på skatteverket.se.")}
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}

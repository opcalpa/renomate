/**
 * ROT Summary Card
 * Shows yearly ROT deduction breakdown per person with progress bars.
 * Data sourced from tasks.rot_amount (planned) and materials.rot_amount + paid_date (actual).
 */

import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Shield, AlertTriangle, Users, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface RotPerson {
  id: string;
  name: string;
  personnummerLast4: string | null;
  customYearlyLimit: number | null;
  isProfileLinked: boolean;
}

interface YearlyRotData {
  year: number;
  limit: number;
  planned: number; // from tasks.rot_amount
  actual: number; // from materials.rot_amount with paid_date in this year
}

interface RotSummaryCardProps {
  projectId: string;
}

function formatCurrency(amount: number): string {
  return Math.round(amount).toLocaleString("sv-SE");
}

export function RotSummaryCard({ projectId }: RotSummaryCardProps) {
  const { t } = useTranslation();
  const [persons, setPersons] = useState<RotPerson[]>([]);
  const [yearlyLimits, setYearlyLimits] = useState<Map<number, number>>(new Map());
  const [plannedRot, setPlannedRot] = useState(0);
  const [actualRotByYear, setActualRotByYear] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const [personsRes, limitsRes, tasksRes, materialsRes] = await Promise.all([
        // ROT persons for this project
        supabase
          .from("project_rot_persons")
          .select("id, name, personnummer, custom_yearly_limit, profile_id")
          .eq("project_id", projectId),
        // System ROT limits
        supabase
          .from("rot_yearly_limits")
          .select("year, max_amount_per_person"),
        // Planned ROT from tasks
        supabase
          .from("tasks")
          .select("rot_amount")
          .eq("project_id", projectId)
          .eq("rot_eligible", true),
        // Actual ROT from paid materials/invoices
        supabase
          .from("materials")
          .select("rot_amount, paid_date")
          .eq("project_id", projectId)
          .not("rot_amount", "is", null)
          .not("paid_date", "is", null),
      ]);

      // Process persons
      if (personsRes.data) {
        setPersons(
          personsRes.data.map((p) => ({
            id: p.id,
            name: p.name,
            personnummerLast4: p.personnummer ? p.personnummer.slice(-4) : null,
            customYearlyLimit: p.custom_yearly_limit,
            isProfileLinked: !!p.profile_id,
          }))
        );
      }

      // Process yearly limits
      if (limitsRes.data) {
        const map = new Map<number, number>();
        for (const l of limitsRes.data) {
          map.set(l.year, l.max_amount_per_person);
        }
        setYearlyLimits(map);
      }

      // Sum planned ROT
      if (tasksRes.data) {
        const total = tasksRes.data.reduce((sum, t) => sum + (t.rot_amount || 0), 0);
        setPlannedRot(total);
      }

      // Actual ROT grouped by year (from paid_date)
      if (materialsRes.data) {
        const byYear = new Map<number, number>();
        for (const m of materialsRes.data) {
          if (!m.paid_date || !m.rot_amount) continue;
          const year = new Date(m.paid_date).getFullYear();
          byYear.set(year, (byYear.get(year) || 0) + m.rot_amount);
        }
        setActualRotByYear(byYear);
      }

      setLoading(false);
    };

    fetchData();
  }, [projectId]);

  // Build yearly breakdown
  const currentYear = new Date().getFullYear();
  const personCount = Math.max(persons.length, 1);

  const yearlyData = useMemo((): YearlyRotData[] => {
    const years = new Set<number>();
    years.add(currentYear);
    for (const [year] of actualRotByYear) years.add(year);

    return Array.from(years)
      .sort()
      .map((year) => {
        const defaultLimit = yearlyLimits.get(year) || 50000;
        // Use custom limit if any person has one, else system default × person count
        const totalLimit = persons.reduce((sum, p) => {
          return sum + (p.customYearlyLimit ?? defaultLimit);
        }, 0) || defaultLimit * personCount;

        return {
          year,
          limit: totalLimit,
          planned: year === currentYear ? plannedRot : 0,
          actual: actualRotByYear.get(year) || 0,
        };
      });
  }, [currentYear, yearlyLimits, persons, personCount, plannedRot, actualRotByYear]);

  const totalPlanned = plannedRot;
  const totalActual = Array.from(actualRotByYear.values()).reduce((s, v) => s + v, 0);

  if (loading) return null;
  if (totalPlanned === 0 && totalActual === 0 && persons.length === 0) return null;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4 text-green-600" />
          {t("rot.summary", "ROT-avdrag")}
        </h3>
        {persons.length > 0 && (
          <Badge variant="secondary" className="text-xs gap-1">
            <Users className="h-3 w-3" />
            {persons.length} {persons.length === 1
              ? t("rot.person", "person")
              : t("rot.persons", "personer")}
          </Badge>
        )}
      </div>

      {/* Per-person list */}
      {persons.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {persons.map((p) => (
            <span key={p.id} className="text-xs text-muted-foreground">
              {p.name}
              {p.personnummerLast4 && (
                <span className="ml-1 text-[10px] opacity-60">
                  (****-{p.personnummerLast4})
                </span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Yearly breakdown */}
      {yearlyData.map((yd) => {
        const used = yd.actual || yd.planned;
        const ratio = yd.limit > 0 ? used / yd.limit : 0;
        const isOver = ratio > 1;
        const barColor = isOver
          ? "bg-destructive"
          : ratio > 0.8
          ? "bg-amber-500"
          : "bg-green-500";

        return (
          <div key={yd.year} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{yd.year}</span>
              <span className="tabular-nums">
                <span className={isOver ? "text-destructive font-medium" : "text-green-700 font-medium"}>
                  {formatCurrency(used)}
                </span>
                <span className="text-muted-foreground"> / {formatCurrency(yd.limit)} kr</span>
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${Math.min(ratio * 100, 100)}%` }}
              />
            </div>
            {isOver && (
              <div className="flex items-center gap-1 text-xs text-destructive">
                <AlertTriangle className="h-3 w-3" />
                {t("rot.overLimit", "Överstiger ROT-tak med {{amount}} kr", {
                  amount: formatCurrency(used - yd.limit),
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Totals */}
      {totalPlanned > 0 && totalActual === 0 && (
        <div className="flex justify-between text-xs pt-1 border-t">
          <span className="text-muted-foreground">{t("rot.plannedTotal", "Planerat ROT-avdrag")}</span>
          <span className="font-medium text-green-700 tabular-nums">{formatCurrency(totalPlanned)} kr</span>
        </div>
      )}
      {totalActual > 0 && (
        <div className="flex justify-between text-xs pt-1 border-t">
          <span className="text-muted-foreground">{t("rot.actualTotal", "Faktiskt ROT-avdrag")}</span>
          <span className="font-medium text-green-700 tabular-nums">{formatCurrency(totalActual)} kr</span>
        </div>
      )}
    </div>
  );
}

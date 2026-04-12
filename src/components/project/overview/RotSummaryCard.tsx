/**
 * ROT Summary Card
 * Shows yearly ROT deduction breakdown per person with progress bars.
 * Manage ROT persons (add/remove). Auto-adds project owner if none exist.
 * Data sourced from tasks.rot_amount (planned) and materials.rot_amount + paid_date (actual).
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { formatCurrency as fc } from "@/lib/currency";
import { Shield, AlertTriangle, Users, Plus, X, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RotRulesPopover } from "./RotRulesCard";

interface RotPerson {
  id: string;
  name: string;
  personnummer: string | null;
  personnummerLast4: string | null;
  customYearlyLimit: number | null;
  isProfileLinked: boolean;
}

interface YearlyRotData {
  year: number;
  limit: number;
  planned: number;
  actual: number;
}

interface RotSummaryCardProps {
  projectId: string;
  embedded?: boolean;
}

function maskPnr(pnr: string): string {
  if (pnr.length <= 4) return pnr;
  return "****-" + pnr.slice(-4);
}

export function RotSummaryCard({ projectId, embedded = false }: RotSummaryCardProps) {
  const { t } = useTranslation();
  const [persons, setPersons] = useState<RotPerson[]>([]);
  const [yearlyLimits, setYearlyLimits] = useState<Map<number, number>>(new Map());
  const [plannedRot, setPlannedRot] = useState(0);
  const [actualRotByYear, setActualRotByYear] = useState<Map<number, number>>(new Map());
  /** Per-person actual ROT: Map<personId, Map<year, amount>> */
  const [perPersonRot, setPerPersonRot] = useState<Map<string, Map<number, number>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPnr, setNewPnr] = useState("");
  const [adding, setAdding] = useState(false);
  const [rotTasksMissingInvoice, setRotTasksMissingInvoice] = useState(0);
  const [fetchVersion, setFetchVersion] = useState(0);

  const refetch = useCallback(() => setFetchVersion((v) => v + 1), []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const [personsRes, limitsRes, tasksRes, materialsRes] = await Promise.all([
        supabase
          .from("project_rot_persons")
          .select("id, name, personnummer, custom_yearly_limit, profile_id")
          .eq("project_id", projectId),
        supabase
          .from("rot_yearly_limits")
          .select("year, max_amount_per_person"),
        supabase
          .from("tasks")
          .select("id, rot_amount")
          .eq("project_id", projectId)
          .eq("rot_eligible", true),
        supabase
          .from("materials")
          .select("id, rot_amount, paid_date")
          .eq("project_id", projectId)
          .not("rot_amount", "is", null)
          .not("paid_date", "is", null),
      ]);

      // Per-person ROT allocations — fetch after materials to filter by material_id
      const materialIds = (materialsRes.data || []).map((m) => m.id);
      const allocRes = materialIds.length > 0
        ? await supabase
            .from("material_rot_allocations")
            .select("material_id, rot_person_id, amount")
            .in("material_id", materialIds)
        : { data: [] };

      if (personsRes.data) {
        setPersons(
          personsRes.data.map((p) => ({
            id: p.id,
            name: p.name,
            personnummer: p.personnummer,
            personnummerLast4: p.personnummer ? p.personnummer.slice(-4) : null,
            customYearlyLimit: p.custom_yearly_limit,
            isProfileLinked: !!p.profile_id,
          }))
        );
      }

      if (limitsRes.data) {
        const map = new Map<number, number>();
        for (const l of limitsRes.data) map.set(l.year, l.max_amount_per_person);
        setYearlyLimits(map);
      }

      if (tasksRes.data) {
        setPlannedRot(tasksRes.data.reduce((sum, t) => sum + (t.rot_amount || 0), 0));

        // Check which ROT tasks have verified invoices
        const rotTaskIds = tasksRes.data.filter((t) => (t.rot_amount || 0) > 0).map((t) => t.id);
        if (rotTaskIds.length > 0) {
          const { data: rotFiles } = await supabase
            .from("task_file_links")
            .select("task_id, file_type")
            .in("task_id", rotTaskIds)
            .in("file_type", ["invoice", "receipt"]);
          const tasksWithInvoice = new Set((rotFiles || []).map((f) => f.task_id));
          setRotTasksMissingInvoice(rotTaskIds.filter((id) => !tasksWithInvoice.has(id)).length);
        } else {
          setRotTasksMissingInvoice(0);
        }
      }

      if (materialsRes.data) {
        const byYear = new Map<number, number>();
        // Build material → paid_year lookup
        const matYearMap = new Map<string, number>();
        for (const m of materialsRes.data) {
          if (!m.paid_date || !m.rot_amount) continue;
          const year = new Date(m.paid_date).getFullYear();
          byYear.set(year, (byYear.get(year) || 0) + m.rot_amount);
          matYearMap.set(m.id, year);
        }
        setActualRotByYear(byYear);

        // Build per-person breakdown from allocations
        if (allocRes.data && allocRes.data.length > 0) {
          const ppMap = new Map<string, Map<number, number>>();
          for (const alloc of allocRes.data) {
            const year = matYearMap.get(alloc.material_id);
            if (!year) continue;
            if (!ppMap.has(alloc.rot_person_id)) ppMap.set(alloc.rot_person_id, new Map());
            const yearMap = ppMap.get(alloc.rot_person_id)!;
            yearMap.set(year, (yearMap.get(year) || 0) + alloc.amount);
          }
          setPerPersonRot(ppMap);
        }
      }

      // Auto-add project owner as ROT person if homeowner with ROT data but no persons
      if (
        (!personsRes.data || personsRes.data.length === 0) &&
        tasksRes.data &&
        tasksRes.data.some((t) => (t.rot_amount || 0) > 0)
      ) {
        // Check if current user is the project owner and a homeowner
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, name, personnummer, onboarding_user_type")
            .eq("user_id", user.id)
            .single();

          if (profile?.onboarding_user_type === "homeowner" && profile.name) {
            // Verify this user is the project owner
            const { data: project } = await supabase
              .from("projects")
              .select("owner_id")
              .eq("id", projectId)
              .single();

            if (project?.owner_id === profile.id) {
              await supabase.from("project_rot_persons").insert({
                project_id: projectId,
                name: profile.name,
                personnummer: profile.personnummer || null,
                profile_id: profile.id,
              });
              // Re-fetch to show the new person
              const { data: refreshed } = await supabase
                .from("project_rot_persons")
                .select("id, name, personnummer, custom_yearly_limit, profile_id")
                .eq("project_id", projectId);
              if (refreshed) {
                setPersons(
                  refreshed.map((p) => ({
                    id: p.id,
                    name: p.name,
                    personnummer: p.personnummer,
                    personnummerLast4: p.personnummer ? p.personnummer.slice(-4) : null,
                    customYearlyLimit: p.custom_yearly_limit,
                    isProfileLinked: !!p.profile_id,
                  }))
                );
              }
            }
          }
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [projectId, fetchVersion]);

  // --- Add person ---
  const handleAddPerson = async () => {
    if (!newName.trim()) return;
    setAdding(true);

    const { error } = await supabase.from("project_rot_persons").insert({
      project_id: projectId,
      name: newName.trim(),
      personnummer: newPnr.trim() || null,
    });

    if (error) {
      console.error("Error adding ROT person:", error);
      toast.error(t("rot.addError", "Kunde inte lägga till ROT-person"));
    } else {
      setNewName("");
      setNewPnr("");
      setShowAddForm(false);
      refetch();
    }
    setAdding(false);
  };

  // --- Remove person ---
  const handleRemovePerson = async (personId: string) => {
    const { error } = await supabase
      .from("project_rot_persons")
      .delete()
      .eq("id", personId);

    if (error) {
      console.error("Error removing ROT person:", error);
    } else {
      refetch();
    }
  };

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
        const totalLimit = persons.length > 0
          ? persons.reduce((sum, p) => sum + (p.customYearlyLimit ?? defaultLimit), 0)
          : defaultLimit * personCount;

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
    <div className={embedded ? "space-y-3" : "rounded-lg border bg-card p-4 space-y-3"}>
      {/* Header — hidden when embedded in parent section */}
      {!embedded && <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4 text-green-600" />
          {t("rot.summary", "ROT-avdrag")}
          <RotRulesPopover />
        </h3>
        <div className="flex items-center gap-2">
          {persons.length > 0 && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Users className="h-3 w-3" />
              {persons.length} {persons.length === 1
                ? t("rot.person", "person")
                : t("rot.persons", "personer")}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <UserPlus className="h-3 w-3" />
            {t("rot.addPerson", "Lägg till")}
          </Button>
        </div>
      </div>}

      {/* Person management — always shown, even embedded */}
      {embedded && (
        <div className="flex items-center justify-end gap-2">
          {persons.length > 0 && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Users className="h-3 w-3" />
              {persons.length} {persons.length === 1 ? t("rot.person", "person") : t("rot.persons", "personer")}
            </Badge>
          )}
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setShowAddForm(!showAddForm)}>
            <UserPlus className="h-3 w-3" />
            {t("rot.addPerson", "Lägg till")}
          </Button>
        </div>
      )}

      {/* Add person form */}
      {showAddForm && (
        <div className="flex flex-col sm:flex-row gap-2 p-3 rounded-lg bg-muted/50 border">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t("rot.namePlaceholder", "Namn")}
            className="h-8 text-sm flex-1"
            autoFocus
          />
          <Input
            value={newPnr}
            onChange={(e) => setNewPnr(e.target.value)}
            placeholder={t("rot.pnrPlaceholder", "Personnummer (valfritt)")}
            className="h-8 text-sm flex-1"
          />
          <div className="flex gap-1">
            <Button
              size="sm"
              className="h-8"
              onClick={handleAddPerson}
              disabled={!newName.trim() || adding}
            >
              <Plus className="h-3 w-3 mr-1" />
              {t("common.add", "Lägg till")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8"
              onClick={() => { setShowAddForm(false); setNewName(""); setNewPnr(""); }}
            >
              {t("common.cancel", "Avbryt")}
            </Button>
          </div>
        </div>
      )}

      {/* Per-person list with remove */}
      {persons.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {persons.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1 text-xs bg-muted/50 px-2 py-0.5 rounded-full"
            >
              {p.name}
              {p.personnummerLast4 && (
                <span className="text-[10px] opacity-60">
                  ({maskPnr(p.personnummer || p.personnummerLast4)})
                </span>
              )}
              <button
                type="button"
                onClick={() => handleRemovePerson(p.id)}
                className="ml-0.5 hover:text-destructive opacity-40 hover:opacity-100 transition-opacity"
                title={t("common.remove", "Ta bort")}
              >
                <X className="h-3 w-3" />
              </button>
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
                  {fc(used, "SEK")}
                </span>
                <span className="text-muted-foreground"> / {fc(yd.limit, "SEK")}</span>
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
                  amount: fc(used - yd.limit, "SEK"),
                })}
              </div>
            )}
            {/* Per-person breakdown for this year */}
            {perPersonRot.size > 0 && persons.length > 1 && (
              <div className="space-y-0.5 pl-1">
                {persons.map((p) => {
                  const personYearMap = perPersonRot.get(p.id);
                  const personUsed = personYearMap?.get(yd.year) || 0;
                  if (personUsed === 0) return null;
                  const defaultLimit = yearlyLimits.get(yd.year) || 50000;
                  const personLimit = p.customYearlyLimit ?? defaultLimit;
                  return (
                    <div key={p.id} className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{p.name}</span>
                      <span className="tabular-nums">
                        {fc(personUsed, "SEK")} / {fc(personLimit, "SEK")}
                      </span>
                    </div>
                  );
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
          <span className="font-medium text-green-700 tabular-nums">{fc(totalPlanned, "SEK")}</span>
        </div>
      )}
      {totalActual > 0 && (
        <div className="flex justify-between text-xs pt-1 border-t">
          <span className="text-muted-foreground">{t("rot.actualTotal", "Faktiskt ROT-avdrag")}</span>
          <span className="font-medium text-green-700 tabular-nums">{fc(totalActual, "SEK")}</span>
        </div>
      )}

      {rotTasksMissingInvoice > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 rounded-md px-2 py-1.5 mt-2">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          {t("rot.missingInvoices", "{{count}} ROT-uppgift(er) saknar verifierad faktura", { count: rotTasksMissingInvoice })}
        </div>
      )}

    </div>
  );
}

/**
 * Skatteöversikt — cross-project tax overview.
 * ROT progress per year + expandable property cards for förbättringsutgifter.
 */

import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/currency";
import {
  Shield,
  Building2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  Receipt,
  FileCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getEvidenceColor } from "@/lib/evidenceStatus";
import { cn } from "@/lib/utils";

// --- Interfaces ---

interface Props {
  projects: { id: string; name: string }[];
  currency?: string | null;
}

interface ProjectMeta {
  id: string;
  name: string;
  address: string | null;
  property_designation: string | null;
}

interface FuProperty {
  key: string;
  address: string;
  qualifyingNet: number;
  totalYears: number;
  qualifyingYears: number;
  yearDetails: { year: number; net: number; qualifies: boolean }[];
  projectIds: string[];
}

// --- Component ---

export function HomeownerYearlyAnalysis({ projects, currency }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<{ id: string; project_id: string; total_amount: number; total_rot_deduction: number; paid_at: string | null; status: string }[]>([]);
  const [materials, setMaterials] = useState<{ id: string; project_id: string; price_total: number; rot_amount: number | null; paid_date: string | null; created_at: string }[]>([]);
  const [fileLinks, setFileLinks] = useState<{ id: string; project_id: string; file_type: string; invoice_date: string | null; invoice_amount: number | null; rot_amount: number | null; task_id: string | null; material_id: string | null }[]>([]);
  const [projectMeta, setProjectMeta] = useState<ProjectMeta[]>([]);
  const [rotPersons, setRotPersons] = useState<{ id: string; project_id: string; name: string; personnummer: string | null; custom_yearly_limit: number | null }[]>([]);
  const [rotYearlyLimits, setRotYearlyLimits] = useState<Map<number, number>>(new Map());
  const [rotAllocations, setRotAllocations] = useState<{ material_id: string; rot_person_id: string; amount: number }[]>([]);

  const [expanded, setExpanded] = useState(false);
  const [expandedRotYears, setExpandedRotYears] = useState<Set<number>>(new Set());
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());

  const projectIds = useMemo(() => projects.map((p) => p.id), [projects]);
  const fc = (v: number) => formatCurrency(v, currency);

  const toggleRotYear = (year: number) => {
    setExpandedRotYears((prev) => {
      const next = new Set(prev);
      next.has(year) ? next.delete(year) : next.add(year);
      return next;
    });
  };

  const toggleProperty = (key: string) => {
    setExpandedProperties((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // --- Data fetching ---
  useEffect(() => {
    if (projectIds.length === 0) { setLoading(false); return; }

    const fetchAll = async () => {
      try {
        const [invRes, matRes, filesRes, metaRes, personsRes, limitsRes] = await Promise.all([
          supabase.from("invoices").select("id, project_id, total_amount, total_rot_deduction, paid_at, status").in("project_id", projectIds).neq("status", "cancelled").neq("status", "draft"),
          supabase.from("materials").select("id, project_id, price_total, rot_amount, paid_date, created_at").in("project_id", projectIds).is("task_id", null),
          supabase.from("task_file_links").select("id, project_id, file_type, invoice_date, invoice_amount, rot_amount, task_id, material_id").in("project_id", projectIds),
          supabase.from("projects").select("id, name, address, property_designation").in("id", projectIds),
          supabase.from("project_rot_persons").select("id, project_id, name, personnummer, custom_yearly_limit").in("project_id", projectIds),
          supabase.from("rot_yearly_limits").select("year, max_amount_per_person"),
        ]);

        setInvoices(invRes.data || []);
        setMaterials(matRes.data || []);
        setFileLinks(filesRes.data || []);
        setProjectMeta(metaRes.data || []);
        setRotPersons(personsRes.data || []);

        if (limitsRes.data) {
          const map = new Map<number, number>();
          for (const l of limitsRes.data) map.set(l.year, l.max_amount_per_person);
          setRotYearlyLimits(map);
        }

        const matIds = (matRes.data || []).map((m) => m.id);
        if (matIds.length > 0) {
          const { data: allocs } = await supabase.from("material_rot_allocations").select("material_id, rot_person_id, amount").in("material_id", matIds);
          setRotAllocations(allocs || []);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [projectIds]);

  // --- File evidence ---
  const entityHasFile = useMemo(() => {
    const set = new Set<string>();
    fileLinks.forEach((f) => {
      if (f.file_type === "invoice" || f.file_type === "receipt") {
        if (f.material_id) set.add(`material-${f.material_id}`);
        set.add(`project-${f.project_id}`);
      }
    });
    return set;
  }, [fileLinks]);

  // --- Years ---
  const years = useMemo(() => {
    const s = new Set<number>();
    invoices.forEach((i) => { if (i.paid_at) s.add(new Date(i.paid_at).getFullYear()); });
    materials.forEach((m) => { const d = m.paid_date || m.created_at; if (d) s.add(new Date(d).getFullYear()); });
    fileLinks.forEach((f) => { if (f.invoice_date) s.add(new Date(f.invoice_date).getFullYear()); });
    return [...s].sort((a, b) => b - a);
  }, [invoices, materials, fileLinks]);

  // --- ROT per year with per-project breakdown ---
  const rotByYear = useMemo(() => {
    const map = new Map<number, { total: number; byProject: Map<string, number> }>();
    const add = (y: number, pid: string, v: number) => {
      if (!map.has(y)) map.set(y, { total: 0, byProject: new Map() });
      const entry = map.get(y)!;
      entry.total += v;
      entry.byProject.set(pid, (entry.byProject.get(pid) || 0) + v);
    };
    materials.forEach((m) => { if (m.rot_amount && m.paid_date) add(new Date(m.paid_date).getFullYear(), m.project_id, m.rot_amount); });
    invoices.forEach((inv) => { if (inv.total_rot_deduction && inv.paid_at) add(new Date(inv.paid_at).getFullYear(), inv.project_id, inv.total_rot_deduction); });
    fileLinks.forEach((fl) => { if (fl.rot_amount && fl.invoice_date && !fl.task_id && !fl.material_id) add(new Date(fl.invoice_date).getFullYear(), fl.project_id, fl.rot_amount); });
    return map;
  }, [materials, invoices, fileLinks]);

  // --- ROT persons ---
  const uniquePersons = useMemo(() => {
    const seen = new Map<string, { name: string; customLimit: number | null }>();
    rotPersons.forEach((p) => {
      const key = p.personnummer || p.name;
      if (!seen.has(key)) seen.set(key, { name: p.name, customLimit: p.custom_yearly_limit });
    });
    return seen;
  }, [rotPersons]);

  const personCount = Math.max(uniquePersons.size, 1);

  // --- Förbättringsutgifter per property (with year details) ---
  const fuByProperty = useMemo((): FuProperty[] => {
    const map = new Map<string, { address: string; projects: Set<string>; netByYear: Map<number, number> }>();

    const getKey = (pid: string) => {
      const meta = projectMeta.find((p) => p.id === pid);
      return meta?.property_designation || meta?.address || meta?.name || pid;
    };
    const getAddress = (pid: string) => {
      const meta = projectMeta.find((p) => p.id === pid);
      return meta?.address || meta?.name || pid;
    };

    const add = (pid: string, year: number, net: number) => {
      const key = getKey(pid);
      if (!map.has(key)) map.set(key, { address: getAddress(pid), projects: new Set(), netByYear: new Map() });
      const entry = map.get(key)!;
      entry.projects.add(pid);
      entry.netByYear.set(year, (entry.netByYear.get(year) || 0) + net);
    };

    invoices.forEach((inv) => {
      if (!inv.paid_at) return;
      add(inv.project_id, new Date(inv.paid_at).getFullYear(), (inv.total_amount || 0) - (inv.total_rot_deduction || 0));
    });
    materials.forEach((mat) => {
      const d = mat.paid_date || mat.created_at;
      if (!d) return;
      add(mat.project_id, new Date(d).getFullYear(), mat.price_total || 0);
    });
    // Only count orphan file links (not linked to a task/material already counted above)
    fileLinks.forEach((fl) => {
      if (!fl.invoice_date || (!fl.invoice_amount && !fl.rot_amount)) return;
      if (fl.task_id || fl.material_id) return;
      add(fl.project_id, new Date(fl.invoice_date).getFullYear(), (fl.invoice_amount || 0) - (fl.rot_amount || 0));
    });

    const result: FuProperty[] = [];
    map.forEach((entry, key) => {
      const yearDetails = [...entry.netByYear.entries()]
        .map(([year, net]) => ({ year, net, qualifies: net >= 5000 }))
        .sort((a, b) => b.year - a.year);
      const qualifyingYears = yearDetails.filter((y) => y.qualifies).length;
      const qualifyingNet = yearDetails.filter((y) => y.qualifies).reduce((s, y) => s + y.net, 0);
      result.push({ key, address: entry.address, qualifyingNet, totalYears: yearDetails.length, qualifyingYears, yearDetails, projectIds: [...entry.projects] });
    });
    return result.filter((r) => r.totalYears > 0).sort((a, b) => b.qualifyingNet - a.qualifyingNet);
  }, [invoices, materials, fileLinks, projectMeta]);

  const fuTotal = fuByProperty.reduce((s, p) => s + p.qualifyingNet, 0);
  const totalRot = useMemo(() => [...rotByYear.values()].reduce((s, v) => s + v.total, 0), [rotByYear]);

  // --- Evidence ---
  const evidenceSummary = useMemo(() => {
    const invWithDocs = invoices.filter((inv) => entityHasFile.has(`project-${inv.project_id}`)).length;
    const matWithDocs = materials.filter((mat) => entityHasFile.has(`material-${mat.id}`)).length;
    return { verified: invWithDocs + matWithDocs, total: invoices.length + materials.length };
  }, [invoices, materials, entityHasFile]);

  // --- Totals (avoid double-counting file_links that overlap invoices/materials) ---
  const totalAmount = useMemo(() => {
    const invTotal = invoices.reduce((s, i) => s + (i.total_amount || 0), 0);
    const matTotal = materials.reduce((s, m) => s + (m.price_total || 0), 0);
    // Only count file_links that aren't already represented by an invoice or material
    const linkedEntityIds = new Set([
      ...invoices.map((i) => i.id),
      ...materials.map((m) => m.id),
    ]);
    const flTotal = fileLinks
      .filter((f) => f.invoice_amount && !f.task_id && !f.material_id)
      .reduce((s, f) => s + (f.invoice_amount || 0), 0);
    return invTotal + matTotal + flTotal;
  }, [invoices, materials, fileLinks]);

  if (loading || (invoices.length === 0 && materials.length === 0)) return null;

  const rotYears = years.filter((y) => rotByYear.has(y) && (rotByYear.get(y) || 0) > 0);
  const hasRot = rotYears.length > 0;

  return (
    <div className="space-y-4">
      {/* ══════ Header ══════ */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full border rounded-xl bg-card p-4 sm:p-5 flex items-center justify-between hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center">
            <Shield className="h-4.5 w-4.5 text-indigo-600" />
          </div>
          <div className="text-left">
            <span className="text-sm font-semibold block">{t("analysis.globalTitle", "Skatteöversikt")}</span>
            <span className="text-xs text-muted-foreground">
              {projects.length} {t("analysis.projectCount", "projekt")}
              {evidenceSummary.total > 0 && (
                <> · <span className={`inline-block h-1.5 w-1.5 rounded-full align-middle mr-0.5 ${getEvidenceColor(evidenceSummary.verified === evidenceSummary.total ? "verified" : "registered")}`} /> {evidenceSummary.verified}/{evidenceSummary.total} {t("evidence.summaryLabel", "verifierade")}</>
              )}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!expanded && (
            <>
              {totalRot > 0 && (
                <Badge className="bg-green-100 text-green-700 border-green-200 hidden sm:flex">
                  ROT &minus;{fc(totalRot)}
                </Badge>
              )}
              <span className="text-sm font-medium tabular-nums">{fc(totalAmount)}</span>
            </>
          )}
          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="space-y-3">
          {/* ══════ Stat cards row ══════ */}
          <div className={cn("grid gap-3", hasRot ? "grid-cols-2" : "grid-cols-1")}>
            {/* Total cost */}
            <div className="border rounded-xl p-4 bg-card">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <Receipt className="h-3.5 w-3.5" />
                <span className="text-[11px] font-medium uppercase tracking-wide">{t("analysis.totalSpent", "Totalt spenderat")}</span>
              </div>
              <span className="text-lg sm:text-xl font-bold tabular-nums">{fc(totalAmount)}</span>
            </div>

            {/* ROT total */}
            {hasRot && (
              <div className="border rounded-xl p-4 bg-card">
                <div className="flex items-center gap-1.5 text-green-600 mb-1">
                  <Shield className="h-3.5 w-3.5" />
                  <span className="text-[11px] font-medium uppercase tracking-wide">{t("rot.summary", "ROT-avdrag")}</span>
                </div>
                <span className="text-lg sm:text-xl font-bold tabular-nums text-green-700">&minus;{fc(totalRot)}</span>
              </div>
            )}
          </div>

          {/* ══════ ROT per year ══════ */}
          {hasRot && (
            <div className="border rounded-xl bg-card overflow-hidden">
              <div className="px-4 py-3 border-b bg-green-50/50 dark:bg-green-950/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    {t("rot.summary", "ROT-avdrag")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {personCount} {personCount === 1 ? t("rot.person") : t("rot.persons")}
                  </span>
                </div>
              </div>
              <div className="divide-y">
                {rotYears.map((year) => {
                  const data = rotByYear.get(year)!;
                  const actual = data.total;
                  const defaultLimit = rotYearlyLimits.get(year) || 50000;
                  const totalLimit = [...uniquePersons.values()].reduce((s, p) => s + (p.customLimit ?? defaultLimit), 0) || defaultLimit;
                  const pct = Math.min((actual / totalLimit) * 100, 100);
                  const isOver = actual > totalLimit;
                  const isYearOpen = expandedRotYears.has(year);
                  const projectBreakdown = [...data.byProject.entries()].sort((a, b) => b[1] - a[1]);

                  return (
                    <div key={year}>
                      <button
                        type="button"
                        onClick={() => toggleRotYear(year)}
                        className="w-full px-4 py-3 space-y-1.5 hover:bg-muted/30 transition-colors text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {isYearOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                            <span className="text-sm font-medium">{year}</span>
                          </div>
                          <div className="text-right">
                            <span className={cn("text-sm font-semibold tabular-nums", isOver ? "text-destructive" : "text-green-700")}>
                              {fc(actual)}
                            </span>
                            <span className="text-xs text-muted-foreground ml-1">/ {fc(totalLimit)}</span>
                          </div>
                        </div>
                        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", isOver ? "bg-destructive" : pct > 80 ? "bg-amber-400" : "bg-green-500")}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        {isOver && (
                          <p className="text-[11px] text-destructive flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {t("rot.overLimit", "Överstiger ROT-tak med {{amount}} kr", { amount: fc(actual - totalLimit) })}
                          </p>
                        )}
                      </button>

                      {/* Expanded: per-project ROT breakdown */}
                      {isYearOpen && projectBreakdown.length > 0 && (
                        <div className="px-4 pb-3 pl-10 space-y-1">
                          {projectBreakdown.map(([pid, amount]) => {
                            const pm = projectMeta.find((p) => p.id === pid);
                            return (
                              <div key={pid} className="flex items-center justify-between text-xs py-1">
                                <button
                                  type="button"
                                  onClick={() => navigate(`/projects/${pid}?tab=budget`)}
                                  className="flex items-center gap-1.5 text-primary hover:underline"
                                >
                                  <ArrowUpRight className="h-3 w-3" />
                                  {pm?.name || pid}
                                </button>
                                <span className="tabular-nums font-medium text-green-700">{fc(amount)}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══════ Förbättringsutgifter per property ══════ */}
          {fuByProperty.length > 0 && (
            <div className="border rounded-xl bg-card overflow-hidden">
              <div className="px-4 py-3 border-b bg-indigo-50/50 dark:bg-indigo-950/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-indigo-600" />
                    {t("analysis.atSale", "Vid försäljning")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("analysis.fuExplanationShort", "Avdrag vid kapitalvinstbeskattning")}
                  </span>
                </div>
              </div>

              <div className="divide-y">
                {fuByProperty.map((prop) => {
                  const isOpen = expandedProperties.has(prop.key);
                  return (
                    <div key={prop.key}>
                      <button
                        type="button"
                        onClick={() => toggleProperty(prop.key)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                          <div className="text-left">
                            <span className="text-sm font-medium">{prop.address}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {prop.qualifyingYears}/{prop.totalYears} {t("analysis.qualifyingYearsShort", "år")}
                            </span>
                          </div>
                        </div>
                        <span className={cn("text-sm font-semibold tabular-nums", prop.qualifyingNet > 0 ? "text-foreground" : "text-muted-foreground")}>
                          {fc(prop.qualifyingNet)}
                        </span>
                      </button>

                      {/* Expanded: year breakdown + project links */}
                      {isOpen && (
                        <div className="px-4 pb-3 pl-10 space-y-1">
                          {prop.yearDetails.map((yd) => (
                            <div key={yd.year} className="flex items-center justify-between text-xs py-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium w-10">{yd.year}</span>
                                {!yd.qualifies && (
                                  <Badge variant="outline" className="text-[10px] h-4 text-amber-600 border-amber-200 bg-amber-50">
                                    &lt; 5 000 kr
                                  </Badge>
                                )}
                              </div>
                              <span className={cn("tabular-nums", yd.qualifies ? "font-medium" : "text-muted-foreground line-through")}>
                                {fc(yd.net)}
                              </span>
                            </div>
                          ))}
                          {/* Project links */}
                          <div className="pt-1.5 border-t mt-1.5 space-y-0.5">
                            {prop.projectIds.map((pid) => {
                              const pm = projectMeta.find((p) => p.id === pid);
                              return (
                                <button
                                  key={pid}
                                  type="button"
                                  onClick={() => navigate(`/projects/${pid}?tab=budget`)}
                                  className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                                >
                                  <ArrowUpRight className="h-3 w-3" />
                                  {pm?.name || pid}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer total */}
              <div className="px-4 py-3 border-t bg-muted/30 flex items-center justify-between">
                <span className="text-sm font-medium">{t("common.total")}</span>
                <span className="text-sm font-bold tabular-nums">{fc(fuTotal)}</span>
              </div>
            </div>
          )}

          {/* Min 5000 kr note */}
          {fuByProperty.length > 0 && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 px-1">
              <FileCheck className="h-3 w-3 shrink-0" />
              {t("analysis.fuExplanation", "Dokumenterade renoveringskostnader som kan dras av från reavinstskatten vid försäljning. Minst 5 000 kr per år krävs.")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Skatteöversikt — compact cross-project tax overview.
 * Two cards: ROT status (per year) + Förbättringsutgifter (at sale).
 * No duplicated tables — links into each project's Budget tab for details.
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
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getEvidenceColor } from "@/lib/evidenceStatus";

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

  const projectIds = useMemo(() => projects.map((p) => p.id), [projects]);
  const fc = (v: number) => formatCurrency(v, currency);

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

        // ROT allocations
        const matIds = (matRes.data || []).map((m) => m.id);
        if (matIds.length > 0) {
          const { data: allocs } = await supabase.from("material_rot_allocations").select("material_id, rot_person_id, amount").in("material_id", matIds);
          setRotAllocations(allocs || []);
        }
      } catch {
        // silent — no data shown
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [projectIds]);

  // --- File evidence map ---
  const entityHasFile = useMemo(() => {
    const set = new Set<string>();
    fileLinks.forEach((f) => {
      if (f.file_type === "invoice" || f.file_type === "receipt") {
        if (f.task_id) set.add(`task-${f.task_id}`);
        if (f.material_id) set.add(`material-${f.material_id}`);
        set.add(`project-${f.project_id}`);
      }
    });
    return set;
  }, [fileLinks]);

  // --- Years with data ---
  const years = useMemo(() => {
    const s = new Set<number>();
    invoices.forEach((i) => { if (i.paid_at) s.add(new Date(i.paid_at).getFullYear()); });
    materials.forEach((m) => {
      const d = m.paid_date || m.created_at;
      if (d) s.add(new Date(d).getFullYear());
    });
    fileLinks.forEach((f) => { if (f.invoice_date) s.add(new Date(f.invoice_date).getFullYear()); });
    return [...s].sort((a, b) => b - a);
  }, [invoices, materials, fileLinks]);

  // --- ROT per year ---
  const rotByYear = useMemo(() => {
    const map = new Map<number, { actual: number; persons: Map<string, number> }>();

    const ensure = (y: number) => {
      if (!map.has(y)) map.set(y, { actual: 0, persons: new Map() });
      return map.get(y)!;
    };

    // From materials
    materials.forEach((m) => {
      if (!m.rot_amount || !m.paid_date) return;
      const y = new Date(m.paid_date).getFullYear();
      ensure(y).actual += m.rot_amount;
    });

    // From invoices
    invoices.forEach((inv) => {
      if (!inv.total_rot_deduction || !inv.paid_at) return;
      const y = new Date(inv.paid_at).getFullYear();
      ensure(y).actual += inv.total_rot_deduction;
    });

    // From file links
    fileLinks.forEach((fl) => {
      if (!fl.rot_amount || !fl.invoice_date) return;
      const y = new Date(fl.invoice_date).getFullYear();
      ensure(y).actual += fl.rot_amount;
    });

    // Per-person allocations
    const matYearMap = new Map<string, number>();
    materials.forEach((m) => {
      if (m.paid_date) matYearMap.set(m.id, new Date(m.paid_date).getFullYear());
    });
    rotAllocations.forEach((a) => {
      const y = matYearMap.get(a.material_id);
      if (!y) return;
      const entry = ensure(y);
      entry.persons.set(a.rot_person_id, (entry.persons.get(a.rot_person_id) || 0) + a.amount);
    });

    return map;
  }, [materials, invoices, fileLinks, rotAllocations]);

  // --- Unique ROT persons (deduplicated by personnummer) ---
  const uniquePersons = useMemo(() => {
    const seen = new Map<string, { name: string; customLimit: number | null }>();
    rotPersons.forEach((p) => {
      const key = p.personnummer || p.name;
      if (!seen.has(key)) seen.set(key, { name: p.name, customLimit: p.custom_yearly_limit });
    });
    return seen;
  }, [rotPersons]);

  const personCount = Math.max(uniquePersons.size, 1);

  // --- Förbättringsutgifter per property ---
  const fuByProperty = useMemo(() => {
    const map = new Map<string, { address: string; projects: Set<string>; netByYear: Map<number, number>; totalNet: number }>();

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
      if (!map.has(key)) map.set(key, { address: getAddress(pid), projects: new Set(), netByYear: new Map(), totalNet: 0 });
      const entry = map.get(key)!;
      entry.projects.add(pid);
      entry.netByYear.set(year, (entry.netByYear.get(year) || 0) + net);
    };

    invoices.forEach((inv) => {
      const d = inv.paid_at;
      if (!d) return;
      const net = (inv.total_amount || 0) - (inv.total_rot_deduction || 0);
      add(inv.project_id, new Date(d).getFullYear(), net);
    });

    materials.forEach((mat) => {
      const d = mat.paid_date || mat.created_at;
      if (!d) return;
      add(mat.project_id, new Date(d).getFullYear(), mat.price_total || 0);
    });

    fileLinks.forEach((fl) => {
      if (!fl.invoice_date || (!fl.invoice_amount && !fl.rot_amount)) return;
      const net = (fl.invoice_amount || 0) - (fl.rot_amount || 0);
      add(fl.project_id, new Date(fl.invoice_date).getFullYear(), net);
    });

    // Compute totals (only qualifying years >= 5000)
    const result: { key: string; address: string; qualifyingNet: number; totalYears: number; qualifyingYears: number }[] = [];
    map.forEach((entry, key) => {
      let qualifyingNet = 0;
      let qualifyingYears = 0;
      entry.netByYear.forEach((net) => {
        if (net >= 5000) { qualifyingNet += net; qualifyingYears++; }
      });
      entry.totalNet = qualifyingNet;
      result.push({ key, address: entry.address, qualifyingNet, totalYears: entry.netByYear.size, qualifyingYears });
    });

    return result.filter((r) => r.totalYears > 0).sort((a, b) => b.qualifyingNet - a.qualifyingNet);
  }, [invoices, materials, fileLinks, projectMeta]);

  const fuTotal = fuByProperty.reduce((s, p) => s + p.qualifyingNet, 0);

  // --- Evidence summary ---
  const evidenceSummary = useMemo(() => {
    const invWithDocs = invoices.filter((inv) => entityHasFile.has(`project-${inv.project_id}`)).length;
    const matWithDocs = materials.filter((mat) => entityHasFile.has(`material-${mat.id}`)).length;
    const total = invoices.length + materials.length;
    const verified = invWithDocs + matWithDocs;
    return { verified, total };
  }, [invoices, materials, entityHasFile]);

  // --- Grand totals ---
  const totalAmount = useMemo(() => {
    const inv = invoices.reduce((s, i) => s + (i.total_amount || 0), 0);
    const mat = materials.reduce((s, m) => s + (m.price_total || 0), 0);
    const fl = fileLinks.filter((f) => f.invoice_amount).reduce((s, f) => s + (f.invoice_amount || 0), 0);
    return inv + mat + fl;
  }, [invoices, materials, fileLinks]);

  const totalRot = useMemo(() => {
    return [...rotByYear.values()].reduce((s, v) => s + v.actual, 0);
  }, [rotByYear]);

  if (loading) return null;
  if (invoices.length === 0 && materials.length === 0) return null;

  return (
    <div className="border rounded-lg bg-card">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-indigo-600" />
          <span className="text-sm font-semibold">
            {t("analysis.globalTitle", "Skatteöversikt")}
          </span>
          <Badge variant="outline" className="text-xs">
            {projects.length} {t("analysis.projectCount", "projekt")}
          </Badge>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <div className="flex items-center gap-3">
            {totalRot > 0 && (
              <span className="text-sm text-green-600 hidden sm:inline">
                ROT &minus;{fc(totalRot)}
              </span>
            )}
            <span className="text-sm text-muted-foreground">{fc(totalAmount)}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </button>

      {expanded && (
        <div className="px-4 sm:px-5 pb-5 space-y-3">

          {/* Evidence summary */}
          {evidenceSummary.total > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${getEvidenceColor(evidenceSummary.verified === evidenceSummary.total ? "verified" : "registered")}`} />
              <span className="text-muted-foreground">
                {evidenceSummary.verified}/{evidenceSummary.total} {t("evidence.summaryLabel", "verifierade")}
              </span>
            </div>
          )}

          {/* === ROT Card === */}
          {totalRot > 0 && (
            <div className="rounded-lg border bg-green-50/50 dark:bg-green-950/20 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">{t("rot.summary", "ROT-avdrag")}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {personCount} {personCount === 1 ? t("rot.person", "person") : t("rot.persons", "personer")}
                </span>
              </div>

              {/* Per-year ROT breakdown */}
              <div className="space-y-2">
                {years.filter((y) => rotByYear.has(y)).map((year) => {
                  const data = rotByYear.get(year)!;
                  const defaultLimit = rotYearlyLimits.get(year) || 50000;
                  const totalLimit = [...uniquePersons.values()].reduce((s, p) => s + (p.customLimit ?? defaultLimit), 0) || defaultLimit;
                  const pct = Math.min((data.actual / totalLimit) * 100, 100);
                  const isOver = data.actual > totalLimit;

                  return (
                    <div key={year} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{year}</span>
                        <span className="tabular-nums">
                          <span className={isOver ? "text-destructive font-medium" : "text-green-700 font-medium"}>
                            {fc(data.actual)}
                          </span>
                          <span className="text-muted-foreground"> / {fc(totalLimit)}</span>
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isOver ? "bg-destructive" : pct > 80 ? "bg-amber-500" : "bg-green-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {isOver && (
                        <p className="text-[11px] text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {t("rot.overLimit", "Överstiger ROT-tak med {{amount}} kr", { amount: fc(data.actual - totalLimit) })}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* === Förbättringsutgifter Card === */}
          {fuByProperty.length > 0 && (
            <div className="rounded-lg border bg-indigo-50/50 dark:bg-indigo-950/20 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-600" />
                <span className="text-sm font-medium">{t("analysis.atSale", "Vid försäljning")}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("analysis.fuExplanation", "Dokumenterade renoveringskostnader som kan dras av från reavinstskatten vid försäljning. Minst 5 000 kr per år krävs.")}
              </p>

              <div className="space-y-2">
                {fuByProperty.map((prop) => (
                  <div key={prop.key} className="flex items-center justify-between text-xs py-1 border-b last:border-0">
                    <div>
                      <span className="font-medium">{prop.address}</span>
                      <span className="text-muted-foreground ml-2">
                        {prop.qualifyingYears}/{prop.totalYears} {t("analysis.qualifyingYearsShort", "år")}
                      </span>
                    </div>
                    <span className="tabular-nums font-medium">{fc(prop.qualifyingNet)}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-sm pt-1 border-t">
                <span className="font-medium">{t("common.total")}</span>
                <span className="tabular-nums font-bold">{fc(fuTotal)}</span>
              </div>
            </div>
          )}

          {/* === Per-project links === */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">{t("analysis.projectDetails", "Detaljer per projekt")}</p>
            {projectMeta.map((pm) => (
              <button
                key={pm.id}
                type="button"
                onClick={() => navigate(`/projects/${pm.id}?tab=budget`)}
                className="flex items-center gap-2 w-full text-left text-xs px-2 py-1.5 rounded-md hover:bg-muted transition-colors group"
              >
                <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
                <span className="group-hover:text-primary">{pm.name}</span>
                {pm.address && <span className="text-muted-foreground">— {pm.address}</span>}
              </button>
            ))}
          </div>

        </div>
      )}
    </div>
  );
}

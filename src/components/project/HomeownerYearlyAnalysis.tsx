import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  ShoppingCart,
  Plus,
  Minus,
  Building2,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// --- Interfaces ---

interface Props {
  projects: { id: string; name: string }[];
  currency?: string | null;
}

interface InvoiceRow {
  id: string;
  project_id: string;
  title: string | null;
  invoice_number: string | null;
  total_amount: number;
  total_rot_deduction: number;
  paid_amount: number;
  status: string;
  is_ata: boolean;
  notes: string | null;
  paid_at: string | null;
  sent_at: string | null;
  created_at: string;
}

interface InvoiceItemRow {
  invoice_id: string;
  description: string;
  total_price: number;
  is_rot_eligible: boolean;
  rot_deduction: number;
  room_id: string | null;
  source_task_id: string | null;
}

interface MaterialRow {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  price_total: number;
  paid_amount: number;
  vendor_name: string | null;
  room_id: string | null;
  created_at: string;
}

interface FileLinkRow {
  project_id: string;
  file_type: string;
  task_id: string | null;
  material_id: string | null;
}

interface ProjectMeta {
  id: string;
  name: string;
  address: string | null;
  property_designation: string | null;
}

// Processed row for individual cost items
interface CostItem {
  id: string;
  type: "invoice" | "material";
  vendor: string;
  description: string;
  date: string | null;
  amount: number;
  laborAmount: number;
  rotDeduction: number;
  netCost: number;
  hasDocuments: boolean;
  notes: string | null;
  isAta: boolean;
}

// Project group with summary + items
interface ProjectGroup {
  projectId: string;
  name: string;
  address: string | null;
  propertyDesignation: string | null;
  totalAmount: number;
  totalLabor: number;
  totalMaterial: number;
  totalRot: number;
  totalNet: number;
  invoiceCount: number;
  materialCount: number;
  hasAllDocs: boolean;
  laborItems: CostItem[];
  materialItems: CostItem[];
}

// --- Component ---

export function HomeownerYearlyAnalysis({ projects, currency }: Props) {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItemRow[]>([]);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [fileLinks, setFileLinks] = useState<FileLinkRow[]>([]);
  const [projectMeta, setProjectMeta] = useState<ProjectMeta[]>([]);

  const [sectionExpanded, setSectionExpanded] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear() - 1);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const projectIds = useMemo(() => projects.map((p) => p.id), [projects]);

  useEffect(() => {
    if (projectIds.length === 0) {
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
      try {
        const [invRes, matRes, filesRes, metaRes] = await Promise.all([
          supabase
            .from("invoices")
            .select("id, project_id, title, invoice_number, total_amount, total_rot_deduction, paid_amount, status, is_ata, notes, paid_at, sent_at, created_at")
            .in("project_id", projectIds)
            .neq("status", "cancelled")
            .neq("status", "draft"),
          supabase
            .from("materials")
            .select("id, project_id, name, description, price_total, paid_amount, vendor_name, room_id, created_at")
            .in("project_id", projectIds)
            .is("task_id", null),
          supabase
            .from("task_file_links")
            .select("project_id, file_type, task_id, material_id")
            .in("project_id", projectIds),
          supabase
            .from("projects")
            .select("id, name, address, property_designation")
            .in("id", projectIds),
        ]);

        const invoicesData = (invRes.data || []) as InvoiceRow[];
        setInvoices(invoicesData);
        setMaterials((matRes.data || []) as MaterialRow[]);
        setFileLinks((filesRes.data || []) as FileLinkRow[]);
        setProjectMeta((metaRes.data || []) as ProjectMeta[]);

        const invoiceIds = invoicesData.map((i) => i.id);
        if (invoiceIds.length > 0) {
          const { data: items } = await supabase
            .from("invoice_items")
            .select("invoice_id, description, total_price, is_rot_eligible, rot_deduction, room_id, source_task_id")
            .in("invoice_id", invoiceIds);
          setInvoiceItems((items || []) as InvoiceItemRow[]);
        }
      } catch (error) {
        console.error("Failed to load yearly analysis:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [projectIds]);

  // --- File link lookup ---

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

  // --- Available years ---

  const years = useMemo(() => {
    const yearSet = new Set<number>();
    invoices.forEach((inv) => {
      const d = inv.sent_at || inv.created_at;
      if (d) yearSet.add(new Date(d).getFullYear());
    });
    materials.forEach((mat) => {
      if (mat.created_at) yearSet.add(new Date(mat.created_at).getFullYear());
    });
    const arr = Array.from(yearSet).sort((a, b) => b - a);
    // Ensure at least previous year is available
    const prevYear = new Date().getFullYear() - 1;
    if (!arr.includes(prevYear)) arr.push(prevYear);
    arr.sort((a, b) => b - a);
    return arr;
  }, [invoices, materials]);

  const activeYear = years.includes(selectedYear) ? selectedYear : years[0] || new Date().getFullYear() - 1;

  // --- Build project groups for active year ---

  const projectGroups = useMemo((): ProjectGroup[] => {
    const metaMap = new Map<string, ProjectMeta>();
    projectMeta.forEach((p) => metaMap.set(p.id, p));

    const invoiceMap = new Map<string, InvoiceItemRow[]>();
    invoiceItems.forEach((item) => {
      const arr = invoiceMap.get(item.invoice_id) || [];
      arr.push(item);
      invoiceMap.set(item.invoice_id, arr);
    });

    const groups = new Map<string, ProjectGroup>();

    const getGroup = (pid: string): ProjectGroup => {
      if (groups.has(pid)) return groups.get(pid)!;
      const meta = metaMap.get(pid);
      const g: ProjectGroup = {
        projectId: pid,
        name: meta?.name || "—",
        address: meta?.address || null,
        propertyDesignation: meta?.property_designation || null,
        totalAmount: 0,
        totalLabor: 0,
        totalMaterial: 0,
        totalRot: 0,
        totalNet: 0,
        invoiceCount: 0,
        materialCount: 0,
        hasAllDocs: true,
        laborItems: [],
        materialItems: [],
      };
      groups.set(pid, g);
      return g;
    };

    // Process invoices
    invoices.forEach((inv) => {
      const invDate = inv.sent_at || inv.created_at;
      if (!invDate || new Date(invDate).getFullYear() !== activeYear) return;

      const g = getGroup(inv.project_id);
      const items = invoiceMap.get(inv.id) || [];
      const laborAmount = items
        .filter((i) => i.is_rot_eligible)
        .reduce((s, i) => s + (i.total_price || 0), 0);
      const amount = inv.total_amount || 0;
      const rot = inv.total_rot_deduction || 0;
      const net = amount - rot;
      const hasDoc = entityHasFile.has(`project-${inv.project_id}`);

      g.invoiceCount++;
      g.totalAmount += amount;
      g.totalLabor += laborAmount;
      g.totalMaterial += Math.max(0, amount - laborAmount);
      g.totalRot += rot;
      g.totalNet += net;
      if (!hasDoc) g.hasAllDocs = false;

      g.laborItems.push({
        id: inv.id,
        type: "invoice",
        vendor: inv.title || inv.invoice_number || t("invoices.untitled", "Faktura"),
        description: items.length > 0 ? items.map((i) => i.description).filter(Boolean).join(", ") : inv.title || "",
        date: invDate,
        amount,
        laborAmount,
        rotDeduction: rot,
        netCost: net,
        hasDocuments: hasDoc,
        notes: inv.notes || null,
        isAta: inv.is_ata,
      });
    });

    // Process materials
    materials.forEach((mat) => {
      if (!mat.created_at || new Date(mat.created_at).getFullYear() !== activeYear) return;

      const g = getGroup(mat.project_id);
      const amount = mat.price_total || 0;
      const hasDoc = entityHasFile.has(`material-${mat.id}`);

      g.materialCount++;
      g.totalAmount += amount;
      g.totalMaterial += amount;
      g.totalNet += amount;
      if (!hasDoc) g.hasAllDocs = false;

      g.materialItems.push({
        id: mat.id,
        type: "material",
        vendor: mat.vendor_name || "—",
        description: mat.name,
        date: mat.created_at,
        amount,
        laborAmount: 0,
        rotDeduction: 0,
        netCost: amount,
        hasDocuments: hasDoc,
        notes: mat.description || null,
        isAta: false,
      });
    });

    // Sort groups by total descending, filter out empty groups
    return Array.from(groups.values())
      .filter((g) => g.invoiceCount > 0 || g.materialCount > 0)
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [invoices, invoiceItems, materials, projectMeta, entityHasFile, activeYear, t]);

  // --- Grand totals ---

  const grandTotal = useMemo(() => {
    return projectGroups.reduce(
      (acc, g) => ({
        amount: acc.amount + g.totalAmount,
        labor: acc.labor + g.totalLabor,
        material: acc.material + g.totalMaterial,
        rot: acc.rot + g.totalRot,
        net: acc.net + g.totalNet,
      }),
      { amount: 0, labor: 0, material: 0, rot: 0, net: 0 },
    );
  }, [projectGroups]);

  // Readiness checks
  const checks = useMemo(() => {
    const relevantProjects = projectMeta.filter((p) =>
      projectGroups.some((g) => g.projectId === p.id),
    );
    const allHaveDesignation = relevantProjects.length > 0 && relevantProjects.every((p) => !!p.property_designation);
    const relevantInvoices = invoices.filter((inv) => {
      const d = inv.sent_at || inv.created_at;
      return d && new Date(d).getFullYear() === activeYear;
    });
    const allPaid = relevantInvoices.length === 0 || relevantInvoices.every((i) => (i.paid_amount || 0) >= (i.total_amount || 0));
    const hasFiles = fileLinks.length > 0;
    return [
      { key: "rot", label: t("analysis.checkRotDetails"), ok: allHaveDesignation },
      { key: "paid", label: t("analysis.checkInvoicesPaid"), ok: allPaid },
      { key: "files", label: t("analysis.checkFilesAttached"), ok: hasFiles },
    ];
  }, [projectMeta, projectGroups, invoices, fileLinks, activeYear, t]);

  // --- Helpers ---

  const fc = (amount: number) => formatCurrency(amount, currency, { decimals: 0 });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try { return format(new Date(dateStr), "yyyy-MM-dd"); } catch { return "—"; }
  };

  const toggleProject = (pid: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      next.has(pid) ? next.delete(pid) : next.add(pid);
      return next;
    });
  };

  // --- Render ---

  if (loading) return null;

  // Check if there's any data at all (across all years)
  const hasAnyData = invoices.length > 0 || materials.length > 0;
  if (!hasAnyData) return null;

  return (
    <div className="border rounded-lg bg-card">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setSectionExpanded(!sectionExpanded)}
        className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-indigo-600" />
          <span className="text-sm font-semibold">
            {t("analysis.globalTitle", "Deklarationsunderlag")}
          </span>
          <Badge variant="outline" className="text-xs">
            {projectGroups.length} {t("analysis.projectCount", "projekt")}
          </Badge>
        </div>
        {sectionExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <div className="flex items-center gap-3">
            {grandTotal.rot > 0 && (
              <span className="text-sm text-green-600 hidden sm:inline">
                ROT &minus;{fc(grandTotal.rot)}
              </span>
            )}
            <span className="text-sm text-muted-foreground">{fc(grandTotal.amount)}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </button>

      {sectionExpanded && (
        <div className="px-4 sm:px-5 pb-5 space-y-4">
          {/* Year selector — prominent */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{t("analysis.taxYear", "Beskattningsår")}:</span>
            </div>
            <div className="flex gap-1 flex-wrap">
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setSelectedYear(y)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    y === activeYear
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          {/* Checklist */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            {checks.map((c) => (
              <div key={c.key} className="flex items-center gap-1.5 text-sm">
                {c.ok ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                )}
                <span className={c.ok ? "text-muted-foreground" : ""}>{c.label}</span>
              </div>
            ))}
          </div>

          <Separator />

          {projectGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t("analysis.noDataForYear", "Inga kostnader registrerade för detta år")}
            </p>
          ) : (
            <>
              {/* Project-grouped table */}
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="px-2 py-2 w-8" />
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                        {t("declaration.colProject", "Projekt")}
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground whitespace-nowrap" style={{ minWidth: "90px" }}>
                        {t("declaration.colLabor", "Arbete")}
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground whitespace-nowrap" style={{ minWidth: "90px" }}>
                        {t("declaration.categoryMaterial", "Material")}
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground whitespace-nowrap" style={{ minWidth: "90px" }}>
                        {t("declaration.colAmount", "Totalt")}
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground whitespace-nowrap" style={{ minWidth: "90px" }}>
                        {t("declaration.colRot", "ROT")}
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground whitespace-nowrap" style={{ minWidth: "100px" }}>
                        {t("declaration.colNetCost", "Netto")}
                      </th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-muted-foreground" style={{ minWidth: "50px" }}>
                        {t("declaration.colDocuments", "Dok")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectGroups.map((group) => {
                      const isOpen = expandedProjects.has(group.projectId);
                      return (
                        <ProjectGroupRows
                          key={group.projectId}
                          group={group}
                          isOpen={isOpen}
                          onToggle={() => toggleProject(group.projectId)}
                          fc={fc}
                          formatDate={formatDate}
                          t={t}
                        />
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/50 border-t font-medium text-sm">
                      <td className="px-2 py-2.5" />
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {t("common.total")}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {grandTotal.labor > 0 ? fc(grandTotal.labor) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {grandTotal.material > 0 ? fc(grandTotal.material) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold">
                        {fc(grandTotal.amount)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-green-600">
                        {grandTotal.rot > 0 ? <>&minus;{fc(grandTotal.rot)}</> : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-bold">
                        {fc(grandTotal.net)}
                      </td>
                      <td className="px-2 py-2.5" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// --- Project group rows (summary + expandable detail) ---

interface ProjectGroupRowsProps {
  group: ProjectGroup;
  isOpen: boolean;
  onToggle: () => void;
  fc: (amount: number) => string;
  formatDate: (dateStr: string | null) => string;
  t: (key: string, fallback?: string) => string;
}

function ProjectGroupRows({ group, isOpen, onToggle, fc, formatDate, t }: ProjectGroupRowsProps) {
  const itemCount = group.laborItems.length + group.materialItems.length;

  return (
    <>
      {/* Project summary row */}
      <tr
        className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
        onClick={onToggle}
      >
        <td className="px-2 py-2.5">
          <button type="button" className="p-0.5 rounded hover:bg-muted">
            {isOpen ? (
              <Minus className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        </td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <span className="font-medium truncate block">{group.name}</span>
              {group.address && (
                <span className="text-xs text-muted-foreground truncate block">{group.address}</span>
              )}
            </div>
            <Badge variant="outline" className="text-[10px] shrink-0 ml-1">
              {itemCount} {t("declaration.rowCount", "rader")}
            </Badge>
          </div>
        </td>
        <td className="px-3 py-2.5 text-right tabular-nums">
          {group.totalLabor > 0 ? fc(group.totalLabor) : "—"}
        </td>
        <td className="px-3 py-2.5 text-right tabular-nums">
          {group.totalMaterial > 0 ? fc(group.totalMaterial) : "—"}
        </td>
        <td className="px-3 py-2.5 text-right tabular-nums font-medium">
          {fc(group.totalAmount)}
        </td>
        <td className="px-3 py-2.5 text-right tabular-nums text-green-600">
          {group.totalRot > 0 ? <>&minus;{fc(group.totalRot)}</> : <span className="text-muted-foreground">—</span>}
        </td>
        <td className="px-3 py-2.5 text-right tabular-nums font-bold">
          {fc(group.totalNet)}
        </td>
        <td className="px-2 py-2.5 text-center">
          {group.hasAllDocs ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mx-auto" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-red-400 mx-auto" />
          )}
        </td>
      </tr>

      {/* Expanded detail rows */}
      {isOpen && (
        <>
          {/* Labor items */}
          {group.laborItems.length > 0 && (
            <>
              <tr className="bg-blue-50/50 dark:bg-blue-950/20">
                <td className="px-2 py-1.5" />
                <td colSpan={7} className="px-3 py-1.5">
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                    {t("analysis.laborCosts", "Arbetskostnader")} ({group.laborItems.length})
                  </span>
                </td>
              </tr>
              {group.laborItems.map((item) => (
                <CostItemRow key={item.id} item={item} fc={fc} formatDate={formatDate} />
              ))}
            </>
          )}

          {/* Material items */}
          {group.materialItems.length > 0 && (
            <>
              <tr className="bg-teal-50/50 dark:bg-teal-950/20">
                <td className="px-2 py-1.5" />
                <td colSpan={7} className="px-3 py-1.5">
                  <span className="text-xs font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wide">
                    {t("analysis.materialCosts", "Materialkostnader")} ({group.materialItems.length})
                  </span>
                </td>
              </tr>
              {group.materialItems.map((item) => (
                <CostItemRow key={item.id} item={item} fc={fc} formatDate={formatDate} />
              ))}
            </>
          )}
        </>
      )}
    </>
  );
}

// --- Individual cost item row ---

interface CostItemRowProps {
  item: CostItem;
  fc: (amount: number) => string;
  formatDate: (dateStr: string | null) => string;
}

function CostItemRow({ item, fc, formatDate }: CostItemRowProps) {
  return (
    <tr className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
      <td className="px-2 py-1.5" />
      <td className="px-3 py-1.5 pl-8">
        <div className="flex items-center gap-2 min-w-0">
          {item.type === "invoice" ? (
            <FileText className="h-3 w-3 text-blue-500 shrink-0" />
          ) : (
            <ShoppingCart className="h-3 w-3 text-teal-500 shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <span className="text-xs font-medium truncate block">{item.vendor}</span>
            {item.description && item.description !== item.vendor && (
              <span className="text-[11px] text-muted-foreground truncate block">{item.description}</span>
            )}
          </div>
          {item.isAta && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 text-amber-600 border-amber-300 shrink-0">
              ÄTA
            </Badge>
          )}
          <span className="text-[11px] text-muted-foreground tabular-nums shrink-0 ml-auto">
            {formatDate(item.date)}
          </span>
        </div>
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums text-xs">
        {item.laborAmount > 0 ? fc(item.laborAmount) : "—"}
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums text-xs">
        {item.type === "material" ? fc(item.amount) : (item.amount - item.laborAmount > 0 ? fc(item.amount - item.laborAmount) : "—")}
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums text-xs">
        {fc(item.amount)}
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums text-xs text-green-600">
        {item.rotDeduction > 0 ? <>&minus;{fc(item.rotDeduction)}</> : <span className="text-muted-foreground">—</span>}
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums text-xs font-medium">
        {fc(item.netCost)}
      </td>
      <td className="px-2 py-1.5 text-center">
        {item.hasDocuments ? (
          <CheckCircle2 className="h-3 w-3 text-green-600 mx-auto" />
        ) : (
          <XCircle className="h-3 w-3 text-red-400 mx-auto" />
        )}
      </td>
    </tr>
  );
}

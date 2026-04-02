import React, { useState, useEffect, useMemo } from "react";
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
  Shield,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RotRulesCard } from "./overview/RotRulesCard";

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
  rot_amount: number | null;
  paid_date: string | null;
}

interface TaskRotRow {
  id: string;
  project_id: string;
  title: string;
  rot_amount: number | null;
}

interface RotPersonRow {
  id: string;
  project_id: string;
  name: string;
  personnummer: string | null;
  custom_yearly_limit: number | null;
}

interface FileLinkRow {
  id: string;
  project_id: string;
  file_type: string;
  file_name: string;
  task_id: string | null;
  material_id: string | null;
  invoice_date: string | null;
  invoice_amount: number | null;
  rot_amount: number | null;
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
  type: "invoice" | "material" | "file";
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

// --- Förbättringsutgifter interfaces ---

interface FuYearGroup {
  year: number;
  totalAmount: number;
  totalLabor: number;
  totalMaterial: number;
  totalRot: number;
  totalNet: number;
  qualifies: boolean;
  items: CostItem[];
  hasAllDocs: boolean;
}

interface FuPropertySummary {
  propertyKey: string;
  address: string;
  projects: string[];
  years: FuYearGroup[];
  grandTotalNet: number;
  grandTotalAll: number;
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
  const [taskRotRows, setTaskRotRows] = useState<TaskRotRow[]>([]);
  const [rotPersons, setRotPersons] = useState<RotPersonRow[]>([]);
  const [rotYearlyLimits, setRotYearlyLimits] = useState<Map<number, number>>(new Map());
  const [rotAllocations, setRotAllocations] = useState<{ material_id: string; rot_person_id: string; amount: number }[]>([]);

  const [sectionExpanded, setSectionExpanded] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear() - 1);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"yearly" | "forbattringsutgifter">("yearly");
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());
  const [expandedFuYears, setExpandedFuYears] = useState<Set<string>>(new Set());

  const projectIds = useMemo(() => projects.map((p) => p.id), [projects]);

  useEffect(() => {
    if (projectIds.length === 0) {
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
      try {
        const [invRes, matRes, filesRes, metaRes, taskRotRes, rotPersonsRes, limitsRes] = await Promise.all([
          supabase
            .from("invoices")
            .select("id, project_id, title, invoice_number, total_amount, total_rot_deduction, paid_amount, status, is_ata, notes, paid_at, sent_at, created_at")
            .in("project_id", projectIds)
            .neq("status", "cancelled")
            .neq("status", "draft"),
          supabase
            .from("materials")
            .select("id, project_id, name, description, price_total, paid_amount, vendor_name, room_id, created_at, rot_amount, paid_date")
            .in("project_id", projectIds)
            .is("task_id", null),
          supabase
            .from("task_file_links")
            .select("id, project_id, file_type, file_name, task_id, material_id, invoice_date, invoice_amount, rot_amount")
            .in("project_id", projectIds),
          supabase
            .from("projects")
            .select("id, name, address, property_designation")
            .in("id", projectIds),
          // ROT tasks across all projects
          supabase
            .from("tasks")
            .select("id, project_id, title, rot_amount")
            .in("project_id", projectIds)
            .eq("rot_eligible", true)
            .not("rot_amount", "is", null),
          // ROT persons across all projects
          supabase
            .from("project_rot_persons")
            .select("id, project_id, name, personnummer, custom_yearly_limit")
            .in("project_id", projectIds),
          // System ROT limits
          supabase
            .from("rot_yearly_limits")
            .select("year, max_amount_per_person"),
        ]);

        // Per-person ROT allocations — fetch after materials to filter
        const allMaterialIds = (matRes.data || []).map((m: { id: string }) => m.id);
        const allocRes = allMaterialIds.length > 0
          ? await supabase
              .from("material_rot_allocations")
              .select("material_id, rot_person_id, amount")
              .in("material_id", allMaterialIds)
          : { data: [] };

        const invoicesData = (invRes.data || []) as InvoiceRow[];
        setInvoices(invoicesData);
        setMaterials((matRes.data || []) as MaterialRow[]);
        setFileLinks((filesRes.data || []) as FileLinkRow[]);
        setProjectMeta((metaRes.data || []) as ProjectMeta[]);
        setTaskRotRows((taskRotRes.data || []) as TaskRotRow[]);
        setRotPersons((rotPersonsRes.data || []) as RotPersonRow[]);
        if (limitsRes.data) {
          const lm = new Map<number, number>();
          for (const l of limitsRes.data) lm.set(l.year, l.max_amount_per_person);
          setRotYearlyLimits(lm);
        }
        setRotAllocations((allocRes.data || []) as { material_id: string; rot_person_id: string; amount: number }[]);

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
      const d = mat.paid_date || mat.created_at;
      if (d) yearSet.add(new Date(d).getFullYear());
    });
    // Include years from file-based invoice dates
    fileLinks.forEach((fl) => {
      if (fl.invoice_date) yearSet.add(new Date(fl.invoice_date).getFullYear());
    });
    const currentYear = new Date().getFullYear();
    yearSet.add(currentYear);
    const arr = Array.from(yearSet).sort((a, b) => b - a);
    // Ensure at least previous year is available
    const prevYear = currentYear - 1;
    if (!arr.includes(prevYear)) arr.push(prevYear);
    arr.sort((a, b) => b - a);
    return arr;
  }, [invoices, materials, fileLinks]);

  const activeYear = years.includes(selectedYear) ? selectedYear : years[0] || new Date().getFullYear() - 1;

  // --- ROT summary for selected year (across all projects) ---
  const rotSummary = useMemo(() => {
    // Actual ROT: from materials with paid_date in activeYear
    let actualRot = 0;
    materials.forEach((mat) => {
      if (mat.rot_amount && mat.paid_date) {
        if (new Date(mat.paid_date).getFullYear() === activeYear) {
          actualRot += mat.rot_amount;
        }
      }
    });
    // Also from invoices
    invoices.forEach((inv) => {
      if (inv.total_rot_deduction && inv.paid_at) {
        if (new Date(inv.paid_at).getFullYear() === activeYear) {
          actualRot += inv.total_rot_deduction;
        }
      }
    });
    // Also from file links
    fileLinks.forEach((fl) => {
      if (fl.rot_amount && fl.invoice_date) {
        if (new Date(fl.invoice_date).getFullYear() === activeYear) {
          actualRot += fl.rot_amount;
        }
      }
    });

    // Planned ROT (from tasks, year-agnostic — shown as reference)
    const plannedRot = taskRotRows.reduce((sum, t) => sum + (t.rot_amount || 0), 0);

    // ROT limit for this year
    const defaultLimit = rotYearlyLimits.get(activeYear) || 50000;
    // Count unique persons across all projects (dedupe by personnummer if available, else by name)
    const uniquePersons = new Map<string, RotPersonRow>();
    rotPersons.forEach((p) => {
      const dedupeKey = p.personnummer || `name:${p.name}`;
      if (!uniquePersons.has(dedupeKey)) uniquePersons.set(dedupeKey, p);
    });
    const personCount = Math.max(uniquePersons.size, 1);
    const totalLimit = Array.from(uniquePersons.values()).reduce(
      (sum, p) => sum + (p.custom_yearly_limit ?? defaultLimit),
      0
    ) || defaultLimit;

    // Per-person breakdown from allocations
    const matYearMap = new Map<string, number>();
    materials.forEach((m) => {
      if (m.paid_date) matYearMap.set(m.id, new Date(m.paid_date).getFullYear());
    });

    const perPerson = new Map<string, number>();
    for (const alloc of rotAllocations) {
      const year = matYearMap.get(alloc.material_id);
      if (year !== activeYear) continue;
      perPerson.set(alloc.rot_person_id, (perPerson.get(alloc.rot_person_id) || 0) + alloc.amount);
    }

    return {
      actualRot,
      plannedRot,
      totalLimit,
      personCount,
      persons: Array.from(uniquePersons.values()),
      remaining: totalLimit - actualRot,
      perPerson,
    };
  }, [activeYear, materials, invoices, fileLinks, taskRotRows, rotPersons, rotYearlyLimits, rotAllocations]);

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

    // Process file-based invoice/ROT data (from Files tab uploads)
    // Only include files that have invoice_amount set and aren't already
    // represented by an invoice record (avoid double-counting)
    const invoiceIds = new Set(invoices.map((i) => i.id));
    fileLinks.forEach((fl) => {
      if (!fl.invoice_amount && !fl.rot_amount) return;
      const flDate = fl.invoice_date;
      if (!flDate || new Date(flDate).getFullYear() !== activeYear) return;

      const g = getGroup(fl.project_id);
      const amount = fl.invoice_amount || 0;
      const rot = fl.rot_amount || 0;
      const net = amount - rot;

      g.totalAmount += amount;
      if (rot > 0) g.totalLabor += amount; // assume labor if ROT is set
      else g.totalMaterial += amount;
      g.totalRot += rot;
      g.totalNet += net;

      const item: CostItem = {
        id: fl.id,
        type: "file",
        vendor: fl.file_name || "—",
        description: fl.file_type === "invoice" ? t("files.invoice", "Faktura") : fl.file_type,
        date: flDate,
        amount,
        laborAmount: rot > 0 ? amount : 0,
        rotDeduction: rot,
        netCost: net,
        hasDocuments: true,
        notes: null,
        isAta: false,
      };

      if (rot > 0) g.laborItems.push(item);
      else g.materialItems.push(item);
    });

    // Sort groups by total descending, filter out empty groups
    return Array.from(groups.values())
      .filter((g) => g.invoiceCount > 0 || g.materialCount > 0 || g.laborItems.length > 0 || g.materialItems.length > 0)
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [invoices, invoiceItems, materials, fileLinks, projectMeta, entityHasFile, activeYear, t]);

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

  // --- Förbättringsutgifter: cross-year aggregation by property ---

  const fuSummary = useMemo((): FuPropertySummary[] => {
    const metaMap = new Map<string, ProjectMeta>();
    projectMeta.forEach((p) => metaMap.set(p.id, p));

    const invoiceMap = new Map<string, InvoiceItemRow[]>();
    invoiceItems.forEach((item) => {
      const arr = invoiceMap.get(item.invoice_id) || [];
      arr.push(item);
      invoiceMap.set(item.invoice_id, arr);
    });

    // Flat list: { propertyKey, year, item }
    type Tagged = { propertyKey: string; address: string; projectId: string; year: number; item: CostItem };
    const tagged: Tagged[] = [];

    const getPropertyKey = (pid: string) => {
      const meta = metaMap.get(pid);
      return meta?.address || meta?.name || pid;
    };
    const getAddress = (pid: string) => {
      const meta = metaMap.get(pid);
      return meta?.address || meta?.name || "—";
    };

    // Invoices
    invoices.forEach((inv) => {
      const invDate = inv.sent_at || inv.created_at;
      if (!invDate) return;
      const year = new Date(invDate).getFullYear();
      const items = invoiceMap.get(inv.id) || [];
      const laborAmount = items.filter((i) => i.is_rot_eligible).reduce((s, i) => s + (i.total_price || 0), 0);
      const amount = inv.total_amount || 0;
      const rot = inv.total_rot_deduction || 0;
      const hasDoc = entityHasFile.has(`project-${inv.project_id}`);

      tagged.push({
        propertyKey: getPropertyKey(inv.project_id),
        address: getAddress(inv.project_id),
        projectId: inv.project_id,
        year,
        item: {
          id: inv.id, type: "invoice",
          vendor: inv.title || inv.invoice_number || t("invoices.untitled", "Faktura"),
          description: items.map((i) => i.description).filter(Boolean).join(", ") || inv.title || "",
          date: invDate, amount, laborAmount, rotDeduction: rot, netCost: amount - rot,
          hasDocuments: hasDoc, notes: inv.notes || null, isAta: inv.is_ata,
        },
      });
    });

    // Materials
    materials.forEach((mat) => {
      const matDate = mat.paid_date || mat.created_at;
      if (!matDate) return;
      const year = new Date(matDate).getFullYear();
      const amount = mat.price_total || 0;
      const hasDoc = entityHasFile.has(`material-${mat.id}`);

      tagged.push({
        propertyKey: getPropertyKey(mat.project_id),
        address: getAddress(mat.project_id),
        projectId: mat.project_id,
        year,
        item: {
          id: mat.id, type: "material",
          vendor: mat.vendor_name || "—", description: mat.name,
          date: matDate, amount, laborAmount: 0, rotDeduction: 0, netCost: amount,
          hasDocuments: hasDoc, notes: mat.description || null, isAta: false,
        },
      });
    });

    // File-based invoices
    fileLinks.forEach((fl) => {
      if (!fl.invoice_amount && !fl.rot_amount) return;
      if (!fl.invoice_date) return;
      const year = new Date(fl.invoice_date).getFullYear();
      const amount = fl.invoice_amount || 0;
      const rot = fl.rot_amount || 0;

      tagged.push({
        propertyKey: getPropertyKey(fl.project_id),
        address: getAddress(fl.project_id),
        projectId: fl.project_id,
        year,
        item: {
          id: fl.id, type: "file",
          vendor: fl.file_name || "—",
          description: fl.file_type === "invoice" ? t("files.invoice", "Faktura") : fl.file_type,
          date: fl.invoice_date, amount, laborAmount: rot > 0 ? amount : 0,
          rotDeduction: rot, netCost: amount - rot, hasDocuments: true, notes: null, isAta: false,
        },
      });
    });

    // Group by property → year
    const propMap = new Map<string, { address: string; projects: Set<string>; yearMap: Map<number, CostItem[]> }>();
    tagged.forEach(({ propertyKey, address, projectId, year, item }) => {
      if (!propMap.has(propertyKey)) {
        propMap.set(propertyKey, { address, projects: new Set(), yearMap: new Map() });
      }
      const prop = propMap.get(propertyKey)!;
      prop.projects.add(projectId);
      if (!prop.yearMap.has(year)) prop.yearMap.set(year, []);
      prop.yearMap.get(year)!.push(item);
    });

    // Build summaries
    const result: FuPropertySummary[] = [];
    propMap.forEach((prop, key) => {
      const years: FuYearGroup[] = [];
      prop.yearMap.forEach((items, year) => {
        const totalAmount = items.reduce((s, i) => s + i.amount, 0);
        const totalLabor = items.reduce((s, i) => s + i.laborAmount, 0);
        const totalMaterial = items.reduce((s, i) => s + (i.type === "material" ? i.amount : Math.max(0, i.amount - i.laborAmount)), 0);
        const totalRot = items.reduce((s, i) => s + i.rotDeduction, 0);
        const totalNet = items.reduce((s, i) => s + i.netCost, 0);
        const hasAllDocs = items.every((i) => i.hasDocuments);
        years.push({ year, totalAmount, totalLabor, totalMaterial, totalRot, totalNet, qualifies: totalNet >= 5000, items, hasAllDocs });
      });
      years.sort((a, b) => b.year - a.year);
      const grandTotalNet = years.filter((y) => y.qualifies).reduce((s, y) => s + y.totalNet, 0);
      const grandTotalAll = years.reduce((s, y) => s + y.totalNet, 0);
      result.push({ propertyKey: key, address: prop.address, projects: Array.from(prop.projects), years, grandTotalNet, grandTotalAll });
    });

    return result.sort((a, b) => b.grandTotalNet - a.grandTotalNet);
  }, [invoices, invoiceItems, materials, fileLinks, projectMeta, entityHasFile, t]);

  const fuGrandTotal = useMemo(() => {
    const allYears = fuSummary.flatMap((p) => p.years);
    const qualifying = allYears.filter((y) => y.qualifies);
    return {
      net: qualifying.reduce((s, y) => s + y.totalNet, 0),
      qualifyingYears: qualifying.length,
      totalYears: allYears.length,
    };
  }, [fuSummary]);

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

  const toggleProperty = (key: string) => {
    setExpandedProperties((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleFuYear = (key: string) => {
    setExpandedFuYears((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
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
          {/* View toggle */}
          <div className="flex rounded-lg border bg-muted/30 p-0.5 w-fit">
            <button
              type="button"
              onClick={() => setViewMode("yearly")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === "yearly"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Calendar className="h-3.5 w-3.5 inline mr-1.5" />
              {t("analysis.taxYear", "Beskattningsår")}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("forbattringsutgifter")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === "forbattringsutgifter"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Building2 className="h-3.5 w-3.5 inline mr-1.5" />
              {t("analysis.improvementCosts", "Förbättringsutgifter")}
            </button>
          </div>

          {/* ===== YEARLY VIEW (existing) ===== */}
          {viewMode === "yearly" && (<>
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

          {/* ROT summary for selected year */}
          {(rotSummary.actualRot > 0 || rotSummary.plannedRot > 0) && (
            <div className="rounded-lg border bg-green-50/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-green-600" />
                  {t("rot.summary", "ROT-avdrag")} {activeYear}
                </span>
                <span className="text-xs text-muted-foreground">
                  {rotSummary.personCount} {rotSummary.personCount === 1 ? t("rot.person", "person") : t("rot.persons", "personer")}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t("rot.used", "Utnyttjat")}</span>
                <span className="tabular-nums">
                  <span className={rotSummary.remaining < 0 ? "text-destructive font-medium" : "text-green-700 font-medium"}>
                    {fc(rotSummary.actualRot)}
                  </span>
                  <span className="text-muted-foreground"> / {fc(rotSummary.totalLimit)}</span>
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    rotSummary.remaining < 0 ? "bg-destructive" : rotSummary.remaining < rotSummary.totalLimit * 0.2 ? "bg-amber-500" : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min((rotSummary.actualRot / rotSummary.totalLimit) * 100, 100)}%` }}
                />
              </div>
              {rotSummary.remaining < 0 && (
                <div className="flex items-center gap-1 text-xs text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  {t("rot.overLimit", "Överstiger ROT-tak med {{amount}} kr", { amount: fc(Math.abs(rotSummary.remaining)) })}
                </div>
              )}
              {rotSummary.remaining > 0 && rotSummary.actualRot > 0 && (
                <div className="text-xs text-muted-foreground">
                  {t("rot.remainingThisYear", "Kvar att nyttja {{year}}: {{amount}}", { year: activeYear, amount: fc(rotSummary.remaining) })}
                </div>
              )}
              {/* Per-person breakdown */}
              {rotSummary.perPerson.size > 0 && rotSummary.persons.length > 1 && (
                <div className="space-y-0.5 pt-1.5 border-t">
                  {rotSummary.persons.map((p) => {
                    const personUsed = rotSummary.perPerson.get(p.id) || 0;
                    const defaultLimit = rotYearlyLimits.get(activeYear) || 50000;
                    const personLimit = p.custom_yearly_limit ?? defaultLimit;
                    return (
                      <div key={p.id} className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{p.name} {p.personnummer ? `(****-${p.personnummer.slice(-4)})` : ""}</span>
                        <span className="tabular-nums">
                          {fc(personUsed)} / {fc(personLimit)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ROT rules transparency */}
          <RotRulesCard />

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
          </>)}

          {/* ===== FÖRBÄTTRINGSUTGIFTER VIEW ===== */}
          {viewMode === "forbattringsutgifter" && (<>
            {/* Explanation */}
            <div className="rounded-lg border bg-indigo-50/50 dark:bg-indigo-950/20 p-3 space-y-1">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                {t("analysis.improvementCosts", "Förbättringsutgifter")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("analysis.fuExplanation", "Dokumenterade renoveringskostnader som kan dras av från reavinstskatten vid försäljning. Minst 5 000 kr per år krävs. Spara alla kvitton och fakturor.")}
              </p>
            </div>

            {fuSummary.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t("analysis.noDataForYear", "Inga kostnader registrerade för detta år")}
              </p>
            ) : (
              <>
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
                      {fuSummary.map((prop) => (
                        <FuPropertyRows
                          key={prop.propertyKey}
                          property={prop}
                          isOpen={expandedProperties.has(prop.propertyKey)}
                          expandedYears={expandedFuYears}
                          onToggleProperty={() => toggleProperty(prop.propertyKey)}
                          onToggleYear={toggleFuYear}
                          fc={fc}
                          formatDate={formatDate}
                          t={t}
                        />
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/50 border-t font-medium text-sm">
                        <td className="px-2 py-2.5" />
                        <td className="px-3 py-2.5">
                          <div>
                            <span className="text-xs text-muted-foreground">{t("analysis.improvementCosts", "Förbättringsutgifter")}</span>
                            <span className="text-[11px] text-muted-foreground block">
                              {t("analysis.qualifyingTotal", "{{count}} av {{total}} år kvalificerar", { count: fuGrandTotal.qualifyingYears, total: fuGrandTotal.totalYears })}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5" />
                        <td className="px-3 py-2.5" />
                        <td className="px-3 py-2.5" />
                        <td className="px-3 py-2.5" />
                        <td className="px-3 py-2.5 text-right tabular-nums font-bold text-base">
                          {fc(fuGrandTotal.net)}
                        </td>
                        <td className="px-2 py-2.5" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </>)}
        </div>
      )}
    </div>
  );
}

// --- Förbättringsutgifter property rows (3-level drill-down) ---

interface FuPropertyRowsProps {
  property: FuPropertySummary;
  isOpen: boolean;
  expandedYears: Set<string>;
  onToggleProperty: () => void;
  onToggleYear: (key: string) => void;
  fc: (amount: number) => string;
  formatDate: (dateStr: string | null) => string;
  t: (key: string, fallback?: string) => string;
}

function FuPropertyRows({ property, isOpen, expandedYears, onToggleProperty, onToggleYear, fc, formatDate, t }: FuPropertyRowsProps) {
  const qualifyingNet = property.years.filter((y) => y.qualifies).reduce((s, y) => s + y.totalNet, 0);

  return (
    <>
      {/* Level 1: Property row */}
      <tr className="border-b hover:bg-muted/30 transition-colors cursor-pointer" onClick={onToggleProperty}>
        <td className="px-2 py-2.5">
          <button type="button" className="p-0.5 rounded hover:bg-muted">
            {isOpen ? <Minus className="h-3.5 w-3.5 text-muted-foreground" /> : <Plus className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
        </td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <span className="font-medium truncate block">{property.address}</span>
              <span className="text-xs text-muted-foreground">
                {property.years.length} {property.years.length === 1 ? "år" : "år"}
              </span>
            </div>
          </div>
        </td>
        <td className="px-3 py-2.5" />
        <td className="px-3 py-2.5" />
        <td className="px-3 py-2.5" />
        <td className="px-3 py-2.5" />
        <td className="px-3 py-2.5 text-right tabular-nums font-bold">
          {fc(qualifyingNet)}
        </td>
        <td className="px-2 py-2.5" />
      </tr>

      {/* Level 2: Year rows */}
      {isOpen && property.years.map((yg) => {
        const yearKey = `${property.propertyKey}:${yg.year}`;
        const yearOpen = expandedYears.has(yearKey);

        return (
          <React.Fragment key={yg.year}>
            <tr
              className={`border-b hover:bg-muted/20 transition-colors cursor-pointer ${!yg.qualifies ? "opacity-50" : ""}`}
              onClick={() => onToggleYear(yearKey)}
            >
              <td className="px-2 py-1.5 pl-6">
                <button type="button" className="p-0.5 rounded hover:bg-muted">
                  {yearOpen ? <Minus className="h-3 w-3 text-muted-foreground" /> : <Plus className="h-3 w-3 text-muted-foreground" />}
                </button>
              </td>
              <td className="px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm font-medium">{yg.year}</span>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {yg.items.length} {t("declaration.rowCount", "rader")}
                  </Badge>
                  {!yg.qualifies && (
                    <Badge variant="secondary" className="text-[9px] text-amber-600 bg-amber-50 border-amber-200">
                      {t("analysis.belowThreshold", "Under 5 000 kr")}
                    </Badge>
                  )}
                </div>
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums text-xs">
                {yg.totalLabor > 0 ? fc(yg.totalLabor) : "—"}
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums text-xs">
                {yg.totalMaterial > 0 ? fc(yg.totalMaterial) : "—"}
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums text-xs font-medium">
                {fc(yg.totalAmount)}
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums text-xs text-green-600">
                {yg.totalRot > 0 ? <>&minus;{fc(yg.totalRot)}</> : <span className="text-muted-foreground">—</span>}
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums text-xs font-medium">
                {fc(yg.totalNet)}
              </td>
              <td className="px-2 py-1.5 text-center">
                {yg.hasAllDocs ? (
                  <CheckCircle2 className="h-3 w-3 text-green-600 mx-auto" />
                ) : (
                  <XCircle className="h-3 w-3 text-red-400 mx-auto" />
                )}
              </td>
            </tr>

            {/* Level 3: Individual items */}
            {yearOpen && yg.items.map((item) => (
              <CostItemRow key={item.id} item={item} fc={fc} formatDate={formatDate} />
            ))}
          </React.Fragment>
        );
      })}
    </>
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

import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/currency";
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  FileText,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  Building2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DeclarationTable, type DeclarationRow } from "./DeclarationTable";

// --- Interfaces ---

interface AnalysisProps {
  projectId: string;
  currency?: string | null;
}

interface InvoiceRow {
  id: string;
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
  name: string;
  description: string | null;
  price_total: number;
  paid_amount: number;
  vendor_name: string | null;
  room_id: string | null;
  created_at: string;
}

interface RoomRow { id: string; name: string }
interface TaskRow { id: string; cost_center: string | null }

interface FileLinkRow {
  file_type: string;
  task_id: string | null;
  material_id: string | null;
}

interface ProjectInfo {
  name: string;
  address: string | null;
  property_designation: string | null;
}

// --- Component ---

export function HomeownerAnalysisSection({ projectId, currency }: AnalysisProps) {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItemRow[]>([]);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [fileLinks, setFileLinks] = useState<FileLinkRow[]>([]);

  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projRes, invRes, matRes, roomsRes, tasksRes, filesRes] = await Promise.all([
          supabase.from("projects").select("name, address, property_designation").eq("id", projectId).single(),
          supabase
            .from("invoices")
            .select("id, title, invoice_number, total_amount, total_rot_deduction, paid_amount, status, is_ata, notes, paid_at, sent_at, created_at")
            .eq("project_id", projectId)
            .neq("status", "cancelled")
            .neq("status", "draft")
            .order("created_at", { ascending: false }),
          supabase
            .from("materials")
            .select("id, name, description, price_total, paid_amount, vendor_name, room_id, created_at")
            .eq("project_id", projectId)
            .is("task_id", null),
          supabase.from("rooms").select("id, name").eq("project_id", projectId),
          supabase.from("tasks").select("id, cost_center").eq("project_id", projectId),
          supabase.from("task_file_links").select("file_type, task_id, material_id").eq("project_id", projectId),
        ]);

        setProject(projRes.data as ProjectInfo | null);
        const invoicesData = (invRes.data || []) as InvoiceRow[];
        setInvoices(invoicesData);
        setMaterials((matRes.data || []) as MaterialRow[]);
        setRooms((roomsRes.data || []) as RoomRow[]);
        setTasks((tasksRes.data || []) as TaskRow[]);
        setFileLinks((filesRes.data || []) as FileLinkRow[]);

        const invoiceIds = invoicesData.map((i) => i.id);
        if (invoiceIds.length > 0) {
          const { data: items } = await supabase
            .from("invoice_items")
            .select("invoice_id, description, total_price, is_rot_eligible, rot_deduction, room_id, source_task_id")
            .in("invoice_id", invoiceIds);
          setInvoiceItems((items || []) as InvoiceItemRow[]);
        }
      } catch (error) {
        console.error("Failed to load analysis data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  // --- Lookup maps ---

  const roomNameMap = useMemo(() => {
    const map = new Map<string, string>();
    rooms.forEach((r) => map.set(r.id, r.name));
    return map;
  }, [rooms]);

  const taskCostCenterMap = useMemo(() => {
    const map = new Map<string, string>();
    tasks.forEach((t) => { if (t.cost_center) map.set(t.id, t.cost_center); });
    return map;
  }, [tasks]);

  const entityHasFile = useMemo(() => {
    const set = new Set<string>();
    fileLinks.forEach((f) => {
      if (f.file_type === "invoice" || f.file_type === "receipt") {
        if (f.task_id) set.add(`task-${f.task_id}`);
        if (f.material_id) set.add(`material-${f.material_id}`);
        set.add("has-any");
      }
    });
    return set;
  }, [fileLinks]);

  // --- Build rows ---

  const rows = useMemo((): DeclarationRow[] => {
    const result: DeclarationRow[] = [];

    invoices.forEach((inv) => {
      const items = invoiceItems.filter((i) => i.invoice_id === inv.id);
      const laborAmount = items
        .filter((i) => i.is_rot_eligible)
        .reduce((s, i) => s + (i.total_price || 0), 0);

      const itemRoomIds = items.map((i) => i.room_id).filter((id): id is string => !!id);
      const uniqueRooms = [...new Set(itemRoomIds)].map((id) => roomNameMap.get(id)).filter(Boolean);

      const itemTaskIds = items.map((i) => i.source_task_id).filter((id): id is string => !!id);
      const categories = [...new Set(itemTaskIds.map((id) => taskCostCenterMap.get(id)).filter(Boolean))];

      result.push({
        id: inv.id,
        type: "invoice",
        vendor: inv.title || inv.invoice_number || t("invoices.untitled", "Faktura"),
        description: items.length > 0 ? items.map((i) => i.description).join(", ") : inv.title || "",
        category: categories.length > 0 ? categories.join(", ") : null,
        room: uniqueRooms.length > 0 ? uniqueRooms.join(", ") : null,
        invoiceDate: inv.sent_at || inv.created_at,
        paidDate: inv.paid_at || null,
        amount: inv.total_amount || 0,
        laborAmount,
        rotDeduction: inv.total_rot_deduction || 0,
        netCost: (inv.total_amount || 0) - (inv.total_rot_deduction || 0),
        paymentMethod: null,
        hasDocuments: entityHasFile.has("has-any"),
        notes: inv.notes || (inv.is_ata ? "ÄTA" : null),
      });
    });

    materials.forEach((mat) => {
      const hasDoc = entityHasFile.has(`material-${mat.id}`);
      const roomName = mat.room_id ? roomNameMap.get(mat.room_id) : null;

      result.push({
        id: mat.id,
        type: "material",
        vendor: mat.vendor_name || "—",
        description: mat.name,
        category: t("declaration.categoryMaterial", "Material"),
        room: roomName || null,
        invoiceDate: mat.created_at,
        paidDate: null,
        amount: mat.price_total || 0,
        laborAmount: 0,
        rotDeduction: 0,
        netCost: mat.price_total || 0,
        paymentMethod: null,
        hasDocuments: hasDoc,
        notes: mat.description || null,
      });
    });

    result.sort((a, b) => (b.invoiceDate || "").localeCompare(a.invoiceDate || ""));
    return result;
  }, [invoices, invoiceItems, materials, roomNameMap, taskCostCenterMap, entityHasFile, t]);

  // --- Totals & checks ---

  const totals = useMemo(() => {
    const amount = rows.reduce((s, r) => s + r.amount, 0);
    const rot = rows.reduce((s, r) => s + r.rotDeduction, 0);
    return { amount, rot, net: amount - rot };
  }, [rows]);

  const checks = useMemo(() => {
    const hasDesignation = !!project?.property_designation;
    const allPaid = invoices.length === 0 || invoices.every((i) => (i.paid_amount || 0) >= (i.total_amount || 0));
    const hasFiles = fileLinks.length > 0;
    return [
      { key: "rot", label: t("analysis.checkRotDetails"), ok: hasDesignation },
      { key: "paid", label: t("analysis.checkInvoicesPaid"), ok: allPaid },
      { key: "files", label: t("analysis.checkFilesAttached"), ok: hasFiles },
    ];
  }, [project, invoices, fileLinks, t]);

  // --- Render ---

  if (loading || rows.length === 0) return null;

  const fc = (amount: number) => formatCurrency(amount, currency, { decimals: 0 });

  return (
    <div className="border rounded-lg">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-indigo-600" />
          <span className="text-sm font-semibold">
            {t("analysis.title", "Kostnadssammanställning")}
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{fc(totals.amount)}</span>
            {totals.rot > 0 && (
              <span className="text-xs text-green-600">ROT &minus;{fc(totals.rot)}</span>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Project info */}
          {project && (
            <div className="bg-muted/30 rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-medium">{project.name}</span>
              </div>
              {project.address && (
                <p className="text-xs text-muted-foreground pl-5">{project.address}</p>
              )}
              {project.property_designation && (
                <p className="text-xs text-muted-foreground pl-5">
                  {t("analysis.propertyDesignation", "Fastighetsbeteckning")}: {project.property_designation}
                </p>
              )}
            </div>
          )}

          {/* Checklist inline */}
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

          {/* Declaration table */}
          <DeclarationTable rows={rows} currency={currency} />
        </div>
      )}
    </div>
  );
}

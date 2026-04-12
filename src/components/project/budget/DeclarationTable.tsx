import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import { Settings2, FileText, ShoppingCart } from "lucide-react";
import { type EvidenceStatus, getEvidenceColor } from "@/lib/evidenceStatus";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// --- Column definitions ---

type ColumnKey =
  | "vendor"
  | "description"
  | "category"
  | "room"
  | "invoiceDate"
  | "paidDate"
  | "amount"
  | "laborAmount"
  | "rotDeduction"
  | "netCost"
  | "paymentMethod"
  | "hasDocuments"
  | "notes";

interface ColumnDef {
  key: ColumnKey;
  labelKey: string;
  defaultVisible: boolean;
  minWidth: string;
  align?: "right";
}

const COLUMNS: ColumnDef[] = [
  { key: "vendor", labelKey: "declaration.colVendor", defaultVisible: true, minWidth: "120px" },
  { key: "description", labelKey: "declaration.colDescription", defaultVisible: true, minWidth: "150px" },
  { key: "category", labelKey: "declaration.colCategory", defaultVisible: false, minWidth: "100px" },
  { key: "room", labelKey: "declaration.colRoom", defaultVisible: false, minWidth: "100px" },
  { key: "invoiceDate", labelKey: "declaration.colInvoiceDate", defaultVisible: true, minWidth: "90px" },
  { key: "paidDate", labelKey: "declaration.colPaidDate", defaultVisible: false, minWidth: "90px" },
  { key: "amount", labelKey: "declaration.colAmount", defaultVisible: true, minWidth: "100px", align: "right" },
  { key: "laborAmount", labelKey: "declaration.colLabor", defaultVisible: false, minWidth: "100px", align: "right" },
  { key: "rotDeduction", labelKey: "declaration.colRot", defaultVisible: true, minWidth: "90px", align: "right" },
  { key: "netCost", labelKey: "declaration.colNetCost", defaultVisible: true, minWidth: "100px", align: "right" },
  { key: "paymentMethod", labelKey: "declaration.colPaymentMethod", defaultVisible: false, minWidth: "90px" },
  { key: "hasDocuments", labelKey: "declaration.colDocuments", defaultVisible: true, minWidth: "60px" },
  { key: "notes", labelKey: "declaration.colNotes", defaultVisible: false, minWidth: "120px" },
];

// --- Row data ---

export interface DeclarationRow {
  id: string;
  type: "invoice" | "material";
  vendor: string;
  description: string;
  category: string | null;
  room: string | null;
  invoiceDate: string | null;
  paidDate: string | null;
  amount: number;
  laborAmount: number;
  rotDeduction: number;
  netCost: number;
  paymentMethod: string | null;
  hasDocuments: boolean;
  evidenceStatus?: EvidenceStatus;
  notes: string | null;
  projectName?: string;
}

interface DeclarationTableProps {
  rows: DeclarationRow[];
  currency?: string | null;
  showProject?: boolean;
}

// --- Component ---

export function DeclarationTable({ rows, currency, showProject }: DeclarationTableProps) {
  const { t } = useTranslation();

  const [visibleCols, setVisibleCols] = useState<Set<ColumnKey>>(() => {
    const defaults = new Set<ColumnKey>();
    COLUMNS.forEach((c) => {
      if (c.defaultVisible) defaults.add(c.key);
    });
    return defaults;
  });

  const toggleColumn = (key: ColumnKey) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const activeColumns = useMemo(
    () => COLUMNS.filter((c) => visibleCols.has(c.key)),
    [visibleCols]
  );

  const fc = (amount: number) => formatCurrency(amount, currency, { decimals: 0 });

  const totals = useMemo(() => {
    return {
      amount: rows.reduce((s, r) => s + r.amount, 0),
      laborAmount: rows.reduce((s, r) => s + r.laborAmount, 0),
      rotDeduction: rows.reduce((s, r) => s + r.rotDeduction, 0),
      netCost: rows.reduce((s, r) => s + r.netCost, 0),
    };
  }, [rows]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      return format(new Date(dateStr), "yyyy-MM-dd");
    } catch {
      return "—";
    }
  };

  const renderCell = (row: DeclarationRow, col: ColumnDef) => {
    switch (col.key) {
      case "vendor":
        return <span className="truncate">{row.vendor || "—"}</span>;
      case "description":
        return <span className="truncate">{row.description}</span>;
      case "category":
        return row.category ? (
          <Badge variant="outline" className="text-[10px]">{row.category}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      case "room":
        return row.room || <span className="text-muted-foreground">—</span>;
      case "invoiceDate":
        return <span className="tabular-nums">{formatDate(row.invoiceDate)}</span>;
      case "paidDate":
        return <span className="tabular-nums">{formatDate(row.paidDate)}</span>;
      case "amount":
        return <span className="tabular-nums font-medium">{fc(row.amount)}</span>;
      case "laborAmount":
        return (
          <span className="tabular-nums">
            {row.laborAmount > 0 ? fc(row.laborAmount) : "—"}
          </span>
        );
      case "rotDeduction":
        return row.rotDeduction > 0 ? (
          <span className="tabular-nums text-green-600">&minus;{fc(row.rotDeduction)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      case "netCost":
        return <span className="tabular-nums font-bold">{fc(row.netCost)}</span>;
      case "paymentMethod":
        return row.paymentMethod || <span className="text-muted-foreground">—</span>;
      case "hasDocuments": {
        const es = row.evidenceStatus ?? (row.hasDocuments ? "verified" : "registered");
        const dotColor = getEvidenceColor(es as EvidenceStatus);
        if (!dotColor) return null;
        return <span className={`inline-block h-2.5 w-2.5 rounded-full mx-auto ${dotColor}`} title={t(`evidence.${es}`)} />;
      }
      case "notes":
        return row.notes ? (
          <span className="truncate text-xs">{row.notes}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      default:
        return null;
    }
  };

  if (rows.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Column picker */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {rows.length} {t("declaration.rowCount", "rader")}
        </p>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
              <Settings2 className="h-3 w-3" />
              {t("declaration.columns", "Kolumner")}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {t("declaration.toggleColumns", "Visa/dölj kolumner")}
            </p>
            <div className="space-y-1">
              {COLUMNS.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={visibleCols.has(col.key)}
                    onChange={() => toggleColumn(col.key)}
                    className="h-3.5 w-3.5 rounded border-gray-300"
                  />
                  {t(col.labelKey)}
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              {/* Row type icon */}
              <th className="px-2 py-2 w-8" />
              {showProject && (
                <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
                  {t("declaration.colProject", "Projekt")}
                </th>
              )}
              {activeColumns.map((col) => (
                <th
                  key={col.key}
                  className={`px-2 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap ${
                    col.align === "right" ? "text-right" : "text-left"
                  }`}
                  style={{ minWidth: col.minWidth }}
                >
                  {t(col.labelKey)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                {/* Type icon */}
                <td className="px-2 py-1.5">
                  {row.type === "invoice" ? (
                    <FileText className="h-3.5 w-3.5 text-blue-500" />
                  ) : (
                    <ShoppingCart className="h-3.5 w-3.5 text-teal-500" />
                  )}
                </td>
                {showProject && (
                  <td className="px-2 py-1.5 text-xs text-muted-foreground truncate max-w-[120px]">
                    {row.projectName || "—"}
                  </td>
                )}
                {activeColumns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-2 py-1.5 ${col.align === "right" ? "text-right" : "text-left"}`}
                  >
                    {renderCell(row, col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {/* Totals footer */}
          <tfoot>
            <tr className="bg-muted/50 border-t font-medium text-sm">
              <td className="px-2 py-2" />
              {showProject && <td className="px-2 py-2" />}
              {activeColumns.map((col) => {
                const isSumCol = col.key === "amount" || col.key === "laborAmount" || col.key === "rotDeduction" || col.key === "netCost";
                return (
                  <td
                    key={col.key}
                    className={`px-2 py-2 ${col.align === "right" ? "text-right" : "text-left"}`}
                  >
                    {col.key === "vendor" && (
                      <span className="text-xs text-muted-foreground">
                        {t("common.total")}
                      </span>
                    )}
                    {col.key === "amount" && (
                      <span className="tabular-nums">{fc(totals.amount)}</span>
                    )}
                    {col.key === "laborAmount" && totals.laborAmount > 0 && (
                      <span className="tabular-nums">{fc(totals.laborAmount)}</span>
                    )}
                    {col.key === "rotDeduction" && totals.rotDeduction > 0 && (
                      <span className="tabular-nums text-green-600">&minus;{fc(totals.rotDeduction)}</span>
                    )}
                    {col.key === "netCost" && (
                      <span className="tabular-nums font-bold">{fc(totals.netCost)}</span>
                    )}
                    {!isSumCol && col.key !== "vendor" && null}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

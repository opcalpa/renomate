import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, FileQuestion } from "lucide-react";

/** Categories that can have meaningful amounts (invoice_amount) */
const AMOUNT_CATEGORIES = new Set(["Offert", "Faktura", "Kvitto"]);

/** Ordered display categories */
const CATEGORY_ORDER = ["Offert", "Faktura", "Kvitto", "Kontrakt", "Specifikation", "Ritning"];

interface FileLink {
  file_path: string;
  file_type: string;
  invoice_amount?: number | null;
  rot_amount?: number | null;
}

interface FileStatsStripProps {
  /** All file links for the project (from task_file_links) */
  fileLinks: FileLink[];
  /** All file paths in the project (from storage, all folders recursively) */
  allFilePaths: string[];
  /** Category resolver: path → display category (e.g. "Faktura") or "" */
  getCategory: (path: string) => string;
  /** Currently active category filter (null = no filter) */
  activeFilter: string | null;
  /** Callback when user clicks a category box */
  onFilterChange: (category: string | null) => void;
  /** Callback when user clicks "missing amount" indicator */
  onFilterMissing: (category: string) => void;
}

interface CategoryStats {
  category: string;
  count: number;
  amount: number | null;
  missingAmount: number;
  hasAmountRelevance: boolean;
}

export function FileStatsStrip({
  fileLinks,
  allFilePaths,
  getCategory,
  activeFilter,
  onFilterChange,
  onFilterMissing,
}: FileStatsStripProps) {
  const { t } = useTranslation();

  const stats = useMemo(() => {
    // Build a map: file_path → best link (for amount data)
    const linksByPath = new Map<string, FileLink>();
    for (const link of fileLinks) {
      const existing = linksByPath.get(link.file_path);
      // Keep the link with more metadata
      if (!existing || (link.invoice_amount != null && existing.invoice_amount == null)) {
        linksByPath.set(link.file_path, link);
      }
    }

    // Count per category
    const catMap = new Map<string, CategoryStats>();
    let unclassifiedCount = 0;

    for (const path of allFilePaths) {
      const cat = getCategory(path);
      if (!cat) {
        unclassifiedCount++;
        continue;
      }

      let entry = catMap.get(cat);
      if (!entry) {
        entry = {
          category: cat,
          count: 0,
          amount: null,
          missingAmount: 0,
          hasAmountRelevance: AMOUNT_CATEGORIES.has(cat),
        };
        catMap.set(cat, entry);
      }
      entry.count++;

      const link = linksByPath.get(path);
      if (entry.hasAmountRelevance) {
        if (link?.invoice_amount != null) {
          entry.amount = (entry.amount || 0) + link.invoice_amount;
        } else {
          entry.missingAmount++;
        }
      }
    }

    // Build ordered result
    const result: CategoryStats[] = [];
    for (const cat of CATEGORY_ORDER) {
      const entry = catMap.get(cat);
      if (entry) result.push(entry);
    }
    // Add any custom categories not in the standard order
    for (const [cat, entry] of catMap) {
      if (!CATEGORY_ORDER.includes(cat)) result.push(entry);
    }

    return { categories: result, unclassifiedCount };
  }, [fileLinks, allFilePaths, getCategory]);

  const totalFiles = allFilePaths.length;
  if (totalFiles === 0) return null;

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(amount) + " kr";
  };

  const categoryI18n: Record<string, string> = {
    Offert: t("fileStats.quote", "Offerter"),
    Faktura: t("fileStats.invoice", "Fakturor"),
    Kvitto: t("fileStats.receipt", "Kvitton"),
    Kontrakt: t("fileStats.contract", "Kontrakt"),
    Specifikation: t("fileStats.specification", "Specifikationer"),
    Ritning: t("fileStats.drawing", "Ritningar"),
  };

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
      {stats.categories.map((s) => {
        const isActive = activeFilter === s.category;
        return (
          <button
            key={s.category}
            onClick={() => onFilterChange(isActive ? null : s.category)}
            className="shrink-0 text-left rounded-lg border transition-all cursor-pointer group"
            style={{
              padding: "10px 14px",
              minWidth: 120,
              background: isActive ? "hsl(var(--primary) / 0.06)" : "hsl(var(--card))",
              borderColor: isActive ? "hsl(var(--primary) / 0.3)" : "hsl(var(--border))",
              boxShadow: isActive ? "0 0 0 1px hsl(var(--primary) / 0.15)" : "none",
            }}
          >
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              {categoryI18n[s.category] || s.category}
            </div>
            <div className="text-lg font-semibold tracking-tight mt-0.5">
              {s.count} <span className="text-xs font-normal text-muted-foreground">st</span>
            </div>
            {s.hasAmountRelevance && s.amount != null && (
              <div className="text-sm text-muted-foreground tabular-nums mt-0.5">
                {formatAmount(s.amount)}
              </div>
            )}
            {s.hasAmountRelevance && s.missingAmount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFilterMissing(s.category);
                }}
                className="flex items-center gap-1 mt-1 text-[11px] bg-transparent border-none cursor-pointer p-0"
                style={{ color: "hsl(var(--warning))" }}
              >
                <AlertTriangle className="h-3 w-3" />
                {s.missingAmount} {t("fileStats.missingAmount", "saknar belopp")}
              </button>
            )}
          </button>
        );
      })}

      {/* Unclassified files */}
      {stats.unclassifiedCount > 0 && (
        <button
          onClick={() => onFilterChange(activeFilter === "__unclassified__" ? null : "__unclassified__")}
          className="shrink-0 text-left rounded-lg border transition-all cursor-pointer"
          style={{
            padding: "10px 14px",
            minWidth: 120,
            background: activeFilter === "__unclassified__"
              ? "hsl(40 65% 55% / 0.08)"
              : "hsl(var(--card))",
            borderColor: activeFilter === "__unclassified__"
              ? "hsl(40 65% 55% / 0.3)"
              : "hsl(var(--border))",
          }}
        >
          <div className="flex items-center gap-1">
            <FileQuestion className="h-3 w-3" style={{ color: "hsl(40 65% 55%)" }} />
            <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "hsl(40 65% 55%)" }}>
              {t("fileStats.unclassified", "Oklassificerade")}
            </span>
          </div>
          <div className="text-lg font-semibold tracking-tight mt-0.5">
            {stats.unclassifiedCount} <span className="text-xs font-normal text-muted-foreground">st</span>
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: "hsl(40 65% 55%)" }}>
            {t("fileStats.toClassify", "att tolka")}
          </div>
        </button>
      )}
    </div>
  );
}

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertTriangle,
  FileQuestion,
  FileText,
  Receipt,
  FileCheck,
  FileSignature,
  Ruler,
  ClipboardList,
} from "lucide-react";

/** Categories that can have meaningful amounts (invoice_amount) */
const AMOUNT_CATEGORIES = new Set(["Offert", "Faktura", "Kvitto"]);

/** Ordered display categories */
const CATEGORY_ORDER = ["Offert", "Faktura", "Kvitto", "Kontrakt", "Specifikation", "Ritning"];

/** Icons per category — matches PulseCards style */
const CATEGORY_ICONS: Record<string, typeof FileText> = {
  Offert: FileSignature,
  Faktura: FileText,
  Kvitto: Receipt,
  Kontrakt: FileCheck,
  Specifikation: ClipboardList,
  Ritning: Ruler,
};

interface FileLink {
  file_path: string;
  file_type: string;
  invoice_amount?: number | null;
  rot_amount?: number | null;
}

interface FileStatsStripProps {
  fileLinks: FileLink[];
  allFilePaths: string[];
  getCategory: (path: string) => string;
  activeFilter: string | null;
  onFilterChange: (category: string | null) => void;
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
    const linksByPath = new Map<string, FileLink>();
    for (const link of fileLinks) {
      const existing = linksByPath.get(link.file_path);
      if (!existing || (link.invoice_amount != null && existing.invoice_amount == null)) {
        linksByPath.set(link.file_path, link);
      }
    }

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

    const result: CategoryStats[] = [];
    for (const cat of CATEGORY_ORDER) {
      const entry = catMap.get(cat);
      if (entry) result.push(entry);
    }
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
    <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-0.5 -mx-1 px-1">
      {stats.categories.map((s) => {
        const isActive = activeFilter === s.category;
        const Icon = CATEGORY_ICONS[s.category] || FileText;
        return (
          <Card
            key={s.category}
            className={`shrink-0 min-w-0 cursor-pointer transition-all duration-200 shadow-sm ${
              isActive
                ? "ring-2 ring-primary/30 shadow-md border-primary/20"
                : "hover:shadow-lg hover:-translate-y-0.5"
            }`}
            onClick={() => onFilterChange(isActive ? null : s.category)}
          >
            <CardContent className="pt-3 pb-3 px-3 sm:pt-4 sm:pb-4 sm:px-4" style={{ minWidth: 120 }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-xs font-medium text-muted-foreground truncate">
                  {categoryI18n[s.category] || s.category}
                </span>
              </div>
              <p className={`text-2xl font-display font-normal tabular-nums ${isActive ? "text-primary" : ""}`}>
                {s.count}
              </p>
              {s.hasAmountRelevance && s.amount != null && (
                <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
                  {formatAmount(s.amount)}
                </p>
              )}
              {s.hasAmountRelevance && s.missingAmount > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFilterMissing(s.category);
                  }}
                  className="flex items-center gap-1 mt-1.5 text-[11px] bg-transparent border-none cursor-pointer p-0"
                >
                  <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" />
                  <span className="text-amber-600 dark:text-amber-400">
                    {s.missingAmount} {t("fileStats.missingAmount", "saknar belopp")}
                  </span>
                </button>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Unclassified files */}
      {stats.unclassifiedCount > 0 && (
        <Card
          className={`shrink-0 min-w-0 cursor-pointer transition-all duration-200 shadow-sm ${
            activeFilter === "__unclassified__"
              ? "ring-2 ring-amber-400/30 shadow-md border-amber-400/20"
              : "hover:shadow-lg hover:-translate-y-0.5"
          }`}
          onClick={() => onFilterChange(activeFilter === "__unclassified__" ? null : "__unclassified__")}
        >
          <CardContent className="pt-3 pb-3 px-3 sm:pt-4 sm:pb-4 sm:px-4" style={{ minWidth: 120 }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <FileQuestion className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400 truncate">
                {t("fileStats.unclassified", "Oklassificerade")}
              </span>
            </div>
            <p className="text-2xl font-display font-normal tabular-nums text-amber-600 dark:text-amber-400">
              {stats.unclassifiedCount}
            </p>
            <p className="text-[11px] text-amber-600/70 dark:text-amber-400/70 mt-0.5">
              {t("fileStats.toClassify", "att tolka")}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

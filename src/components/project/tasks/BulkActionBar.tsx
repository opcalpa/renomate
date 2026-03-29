import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, X, Plus } from "lucide-react";
import { getStatusBadgeColor } from "@/lib/statusColors";
import { DEFAULT_COST_CENTERS } from "@/lib/costCenters";
import { cn } from "@/lib/utils";
import { formatLocalDate } from "@/lib/dateUtils";

interface Stakeholder {
  id: string;
  name: string;
  role: string;
  contractor_category: string | null;
}

interface TeamMember {
  id: string;
  name: string;
  role?: string;
}

interface BulkActionBarProps {
  selectedCount: number;
  statusLabels: Record<string, string>;
  rooms: { id: string; name: string }[];
  stakeholders: Stakeholder[];
  teamMembers: TeamMember[];
  onBulkUpdate: (dbField: string, value: unknown) => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
  isLoading: boolean;
}

type ExtraFieldKey = "startDate" | "finishDate" | "costCenter" | "paymentStatus";

const EXTRA_FIELDS: { key: ExtraFieldKey; labelKey: string }[] = [
  { key: "startDate", labelKey: "tasksTable.bulkStartDate" },
  { key: "finishDate", labelKey: "tasksTable.bulkFinishDate" },
  { key: "costCenter", labelKey: "tasksTable.bulkCostCenter" },
  { key: "paymentStatus", labelKey: "tasksTable.bulkPaymentStatus" },
];

const PRIORITY_OPTIONS = [
  { value: "low", labelKey: "priorities.low" },
  { value: "medium", labelKey: "priorities.medium" },
  { value: "high", labelKey: "priorities.high" },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: "not_paid", labelKey: "tasks.notPaid" },
  { value: "paid", labelKey: "tasks.paid" },
  { value: "billed", labelKey: "tasks.billed" },
  { value: "partially_paid", labelKey: "tasks.partiallyPaid" },
];

export function BulkActionBar({
  selectedCount,
  statusLabels,
  rooms,
  stakeholders,
  teamMembers,
  onBulkUpdate,
  onBulkDelete,
  onClearSelection,
  isLoading,
}: BulkActionBarProps) {
  const { t } = useTranslation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [visibleExtras, setVisibleExtras] = useState<Set<ExtraFieldKey>>(new Set());

  const toggleExtra = (key: ExtraFieldKey) => {
    setVisibleExtras((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allAssignees = [
    ...stakeholders.map((s) => ({ id: s.id, name: s.name })),
    ...teamMembers.map((m) => ({ id: m.id, name: m.name })),
  ];

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap rounded-lg border bg-muted/50 px-3 py-2 animate-in fade-in slide-in-from-top-1 duration-200">
        <span className="text-sm font-medium whitespace-nowrap">
          {t("tasksTable.bulkSelected", { count: selectedCount, defaultValue: "{{count}} selected" })}
        </span>

        <div className="h-4 w-px bg-border" />

        {/* Status */}
        <Select onValueChange={(v) => onBulkUpdate("status", v)} disabled={isLoading}>
          <SelectTrigger className="h-7 w-[130px] text-xs">
            <SelectValue placeholder={t("tasksTable.bulkChangeStatus", "Status")} />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(statusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                <span className={cn("inline-block w-2 h-2 rounded-full mr-1.5", getStatusBadgeColor(value).includes("green") ? "bg-green-500" : getStatusBadgeColor(value).includes("blue") ? "bg-blue-500" : getStatusBadgeColor(value).includes("amber") ? "bg-amber-500" : "bg-gray-400")} />
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priority */}
        <Select onValueChange={(v) => onBulkUpdate("priority", v)} disabled={isLoading}>
          <SelectTrigger className="h-7 w-[120px] text-xs">
            <SelectValue placeholder={t("tasksTable.bulkChangePriority", "Priority")} />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {t(opt.labelKey, opt.value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Assignee */}
        {allAssignees.length > 0 && (
          <Select
            onValueChange={(v) => onBulkUpdate("assigned_to_stakeholder_id", v === "__unassigned__" ? null : v)}
            disabled={isLoading}
          >
            <SelectTrigger className="h-7 w-[140px] text-xs">
              <SelectValue placeholder={t("tasksTable.bulkChangeAssignee", "Assignee")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__unassigned__">
                {t("tasks.unassigned", "Unassigned")}
              </SelectItem>
              {allAssignees.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Room */}
        {rooms.length > 0 && (
          <Select
            onValueChange={(v) => onBulkUpdate("room_id", v === "__none__" ? null : v)}
            disabled={isLoading}
          >
            <SelectTrigger className="h-7 w-[120px] text-xs">
              <SelectValue placeholder={t("tasksTable.bulkChangeRoom", "Room")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">
                {t("tasks.noRoom", "No room")}
              </SelectItem>
              {rooms.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Extra fields: Start date */}
        {visibleExtras.has("startDate") && (
          <DatePicker
            date={undefined}
            onDateChange={(date) => {
              if (date) onBulkUpdate("start_date", formatLocalDate(date));
            }}
            placeholder={t("tasksTable.bulkStartDate", "Start date")}
            className="h-7 w-[140px] text-xs"
            disabled={isLoading}
          />
        )}

        {/* Extra fields: Finish date */}
        {visibleExtras.has("finishDate") && (
          <DatePicker
            date={undefined}
            onDateChange={(date) => {
              if (date) onBulkUpdate("finish_date", formatLocalDate(date));
            }}
            placeholder={t("tasksTable.bulkFinishDate", "Finish date")}
            className="h-7 w-[140px] text-xs"
            disabled={isLoading}
          />
        )}

        {/* Extra fields: Cost center */}
        {visibleExtras.has("costCenter") && (
          <Select onValueChange={(v) => onBulkUpdate("cost_center", v === "__none__" ? null : v)} disabled={isLoading}>
            <SelectTrigger className="h-7 w-[140px] text-xs">
              <SelectValue placeholder={t("tasksTable.bulkCostCenter", "Cost center")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{t("common.none", "None")}</SelectItem>
              {DEFAULT_COST_CENTERS.map((cc) => (
                <SelectItem key={cc.id} value={cc.id}>
                  {cc.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Extra fields: Payment status */}
        {visibleExtras.has("paymentStatus") && (
          <Select onValueChange={(v) => onBulkUpdate("payment_status", v)} disabled={isLoading}>
            <SelectTrigger className="h-7 w-[140px] text-xs">
              <SelectValue placeholder={t("tasksTable.bulkPaymentStatus", "Payment")} />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {t(opt.labelKey, opt.value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Add more fields popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs px-2" disabled={isLoading}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              {t("tasksTable.bulkMoreFields", "More")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48" align="start">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {t("tasksTable.bulkExtraFields", "Extra bulk fields")}
              </p>
              {EXTRA_FIELDS.map((field) => (
                <label
                  key={field.key}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={visibleExtras.has(field.key)}
                    onCheckedChange={() => toggleExtra(field.key)}
                  />
                  {t(field.labelKey, field.key)}
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <div className="h-4 w-px bg-border" />

        {/* Delete */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isLoading}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          {t("tasksTable.bulkDelete", "Delete")}
        </Button>

        {/* Clear selection */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs ml-auto"
          onClick={onClearSelection}
          disabled={isLoading}
        >
          <X className="h-3.5 w-3.5 mr-1" />
          {t("tasksTable.bulkClearSelection", "Clear")}
        </Button>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("tasksTable.bulkDeleteConfirmTitle", { count: selectedCount, defaultValue: "Delete {{count}} tasks?" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("tasksTable.bulkDeleteConfirmDesc", "This will permanently delete the selected tasks. This action cannot be undone.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setShowDeleteConfirm(false);
                onBulkDelete();
              }}
            >
              {t("tasksTable.bulkDelete", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

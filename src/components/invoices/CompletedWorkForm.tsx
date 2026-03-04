import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchInvoiceableTasks,
  createCompletedWorkInvoice,
  type InvoiceableTask,
  type TaskSelection,
} from "@/services/invoiceMethodService";

interface TaskRow {
  task: InvoiceableTask;
  selected: boolean;
  percent: string;
}

interface CompletedWorkFormProps {
  projectId: string;
  onCreated: (invoiceId: string) => void;
  onBack: () => void;
}

export function CompletedWorkForm({
  projectId,
  onCreated,
  onBack,
}: CompletedWorkFormProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [rows, setRows] = useState<TaskRow[]>([]);

  useEffect(() => {
    fetchInvoiceableTasks(projectId).then((tasks) => {
      setRows(
        tasks.map((task) => ({
          task,
          selected: task.status === "completed",
          percent: task.status === "completed" ? "100" : "0",
        }))
      );
      setLoading(false);
    });
  }, [projectId]);

  const toggleTask = (idx: number) => {
    setRows((prev) => {
      const next = [...prev];
      const row = { ...next[idx] };
      row.selected = !row.selected;
      if (row.selected && row.percent === "0") {
        row.percent = row.task.status === "completed" ? "100" : "50";
      }
      next[idx] = row;
      return next;
    });
  };

  const updatePercent = (idx: number, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], percent: value };
      return next;
    });
  };

  const getLineAmount = (row: TaskRow): number => {
    const pct = parseFloat(row.percent) || 0;
    const maxPct = (row.task.remainingAmount / row.task.calculatedCost) * 100;
    const effectivePct = Math.min(pct, maxPct);
    return Math.round(row.task.calculatedCost * (effectivePct / 100) * 100) / 100;
  };

  const totalAmount = useMemo(
    () =>
      rows
        .filter((r) => r.selected)
        .reduce((sum, r) => sum + getLineAmount(r), 0),
    [rows]
  );

  const handleCreate = async () => {
    const selections: TaskSelection[] = rows
      .filter((r) => r.selected && getLineAmount(r) > 0)
      .map((r) => ({
        taskId: r.task.id,
        percent: parseFloat(r.percent) || 0,
        amount: getLineAmount(r),
        isRotEligible: r.task.isRotEligible,
      }));

    if (selections.length === 0) return;
    setCreating(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setCreating(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      setCreating(false);
      return;
    }

    const invoiceId = await createCompletedWorkInvoice(
      projectId,
      profile.id,
      selections
    );

    setCreating(false);

    if (invoiceId) {
      toast.success(t("invoiceMethod.invoiceCreated"));
      onCreated(invoiceId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>{t("invoiceMethod.completedWork")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground py-4">
          {t("invoiceMethod.noCompletedTasks")}
        </p>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t("common.cancel")}
        </Button>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("invoiceMethod.selectTasks")}</DialogTitle>
      </DialogHeader>

      <div className="mt-2 max-h-[400px] overflow-y-auto -mx-1 px-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="w-8 pb-2" />
              <th className="text-left pb-2">{t("invoiceMethod.task")}</th>
              <th className="text-right pb-2 px-2">{t("invoiceMethod.cost")}</th>
              <th className="text-right pb-2 px-2">{t("invoiceMethod.invoiced")}</th>
              <th className="text-right pb-2 px-2 w-20">{t("invoiceMethod.percent")}</th>
              <th className="text-right pb-2">{t("invoiceMethod.amount")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const lineAmount = getLineAmount(row);

              return (
                <tr
                  key={row.task.id}
                  className={`border-b last:border-0 ${
                    row.selected ? "bg-primary/5" : ""
                  }`}
                >
                  <td className="py-2 pr-1">
                    <Checkbox
                      checked={row.selected}
                      onCheckedChange={() => toggleTask(idx)}
                    />
                  </td>
                  <td className="py-2">
                    <div className="font-medium truncate max-w-[160px]">
                      {row.task.title}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {row.task.status === "completed"
                        ? t("statuses.completed", "Completed")
                        : t("statuses.inProgress", "In progress")}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right whitespace-nowrap">
                    {formatCurrency(row.task.calculatedCost)}
                  </td>
                  <td className="py-2 px-2 text-right whitespace-nowrap text-muted-foreground">
                    {row.task.invoicedPercent > 0
                      ? `${row.task.invoicedPercent}%`
                      : "\u2014"}
                  </td>
                  <td className="py-2 px-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={5}
                      value={row.percent}
                      onChange={(e) => updatePercent(idx, e.target.value)}
                      disabled={!row.selected}
                      className="h-7 w-16 text-right text-xs ml-auto"
                    />
                  </td>
                  <td className="py-2 text-right whitespace-nowrap font-medium">
                    {row.selected && lineAmount > 0
                      ? formatCurrency(lineAmount)
                      : "\u2014"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Total */}
      <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border mt-3">
        <span className="text-sm font-medium">
          {t("invoiceMethod.totalInvoiceAmount")}
        </span>
        <span className="text-lg font-bold">{formatCurrency(totalAmount)}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-4">
        <Button variant="outline" onClick={onBack} disabled={creating}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t("common.cancel")}
        </Button>
        <Button
          onClick={handleCreate}
          disabled={creating || totalAmount <= 0}
        >
          {creating ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              {t("invoiceMethod.creating")}
            </>
          ) : (
            t("invoiceMethod.createInvoice")
          )}
        </Button>
      </div>
    </>
  );
}

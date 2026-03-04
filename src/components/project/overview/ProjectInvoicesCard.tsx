import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Receipt } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ProjectInvoicesDialog } from "./ProjectInvoicesDialog";

interface ProjectInvoicesCardProps {
  projectId: string;
  currency?: string | null;
  onCreateInvoice: () => void;
}

interface InvoiceSummary {
  total: number;
  draft: number;
  sent: number;
  paid: number;
  partially_paid: number;
  overdue: number;
}

export function ProjectInvoicesCard({
  projectId,
  currency,
  onCreateInvoice,
}: ProjectInvoicesCardProps) {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<InvoiceSummary>({
    total: 0,
    draft: 0,
    sent: 0,
    paid: 0,
    partially_paid: 0,
    overdue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("invoices")
        .select("status, due_date, sent_at")
        .eq("project_id", projectId);

      if (error) {
        console.error("Failed to fetch invoices:", error);
        setLoading(false);
        return;
      }

      const now = new Date();
      const counts: InvoiceSummary = {
        total: data?.length || 0,
        draft: 0,
        sent: 0,
        paid: 0,
        partially_paid: 0,
        overdue: 0,
      };

      for (const inv of data || []) {
        if (inv.status === "draft") counts.draft++;
        else if (inv.status === "sent") {
          if (inv.due_date && new Date(inv.due_date) < now) {
            counts.overdue++;
          } else {
            counts.sent++;
          }
        } else if (inv.status === "paid") counts.paid++;
        else if (inv.status === "partially_paid") counts.partially_paid++;
      }

      setSummary(counts);
      setLoading(false);
    };

    fetchInvoices();
  }, [projectId]);

  const statusParts: string[] = [];
  if (summary.draft > 0)
    statusParts.push(`${summary.draft} ${t("invoices.draft").toLowerCase()}`);
  if (summary.sent > 0)
    statusParts.push(`${summary.sent} ${t("invoices.sent").toLowerCase()}`);
  if (summary.overdue > 0)
    statusParts.push(`${summary.overdue} ${t("invoices.overdue").toLowerCase()}`);
  if (summary.partially_paid > 0)
    statusParts.push(
      `${summary.partially_paid} ${t("invoices.partiallyPaid").toLowerCase()}`
    );
  if (summary.paid > 0)
    statusParts.push(`${summary.paid} ${t("invoices.paid").toLowerCase()}`);

  const statusText = statusParts.join(" · ");

  return (
    <>
      <Card
        className={cn(
          "cursor-pointer transition-colors hover:bg-muted/50",
          summary.total === 0 && "border-dashed"
        )}
        onClick={() => setDialogOpen(true)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Receipt className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t("invoices.title")}</span>
                  {summary.total > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {summary.total}
                    </Badge>
                  )}
                </div>
                {loading ? (
                  <p className="text-sm text-muted-foreground">
                    {t("common.loading")}
                  </p>
                ) : summary.total === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("invoices.noInvoices")}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">{statusText}</p>
                )}
              </div>
            </div>
            {summary.overdue > 0 && (
              <Badge variant="destructive" className="text-xs">
                {summary.overdue} {t("invoices.overdue").toLowerCase()}
              </Badge>
            )}
            {summary.overdue === 0 && summary.paid > 0 && (
              <Badge variant="default" className="bg-green-600 text-xs">
                {summary.paid} {t("invoices.paid").toLowerCase()}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <ProjectInvoicesDialog
        projectId={projectId}
        currency={currency}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreateInvoice={() => {
          setDialogOpen(false);
          onCreateInvoice();
        }}
      />
    </>
  );
}

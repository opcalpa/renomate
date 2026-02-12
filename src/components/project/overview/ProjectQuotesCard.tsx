import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ProjectQuotesDialog } from "./ProjectQuotesDialog";

interface ProjectQuotesCardProps {
  projectId: string;
  currency?: string | null;
  onCreateQuote: () => void;
}

interface QuoteSummary {
  total: number;
  draft: number;
  sent: number;
  accepted: number;
  rejected: number;
}

export function ProjectQuotesCard({ projectId, currency, onCreateQuote }: ProjectQuotesCardProps) {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<QuoteSummary>({
    total: 0,
    draft: 0,
    sent: 0,
    accepted: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const fetchQuotes = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("quotes")
        .select("status")
        .eq("project_id", projectId);

      if (error) {
        console.error("Failed to fetch quotes:", error);
        setLoading(false);
        return;
      }

      const counts: QuoteSummary = {
        total: data?.length || 0,
        draft: 0,
        sent: 0,
        accepted: 0,
        rejected: 0,
      };

      for (const quote of data || []) {
        if (quote.status === "draft") counts.draft++;
        else if (quote.status === "sent") counts.sent++;
        else if (quote.status === "accepted") counts.accepted++;
        else if (quote.status === "rejected") counts.rejected++;
      }

      setSummary(counts);
      setLoading(false);
    };

    fetchQuotes();
  }, [projectId]);

  // Build status summary text
  const statusParts: string[] = [];
  if (summary.draft > 0) statusParts.push(`${summary.draft} ${t("quotes.draft").toLowerCase()}`);
  if (summary.sent > 0) statusParts.push(`${summary.sent} ${t("quotes.sent").toLowerCase()}`);
  if (summary.accepted > 0) statusParts.push(`${summary.accepted} ${t("quotes.accepted").toLowerCase()}`);
  if (summary.rejected > 0) statusParts.push(`${summary.rejected} ${t("quotes.rejected").toLowerCase()}`);

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
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t("quotes.title")}</span>
                  {summary.total > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {summary.total}
                    </Badge>
                  )}
                </div>
                {loading ? (
                  <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
                ) : summary.total === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("quotes.noSavedQuotes")}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">{statusText}</p>
                )}
              </div>
            </div>
            {summary.accepted > 0 && (
              <Badge variant="default" className="bg-green-600">
                {summary.accepted} {t("quotes.accepted").toLowerCase()}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <ProjectQuotesDialog
        projectId={projectId}
        currency={currency}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreateQuote={() => {
          setDialogOpen(false);
          onCreateQuote();
        }}
      />
    </>
  );
}

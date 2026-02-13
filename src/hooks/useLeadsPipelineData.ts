import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { LeadsPipelineData, IntakeRequestSummary, QuoteSummary } from "@/components/pipeline/types";

interface UseLeadsPipelineDataResult {
  data: LeadsPipelineData;
  intakeRequests: IntakeRequestSummary[];
  quotes: QuoteSummary[];
  refetch: () => Promise<void>;
}

export function useLeadsPipelineData(): UseLeadsPipelineDataResult {
  const [data, setData] = useState<LeadsPipelineData>({
    intakeRequests: { total: 0, pending: 0, submitted: 0, unlinked: 0 },
    quotes: { total: 0, draft: 0, sent: 0, accepted: 0, rejected: 0, acceptedTotal: 0 },
    loading: true,
  });
  const [intakeRequests, setIntakeRequests] = useState<IntakeRequestSummary[]>([]);
  const [quotes, setQuotes] = useState<QuoteSummary[]>([]);

  const fetchData = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true }));

    try {
      // Fetch intake requests and quotes in parallel
      const [intakeRes, quotesRes] = await Promise.all([
        supabase
          .from("customer_intake_requests")
          .select("id, customer_name, customer_email, property_address, property_city, status, project_id, created_at, submitted_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("quotes")
          .select("id, title, status, total_amount, total_after_rot, project_id, updated_at, created_at")
          .order("updated_at", { ascending: false }),
      ]);

      if (intakeRes.error) {
        console.error("Failed to fetch intake requests:", intakeRes.error);
      }

      if (quotesRes.error) {
        console.error("Failed to fetch quotes:", quotesRes.error);
      }

      const intakeData = intakeRes.data || [];
      const quotesData = quotesRes.data || [];

      // Get project names for intake requests that have project_id
      const intakeProjectIds = intakeData
        .filter((i) => i.project_id)
        .map((i) => i.project_id as string);

      // Get project names for quotes
      const quoteProjectIds = quotesData.map((q) => q.project_id);

      const allProjectIds = [...new Set([...intakeProjectIds, ...quoteProjectIds])];

      let projectNames: Map<string, string> = new Map();
      if (allProjectIds.length > 0) {
        const { data: projects } = await supabase
          .from("projects")
          .select("id, name")
          .in("id", allProjectIds);

        if (projects) {
          projectNames = new Map(projects.map((p) => [p.id, p.name]));
        }
      }

      // Aggregate intake request stats
      const intakeStats = {
        total: intakeData.length,
        pending: intakeData.filter((i) => i.status === "pending").length,
        submitted: intakeData.filter((i) => i.status === "submitted").length,
        unlinked: intakeData.filter((i) => !i.project_id && i.status !== "cancelled" && i.status !== "converted").length,
      };

      // Aggregate quote stats
      const quoteStats = {
        total: quotesData.length,
        draft: quotesData.filter((q) => q.status === "draft").length,
        sent: quotesData.filter((q) => q.status === "sent").length,
        accepted: quotesData.filter((q) => q.status === "accepted").length,
        rejected: quotesData.filter((q) => q.status === "rejected").length,
        acceptedTotal: quotesData
          .filter((q) => q.status === "accepted")
          .reduce((sum, q) => sum + (q.total_after_rot || q.total_amount || 0), 0),
      };

      // Enrich intake requests with project names
      const enrichedIntakes: IntakeRequestSummary[] = intakeData.map((i) => ({
        ...i,
        project_name: i.project_id ? projectNames.get(i.project_id) || null : null,
      }));

      // Enrich quotes with project names
      const enrichedQuotes: QuoteSummary[] = quotesData.map((q) => ({
        ...q,
        project_name: projectNames.get(q.project_id) || null,
      }));

      setIntakeRequests(enrichedIntakes);
      setQuotes(enrichedQuotes);
      setData({
        intakeRequests: intakeStats,
        quotes: quoteStats,
        loading: false,
      });
    } catch (error) {
      console.error("Failed to fetch pipeline data:", error);
      setData((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, intakeRequests, quotes, refetch: fetchData };
}

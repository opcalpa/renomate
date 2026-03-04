import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { LeadsPipelineData, IntakeRequestSummary, QuoteSummary, ProjectBucket } from "@/components/pipeline/types";

interface UseLeadsPipelineDataResult {
  data: LeadsPipelineData;
  intakeRequests: IntakeRequestSummary[];
  projectBuckets: Map<ProjectBucket, QuoteSummary[]>;
  refetch: () => Promise<void>;
}

const STATUS_PRIORITY: Record<string, number> = {
  accepted: 3,
  sent: 2,
  draft: 1,
};

function getBestStatus(quotes: QuoteSummary[]): ProjectBucket | null {
  let best: ProjectBucket | null = null;
  let bestPriority = 0;
  for (const q of quotes) {
    const p = STATUS_PRIORITY[q.status] || 0;
    if (p > bestPriority) {
      bestPriority = p;
      best = q.status as ProjectBucket;
    }
  }
  return best;
}

function getRepresentativeAmounts(quotes: QuoteSummary[], bucket: ProjectBucket): { totalAmount: number; totalAfterRot: number } {
  if (bucket === "accepted") {
    const accepted = quotes.filter((q) => q.status === "accepted");
    return {
      totalAmount: accepted.reduce((sum, q) => sum + (q.total_amount || 0), 0),
      totalAfterRot: accepted.reduce((sum, q) => sum + (q.total_after_rot || q.total_amount || 0), 0),
    };
  }
  // For draft/sent: latest quote with that status
  const matching = quotes
    .filter((q) => q.status === bucket)
    .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());
  if (matching.length === 0) return { totalAmount: 0, totalAfterRot: 0 };
  return {
    totalAmount: matching[0].total_amount || 0,
    totalAfterRot: matching[0].total_after_rot || matching[0].total_amount || 0,
  };
}

export function useLeadsPipelineData(): UseLeadsPipelineDataResult {
  const [data, setData] = useState<LeadsPipelineData>({
    intakeRequests: { total: 0, pending: 0, submitted: 0, unlinked: 0 },
    projectQuotes: {
      draft: { count: 0, totalAmount: 0, totalAfterRot: 0 },
      sent: { count: 0, totalAmount: 0, totalAfterRot: 0 },
      accepted: { count: 0, totalAmount: 0, totalAfterRot: 0 },
    },
    loading: true,
  });
  const [intakeRequests, setIntakeRequests] = useState<IntakeRequestSummary[]>([]);
  const [projectBuckets, setProjectBuckets] = useState<Map<ProjectBucket, QuoteSummary[]>>(new Map());

  const fetchData = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true }));

    try {
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

      // Get project names
      const intakeProjectIds = intakeData
        .filter((i) => i.project_id)
        .map((i) => i.project_id as string);
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

      // Enrich quotes with project names
      const enrichedQuotes: QuoteSummary[] = quotesData.map((q) => ({
        ...q,
        project_name: projectNames.get(q.project_id) || null,
      }));

      // Group quotes by project_id
      const projectGroups = new Map<string, QuoteSummary[]>();
      for (const q of enrichedQuotes) {
        // Skip rejected/expired quotes for bucket determination
        if (q.status === "rejected" || q.status === "expired") continue;
        const group = projectGroups.get(q.project_id) || [];
        group.push(q);
        projectGroups.set(q.project_id, group);
      }

      // Determine bucket per project and aggregate
      const buckets = new Map<ProjectBucket, QuoteSummary[]>([
        ["draft", []],
        ["sent", []],
        ["accepted", []],
      ]);
      const stats = {
        draft: { count: 0, totalAmount: 0, totalAfterRot: 0 },
        sent: { count: 0, totalAmount: 0, totalAfterRot: 0 },
        accepted: { count: 0, totalAmount: 0, totalAfterRot: 0 },
      };

      for (const [, projectQuotes] of projectGroups) {
        const bucket = getBestStatus(projectQuotes);
        if (!bucket) continue;

        const amounts = getRepresentativeAmounts(projectQuotes, bucket);
        stats[bucket].count += 1;
        stats[bucket].totalAmount += amounts.totalAmount;
        stats[bucket].totalAfterRot += amounts.totalAfterRot;

        // Only add quotes matching the bucket status for dialog display
        const matchingQuotes = projectQuotes.filter((q) => q.status === bucket);
        buckets.get(bucket)!.push(...matchingQuotes);
      }

      // Enrich intake requests with project names
      const enrichedIntakes: IntakeRequestSummary[] = intakeData.map((i) => ({
        ...i,
        project_name: i.project_id ? projectNames.get(i.project_id) || null : null,
      }));

      setIntakeRequests(enrichedIntakes);
      setProjectBuckets(buckets);
      setData({
        intakeRequests: intakeStats,
        projectQuotes: stats,
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

  return { data, intakeRequests, projectBuckets, refetch: fetchData };
}

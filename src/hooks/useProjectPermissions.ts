import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuthSession";
import { isDemoProject } from "@/services/demoProjectService";

export interface ProjectPermissions {
  isOwner: boolean;
  isSystemAdmin: boolean;
  isDemoProject: boolean;
  overview: string;
  timeline: string;
  tasks: string;
  tasksScope: string;
  spacePlanner: string;
  purchases: string;
  purchasesScope: string;
  budget: string;
  files: string;
  teams: string;
  loading: boolean;
}

const ALL_EDIT: Omit<ProjectPermissions, "loading"> = {
  isOwner: true,
  isSystemAdmin: false,
  isDemoProject: false,
  overview: "edit",
  timeline: "edit",
  tasks: "edit",
  tasksScope: "all",
  spacePlanner: "edit",
  purchases: "edit",
  purchasesScope: "all",
  budget: "view",
  files: "edit",
  teams: "invite",
};

// View-only permissions for demo project (non-admin users)
const DEMO_VIEW_ONLY: Omit<ProjectPermissions, "loading"> = {
  isOwner: false,
  isSystemAdmin: false,
  isDemoProject: true,
  overview: "view",
  timeline: "view",
  tasks: "view",
  tasksScope: "all",
  spacePlanner: "view",
  purchases: "view",
  purchasesScope: "all",
  budget: "view",
  files: "view",
  teams: "none",
};

const ALL_NONE: Omit<ProjectPermissions, "loading"> = {
  isOwner: false,
  isSystemAdmin: false,
  isDemoProject: false,
  overview: "none",
  timeline: "none",
  tasks: "none",
  tasksScope: "all",
  spacePlanner: "none",
  purchases: "none",
  purchasesScope: "all",
  budget: "none",
  files: "none",
  teams: "none",
};

export function useProjectPermissions(projectId: string | undefined): ProjectPermissions {
  const { user } = useAuthSession();
  const [perms, setPerms] = useState<Omit<ProjectPermissions, "loading">>(ALL_NONE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !projectId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchPermissions = async () => {
      setLoading(true);

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, is_system_admin")
        .eq("user_id", user.id)
        .single();

      if (!profile || cancelled) {
        setLoading(false);
        return;
      }

      const isAdmin = (profile as { id: string; is_system_admin?: boolean }).is_system_admin === true;

      const { data: project } = await supabase
        .from("projects")
        .select("owner_id, project_type")
        .eq("id", projectId)
        .single();

      if (!project || cancelled) {
        setLoading(false);
        return;
      }

      const isDemo = isDemoProject(project.project_type);

      // Demo project: only system admin can edit, others get view-only
      if (isDemo) {
        if (isAdmin) {
          setPerms({ ...ALL_EDIT, isSystemAdmin: true, isDemoProject: true });
        } else {
          setPerms(DEMO_VIEW_ONLY);
        }
        setLoading(false);
        return;
      }

      if (project.owner_id === profile.id) {
        setPerms({ ...ALL_EDIT, isSystemAdmin: isAdmin });
        setLoading(false);
        return;
      }

      const { data: share } = await supabase
        .from("project_shares")
        .select("overview_access, timeline_access, tasks_access, tasks_scope, space_planner_access, purchases_access, purchases_scope, budget_access, files_access, teams_access")
        .eq("project_id", projectId)
        .eq("shared_with_user_id", profile.id)
        .maybeSingle();

      if (cancelled) return;

      if (!share) {
        setPerms(ALL_NONE);
      } else {
        setPerms({
          isOwner: false,
          overview: share.overview_access || "none",
          timeline: share.timeline_access || "none",
          tasks: share.tasks_access || "none",
          tasksScope: share.tasks_scope || "all",
          spacePlanner: share.space_planner_access || "none",
          purchases: share.purchases_access || "none",
          purchasesScope: share.purchases_scope || "all",
          budget: share.budget_access || "none",
          files: share.files_access || "none",
          teams: share.teams_access || "none",
        });
      }

      setLoading(false);
    };

    fetchPermissions();

    return () => {
      cancelled = true;
    };
  }, [user, projectId]);

  return useMemo(() => ({ ...perms, loading }), [perms, loading]);
}

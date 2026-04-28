/**
 * OwnerStart — Homeowner start page.
 *
 * Architecture decision: separate page for homeowners (50%+ different from contractor).
 * - 1 project → redirect straight into it
 * - 0 projects → welcome screen with CTA
 * - 2+ projects → project cards with progress + ROT summary
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuthSession";
import { AppHeader } from "@/components/AppHeader";
import { HomeownerYearlyAnalysis } from "@/components/project/HomeownerYearlyAnalysis";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Plus, Home, ChevronRight, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface OwnerProject {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  status: string | null;
  total_budget: number | null;
  created_at: string;
}

interface ProjectProgress {
  done: number;
  total: number;
}

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-blue-100 text-blue-700 border-blue-200",
  active: "bg-green-100 text-green-700 border-green-200",
  on_hold: "bg-yellow-100 text-yellow-700 border-yellow-200",
  completed: "bg-gray-100 text-gray-600 border-gray-200",
};

export default function OwnerStart() {
  const { user } = useAuthSession();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [projects, setProjects] = useState<OwnerProject[]>([]);
  const [progress, setProgress] = useState<Record<string, ProjectProgress>>({});
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ name: string; email: string | null; avatar_url: string | null } | null>(null);

  useEffect(() => {
    if (!user) return;

    async function load() {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("name, email, avatar_url, id")
        .eq("user_id", user!.id)
        .single();

      setProfile(profileData);

      const profileId = profileData?.id;
      const { data: ownProjects } = await supabase
        .from("projects")
        .select("id, name, address, city, status, total_budget, created_at")
        .eq("owner_id", profileId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      let sharedProjects: OwnerProject[] = [];
      if (profileId) {
        const { data: shares } = await supabase
          .from("project_shares")
          .select("project_id")
          .eq("shared_with_user_id", profileId);

        if (shares && shares.length > 0) {
          const sharedIds = shares.map(s => s.project_id);
          const { data: sp } = await supabase
            .from("projects")
            .select("id, name, address, city, status, total_budget, created_at")
            .in("id", sharedIds)
            .is("deleted_at", null);
          sharedProjects = sp || [];
        }
      }

      // Merge and deduplicate
      const allProjects = [...(ownProjects || [])];
      for (const sp of sharedProjects) {
        if (!allProjects.some(p => p.id === sp.id)) {
          allProjects.push(sp);
        }
      }

      setProjects(allProjects);

      // Fetch task progress per project
      if (allProjects.length > 0) {
        const projectIds = allProjects.map(p => p.id);
        const { data: tasks } = await supabase
          .from("tasks")
          .select("project_id, status")
          .in("project_id", projectIds);

        if (tasks) {
          const prog: Record<string, ProjectProgress> = {};
          for (const task of tasks) {
            if (!prog[task.project_id]) prog[task.project_id] = { done: 0, total: 0 };
            prog[task.project_id].total++;
            if (task.status === "done") prog[task.project_id].done++;
          }
          setProgress(prog);
        }
      }

      setLoading(false);
    }

    load();
  }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 1 project → redirect into it
  if (projects.length === 1) {
    navigate(`/projects/${projects[0].id}`, { replace: true });
    return null;
  }

  const nonDemoProjects = projects.filter(p => p.status !== "demo");

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        userName={profile?.name}
        userEmail={profile?.email || user?.email}
        avatarUrl={profile?.avatar_url}
        onSignOut={handleSignOut}
      />

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* 0 projects → welcome */}
        {projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Home className="h-16 w-16 text-muted-foreground/30" />
            <h1 className="text-2xl font-semibold">
              {t("ownerStart.welcome")}
            </h1>
            <p className="text-muted-foreground text-center max-w-md">
              {t("ownerStart.welcomeDescription")}
            </p>
            <Button size="lg" onClick={() => navigate("/start")} className="mt-4">
              <Plus className="h-5 w-5 mr-2" />
              {t("ownerStart.createProject")}
            </Button>
          </div>
        )}

        {/* 2+ projects → project cards */}
        {projects.length > 1 && (
          <>
            <h1 className="text-2xl font-semibold mb-6">
              {t("ownerStart.myRenovations")}
            </h1>

            <div className="space-y-3 mb-8">
              {projects.map(project => {
                const prog = progress[project.id];
                const pct = prog && prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;

                return (
                  <Card
                    key={project.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{project.name}</span>
                            {project.status && (
                              <Badge
                                variant="outline"
                                className={cn("text-xs shrink-0 border", STATUS_COLORS[project.status] || "")}
                              >
                                {t(`projectStatus.${project.status}`, project.status)}
                              </Badge>
                            )}
                          </div>
                          {(project.address || project.city) && (
                            <p className="text-sm text-muted-foreground truncate mt-0.5">
                              {[project.address, project.city].filter(Boolean).join(", ")}
                            </p>
                          )}
                        </div>
                        {project.total_budget != null && project.total_budget > 0 && (
                          <span className="text-sm font-medium text-muted-foreground shrink-0">
                            {formatCurrency(project.total_budget)}
                          </span>
                        )}
                        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                      </div>

                      {/* Task progress */}
                      {prog && prog.total > 0 && (
                        <div className="mt-3 flex items-center gap-3">
                          <Progress value={pct} className="h-1.5 flex-1" />
                          <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            {prog.done}/{prog.total}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* ROT/cost summary */}
            {nonDemoProjects.length > 0 && (
              <HomeownerYearlyAnalysis
                projects={nonDemoProjects.map(p => ({ id: p.id, name: p.name }))}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

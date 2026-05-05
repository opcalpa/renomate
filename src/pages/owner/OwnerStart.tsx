/**
 * OwnerStart — Homeowner start page (handoff design).
 *
 * - 1 project → redirect straight into it
 * - 0 projects → welcome with onboarding CTA
 * - 2+ projects → editorial cards with progress + ROT summary
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuthSession";
import { AppHeader } from "@/components/AppHeader";
import { AppBottomNav } from "@/components/AppBottomNav";
import { HomeownerYearlyAnalysis } from "@/components/project/HomeownerYearlyAnalysis";
import { Loader2, Plus, Home } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

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

function chipClass(status: string | null): string {
  if (!status) return "rf-chip";
  if (status === "completed") return "rf-chip chip-muted";
  if (status === "on_hold") return "rf-chip chip-warn";
  return "rf-chip chip-primary";
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "God natt";
  if (hour < 12) return "God morgon";
  if (hour < 17) return "God eftermiddag";
  return "God kväll";
}

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

      const allProjects = [...(ownProjects || [])];
      for (const sp of sharedProjects) {
        if (!allProjects.some(p => p.id === sp.id)) allProjects.push(sp);
      }

      setProjects(allProjects);

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
            if (task.status === "completed" || task.status === "done") prog[task.project_id].done++;
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

  // 1 project → redirect
  if (projects.length === 1) {
    navigate(`/projects/${projects[0].id}`, { replace: true });
    return null;
  }

  const firstName = profile?.name?.split(" ")[0] || "";
  const activeProjects = projects.filter(p => p.status !== "completed" && p.status !== "archived");
  const completedProjects = projects.filter(p => p.status === "completed");
  const totalInvested = projects.reduce((s, p) => s + (p.total_budget || 0), 0);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <AppHeader
        userName={profile?.name}
        userEmail={profile?.email || user?.email}
        avatarUrl={profile?.avatar_url}
        onSignOut={handleSignOut}
      />

      <main className="px-4 sm:px-6 md:px-10 py-6 md:py-8 max-w-[900px] mx-auto">
        {/* 0 projects → welcome empty state */}
        {projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div style={{
              width: 56, height: 56, borderRadius: 12,
              background: "var(--bg-sunken, hsl(var(--muted)))",
              border: "1px solid var(--hairline, hsl(var(--border)))",
              display: "grid", placeItems: "center",
            }}>
              <Home className="h-6 w-6 text-muted-foreground" />
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-normal tracking-tight">
              {t("ownerStart.welcomeTitle", "Välkommen till Renofine")}
            </h1>
            <p className="text-[15px] text-muted-foreground max-w-md leading-relaxed">
              {t("ownerStart.welcomeDescription", "Här samlar du allt om din renovering — budget, tidslinje, inköp och kommunikation med din byggare.")}
            </p>
            <button
              className="rf-btn rf-btn-primary mt-4"
              style={{ padding: "10px 20px", fontSize: 14 }}
              onClick={() => navigate("/start")}
            >
              <Plus className="h-4 w-4" />
              {t("ownerStart.createProject", "Skapa projekt")}
            </button>
          </div>
        )}

        {/* 2+ projects */}
        {projects.length > 1 && (
          <>
            {/* Greeting */}
            <div className="mb-6 md:mb-8 pb-5 border-b border-border/60">
              <span className="kicker">
                {t("ownerStart.kicker", "Mina renoveringar")}
              </span>
              <h1 className="font-display text-3xl sm:text-4xl font-normal tracking-tight mt-1">
                {getGreeting()}, {firstName}.
              </h1>
              {totalInvested > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  {t("ownerStart.summary", "{{active}} aktiva projekt · {{invested}} investerat", {
                    active: activeProjects.length,
                    invested: formatCurrency(totalInvested),
                  })}
                </p>
              )}
            </div>

            {/* Active project cards */}
            {activeProjects.length > 0 && (
              <section className="mb-8">
                <div className="flex flex-col gap-3">
                  {activeProjects.map(project => {
                    const prog = progress[project.id];
                    const pct = prog && prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;
                    const budgetTkr = project.total_budget ? Math.round(project.total_budget / 1000) : 0;

                    return (
                      <div
                        key={project.id}
                        onClick={() => navigate(`/projects/${project.id}`)}
                        className="rounded-xl border border-border/60 bg-card p-4 sm:p-5 cursor-pointer hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="text-[15px] font-medium tracking-[-0.003em]">{project.name}</h3>
                            {(project.address || project.city) && (
                              <p className="font-mono text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">
                                {[project.address, project.city].filter(Boolean).join(", ")}
                                {budgetTkr > 0 && ` · ${budgetTkr}k kr`}
                              </p>
                            )}
                          </div>
                          <span className={chipClass(project.status)} style={{ flexShrink: 0 }}>
                            {t(`projectStatus.${project.status}`, project.status || "")}
                          </span>
                        </div>

                        {prog && prog.total > 0 && (
                          <div className="flex items-center gap-3 mt-3">
                            <div className="flex-1 h-[3px] bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] text-muted-foreground tnum">
                              {prog.done}/{prog.total}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Completed projects */}
            {completedProjects.length > 0 && (
              <section className="mb-8">
                <span className="kicker">{t("ownerStart.completedKicker", "Avslutade")}</span>
                <div className="flex flex-col gap-2 mt-3">
                  {completedProjects.map(project => (
                    <div
                      key={project.id}
                      onClick={() => navigate(`/projects/${project.id}`)}
                      className="rounded-xl border border-border/60 bg-card/60 p-3 sm:p-4 cursor-pointer hover:bg-card transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <span className="text-sm font-medium">{project.name}</span>
                        {project.total_budget && project.total_budget > 0 && (
                          <span className="font-mono text-[10px] text-muted-foreground ml-2 tnum">
                            {formatCurrency(project.total_budget)}
                          </span>
                        )}
                      </div>
                      <span className="rf-chip chip-muted">{t("projectStatus.completed", "Klar")}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ROT/cost yearly analysis */}
            {projects.filter(p => p.status !== "demo").length > 0 && (
              <HomeownerYearlyAnalysis
                projects={projects.filter(p => p.status !== "demo").map(p => ({ id: p.id, name: p.name }))}
              />
            )}
          </>
        )}
      </main>

      <AppBottomNav />
    </div>
  );
}

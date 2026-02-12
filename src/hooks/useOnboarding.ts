import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { triggerConfetti } from "@/lib/confetti";

export type StepKey =
  | "project"
  | "enterCanvas"
  | "drawRoom"
  | "generateWalls"
  | "taskWithRoom"
  | "profile"
  | "viewProject"
  | "postComment";

export interface OnboardingStep {
  key: string;
  labelKey: string;
  instructionKey: string;
  hotspotId?: string;
  canvasHintKey?: string;
  completed: boolean;
  link?: string;
  optional?: boolean;
}

export interface OnboardingState {
  steps: OnboardingStep[];
  completedCount: number;
  totalSteps: number;
  isComplete: boolean;
  isDismissed: boolean;
  loading: boolean;
  profileId: string | null;
  userType: string | null;
  currentStep: OnboardingStep | null;
  currentStepKey: StepKey | null;
  isStepActive: (key: StepKey) => boolean;
  dismiss: () => Promise<void>;
  markStepComplete: (step: StepKey) => Promise<void>;
  refresh: () => Promise<void>;
}

interface StepConfig {
  key: StepKey;
  dbField: string;
  labelKey: string;
  instructionKey: string;
  hotspotId?: string;
  canvasHintKey?: string;
  link?: string;
  optional?: boolean;
}

function getStepsConfig(userType: string | null): StepConfig[] {
  if (userType === "invited_client") {
    return [
      {
        key: "viewProject" as StepKey,
        dbField: "onboarding_entered_canvas",
        labelKey: "onboarding.steps.viewProject.label",
        instructionKey: "onboarding.steps.viewProject.instruction",
      },
      {
        key: "postComment" as StepKey,
        dbField: "onboarding_created_quote",
        labelKey: "onboarding.steps.postComment.label",
        instructionKey: "onboarding.steps.postComment.instruction",
        optional: true,
      },
    ];
  }

  if (userType === "homeowner") {
    return [
      {
        key: "project",
        dbField: "onboarding_created_project",
        labelKey: "onboarding.steps.project.label",
        instructionKey: "onboarding.steps.project.instruction",
        hotspotId: "create-project",
      },
      {
        key: "enterCanvas",
        dbField: "onboarding_entered_canvas",
        labelKey: "onboarding.steps.enterCanvas.label",
        instructionKey: "onboarding.steps.enterCanvas.instruction",
        hotspotId: "canvas-tab",
      },
      {
        key: "drawRoom",
        dbField: "onboarding_drawn_room",
        labelKey: "onboarding.steps.drawRoom.label",
        instructionKey: "onboarding.steps.drawRoom.instruction",
        hotspotId: "room-tool",
        canvasHintKey: "onboarding.steps.drawRoom.canvasHint",
      },
      {
        key: "generateWalls",
        dbField: "onboarding_generated_walls",
        labelKey: "onboarding.steps.generateWalls.label",
        instructionKey: "onboarding.steps.generateWalls.instruction",
        hotspotId: "generate-walls",
        canvasHintKey: "onboarding.steps.generateWalls.canvasHint",
        optional: true,
      },
      {
        key: "taskWithRoom",
        dbField: "onboarding_created_task_room",
        labelKey: "onboarding.steps.taskWithRoom.label",
        instructionKey: "onboarding.steps.taskWithRoom.instruction",
        hotspotId: "create-task",
      },
    ];
  }

  // contractor (and fallback for null/unknown)
  return [
    {
      key: "project",
      dbField: "onboarding_created_project",
      labelKey: "onboarding.steps.project.label",
      instructionKey: "onboarding.steps.project.instruction",
      hotspotId: "create-project",
    },
    {
      key: "enterCanvas",
      dbField: "onboarding_entered_canvas",
      labelKey: "onboarding.steps.enterCanvas.label",
      instructionKey: "onboarding.steps.enterCanvas.instruction",
      hotspotId: "canvas-tab",
    },
    {
      key: "drawRoom",
      dbField: "onboarding_drawn_room",
      labelKey: "onboarding.steps.drawRoom.label",
      instructionKey: "onboarding.steps.drawRoom.instruction",
      hotspotId: "room-tool",
      canvasHintKey: "onboarding.steps.drawRoom.canvasHint",
    },
    {
      key: "profile",
      dbField: "onboarding_completed_profile",
      labelKey: "onboarding.steps.profile.label",
      instructionKey: "onboarding.steps.profile.instruction",
      link: "/profile",
    },
  ];
}

const STEP_DB_FIELDS: Record<StepKey, string> = {
  profile: "onboarding_completed_profile",
  project: "onboarding_created_project",
  enterCanvas: "onboarding_entered_canvas",
  drawRoom: "onboarding_drawn_room",
  generateWalls: "onboarding_generated_walls",
  taskWithRoom: "onboarding_created_task_room",
  viewProject: "onboarding_entered_canvas",
  postComment: "onboarding_created_quote",
};

export function useOnboarding(): OnboardingState {
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [isDismissed, setIsDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [celebrationTriggered, setCelebrationTriggered] = useState(false);
  const [totalSteps, setTotalSteps] = useState(3);

  const fetchOnboardingStatus = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch profile with onboarding fields
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, phone, avatar_url, is_professional, company_name, contractor_category, onboarding_completed_profile, onboarding_created_project, onboarding_drawn_room, onboarding_created_quote, onboarding_created_task_room, onboarding_entered_canvas, onboarding_generated_walls, onboarding_dismissed, onboarding_completed_at, onboarding_user_type")
        .eq("user_id", user.id)
        .single();

      if (profileError || !profile) {
        setLoading(false);
        return;
      }

      setProfileId(profile.id);
      setIsDismissed(profile.onboarding_dismissed ?? false);
      setUserType(profile.onboarding_user_type);

      const stepsConfig = getStepsConfig(profile.onboarding_user_type);
      setTotalSteps(stepsConfig.filter(s => !s.optional).length);

      // Auto-detect completion based on actual data
      const projectsRes = await supabase.from("projects").select("id").eq("owner_id", profile.id).limit(50);

      // For invited clients, check shared projects
      let hasSharedProject = false;
      if (profile.onboarding_user_type === "invited_client") {
        const sharesRes = await supabase.from("project_shares").select("id").eq("shared_with_user_id", profile.id).limit(1);
        hasSharedProject = (sharesRes.data?.length ?? 0) > 0;
      }

      const roomsRes = await supabase.from("rooms").select("id, project_id").limit(50);

      const hasProject = (projectsRes.data?.length ?? 0) > 0;

      // Check if user has any rooms in projects they own
      let hasRoom = false;
      const ownedProjectIds = new Set(projectsRes.data?.map(p => p.id) ?? []);
      if (roomsRes.data && roomsRes.data.length > 0) {
        hasRoom = roomsRes.data.some(r => ownedProjectIds.has(r.project_id));
      }

      // Auto-detect taskRoom: tasks with non-null room_id in owned projects (homeowner only)
      let hasTaskRoom = false;
      if (profile.onboarding_user_type === "homeowner" && ownedProjectIds.size > 0) {
        const tasksWithRoomRes = await supabase
          .from("tasks")
          .select("id, project_id, room_id")
          .not("room_id", "is", null)
          .limit(50);
        if (tasksWithRoomRes.data) {
          hasTaskRoom = tasksWithRoomRes.data.some(t => ownedProjectIds.has(t.project_id));
        }
      }

      // Profile completion for contractors: requires professional fields
      const profileComplete = Boolean(
        profile.is_professional && profile.company_name?.trim() && profile.contractor_category?.trim()
      );

      // Build completion map
      const completionMap: Record<StepKey, boolean> = {
        project: hasProject || (profile.onboarding_created_project ?? false),
        enterCanvas: profile.onboarding_entered_canvas ?? false,
        drawRoom: hasRoom || (profile.onboarding_drawn_room ?? false),
        generateWalls: profile.onboarding_generated_walls ?? false,
        taskWithRoom: hasTaskRoom || (profile.onboarding_created_task_room ?? false),
        profile: profileComplete || (profile.onboarding_completed_profile ?? false),
        viewProject: hasSharedProject || (profile.onboarding_entered_canvas ?? false),
        postComment: profile.onboarding_created_quote ?? false,
      };

      // Build steps array based on user type
      const stepsData: OnboardingStep[] = stepsConfig.map((cfg) => ({
        key: cfg.key,
        labelKey: cfg.labelKey,
        instructionKey: cfg.instructionKey,
        hotspotId: cfg.hotspotId,
        canvasHintKey: cfg.canvasHintKey,
        completed: completionMap[cfg.key],
        link: cfg.link,
        optional: cfg.optional,
      }));

      setSteps(stepsData);

      // Sync flags if data exists but flag is false
      const updates: Record<string, boolean> = {};
      if (hasProject && !profile.onboarding_created_project) {
        updates.onboarding_created_project = true;
      }
      if (hasRoom && !profile.onboarding_drawn_room) {
        updates.onboarding_drawn_room = true;
      }
      if (profileComplete && !profile.onboarding_completed_profile) {
        updates.onboarding_completed_profile = true;
      }
      if (hasTaskRoom && !profile.onboarding_created_task_room) {
        updates.onboarding_created_task_room = true;
      }

      if (Object.keys(updates).length > 0) {
        await supabase.from("profiles").update(updates).eq("id", profile.id);
      }

      // Check if all required steps are complete and set completion timestamp
      const allRequiredComplete = stepsData.filter(s => !s.optional).every((s) => s.completed);
      if (allRequiredComplete && !profile.onboarding_completed_at) {
        await supabase
          .from("profiles")
          .update({ onboarding_completed_at: new Date().toISOString() })
          .eq("id", profile.id);
      }
    } catch (error) {
      console.error("Error fetching onboarding status:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOnboardingStatus();
  }, [fetchOnboardingStatus]);

  // Trigger confetti when all required steps become complete
  const completedCount = steps.filter((s) => s.completed).length;
  const requiredSteps = steps.filter(s => !s.optional);
  const isComplete = requiredSteps.length > 0 && requiredSteps.every(s => s.completed);

  useEffect(() => {
    if (isComplete && !celebrationTriggered && !isDismissed) {
      setCelebrationTriggered(true);
      triggerConfetti();
    }
  }, [isComplete, celebrationTriggered, isDismissed]);

  // Current step is the first non-completed step
  const currentStep = useMemo(() => {
    const firstIncomplete = steps.find(s => !s.completed);
    return firstIncomplete ?? null;
  }, [steps]);

  const currentStepKey = (currentStep?.key as StepKey) ?? null;

  // Check if a specific step is active (for hotspots)
  const isStepActive = useCallback((key: StepKey) => {
    return currentStepKey === key;
  }, [currentStepKey]);

  const dismiss = useCallback(async () => {
    if (!profileId) return;

    try {
      await supabase
        .from("profiles")
        .update({ onboarding_dismissed: true })
        .eq("id", profileId);
      setIsDismissed(true);
    } catch (error) {
      console.error("Error dismissing onboarding:", error);
    }
  }, [profileId]);

  const markStepComplete = useCallback(
    async (step: StepKey) => {
      if (!profileId) return;

      const fieldName = STEP_DB_FIELDS[step];
      try {
        await supabase
          .from("profiles")
          .update({ [fieldName]: true })
          .eq("id", profileId);

        // Update local state immediately
        setSteps((prev) =>
          prev.map((s) => (s.key === step ? { ...s, completed: true } : s))
        );
      } catch (error) {
        console.error(`Error marking step ${step} complete:`, error);
      }
    },
    [profileId]
  );

  return {
    steps,
    completedCount,
    totalSteps,
    isComplete,
    isDismissed,
    loading,
    profileId,
    userType,
    currentStep,
    currentStepKey,
    isStepActive,
    dismiss,
    markStepComplete,
    refresh: fetchOnboardingStatus,
  };
}

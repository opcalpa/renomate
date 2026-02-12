import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Check, Circle, ChevronDown, ChevronRight, ChevronUp, X, Target, PartyPopper } from "lucide-react";
import type { OnboardingStep, StepKey } from "@/hooks/useOnboarding";

// Steps that require desktop Canvas and shouldn't be shown on mobile
const CANVAS_DEPENDENT_STEPS: StepKey[] = ["drawRoom", "generateWalls", "enterCanvas"];

interface OnboardingChecklistProps {
  steps: OnboardingStep[];
  completedCount: number;
  totalSteps: number;
  isComplete: boolean;
  onDismiss: () => void;
  onCreateProject: () => void;
  firstProjectId?: string;
  currentStepKey?: StepKey | null;
  onNavigateToStep?: (step: OnboardingStep) => void;
}

export function OnboardingChecklist({
  steps,
  completedCount,
  totalSteps,
  isComplete,
  onDismiss,
  onCreateProject,
  firstProjectId,
  currentStepKey,
  onNavigateToStep,
}: OnboardingChecklistProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Filter steps for mobile - hide canvas-dependent steps
  const visibleSteps = isMobile
    ? steps.filter(s => !CANVAS_DEPENDENT_STEPS.includes(s.key as StepKey))
    : steps;

  // Recalculate progress for visible steps
  const visibleCompletedCount = visibleSteps.filter(s => s.completed).length;
  const visibleTotalSteps = visibleSteps.filter(s => !s.optional).length;
  const progressPercent = visibleTotalSteps > 0 ? (visibleCompletedCount / visibleTotalSteps) * 100 : 0;

  const getStepLink = (step: OnboardingStep): string | undefined => {
    if (step.link) return step.link;
    if (step.key === "drawRoom" && firstProjectId) {
      return `/projects/${firstProjectId}?tab=space-planner`;
    }
    if (step.key === "enterCanvas" && firstProjectId) {
      return `/projects/${firstProjectId}?tab=space-planner`;
    }
    if (step.key === "generateWalls" && firstProjectId) {
      return `/projects/${firstProjectId}?tab=space-planner`;
    }
    if (step.key === "taskWithRoom" && firstProjectId) {
      return `/projects/${firstProjectId}?tab=tasks`;
    }
    return undefined;
  };

  const handleStepClick = (step: OnboardingStep) => {
    if (step.key === "project" && !step.completed) {
      onCreateProject();
    }
  };

  const handleNavigateToStep = (step: OnboardingStep) => {
    if (onNavigateToStep) {
      onNavigateToStep(step);
    } else {
      const link = getStepLink(step);
      if (link) {
        navigate(link);
      } else if (step.key === "project") {
        onCreateProject();
      }
    }
  };

  const isStepExpanded = (step: OnboardingStep): boolean => {
    return currentStepKey === step.key && !step.completed;
  };

  return (
    <Card className="mb-4 sm:mb-6 shadow-md border-primary/10">
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
        <div className="flex items-center justify-between gap-2">
          <div
            className="flex items-center gap-2 flex-1 cursor-pointer sm:cursor-default"
            onClick={() => isMobile && setIsExpanded(!isExpanded)}
          >
            <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            <span className="font-semibold text-sm sm:text-lg">
              {isMobile ? (
                t("onboarding.checklist.progress", { count: visibleCompletedCount, total: visibleTotalSteps })
              ) : (
                t("onboarding.checklist.title")
              )}
            </span>
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 ml-auto"
                onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            )}
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground flex-shrink-0">
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("onboarding.checklist.confirmDismiss")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("onboarding.checklist.dismiss")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={onDismiss}>
                  {t("common.confirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 mt-2">
          <Progress value={progressPercent} className="flex-1 h-1.5 sm:h-2" />
          {!isMobile && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {t("onboarding.checklist.progress", { count: visibleCompletedCount, total: visibleTotalSteps })}
            </span>
          )}
        </div>
      </CardHeader>
      {(isExpanded || !isMobile) && (
        <CardContent className="pt-0 px-3 sm:px-6 pb-3 sm:pb-6">
          {isComplete ? (
            <div className="flex items-center gap-2 sm:gap-3 py-3 sm:py-4 text-center justify-center">
              <PartyPopper className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <div>
                <p className="font-medium text-primary text-sm sm:text-base">{t("onboarding.checklist.allDone")}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{t("onboarding.checklist.inviteClient")}</p>
              </div>
            </div>
          ) : (
            <ul className="space-y-0.5 sm:space-y-1">
              {visibleSteps.map((step) => {
              const link = getStepLink(step);
              const isClickable = step.key === "project" && !step.completed;
              const needsProject = (step.key === "drawRoom" || step.key === "enterCanvas" || step.key === "generateWalls" || step.key === "taskWithRoom") && !firstProjectId && !step.completed;
              const expanded = isStepExpanded(step);

              return (
                <li key={step.key}>
                  <div
                    className={`rounded-md transition-colors ${
                      expanded ? "bg-primary/5 border border-primary/20" : ""
                    }`}
                  >
                    {/* Step header */}
                    <div
                      className={`flex items-center gap-2 sm:gap-3 py-2 sm:py-2.5 px-2 sm:px-3 transition-colors ${
                        step.completed
                          ? "text-muted-foreground"
                          : isClickable
                          ? "hover:bg-accent cursor-pointer active:bg-accent"
                          : needsProject
                          ? "text-muted-foreground/60"
                          : ""
                      }`}
                      onClick={isClickable ? () => handleStepClick(step) : undefined}
                    >
                      {step.completed ? (
                        <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Check className="h-3.5 w-3.5 text-primary" />
                        </div>
                      ) : expanded ? (
                        <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary-foreground">
                            {visibleSteps.filter(s => !s.completed).findIndex(s => s.key === step.key) + 1}
                          </span>
                        </div>
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground/40 flex-shrink-0" />
                      )}
                      <span className={`flex-1 text-sm sm:text-base ${step.completed ? "line-through" : expanded ? "font-semibold text-primary" : "font-medium"}`}>
                        {t(step.labelKey)}
                        {step.optional && !step.completed && (
                          <span className="ml-1.5 sm:ml-2 text-xs text-muted-foreground font-normal">
                            ({t("common.optional")})
                          </span>
                        )}
                      </span>
                      {expanded ? (
                        <ChevronDown className="h-4 w-4 text-primary flex-shrink-0" />
                      ) : !step.completed && !needsProject ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      ) : null}
                    </div>

                    {/* Expanded instruction panel */}
                    {expanded && (
                      <div className="px-2 sm:px-3 pb-2 sm:pb-3 pt-0.5 sm:pt-1">
                        <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 pl-7 sm:pl-8">
                          {t(step.instructionKey)}
                        </p>
                        <div className="pl-7 sm:pl-8">
                          <Button
                            size="sm"
                            onClick={() => handleNavigateToStep(step)}
                            className="gap-1 h-8 sm:h-9 text-xs sm:text-sm"
                          >
                            {t("onboarding.checklist.showMe")}
                            <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
            </ul>
          )}
        </CardContent>
      )}
    </Card>
  );
}

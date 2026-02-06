import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Check, Circle, ChevronDown, ChevronRight, X, Target, PartyPopper } from "lucide-react";
import type { OnboardingStep, StepKey } from "@/hooks/useOnboarding";

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
  const progressPercent = (completedCount / totalSteps) * 100;

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
    <Card className="mb-6 shadow-md border-primary/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-primary" />
            {t("onboarding.checklist.title")}
          </CardTitle>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
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
        <div className="flex items-center gap-3 mt-2">
          <Progress value={progressPercent} className="flex-1 h-2" />
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {t("onboarding.checklist.progress", { count: completedCount, total: totalSteps })}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isComplete ? (
          <div className="flex items-center gap-3 py-4 text-center justify-center">
            <PartyPopper className="h-6 w-6 text-primary" />
            <div>
              <p className="font-medium text-primary">{t("onboarding.checklist.allDone")}</p>
              <p className="text-sm text-muted-foreground">{t("onboarding.checklist.inviteClient")}</p>
            </div>
          </div>
        ) : (
          <ul className="space-y-1">
            {steps.map((step) => {
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
                      className={`flex items-center gap-3 py-2.5 px-3 transition-colors ${
                        step.completed
                          ? "text-muted-foreground"
                          : isClickable
                          ? "hover:bg-accent cursor-pointer"
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
                            {steps.filter(s => !s.completed).findIndex(s => s.key === step.key) + 1}
                          </span>
                        </div>
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground/40 flex-shrink-0" />
                      )}
                      <span className={`flex-1 ${step.completed ? "line-through" : expanded ? "font-semibold text-primary" : "font-medium"}`}>
                        {t(step.labelKey)}
                        {step.optional && !step.completed && (
                          <span className="ml-2 text-xs text-muted-foreground font-normal">
                            ({t("common.optional")})
                          </span>
                        )}
                      </span>
                      {expanded ? (
                        <ChevronDown className="h-4 w-4 text-primary" />
                      ) : !step.completed && !needsProject ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      ) : null}
                    </div>

                    {/* Expanded instruction panel */}
                    {expanded && (
                      <div className="px-3 pb-3 pt-1">
                        <p className="text-sm text-muted-foreground mb-3 pl-8">
                          {t(step.instructionKey)}
                        </p>
                        <div className="pl-8">
                          <Button
                            size="sm"
                            onClick={() => handleNavigateToStep(step)}
                            className="gap-1"
                          >
                            {t("onboarding.checklist.showMe")}
                            <ChevronRight className="h-3.5 w-3.5" />
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
    </Card>
  );
}

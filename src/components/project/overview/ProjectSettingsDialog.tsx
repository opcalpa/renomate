import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CURRENCIES } from "@/lib/currency";
import type { OverviewProject } from "./types";

const CURRENCY_OPTIONS = Object.entries(CURRENCIES).map(([code, config]) => ({
  value: code,
  label: `${code} (${config.symbol})`,
}));

interface ProjectSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: OverviewProject;
  onProjectUpdate?: () => void;
}

export function ProjectSettingsDialog({
  open,
  onOpenChange,
  project,
  onProjectUpdate,
}: ProjectSettingsDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [projectName, setProjectName] = useState(project.name || "");
  const [projectDescription, setProjectDescription] = useState(project.description || "");
  const [startDate, setStartDate] = useState(project.start_date || "");
  const [goalDate, setGoalDate] = useState(project.finish_goal_date || "");
  const [budgetValue, setBudgetValue] = useState(project.total_budget?.toString() || "");
  const [currency, setCurrency] = useState(project.currency || "SEK");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setProjectName(project.name || "");
      setProjectDescription(project.description || "");
      setStartDate(project.start_date || "");
      setGoalDate(project.finish_goal_date || "");
      setBudgetValue(project.total_budget?.toString() || "");
      setCurrency(project.currency || "SEK");
    }
  }, [open, project]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const budgetNumber = budgetValue ? parseFloat(budgetValue) : null;
      const { error } = await supabase
        .from("projects")
        .update({
          name: projectName.trim(),
          description: projectDescription.trim() || null,
          start_date: startDate || null,
          finish_goal_date: goalDate || null,
          total_budget: budgetNumber,
          currency,
        })
        .eq("id", project.id);

      if (error) throw error;

      toast({
        title: t("overview.settings.saved"),
        description: t("overview.settings.savedDescription"),
      });
      onProjectUpdate?.();
      onOpenChange(false);
    } catch (error: unknown) {
      toast({
        title: t("common.error"),
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("overview.settings.title")}</DialogTitle>
          <DialogDescription>{t("overview.settings.description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t("overview.settings.projectName")}</Label>
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder={t("projects.projectNamePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("overview.settings.projectDescription")}</Label>
            <Textarea
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder={t("projects.projectDescriptionPlaceholder")}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("overview.settings.startDate")}</Label>
            <DatePicker
              date={startDate ? new Date(startDate) : undefined}
              onDateChange={(date) =>
                setStartDate(date ? date.toISOString().split("T")[0] : "")
              }
              placeholder={t("overview.selectStartDate")}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("overview.settings.goalDate")}</Label>
            <DatePicker
              date={goalDate ? new Date(goalDate) : undefined}
              onDateChange={(date) =>
                setGoalDate(date ? date.toISOString().split("T")[0] : "")
              }
              placeholder={t("overview.selectGoalDate")}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("overview.settings.totalBudget")}</Label>
            <Input
              type="number"
              step="0.01"
              placeholder={t("overview.enterTotalBudget")}
              value={budgetValue}
              onChange={(e) => setBudgetValue(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("overview.settings.currency")}</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || !projectName.trim()}>
            {saving ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

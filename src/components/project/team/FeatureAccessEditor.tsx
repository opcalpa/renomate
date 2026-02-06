import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Eye, Edit3, Plus, UserPlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface FeatureAccess {
  timeline: "none" | "view" | "edit";
  tasks: "none" | "view" | "edit";
  tasksScope: "all" | "assigned";
  spacePlanner: "none" | "view" | "edit";
  purchases: "none" | "view" | "create" | "edit";
  purchasesScope: "all" | "assigned";
  overview: "none" | "view" | "edit";
  teams: "none" | "view" | "invite";
  budget: "none" | "view";
  files: "none" | "view" | "upload" | "edit";
}

interface FeatureConfig {
  key: keyof FeatureAccess;
  labelKey: string;
  options: string[];
  scope?: {
    key: keyof FeatureAccess;
    labelKey: string;
    showWhen: string[];
    options: { value: string; labelKey: string }[];
  };
}

const OPTION_ICONS: Record<string, LucideIcon | undefined> = {
  none: undefined,
  view: Eye,
  edit: Edit3,
  create: Plus,
  upload: Plus,
  invite: UserPlus,
};

const OPTION_LABEL_KEYS: Record<string, string> = {
  none: "roles.accessNone",
  view: "roles.accessView",
  edit: "roles.accessEdit",
  create: "roles.accessCreate",
  upload: "roles.accessUpload",
  invite: "roles.accessInvite",
};

const FEATURES: FeatureConfig[] = [
  { key: "timeline", labelKey: "roles.featureTimeline", options: ["none", "view", "edit"] },
  {
    key: "tasks",
    labelKey: "roles.featureTasks",
    options: ["none", "view", "edit"],
    scope: {
      key: "tasksScope",
      labelKey: "roles.taskScope",
      showWhen: ["view", "edit"],
      options: [
        { value: "all", labelKey: "roles.allTasks" },
        { value: "assigned", labelKey: "roles.assignedOnly" },
      ],
    },
  },
  { key: "spacePlanner", labelKey: "roles.featureSpacePlanner", options: ["none", "view", "edit"] },
  {
    key: "purchases",
    labelKey: "roles.featurePurchaseOrders",
    options: ["none", "view", "create", "edit"],
    scope: {
      key: "purchasesScope",
      labelKey: "roles.orderScope",
      showWhen: ["view", "create", "edit"],
      options: [
        { value: "all", labelKey: "roles.allOrders" },
        { value: "assigned", labelKey: "roles.assignedCreatedOnly" },
      ],
    },
  },
  { key: "overview", labelKey: "roles.featureOverview", options: ["none", "view", "edit"] },
  { key: "teams", labelKey: "roles.featureTeamManagement", options: ["none", "view", "invite"] },
  { key: "budget", labelKey: "roles.featureBudget", options: ["none", "view"] },
  { key: "files", labelKey: "roles.featureFiles", options: ["none", "view", "upload", "edit"] },
];

interface FeatureAccessEditorProps {
  featureAccess: FeatureAccess;
  onChange: (updates: Partial<FeatureAccess>) => void;
  idPrefix: string;
}

export function FeatureAccessEditor({ featureAccess, onChange, idPrefix }: FeatureAccessEditorProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {FEATURES.map((feature) => (
        <div key={feature.key} className="space-y-2">
          <div className="flex items-center justify-between space-x-4">
            <Label className="flex-1">{t(feature.labelKey)}</Label>
            <RadioGroup
              value={featureAccess[feature.key]}
              onValueChange={(value) => onChange({ [feature.key]: value } as Partial<FeatureAccess>)}
              className="flex gap-2"
            >
              {feature.options.map((opt) => {
                const Icon = OPTION_ICONS[opt];
                const id = `${idPrefix}-${feature.key}-${opt}`;
                return (
                  <div key={opt} className="flex items-center space-x-1">
                    <RadioGroupItem value={opt} id={id} />
                    <Label htmlFor={id} className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      {Icon && <Icon className="h-3 w-3" />}
                      {t(OPTION_LABEL_KEYS[opt])}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>
          {feature.scope && feature.scope.showWhen.includes(featureAccess[feature.key]) && (
            <div className="ml-4 flex items-center gap-2 text-sm">
              <Label className="text-xs text-muted-foreground">{t(feature.scope.labelKey)}:</Label>
              <RadioGroup
                value={featureAccess[feature.scope.key]}
                onValueChange={(value) => onChange({ [feature.scope!.key]: value } as Partial<FeatureAccess>)}
                className="flex gap-3"
              >
                {feature.scope.options.map((scopeOpt) => {
                  const scopeId = `${idPrefix}-${feature.scope!.key}-${scopeOpt.value}`;
                  return (
                    <div key={scopeOpt.value} className="flex items-center space-x-1">
                      <RadioGroupItem value={scopeOpt.value} id={scopeId} />
                      <Label htmlFor={scopeId} className="text-xs cursor-pointer font-normal">
                        {t(scopeOpt.labelKey)}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

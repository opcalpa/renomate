import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { getDateLocale } from "@/lib/dateFnsLocale";
import { CheckSquare, Home, Package, Users, Map } from "lucide-react";
import type { ActivityLogItem } from "./types";

const entityIcons: Record<string, React.ReactNode> = {
  task: <CheckSquare className="h-3.5 w-3.5 text-blue-500" />,
  room: <Home className="h-3.5 w-3.5 text-green-500" />,
  material: <Package className="h-3.5 w-3.5 text-orange-500" />,
  team_member: <Users className="h-3.5 w-3.5 text-violet-500" />,
  floor_plan: <Map className="h-3.5 w-3.5 text-cyan-500" />,
};

const borderColors: Record<string, string> = {
  task: "border-l-blue-400",
  room: "border-l-green-400",
  material: "border-l-orange-400",
  team_member: "border-l-violet-400",
  floor_plan: "border-l-cyan-400",
};

const statusKey = (s: string) => {
  const map: Record<string, string> = {
    to_do: "toDo",
    in_progress: "inProgress",
    on_hold: "onHold",
    new_construction: "newConstruction",
    to_be_renovated: "toBeRenovated",
    not_paid: "notPaid",
    partially_paid: "partiallyPaid",
  };
  return map[s] || s;
};

interface ActivityCardProps {
  activity: ActivityLogItem;
}

export const ActivityCard = ({ activity }: ActivityCardProps) => {
  const { t, i18n } = useTranslation();
  const actorName = activity.actor?.name || t("common.unassigned");
  const entityName = activity.entity_name || "";

  const actionText = t(`activity.${activity.action === "status_changed" ? "statusChanged" : activity.action === "member_added" ? "memberAdded" : activity.action === "member_removed" ? "memberRemoved" : activity.action}`);
  const entityTypeText = t(`activity.entityTypes.${activity.entity_type === "floor_plan" ? "floorPlan" : activity.entity_type === "team_member" ? "teamMember" : activity.entity_type}`);

  return (
    <div className={`flex items-start gap-3 px-3 py-2 rounded-lg border-l-2 bg-muted/40 ${borderColors[activity.entity_type] || "border-l-gray-400"}`}>
      <Avatar className="h-6 w-6 flex-shrink-0 mt-0.5">
        <AvatarFallback className="text-[10px]">
          {actorName.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-medium">{actorName}</span>
          {" "}
          {actionText}
          {" "}
          {entityTypeText}
          {entityName && (
            <>
              {" "}
              <span className="font-medium">{entityName}</span>
            </>
          )}
          {activity.action === "status_changed" && activity.changes?.old && activity.changes?.new && (
            <span className="text-muted-foreground">
              {" "}
              {t("activity.statusChange", {
                old: t(`statuses.${statusKey(String(activity.changes.old))}`, String(activity.changes.old)),
                new: t(`statuses.${statusKey(String(activity.changes.new))}`, String(activity.changes.new)),
              })}
            </span>
          )}
        </p>
        <div className="flex items-center gap-1.5 mt-1 md:hidden">
          {entityIcons[activity.entity_type]}
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(activity.created_at), {
              addSuffix: true,
              locale: getDateLocale(i18n.language),
            })}
          </span>
        </div>
      </div>
      <div className="hidden md:flex items-center gap-1.5 flex-shrink-0 mt-0.5">
        {entityIcons[activity.entity_type]}
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDistanceToNow(new Date(activity.created_at), {
            addSuffix: true,
            locale: getDateLocale(i18n.language),
          })}
        </span>
      </div>
    </div>
  );
};

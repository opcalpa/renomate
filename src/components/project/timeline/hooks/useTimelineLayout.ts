import { useMemo } from "react";
import type {
  TimelineTask,
  GroupByOption,
  GroupRow,
  Room,
  TeamMember,
} from "../types";

interface UseTimelineLayoutOptions {
  tasks: TimelineTask[];
  groupBy: GroupByOption;
  selectedAssignee: string;
  collapsedGroups: Set<string>;
  rooms: Room[];
  teamMembers: TeamMember[];
}

interface UseTimelineLayoutResult {
  rows: GroupRow[];
  totalRows: number;
}

function getGroupKeyAndLabel(
  task: TimelineTask,
  groupBy: GroupByOption,
  rooms: Room[],
  teamMembers: TeamMember[]
): { key: string; label: string } {
  switch (groupBy) {
    case "status":
      return { key: task.status, label: task.status.replace(/_/g, " ") };
    case "room": {
      const room = rooms.find((r) => r.id === task.room_id);
      return {
        key: task.room_id || "unassigned",
        label: room?.name || "Unassigned",
      };
    }
    case "assignee": {
      const member = teamMembers.find(
        (m) => m.id === task.assigned_to_stakeholder_id
      );
      return {
        key: task.assigned_to_stakeholder_id || "unassigned",
        label: member?.name || "Unassigned",
      };
    }
    case "priority":
      return { key: task.priority, label: task.priority };
    default:
      return { key: "all", label: "All Tasks" };
  }
}

export function useTimelineLayout({
  tasks,
  groupBy,
  selectedAssignee,
  collapsedGroups,
  rooms,
  teamMembers,
}: UseTimelineLayoutOptions): UseTimelineLayoutResult {
  return useMemo(() => {
    // Filter by assignee
    const filtered =
      selectedAssignee === "all"
        ? tasks
        : tasks.filter((t) =>
            selectedAssignee === "unassigned"
              ? !t.assigned_to_stakeholder_id
              : t.assigned_to_stakeholder_id === selectedAssignee
          );

    if (groupBy === "none") {
      const rows: GroupRow[] = filtered.map((task, index) => ({
        type: "task" as const,
        groupId: "all",
        groupLabel: "All Tasks",
        task,
        rowIndex: index,
      }));
      return { rows, totalRows: rows.length };
    }

    // Group tasks
    const groups = new Map<string, { label: string; tasks: TimelineTask[] }>();
    for (const task of filtered) {
      const { key, label } = getGroupKeyAndLabel(
        task,
        groupBy,
        rooms,
        teamMembers
      );
      if (!groups.has(key)) {
        groups.set(key, { label, tasks: [] });
      }
      groups.get(key)!.tasks.push(task);
    }

    const rows: GroupRow[] = [];
    let rowIndex = 0;

    for (const [groupId, group] of groups) {
      rows.push({
        type: "group-header",
        groupId,
        groupLabel: group.label,
        rowIndex,
      });
      rowIndex++;

      if (!collapsedGroups.has(groupId)) {
        for (const task of group.tasks) {
          rows.push({
            type: "task",
            groupId,
            groupLabel: group.label,
            task,
            rowIndex,
          });
          rowIndex++;
        }
      }
    }

    return { rows, totalRows: rowIndex };
  }, [tasks, groupBy, selectedAssignee, collapsedGroups, rooms, teamMembers]);
}

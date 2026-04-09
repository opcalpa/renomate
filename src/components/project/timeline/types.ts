export interface TimelineTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  start_date: string | null;
  finish_date: string | null;
  progress: number;
  assigned_to_stakeholder_id: string | null;
  room_id: string | null;
}

export interface TimelineDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
}

export interface TeamMember {
  id: string;
  name: string;
}

export interface Room {
  id: string;
  name: string;
}

export interface TimelineMilestone {
  id: string;
  title: string;
  date: string;
  color: string | null;
}

export type GroupByOption = "none" | "status" | "room" | "assignee" | "priority";

export interface TimelineViewState {
  panX: number;
  panY: number;
  pixelsPerDay: number;
  stageWidth: number;
  stageHeight: number;
}

export interface TaskPosition {
  x: number;
  y: number;
  width: number;
  taskId: string;
}

export interface GroupRow {
  type: "group-header" | "task";
  groupId: string;
  groupLabel: string;
  task?: TimelineTask;
  rowIndex: number;
}

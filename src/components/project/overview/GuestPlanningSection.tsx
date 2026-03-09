import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, ClipboardList, Home, Trash2, Cloud, Columns3 } from "lucide-react";
import {
  getGuestTasks,
  saveGuestTask,
  updateGuestTask,
  deleteGuestTask,
  getGuestRooms,
  saveGuestRoom,
  deleteGuestRoom,
} from "@/services/guestStorageService";
import type { GuestTask, GuestRoom } from "@/types/guest.types";

// ---------------------------------------------------------------------------
// Column config
// ---------------------------------------------------------------------------

type TaskColumnKey = "room" | "description" | "status";

interface ColumnDef {
  key: TaskColumnKey;
  labelKey: string;
  defaultOn: boolean;
}

const TASK_COLUMNS: ColumnDef[] = [
  { key: "room", labelKey: "planningTasks.room", defaultOn: true },
  { key: "description", labelKey: "tasks.description", defaultOn: false },
  { key: "status", labelKey: "common.status", defaultOn: false },
];

const TASK_STATUSES = ["to_do", "in_progress", "completed"] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface GuestPlanningSectionProps {
  projectId: string;
}

export function GuestPlanningSection({ projectId }: GuestPlanningSectionProps) {
  const { t } = useTranslation();

  // Tasks
  const [tasks, setTasks] = useState<GuestTask[]>(() => getGuestTasks(projectId));
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  // Rooms
  const [rooms, setRooms] = useState<GuestRoom[]>(() => getGuestRooms(projectId));
  const [addingRoom, setAddingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");

  // Inline editing
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  // Column visibility
  const [visibleCols, setVisibleCols] = useState<Set<TaskColumnKey>>(
    () => new Set(TASK_COLUMNS.filter((c) => c.defaultOn).map((c) => c.key))
  );

  const show = useMemo(() => ({
    room: visibleCols.has("room"),
    description: visibleCols.has("description"),
    status: visibleCols.has("status"),
  }), [visibleCols]);

  const toggleColumn = useCallback((key: TaskColumnKey) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r.name])), [rooms]);

  // Refresh helpers
  const refreshTasks = useCallback(() => setTasks(getGuestTasks(projectId)), [projectId]);
  const refreshRooms = useCallback(() => {
    setRooms(getGuestRooms(projectId));
    refreshTasks(); // room deletion cascades
  }, [projectId, refreshTasks]);

  // ----- Task CRUD -----
  const handleAddTask = useCallback(() => {
    const title = newTaskTitle.trim();
    if (!title) return;
    saveGuestTask(projectId, {
      title,
      room_id: null,
      description: null,
      status: "to_do",
      priority: null,
      due_date: null,
    });
    refreshTasks();
    setNewTaskTitle("");
    setAddingTask(false);
  }, [projectId, newTaskTitle, refreshTasks]);

  const handleDeleteTask = useCallback((taskId: string) => {
    deleteGuestTask(projectId, taskId);
    refreshTasks();
  }, [projectId, refreshTasks]);

  const handleTaskUpdate = useCallback((taskId: string, updates: Partial<GuestTask>) => {
    updateGuestTask(projectId, taskId, updates);
    refreshTasks();
  }, [projectId, refreshTasks]);

  // Inline edit helpers
  const startEdit = useCallback((id: string, field: string, value: string) => {
    setEditingCell({ id, field });
    setEditValue(value);
  }, []);

  const saveEdit = useCallback((taskId: string, field: string) => {
    setEditingCell(null);
    if (field === "title") {
      const trimmed = editValue.trim();
      if (trimmed) handleTaskUpdate(taskId, { title: trimmed });
    } else if (field === "description") {
      handleTaskUpdate(taskId, { description: editValue.trim() || null });
    }
  }, [editValue, handleTaskUpdate]);

  // ----- Room CRUD -----
  const handleAddRoom = useCallback(() => {
    const name = newRoomName.trim();
    if (!name) return;
    saveGuestRoom(projectId, {
      name,
      room_type: null,
      status: "existing",
      area_sqm: null,
      floor_number: null,
      notes: null,
    });
    refreshRooms();
    setNewRoomName("");
    setAddingRoom(false);
  }, [projectId, newRoomName, refreshRooms]);

  const handleDeleteRoom = useCallback((roomId: string) => {
    deleteGuestRoom(projectId, roomId);
    refreshRooms();
  }, [projectId, refreshRooms]);

  // Column count for colSpan
  const colCount = 1 + (show.room ? 1 : 0) + (show.description ? 1 : 0) + (show.status ? 1 : 0) + 1;

  const statusKey = (s: string) => {
    const map: Record<string, string> = { to_do: "toDo", in_progress: "inProgress" };
    return map[s] || s;
  };

  return (
    <>
      {/* Task planning card */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">{t("planningTasks.title", "Scope of work")}</CardTitle>
              <CardDescription className="text-xs">
                {t("planningTasks.description", "Define the tasks included in your renovation, e.g. painting, demolition, tiling")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {tasks.length === 0 && !addingTask ? (
            <div className="text-center py-8">
              <ClipboardList className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm font-medium text-muted-foreground">
                {t("planningTasks.empty", "No tasks yet")}
              </p>
              <p className="text-xs text-muted-foreground/70 mb-4">
                {t("planningTasks.emptyHint", "Add the work items included in your renovation")}
              </p>
              <Button size="sm" onClick={() => setAddingTask(true)}>
                <Plus className="h-4 w-4 mr-1" />
                {t("planningTasks.addFirst", "Add first task")}
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-medium">{t("planningTasks.taskName", "Task")}</TableHead>
                    {show.room && (
                      <TableHead className="text-xs font-medium w-[140px]">{t("planningTasks.room", "Room")}</TableHead>
                    )}
                    {show.description && (
                      <TableHead className="text-xs font-medium w-[200px]">{t("tasks.description", "Description")}</TableHead>
                    )}
                    {show.status && (
                      <TableHead className="text-xs font-medium w-[120px]">{t("common.status", "Status")}</TableHead>
                    )}
                    <TableHead className="text-xs font-medium w-[40px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => {
                    const isEditingTitle = editingCell?.id === task.id && editingCell?.field === "title";
                    const isEditingDesc = editingCell?.id === task.id && editingCell?.field === "description";

                    return (
                      <TableRow key={task.id} className="group">
                        {/* Title — inline editable */}
                        <TableCell className="py-1.5">
                          {isEditingTitle ? (
                            <Input
                              autoFocus
                              className="h-7 text-sm"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEdit(task.id, "title");
                                if (e.key === "Escape") setEditingCell(null);
                              }}
                              onBlur={() => saveEdit(task.id, "title")}
                            />
                          ) : (
                            <button
                              className="text-sm font-medium text-left w-full rounded px-1 -mx-1 hover:bg-muted cursor-text transition-colors"
                              onClick={() => startEdit(task.id, "title", task.title)}
                            >
                              {task.title}
                            </button>
                          )}
                        </TableCell>

                        {/* Room — select dropdown */}
                        {show.room && (
                          <TableCell className="py-1.5">
                            <Select
                              value={task.room_id || "__none__"}
                              onValueChange={(val) =>
                                handleTaskUpdate(task.id, { room_id: val === "__none__" ? null : val })
                              }
                            >
                              <SelectTrigger className="h-7 text-xs border-0 shadow-none bg-transparent hover:bg-muted px-1 -mx-1">
                                <SelectValue placeholder="–" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">
                                  <span className="text-muted-foreground">–</span>
                                </SelectItem>
                                {rooms.map((r) => (
                                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        )}

                        {/* Description — inline editable */}
                        {show.description && (
                          <TableCell className="py-1.5">
                            {isEditingDesc ? (
                              <Input
                                autoFocus
                                className="h-7 text-sm"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveEdit(task.id, "description");
                                  if (e.key === "Escape") setEditingCell(null);
                                }}
                                onBlur={() => saveEdit(task.id, "description")}
                              />
                            ) : (
                              <button
                                className="text-sm text-left w-full rounded px-1 -mx-1 hover:bg-muted cursor-text transition-colors text-muted-foreground"
                                onClick={() => startEdit(task.id, "description", task.description || "")}
                              >
                                {task.description || <span className="text-muted-foreground/50">–</span>}
                              </button>
                            )}
                          </TableCell>
                        )}

                        {/* Status — select dropdown */}
                        {show.status && (
                          <TableCell className="py-1.5">
                            <Select
                              value={task.status}
                              onValueChange={(val) => handleTaskUpdate(task.id, { status: val })}
                            >
                              <SelectTrigger className="h-7 text-xs border-0 shadow-none bg-transparent hover:bg-muted px-1 -mx-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TASK_STATUSES.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {t(`statuses.${statusKey(s)}`, s)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        )}

                        {/* Delete */}
                        <TableCell className="py-1.5 w-[40px]">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {addingTask && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={colCount} className="py-1.5">
                        <form
                          className="flex items-center gap-2"
                          onSubmit={(e) => { e.preventDefault(); handleAddTask(); }}
                        >
                          <Input
                            autoFocus
                            placeholder={t("planningTasks.taskPlaceholder", "e.g. Paint living room")}
                            className="h-7 text-sm flex-1 max-w-[300px]"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") { setAddingTask(false); setNewTaskTitle(""); }
                            }}
                          />
                          <Button type="submit" size="sm" variant="ghost" className="h-7 text-xs" disabled={!newTaskTitle.trim()}>
                            {t("common.add", "Add")}
                          </Button>
                          <Button type="button" size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground"
                            onClick={() => { setAddingTask(false); setNewTaskTitle(""); }}>
                            {t("common.cancel")}
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Footer: add + column chooser */}
              <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setAddingTask(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  {t("planningTasks.addTask", "Add task")}
                </Button>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 ml-auto">
                      <Columns3 className="h-3.5 w-3.5" />
                      {t("planningTasks.showColumns", "Columns")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2" align="end">
                    {TASK_COLUMNS.map((col) => (
                      <label
                        key={col.key}
                        className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={visibleCols.has(col.key)}
                          onCheckedChange={() => toggleColumn(col.key)}
                        />
                        {t(col.labelKey)}
                      </label>
                    ))}
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Room planning card */}
      <Card className="border-l-4 border-l-blue-400">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-blue-500" />
            <div>
              <CardTitle className="text-base">{t("planningRooms.title", "Room planning")}</CardTitle>
              <CardDescription className="text-xs">
                {t("planningRooms.description", "Add rooms and dimensions to help estimate work")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {rooms.length === 0 && !addingRoom ? (
            <div className="text-center py-8">
              <Home className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm font-medium text-muted-foreground">
                {t("planningRooms.empty", "No rooms yet")}
              </p>
              <p className="text-xs text-muted-foreground/70 mb-4">
                {t("planningRooms.emptyHint", "Add rooms to plan dimensions and estimate materials")}
              </p>
              <Button size="sm" onClick={() => setAddingRoom(true)}>
                <Plus className="h-4 w-4 mr-1" />
                {t("planningRooms.addFirst", "Add first room")}
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-medium">{t("planningRooms.roomName", "Room")}</TableHead>
                    <TableHead className="text-xs font-medium w-[40px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rooms.map((room) => (
                    <TableRow key={room.id} className="group">
                      <TableCell className="py-1.5">
                        <span className="text-sm font-medium">{room.name}</span>
                      </TableCell>
                      <TableCell className="py-1.5 w-[40px]">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteRoom(room.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {addingRoom && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={2} className="py-1.5">
                        <form
                          className="flex items-center gap-2"
                          onSubmit={(e) => { e.preventDefault(); handleAddRoom(); }}
                        >
                          <Input
                            autoFocus
                            placeholder={t("rooms.roomNamePlaceholder", "e.g. Kitchen")}
                            className="h-7 text-sm flex-1 max-w-[240px]"
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") { setAddingRoom(false); setNewRoomName(""); }
                            }}
                          />
                          <Button type="submit" size="sm" variant="ghost" className="h-7 text-xs" disabled={!newRoomName.trim()}>
                            {t("common.add", "Add")}
                          </Button>
                          <Button type="button" size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground"
                            onClick={() => { setAddingRoom(false); setNewRoomName(""); }}>
                            {t("common.cancel")}
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="mt-2 pt-2 border-t">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setAddingRoom(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  {t("planningRooms.addRoom", "Add room")}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Soft sign-up nudge */}
      <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
        <Cloud className="h-4 w-4 shrink-0" />
        <span>{t("guest.signUpNudge", "Create a free account to save your project, get estimates, and invite collaborators.")}</span>
        <Button variant="link" size="sm" className="shrink-0 h-auto p-0 text-sm" onClick={() => window.location.href = "/auth"}>
          {t("guest.signUpLink", "Sign up")}
        </Button>
      </div>
    </>
  );
}

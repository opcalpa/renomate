/**
 * AI Document Import Modal
 * Displays extracted rooms and tasks from documents for review and import
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Sparkles,
  Loader2,
  Home,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Edit2,
  X,
  FileText,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useFloorMapStore } from '@/components/floormap/store';
import {
  ExtractedRoom,
  ExtractedTask,
  AIDocumentExtractionResult,
  TaskCategory,
  TASK_CATEGORY_LABELS,
  TASK_CATEGORY_TO_COST_CENTER,
} from '@/services/aiDocumentService.types';
import { extractFromDocument, getFilePublicUrl } from '@/services/aiDocumentService';
import { calculateGridPlacements, createRoomPoints } from '@/components/floormap/utils/roomPlacement';
import { FloorMapShape } from '@/components/floormap/types';
import { saveShapesForPlan } from '@/components/floormap/utils/plans';

interface ProjectFile {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
}

interface AIDocumentImportModalProps {
  projectId: string;
  file: ProjectFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

interface EditableRoom extends ExtractedRoom {
  index: number;
  selected: boolean;
}

interface EditableTask extends ExtractedTask {
  index: number;
  selected: boolean;
}

/**
 * Get confidence indicator based on score
 */
function ConfidenceIndicator({ confidence }: { confidence: number }) {
  if (confidence >= 0.8) {
    return <span title={`Konfidens: ${Math.round(confidence * 100)}%`}>🟢</span>;
  } else if (confidence >= 0.5) {
    return <span title={`Konfidens: ${Math.round(confidence * 100)}%`}>🟡</span>;
  } else {
    return <span title={`Konfidens: ${Math.round(confidence * 100)}%`}>🔴</span>;
  }
}

export function AIDocumentImportModal({
  projectId,
  file,
  open,
  onOpenChange,
  onImportComplete,
}: AIDocumentImportModalProps) {
  const { toast } = useToast();

  // States
  const [extracting, setExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<AIDocumentExtractionResult | null>(null);
  const [rooms, setRooms] = useState<EditableRoom[]>([]);
  const [tasks, setTasks] = useState<EditableTask[]>([]);
  const [importing, setImporting] = useState(false);
  const [editingRoomIndex, setEditingRoomIndex] = useState<number | null>(null);
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);

  // Zustand store
  const { shapes, currentPlanId, addShape } = useFloorMapStore();

  // Reset state when modal opens with a new file
  useEffect(() => {
    if (open && file) {
      setExtractionResult(null);
      setRooms([]);
      setTasks([]);
      setEditingRoomIndex(null);
      setEditingTaskIndex(null);
      handleExtract();
    }
  }, [open, file?.id]);

  const handleExtract = useCallback(async () => {
    if (!file) return;

    setExtracting(true);

    try {
      const fileUrl = getFilePublicUrl(file.path);

      const result = await extractFromDocument(fileUrl, file.type, file.name, file.size);

      setExtractionResult(result);

      // Initialize editable rooms
      setRooms(
        result.rooms.map((room, index) => ({
          ...room,
          index,
          selected: room.confidence >= 0.5, // Auto-select high-confidence items
        }))
      );

      // Initialize editable tasks
      setTasks(
        result.tasks.map((task, index) => ({
          ...task,
          index,
          selected: task.confidence >= 0.5,
        }))
      );

      toast({
        title: 'Analys klar',
        description: `Hittade ${result.rooms.length} rum och ${result.tasks.length} uppgifter`,
      });
    } catch (error) {
      console.error('Extraction error:', error);
      toast({
        title: 'Analysfel',
        description: error instanceof Error ? error.message : 'Kunde inte analysera dokumentet',
        variant: 'destructive',
      });
      onOpenChange(false);
    } finally {
      setExtracting(false);
    }
  }, [file, toast, onOpenChange]);

  const toggleRoomSelection = (index: number) => {
    setRooms((prev) =>
      prev.map((room) => (room.index === index ? { ...room, selected: !room.selected } : room))
    );
  };

  const toggleTaskSelection = (index: number) => {
    setTasks((prev) =>
      prev.map((task) => (task.index === index ? { ...task, selected: !task.selected } : task))
    );
  };

  const selectAllRooms = () => {
    setRooms((prev) => prev.map((room) => ({ ...room, selected: true })));
  };

  const deselectAllRooms = () => {
    setRooms((prev) => prev.map((room) => ({ ...room, selected: false })));
  };

  const selectAllTasks = () => {
    setTasks((prev) => prev.map((task) => ({ ...task, selected: true })));
  };

  const deselectAllTasks = () => {
    setTasks((prev) => prev.map((task) => ({ ...task, selected: false })));
  };

  const updateRoom = (index: number, updates: Partial<ExtractedRoom>) => {
    setRooms((prev) =>
      prev.map((room) => (room.index === index ? { ...room, ...updates } : room))
    );
  };

  const updateTask = (index: number, updates: Partial<ExtractedTask>) => {
    setTasks((prev) =>
      prev.map((task) => (task.index === index ? { ...task, ...updates } : task))
    );
  };

  const handleImport = async () => {
    const selectedRooms = rooms.filter((r) => r.selected);
    const selectedTasks = tasks.filter((t) => t.selected);

    if (selectedRooms.length === 0 && selectedTasks.length === 0) {
      toast({
        title: 'Inget valt',
        description: 'Välj minst ett rum eller en uppgift att importera',
        variant: 'destructive',
      });
      return;
    }

    setImporting(true);

    try {
      // Get user profile for created_by_user_id
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Inte inloggad');

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profileData) throw new Error('Kunde inte hitta användarprofil');

      const profileId = profileData.id;
      const createdRoomIds = new Map<string, string>(); // roomName -> roomId

      // 1. Create rooms in database and as shapes
      if (selectedRooms.length > 0) {
        // Calculate grid placements
        const placements = calculateGridPlacements(selectedRooms, shapes);

        for (const room of selectedRooms) {
          const placement = placements.get(room.index);
          if (!placement) continue;

          // Create room in rooms table
          const { data: roomData, error: roomError } = await supabase
            .from('rooms')
            .insert({
              project_id: projectId,
              name: room.name,
              description: room.description,
              dimensions: {
                estimatedAreaSqm: room.estimatedAreaSqm,
                width: placement.width,
                height: placement.height,
              },
            })
            .select('id')
            .single();

          if (roomError) {
            console.error('Error creating room:', roomError);
            continue;
          }

          createdRoomIds.set(room.name.toLowerCase(), roomData.id);

          // Create shape for canvas if we have a plan
          if (currentPlanId) {
            const roomShape: FloorMapShape = {
              id: `room-${Date.now()}-${room.index}`,
              type: 'room',
              planId: currentPlanId,
              roomId: roomData.id,
              name: room.name,
              coordinates: {
                points: createRoomPoints(placement),
              },
              color: 'rgba(59, 130, 246, 0.2)',
              strokeColor: '#1d4ed8',
            };

            addShape(roomShape);
          }
        }

        // Save shapes to database if we have a plan
        if (currentPlanId) {
          const updatedShapes = useFloorMapStore.getState().shapes;
          await saveShapesForPlan(currentPlanId, updatedShapes);
        }
      }

      // 2. Create tasks in database
      if (selectedTasks.length > 0) {
        for (const task of selectedTasks) {
          // Try to find matching room
          let roomId = null;
          if (task.roomName) {
            roomId = createdRoomIds.get(task.roomName.toLowerCase()) || null;

            // If not found in newly created rooms, search existing rooms
            if (!roomId) {
              const { data: existingRoom } = await supabase
                .from('rooms')
                .select('id')
                .eq('project_id', projectId)
                .ilike('name', task.roomName)
                .single();

              roomId = existingRoom?.id || null;
            }
          }

          const costCenter = TASK_CATEGORY_TO_COST_CENTER[task.category as TaskCategory] || 'construction';

          const { error: taskError } = await supabase.from('tasks').insert({
            project_id: projectId,
            room_id: roomId,
            title: task.title,
            description: task.description,
            status: 'to_do',
            priority: 'medium',
            created_by_user_id: profileId,
            cost_center: costCenter,
          });

          if (taskError) {
            console.error('Error creating task:', taskError);
          }
        }
      }

      toast({
        title: 'Import klar!',
        description: `Importerade ${selectedRooms.length} rum och ${selectedTasks.length} uppgifter`,
      });

      onOpenChange(false);
      onImportComplete?.();
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Importfel',
        description: error instanceof Error ? error.message : 'Kunde inte importera data',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const selectedRoomCount = rooms.filter((r) => r.selected).length;
  const selectedTaskCount = tasks.filter((t) => t.selected).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Importera från "{file?.name}"
          </DialogTitle>
          <DialogDescription>
            Granska och välj vilka rum och uppgifter som ska importeras
          </DialogDescription>
        </DialogHeader>

        {/* Loading State */}
        {extracting && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Analyserar dokument med AI...</p>
            <p className="text-sm text-muted-foreground mt-2">Detta kan ta upp till 30 sekunder</p>
          </div>
        )}

        {/* Results */}
        {!extracting && extractionResult && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Summary */}
            {extractionResult.documentSummary && (
              <Card className="mb-4 flex-shrink-0">
                <CardContent className="pt-4">
                  <div className="flex gap-2 items-start">
                    <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">{extractionResult.documentSummary}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Two-column layout */}
            <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
              {/* Rooms Column */}
              <Card className="flex flex-col min-h-0 overflow-hidden">
                <CardHeader className="pb-2 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      Rum ({rooms.length} hittade)
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={selectAllRooms}>
                        Alla
                      </Button>
                      <Button variant="ghost" size="sm" onClick={deselectAllRooms}>
                        Ingen
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 pt-0 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="space-y-2 pr-4">
                      {rooms.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Inga rum hittades i dokumentet
                        </p>
                      ) : (
                        rooms.map((room) => (
                          <div
                            key={room.index}
                            className={`flex items-start gap-2 p-2 rounded-lg border transition-colors ${
                              room.selected ? 'bg-primary/5 border-primary/20' : 'bg-background'
                            }`}
                          >
                            <Checkbox
                              checked={room.selected}
                              onCheckedChange={() => toggleRoomSelection(room.index)}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              {editingRoomIndex === room.index ? (
                                <div className="space-y-2">
                                  <Input
                                    value={room.name}
                                    onChange={(e) => updateRoom(room.index, { name: e.target.value })}
                                    placeholder="Rumsnamn"
                                    className="h-8"
                                  />
                                  <Input
                                    type="number"
                                    value={room.estimatedAreaSqm || ''}
                                    onChange={(e) =>
                                      updateRoom(room.index, {
                                        estimatedAreaSqm: e.target.value ? parseFloat(e.target.value) : null,
                                      })
                                    }
                                    placeholder="Area (m²)"
                                    className="h-8"
                                  />
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingRoomIndex(null)}
                                  >
                                    Klar
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium truncate">{room.name}</span>
                                    {room.estimatedAreaSqm && (
                                      <Badge variant="secondary" className="text-xs">
                                        {room.estimatedAreaSqm} m²
                                      </Badge>
                                    )}
                                    <ConfidenceIndicator confidence={room.confidence} />
                                  </div>
                                  {room.description && (
                                    <p className="text-xs text-muted-foreground truncate">
                                      {room.description}
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                            {editingRoomIndex !== room.index && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => setEditingRoomIndex(room.index)}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Tasks Column */}
              <Card className="flex flex-col min-h-0 overflow-hidden">
                <CardHeader className="pb-2 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ClipboardList className="h-4 w-4" />
                      Uppgifter ({tasks.length} hittade)
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={selectAllTasks}>
                        Alla
                      </Button>
                      <Button variant="ghost" size="sm" onClick={deselectAllTasks}>
                        Ingen
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 pt-0 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="space-y-2 pr-4">
                      {tasks.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Inga uppgifter hittades i dokumentet
                        </p>
                      ) : (
                        tasks.map((task) => (
                          <div
                            key={task.index}
                            className={`flex items-start gap-2 p-2 rounded-lg border transition-colors ${
                              task.selected ? 'bg-primary/5 border-primary/20' : 'bg-background'
                            }`}
                          >
                            <Checkbox
                              checked={task.selected}
                              onCheckedChange={() => toggleTaskSelection(task.index)}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              {editingTaskIndex === task.index ? (
                                <div className="space-y-2">
                                  <Input
                                    value={task.title}
                                    onChange={(e) => updateTask(task.index, { title: e.target.value })}
                                    placeholder="Uppgiftstitel"
                                    className="h-8"
                                  />
                                  <Select
                                    value={task.category}
                                    onValueChange={(value) =>
                                      updateTask(task.index, { category: value as TaskCategory })
                                    }
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue placeholder="Kategori" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Object.entries(TASK_CATEGORY_LABELS).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                          {label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingTaskIndex(null)}
                                  >
                                    Klar
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium">{task.title}</span>
                                    <ConfidenceIndicator confidence={task.confidence} />
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      {TASK_CATEGORY_LABELS[task.category as TaskCategory] || task.category}
                                    </Badge>
                                    {task.roomName && (
                                      <span className="text-xs text-muted-foreground">
                                        {task.roomName}
                                      </span>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                            {editingTaskIndex !== task.index && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => setEditingTaskIndex(task.index)}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                🟢 Hög konfidens (&gt;80%)
              </span>
              <span className="flex items-center gap-1">
                🟡 Medium (50-80%)
              </span>
              <span className="flex items-center gap-1">
                🔴 Låg (&lt;50%)
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <Separator className="my-4" />
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedRoomCount > 0 || selectedTaskCount > 0 ? (
              <span>
                Valt: {selectedRoomCount} rum, {selectedTaskCount} uppgifter
              </span>
            ) : (
              <span>Välj rum och uppgifter att importera</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
              Avbryt
            </Button>
            <Button
              onClick={handleImport}
              disabled={
                extracting ||
                importing ||
                (selectedRoomCount === 0 && selectedTaskCount === 0)
              }
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importerar...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Importera {selectedRoomCount} rum & {selectedTaskCount} uppgifter
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

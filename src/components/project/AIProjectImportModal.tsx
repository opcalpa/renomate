/**
 * AI Project Import Modal
 * Upload a document, AI extracts project name, rooms and tasks,
 * then creates the project with everything pre-filled.
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Sparkles,
  Loader2,
  Home,
  ClipboardList,
  CheckCircle2,
  Edit2,
  Upload,
  FileText,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  ExtractedRoom,
  ExtractedTask,
  AIDocumentExtractionResult,
  TaskCategory,
  TASK_CATEGORY_LABELS,
  TASK_CATEGORY_TO_COST_CENTER,
} from '@/services/aiDocumentService.types';

interface EditableRoom extends ExtractedRoom {
  index: number;
  selected: boolean;
}

interface EditableTask extends ExtractedTask {
  index: number;
  selected: boolean;
}

function ConfidenceIndicator({ confidence }: { confidence: number }) {
  if (confidence >= 0.8) return <span title={`${Math.round(confidence * 100)}%`}>🟢</span>;
  if (confidence >= 0.5) return <span title={`${Math.round(confidence * 100)}%`}>🟡</span>;
  return <span title={`${Math.round(confidence * 100)}%`}>🔴</span>;
}

interface AIProjectImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated: (projectId: string) => void;
}

export function AIProjectImportModal({ open, onOpenChange, onProjectCreated }: AIProjectImportModalProps) {
  const { toast } = useToast();
  const { t } = useTranslation();

  // Step 1: Upload, Step 2: Review, Step 3: Creating
  const [step, setStep] = useState<'upload' | 'review' | 'creating'>('upload');
  const [extracting, setExtracting] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [rooms, setRooms] = useState<EditableRoom[]>([]);
  const [tasks, setTasks] = useState<EditableTask[]>([]);
  const [editingRoomIndex, setEditingRoomIndex] = useState<number | null>(null);
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);
  const [summary, setSummary] = useState('');
  const [uploadedFile, setUploadedFile] = useState<{ tempPath: string; name: string; file: File } | null>(null);

  const resetState = useCallback(() => {
    setStep('upload');
    setExtracting(false);
    setProjectName('');
    setRooms([]);
    setTasks([]);
    setEditingRoomIndex(null);
    setEditingTaskIndex(null);
    setSummary('');
    setUploadedFile(null);
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.toLowerCase().split('.').pop();
    if (!['pdf', 'txt', 'docx', 'doc'].includes(ext || '')) {
      toast({
        title: t('errors.generic'),
        description: t('aiProjectImport.unsupportedFormat'),
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: t('errors.generic'),
        description: t('aiProjectImport.fileTooLarge'),
        variant: 'destructive',
      });
      return;
    }

    setExtracting(true);

    try {
      // Upload file to temp storage
      const tempPath = `temp/ai-import-${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from('project-files')
        .upload(tempPath, file);

      if (uploadErr) throw new Error(uploadErr.message);

      const { data: urlData } = supabase.storage
        .from('project-files')
        .getPublicUrl(tempPath);

      // Call the existing process-document edge function
      const { data, error } = await supabase.functions.invoke('process-document', {
        body: {
          fileUrl: urlData.publicUrl,
          fileType: file.type,
          fileName: file.name,
        },
      });

      if (error) {
        // Clean up temp file on error
        supabase.storage.from('project-files').remove([tempPath]);
        throw new Error(error.message);
      }

      // Keep reference to move file into project later
      setUploadedFile({ tempPath, name: file.name, file });

      const result = data as AIDocumentExtractionResult;
      result.rooms = result.rooms || [];
      result.tasks = result.tasks || [];
      result.documentSummary = result.documentSummary || '';

      // Use document summary to suggest a project name
      // Try to extract a short name from the summary, or use the filename
      const suggestedName = extractProjectName(result.documentSummary, file.name);
      setProjectName(suggestedName);
      setSummary(result.documentSummary);

      setRooms(
        result.rooms.map((room, index) => ({
          ...room,
          index,
          selected: room.confidence >= 0.5,
        }))
      );

      setTasks(
        result.tasks.map((task, index) => ({
          ...task,
          index,
          selected: task.confidence >= 0.5,
        }))
      );

      setStep('review');

      toast({
        title: t('aiDocumentImport.analysisDone'),
        description: t('aiDocumentImport.analysisResult', { rooms: result.rooms.length, tasks: result.tasks.length }),
      });
    } catch (err) {
      console.error('AI extraction error:', err);
      toast({
        title: t('aiDocumentImport.analysisError'),
        description: err instanceof Error ? err.message : t('aiDocumentImport.couldNotAnalyze'),
        variant: 'destructive',
      });
    } finally {
      setExtracting(false);
      // Reset the input so the same file can be re-selected
      e.target.value = '';
    }
  };

  const handleImport = async () => {
    if (!projectName.trim()) return;

    const selectedRooms = rooms.filter((r) => r.selected);
    const selectedTasks = tasks.filter((t) => t.selected);

    setStep('creating');

    try {
      // Refresh session to ensure valid token after potentially long AI analysis
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) throw new Error('Inte inloggad');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profil hittades inte');

      // 1. Create project
      let projectId: string;

      const projectPayload = {
        name: projectName.trim(),
        description: summary || null,
        owner_id: profile.id,
      };

      // Try insert with select (same as Projects.tsx)
      const { data: insertResult, error: projErr } = await supabase
        .from('projects')
        .insert(projectPayload)
        .select()
        .single();

      if (projErr) {
        // Fallback: plain insert then query
        console.error('[AI Import] Insert failed:', projErr.message, '— trying plain insert');
        const { error: plainErr } = await supabase
          .from('projects')
          .insert(projectPayload);

        if (plainErr) throw new Error(plainErr.message);

        const { data: found } = await supabase
          .from('projects')
          .select('id')
          .eq('owner_id', profile.id)
          .eq('name', projectPayload.name)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!found) throw new Error('Projekt skapades men kunde inte hittas');
        projectId = found.id;
      } else {
        projectId = insertResult.id;
      }

      // Move uploaded document into project files
      if (uploadedFile) {
        const destPath = `projects/${projectId}/${Date.now()}-${uploadedFile.name}`;
        // Re-upload the original file to the project path (Supabase has no move API)
        await supabase.storage.from('project-files').upload(destPath, uploadedFile.file);
        // Remove temp file
        supabase.storage.from('project-files').remove([uploadedFile.tempPath]);
      }

      const createdRoomIds = new Map<string, string>();

      // 2. Create rooms
      for (const room of selectedRooms) {
        const { data: roomData, error: roomErr } = await supabase
          .from('rooms')
          .insert({
            project_id: projectId,
            name: room.name,
            description: room.description,
            dimensions: room.estimatedAreaSqm
              ? { estimatedAreaSqm: room.estimatedAreaSqm }
              : null,
          })
          .select('id')
          .single();

        if (roomErr) {
          console.error('Error creating room:', roomErr);
          continue;
        }
        createdRoomIds.set(room.name.toLowerCase(), roomData.id);
      }

      // 3. Create tasks linked to rooms
      for (const task of selectedTasks) {
        let roomId: string | null = null;
        if (task.roomName) {
          roomId = createdRoomIds.get(task.roomName.toLowerCase()) || null;
        }

        const costCenter = TASK_CATEGORY_TO_COST_CENTER[task.category as TaskCategory] || 'construction';

        const { error: taskErr } = await supabase.from('tasks').insert({
          project_id: projectId,
          room_id: roomId,
          title: task.title,
          description: task.description,
          status: 'to_do',
          priority: 'medium',
          created_by_user_id: profile.id,
          cost_center: costCenter,
        });

        if (taskErr) {
          console.error('Error creating task:', taskErr);
        }
      }

      toast({
        title: t('aiProjectImport.projectCreated'),
        description: t('aiProjectImport.projectCreatedDescription', {
          rooms: selectedRooms.length,
          tasks: selectedTasks.length,
        }),
      });

      onOpenChange(false);
      resetState();
      onProjectCreated(projectId);
    } catch (err) {
      console.error('Import error:', err);
      toast({
        title: t('errors.generic'),
        description: err instanceof Error ? err.message : t('aiDocumentImport.couldNotImport'),
        variant: 'destructive',
      });
      setStep('review');
    }
  };

  const toggleRoomSelection = (index: number) => {
    setRooms((prev) => prev.map((r) => (r.index === index ? { ...r, selected: !r.selected } : r)));
  };

  const toggleTaskSelection = (index: number) => {
    setTasks((prev) => prev.map((t) => (t.index === index ? { ...t, selected: !t.selected } : t)));
  };

  const updateRoom = (index: number, updates: Partial<ExtractedRoom>) => {
    setRooms((prev) => prev.map((r) => (r.index === index ? { ...r, ...updates } : r)));
  };

  const updateTask = (index: number, updates: Partial<ExtractedTask>) => {
    setTasks((prev) => prev.map((t) => (t.index === index ? { ...t, ...updates } : t)));
  };

  const selectedRoomCount = rooms.filter((r) => r.selected).length;
  const selectedTaskCount = tasks.filter((t) => t.selected).length;

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o && uploadedFile) {
        supabase.storage.from('project-files').remove([uploadedFile.tempPath]);
      }
      onOpenChange(o);
      if (!o) resetState();
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('aiProjectImport.title')}
          </DialogTitle>
          <DialogDescription>{t('aiProjectImport.description')}</DialogDescription>
        </DialogHeader>

        {/* Upload step */}
        {step === 'upload' && !extracting && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="rounded-full bg-primary/10 p-4">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-medium">{t('aiProjectImport.uploadTitle')}</p>
              <p className="text-sm text-muted-foreground">{t('aiProjectImport.uploadDescription')}</p>
            </div>
            <Label htmlFor="ai-project-file" className="cursor-pointer">
              <Button asChild variant="outline" className="min-h-[48px]">
                <span>
                  <FileText className="h-4 w-4 mr-2" />
                  {t('aiProjectImport.chooseFile')}
                </span>
              </Button>
            </Label>
            <input
              id="ai-project-file"
              type="file"
              accept=".pdf,.txt,.docx,.doc"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        )}

        {/* Extracting spinner */}
        {extracting && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">{t('aiDocumentImport.analyzing')}</p>
            <p className="text-sm text-muted-foreground mt-2">{t('aiDocumentImport.analyzingTime')}</p>
          </div>
        )}

        {/* Review step */}
        {step === 'review' && (
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <div className="space-y-4">
              {/* Project name */}
              <div className="space-y-2">
                <Label>{t('projects.projectName')} *</Label>
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder={t('projects.projectNamePlaceholder')}
                  className="min-h-[44px]"
                />
              </div>

              {/* Summary */}
              {summary && (
                <div className="flex gap-2 items-start p-3 rounded-lg bg-muted/50">
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">{summary}</p>
                </div>
              )}

              {/* Rooms */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    {t('aiDocumentImport.roomsFound', { count: rooms.length })}
                  </h4>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setRooms((p) => p.map((r) => ({ ...r, selected: true })))}>
                      {t('aiDocumentImport.all')}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setRooms((p) => p.map((r) => ({ ...r, selected: false })))}>
                      {t('aiDocumentImport.none')}
                    </Button>
                  </div>
                </div>
                {rooms.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-3">{t('aiDocumentImport.noRoomsFound')}</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {rooms.map((room) => (
                      <div
                        key={room.index}
                        className={`flex items-start gap-2 p-2 rounded-lg border transition-colors ${room.selected ? 'bg-primary/5 border-primary/20' : 'bg-background'}`}
                      >
                        <Checkbox checked={room.selected} onCheckedChange={() => toggleRoomSelection(room.index)} className="mt-0.5" />
                        <div className="flex-1 min-w-0">
                          {editingRoomIndex === room.index ? (
                            <div className="space-y-1.5">
                              <Input value={room.name} onChange={(e) => updateRoom(room.index, { name: e.target.value })} className="h-7 text-sm" />
                              <Input
                                type="number"
                                value={room.estimatedAreaSqm || ''}
                                onChange={(e) => updateRoom(room.index, { estimatedAreaSqm: e.target.value ? parseFloat(e.target.value) : null })}
                                placeholder={t('aiDocumentImport.areaPlaceholder')}
                                className="h-7 text-sm"
                              />
                              <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setEditingRoomIndex(null)}>{t('aiDocumentImport.done')}</Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium truncate">{room.name}</span>
                              {room.estimatedAreaSqm && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{room.estimatedAreaSqm} m²</Badge>}
                              <ConfidenceIndicator confidence={room.confidence} />
                            </div>
                          )}
                        </div>
                        {editingRoomIndex !== room.index && (
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setEditingRoomIndex(room.index)}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Tasks */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    {t('aiDocumentImport.tasksFound', { count: tasks.length })}
                  </h4>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setTasks((p) => p.map((t) => ({ ...t, selected: true })))}>
                      {t('aiDocumentImport.all')}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setTasks((p) => p.map((t) => ({ ...t, selected: false })))}>
                      {t('aiDocumentImport.none')}
                    </Button>
                  </div>
                </div>
                {tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-3">{t('aiDocumentImport.noTasksFound')}</p>
                ) : (
                  <div className="space-y-1.5">
                    {tasks.map((task) => (
                      <div
                        key={task.index}
                        className={`flex items-start gap-2 p-2 rounded-lg border transition-colors ${task.selected ? 'bg-primary/5 border-primary/20' : 'bg-background'}`}
                      >
                        <Checkbox checked={task.selected} onCheckedChange={() => toggleTaskSelection(task.index)} className="mt-0.5" />
                        <div className="flex-1 min-w-0">
                          {editingTaskIndex === task.index ? (
                            <div className="space-y-1.5">
                              <Input value={task.title} onChange={(e) => updateTask(task.index, { title: e.target.value })} className="h-7 text-sm" />
                              <Select value={task.category} onValueChange={(v) => updateTask(task.index, { category: v as TaskCategory })}>
                                <SelectTrigger className="h-7 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {Object.entries(TASK_CATEGORY_LABELS).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setEditingTaskIndex(null)}>{t('aiDocumentImport.done')}</Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-medium">{task.title}</span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {TASK_CATEGORY_LABELS[task.category as TaskCategory] || task.category}
                              </Badge>
                              {task.roomName && <span className="text-xs text-muted-foreground">({task.roomName})</span>}
                              <ConfidenceIndicator confidence={task.confidence} />
                            </div>
                          )}
                        </div>
                        {editingTaskIndex !== task.index && (
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setEditingTaskIndex(task.index)}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{t('aiDocumentImport.highConfidence')}</span>
                <span>{t('aiDocumentImport.mediumConfidence')}</span>
                <span>{t('aiDocumentImport.lowConfidence')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Creating spinner */}
        {step === 'creating' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">{t('aiProjectImport.creating')}</p>
          </div>
        )}

        {/* Footer */}
        {step === 'review' && (
          <>
            <Separator className="my-4" />
            <div className="flex items-center justify-between flex-shrink-0">
              <div className="text-sm text-muted-foreground">
                {selectedRoomCount > 0 || selectedTaskCount > 0
                  ? t('aiDocumentImport.selected', { rooms: selectedRoomCount, tasks: selectedTaskCount })
                  : t('aiDocumentImport.selectPrompt')}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { onOpenChange(false); resetState(); }}>
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!projectName.trim()}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {t('aiProjectImport.createProject')}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Try to extract a short project name from the AI summary.
 * Falls back to a cleaned-up filename.
 */
function extractProjectName(summary: string, fileName: string): string {
  // If summary is short enough (< 60 chars), use it as-is
  if (summary && summary.length < 60 && summary.length > 3) {
    // Take first sentence
    const firstSentence = summary.split(/[.\n]/)[0].trim();
    if (firstSentence.length > 3 && firstSentence.length < 60) {
      return firstSentence;
    }
  }

  // Try to extract an address or object name from summary
  if (summary) {
    // Look for common patterns like "Renovering av Storgatan 12" or "Badrumsrenovering"
    const addressMatch = summary.match(/(?:renovering|ombyggnad|uppdrag)\s+(?:av|på|i)\s+([^,.]+)/i);
    if (addressMatch) return addressMatch[0].trim().substring(0, 60);

    // Just use first 60 chars of summary
    const short = summary.substring(0, 60).trim();
    if (short.length > 10) return short;
  }

  // Fall back to filename without extension
  return fileName.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
}

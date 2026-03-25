import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useBatchClassification, type BatchClassificationItem } from '@/hooks/useBatchClassification';
import { batchRename } from '@/services/batchRenameService';
import { BatchTolkSummaryTable } from './BatchTolkSummaryTable';
import { BatchTolkFilePreview } from './BatchTolkFilePreview';

interface ProjectFile {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
}

interface BatchSmartTolkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: ProjectFile[];
  projectId: string;
  onComplete: () => void;
}

export function BatchSmartTolkDialog({
  open, onOpenChange, files, projectId, onComplete,
}: BatchSmartTolkDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const { items, progress, isComplete, updateItem } = useBatchClassification(
    open ? files : [],
    projectId,
    open,
  );

  const [selectedForRename, setSelectedForRename] = useState<Set<string>>(new Set());
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);
  const [renaming, setRenaming] = useState(false);

  // Entity lists for linking
  const [tasks, setTasks] = useState<{ id: string; name: string }[]>([]);
  const [materials, setMaterials] = useState<{ id: string; name: string }[]>([]);
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([]);
  const [profileId, setProfileId] = useState<string | null>(null);

  // Fetch entities + profile
  useEffect(() => {
    if (!open) return;
    (async () => {
      const [tasksRes, matsRes, roomsRes] = await Promise.all([
        supabase.from('tasks').select('id, title').eq('project_id', projectId).order('title'),
        supabase.from('materials').select('id, name').eq('project_id', projectId).order('name'),
        supabase.from('rooms').select('id, name').eq('project_id', projectId).order('name'),
      ]);
      setTasks((tasksRes.data || []).map(t => ({ id: t.id, name: t.title })));
      setMaterials(matsRes.data || []);
      setRooms(roomsRes.data || []);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
        if (profile) setProfileId(profile.id);
      }
    })();
  }, [open, projectId]);

  // Auto-select done items for rename
  useEffect(() => {
    const doneWithSuggestion = items.filter(i => i.status === 'done' && i.suggestedName && i.suggestedName !== i.file.name);
    setSelectedForRename(new Set(doneWithSuggestion.map(i => i.file.path)));
  }, [items.filter(i => i.status === 'done').length]);

  const refreshEntities = useCallback(async () => {
    const [tasksRes, matsRes, roomsRes] = await Promise.all([
      supabase.from('tasks').select('id, title').eq('project_id', projectId).order('title'),
      supabase.from('materials').select('id, name').eq('project_id', projectId).order('name'),
      supabase.from('rooms').select('id, name').eq('project_id', projectId).order('name'),
    ]);
    setTasks((tasksRes.data || []).map(t => ({ id: t.id, name: t.title })));
    setMaterials(matsRes.data || []);
    setRooms(roomsRes.data || []);
  }, [projectId]);

  const toggleRename = (path: string) => {
    setSelectedForRename(prev => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  };

  const toggleAllRename = () => {
    const renameable = items.filter(i => i.suggestedName && i.suggestedName !== i.file.name);
    if (selectedForRename.size === renameable.length) {
      setSelectedForRename(new Set());
    } else {
      setSelectedForRename(new Set(renameable.map(i => i.file.path)));
    }
  };

  const handleDone = async () => {
    if (selectedForRename.size > 0) {
      setRenaming(true);
      const renames = items
        .filter(i => selectedForRename.has(i.file.path) && i.suggestedName)
        .map(i => ({ oldPath: i.file.path, newFileName: i.suggestedName! }));

      const result = await batchRename(renames);
      setRenaming(false);

      if (result.success > 0) {
        toast({ title: t('batchTolk.renameSuccess', '{{count}} filer omdöpta', { count: result.success }) });
      }
      if (result.failed > 0) {
        toast({ title: t('batchTolk.renameFailed', '{{failed}} filer kunde inte döpas om', { failed: result.failed }), variant: 'destructive' });
      }
    }

    onComplete();
    onOpenChange(false);
  };

  const handleSkip = () => {
    onComplete();
    onOpenChange(false);
  };

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const renameableCount = items.filter(i => i.suggestedName && i.suggestedName !== i.file.name).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-6xl w-[calc(100%-2rem)] !max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('batchTolk.title', 'Smart Tolk')} — {progress.total} {t('batchTolk.filesCount', 'filer')}
          </DialogTitle>
          <DialogDescription>
            {!isComplete
              ? `${t('batchTolk.classifying', 'Tolkar')}... ${progress.done}/${progress.total}`
              : progress.errors > 0
                ? t('batchTolk.completeWithErrors', 'Klart ({{errors}} fel)', { errors: progress.errors })
                : t('batchTolk.classificationComplete', 'Alla filer tolkade')
            }
          </DialogDescription>
          {!isComplete && (
            <Progress value={pct} className="h-1.5 mt-2" />
          )}
        </DialogHeader>

        {/* Main content: table + optional preview */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          <div className={previewFile ? 'w-[60%]' : 'w-full'}>
            <BatchTolkSummaryTable
              items={items}
              onUpdateItem={updateItem}
              onPreviewFile={setPreviewFile}
              selectedForRename={selectedForRename}
              onToggleRename={toggleRename}
              projectId={projectId}
              tasks={tasks}
              materials={materials}
              rooms={rooms}
              onEntitiesChanged={refreshEntities}
              profileId={profileId}
            />
          </div>
          {previewFile && (
            <div className="w-[40%]">
              <BatchTolkFilePreview file={previewFile} onClose={() => setPreviewFile(null)} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t flex-shrink-0">
          <div className="flex items-center gap-2">
            {renameableCount > 0 && (
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox
                  checked={selectedForRename.size === renameableCount && renameableCount > 0}
                  onCheckedChange={toggleAllRename}
                />
                {t('batchTolk.selectAllRename', 'Markera alla för namnbyte')} ({renameableCount})
              </label>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSkip} disabled={renaming}>
              {t('batchTolk.skip', 'Hoppa över')}
            </Button>
            <Button onClick={handleDone} disabled={renaming || !isComplete}>
              {renaming ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {t('batchTolk.renaming', 'Döper om...')}</>
              ) : selectedForRename.size > 0 ? (
                t('batchTolk.renameAndDone', 'Byt namn & klar')
              ) : (
                t('batchTolk.done', 'Klar')
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

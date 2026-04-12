import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Upload,
  FileIcon,
  Download,
  Trash2,
  Image as ImageIcon,
  FileText,
  Loader2,
  FolderOpen,
  MessageSquare,
  FolderPlus,
  Folder,
  ChevronLeft,
  ChevronRight,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCw,
  X,
  Layers,
  Sparkles,
  Wand2,
  Link,
  Camera,
  ChevronDown,
  MoreVertical,
  Settings2,
  AlignJustify,
  Plus,
  Check,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Pin,
  LayoutGrid,
  List,
  HelpCircle,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { AIFloorPlanImport } from "./AIFloorPlanImport";
import { AIDocumentImportModal } from "./AIDocumentImportModal";
import { LinkFileToTaskDialog } from "./LinkFileToTaskDialog";
import { SmartUploadDialog, type SmartUploadAction } from "./SmartUploadDialog";
import { QuoteReviewDialog } from "./QuoteReviewDialog";
import { LinkPurchaseDialog } from "./LinkPurchaseDialog";
import { isDocumentFile } from "@/services/aiDocumentService";
import { BatchSmartUploadDialog, readDroppedItems, type DroppedFile } from "./BatchSmartUploadDialog";
import { BatchSmartTolkDialog } from "./batch-tolk";
import { FilesGridView } from "./files/FilesGridView";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ProjectFile {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  uploaded_at: string;
  uploaded_by: string;
  uploader_name?: string;
  folder?: string;
  thumbnail_url?: string;
}

interface Folder {
  id: string;
  name: string;
  path: string;
}

interface ProjectFilesTabProps {
  projectId: string;
  projectName: string;
  canEdit?: boolean;
  onNavigateToFloorPlan?: () => void;
  onUseAsBackground?: (imageUrl: string, fileName: string) => void;
}

const ProjectFilesTab = ({ projectId, projectName, canEdit = true, onNavigateToFloorPlan, onUseAsBackground }: ProjectFilesTabProps) => {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<ProjectFile | null>(null);
  const [selectedFileForComments, setSelectedFileForComments] = useState<ProjectFile | null>(null);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [imageZoom, setImageZoom] = useState(100);
  const [imageRotation, setImageRotation] = useState(0);
  const [documentImportFile, setDocumentImportFile] = useState<ProjectFile | null>(null);
  const [showDocumentUploadSuggestion, setShowDocumentUploadSuggestion] = useState<ProjectFile | null>(null);
  const [showImageUploadSuggestion, setShowImageUploadSuggestion] = useState<ProjectFile | null>(null);
  const [floorPlanImportFile, setFloorPlanImportFile] = useState<ProjectFile | null>(null);
  const [linkFile, setLinkFile] = useState<ProjectFile | null>(null);
  const [showSmartUpload, setShowSmartUpload] = useState(false);
  const [quoteReviewFile, setQuoteReviewFile] = useState<File | null>(null);
  const [purchaseFile, setPurchaseFile] = useState<{ file: File; type: "invoice" | "receipt" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [batchFiles, setBatchFiles] = useState<DroppedFile[]>([]);
  const [showBatchUpload, setShowBatchUpload] = useState(false);
  const dragCountRef = useRef(0);

  // Internal drag-and-drop state (handlers defined after toast/t)
  const [dragItem, setDragItem] = useState<{ path: string; name: string; isFolder: boolean } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  // Expandable folders — inline sub-file display
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [folderContents, setFolderContents] = useState<Map<string, ProjectFile[]>>(new Map());

  const toggleFolder = useCallback(async (folderPath: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
        // Fetch contents if not cached
        if (!folderContents.has(folderPath)) {
          const basePath = `projects/${projectId}/${folderPath}`;
          supabase.storage.from('project-files').list(basePath, { sortBy: { column: 'name', order: 'asc' } })
            .then(({ data }) => {
              if (!data) return;
              const subFiles = data
                .filter(f => !f.name.startsWith('.') && f.name.includes('.'))
                .map(f => {
                  const filePath = `${basePath}/${f.name}`;
                  const mime = (f.metadata as Record<string, unknown>)?.mimetype as string || '';
                  let thumbnailUrl: string | undefined;
                  if (mime.startsWith('image/')) {
                    const { data: { publicUrl } } = supabase.storage
                      .from('project-files')
                      .getPublicUrl(filePath, { transform: { width: 100, height: 100, resize: 'cover' } });
                    thumbnailUrl = publicUrl;
                  }
                  return {
                    id: f.id || f.name,
                    name: f.name,
                    path: filePath,
                    size: (f.metadata as Record<string, unknown>)?.size as number || 0,
                    type: mime,
                    uploaded_at: f.created_at || '',
                    thumbnail_url: thumbnailUrl,
                  };
                }) as ProjectFile[];
              setFolderContents(prev => new Map(prev).set(folderPath, subFiles));
            });
        }
      }
      return next;
    });
  }, [projectId, folderContents]);

  const { toast } = useToast();
  const { t } = useTranslation();

  // Internal drag-and-drop — move files between directories
  const moveFile = useCallback(async (fromPath: string, toFolderPath: string, fileName: string) => {
    const basePath = `projects/${projectId}`;
    const newPath = toFolderPath
      ? `${basePath}/${toFolderPath}/${fileName}`
      : `${basePath}/${fileName}`;

    if (fromPath === newPath) return;

    const { error } = await supabase.storage
      .from('project-files')
      .move(fromPath, newPath);

    if (error) {
      console.error('Move failed:', error);
      toast({
        title: t('files.moveError', 'Kunde inte flytta filen'),
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: t('files.fileMoved', 'Fil flyttad'),
      description: fileName,
    });

    // Also update file_path in task_file_links
    await supabase
      .from('task_file_links')
      .update({ file_path: newPath })
      .eq('file_path', fromPath)
      .eq('project_id', projectId);

    // Refresh
    await fetchFiles();
    await fetchFolders();
    setFolderContents(new Map());
    setExpandedFolders(new Set());
  }, [projectId, t]);

  const handleInternalDragStart = useCallback((e: React.DragEvent, path: string, name: string, isFolder: boolean) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/x-internal-path', path);
    e.dataTransfer.setData('text/x-internal-name', name);
    e.dataTransfer.setData('text/x-is-folder', isFolder ? '1' : '0');
    setDragItem({ path, name, isFolder });
  }, []);

  const handleInternalDragEnd = useCallback(() => {
    setDragItem(null);
    setDropTarget(null);
  }, []);

  const handleFolderDragOver = useCallback((e: React.DragEvent, folderPath: string) => {
    if (e.dataTransfer.types.includes('text/x-internal-path')) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      setDropTarget(folderPath);
    }
  }, []);

  const handleFolderDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(null);
  }, []);

  const handleFolderDrop = useCallback(async (e: React.DragEvent, targetFolderPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(null);
    setDragItem(null);

    const fromPath = e.dataTransfer.getData('text/x-internal-path');
    const fileName = e.dataTransfer.getData('text/x-internal-name');
    const isFolder = e.dataTransfer.getData('text/x-is-folder') === '1';

    if (!fromPath || !fileName) return;

    if (isFolder) {
      toast({
        title: t('files.moveFolderNotSupported', 'Mappflyttning stöds inte ännu'),
        variant: 'destructive',
      });
      return;
    }

    await moveFile(fromPath, targetFolderPath, fileName);
  }, [moveFile, t]);

  // Search filter
  const [fileSearch, setFileSearch] = useState('');

  // Compact row toggle
  const [compactRows, setCompactRows] = useState(() => localStorage.getItem('files_compact') === 'true');
  const toggleCompact = () => {
    setCompactRows(prev => { const next = !prev; localStorage.setItem('files_compact', String(next)); return next; });
  };

  // File sorting
  type FileSortKey = 'name' | 'category' | 'task' | 'purchase' | 'room' | 'vendor' | 'invoiceDate' | 'invoiceAmount' | 'rotAmount' | 'summary' | 'type' | 'size' | 'uploaded';
  const [fileSortKey, setFileSortKey] = useState<FileSortKey | null>(null);
  const [fileSortDir, setFileSortDir] = useState<'asc' | 'desc'>('asc');
  const toggleFileSort = (key: FileSortKey) => {
    if (fileSortKey === key) {
      setFileSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setFileSortKey(key);
      setFileSortDir('asc');
    }
  };

  // Pinned column (sticky left after checkbox)
  const [pinnedCol, setPinnedCol] = useState<'name' | FileSortKey | null>('name');

  // View mode — folder (default), grid, or flat
  type FilesViewMode = 'folder' | 'grid' | 'flat';
  const [viewMode, setViewMode] = useState<FilesViewMode>(() => {
    return (localStorage.getItem('files_view_mode') as FilesViewMode) || 'folder';
  });
  const changeViewMode = (mode: FilesViewMode) => {
    setViewMode(mode);
    localStorage.setItem('files_view_mode', mode);
  };
  const [allProjectFiles, setAllProjectFiles] = useState<ProjectFile[]>([]);
  const [loadingFlat, setLoadingFlat] = useState(false);

  const fetchAllFiles = async () => {
    setLoadingFlat(true);
    try {
      const basePath = `projects/${projectId}`;
      const result: ProjectFile[] = [];

      // Recursive list function
      const listRecursive = async (path: string) => {
        const { data, error } = await supabase.storage
          .from('project-files')
          .list(path, { sortBy: { column: 'name', order: 'asc' } });
        if (error || !data) return;

        for (const item of data) {
          if (item.name === '.emptyFolderPlaceholder') continue;
          const fullPath = `${path}/${item.name}`;

          if (item.metadata?.mimetype) {
            // It's a file — generate thumbnail for images
            let thumbnailUrl: string | undefined;
            if (item.metadata.mimetype.startsWith('image/')) {
              const { data: { publicUrl } } = supabase.storage
                .from('project-files')
                .getPublicUrl(fullPath, { transform: { width: 100, height: 100, resize: 'cover' } });
              thumbnailUrl = publicUrl;
            }
            result.push({
              id: item.id || item.name,
              name: item.name,
              path: fullPath,
              size: item.metadata?.size || 0,
              type: item.metadata?.mimetype || 'unknown',
              uploaded_at: item.created_at || new Date().toISOString(),
              uploaded_by: '',
              folder: path.replace(basePath, '').replace(/^\//, '') || '/',
              thumbnail_url: thumbnailUrl,
            });
          } else if (!item.name.includes('.')) {
            // Likely a folder — recurse
            await listRecursive(fullPath);
          }
        }
      };

      await listRecursive(basePath);
      setAllProjectFiles(result);
    } catch (err) {
      console.error('Failed to fetch all files:', err);
    } finally {
      setLoadingFlat(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'flat') fetchAllFiles();
  }, [viewMode]);

  // Batch selection
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  // batchProcessing/batchProgress removed — BatchSmartTolkDialog handles its own state

  const toggleFileSelection = (path: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  };

  // Configurable file table columns
  type FileColKey = 'category' | 'task' | 'purchase' | 'room' | 'vendor' | 'invoiceDate' | 'invoiceAmount' | 'rotAmount' | 'summary' | 'size' | 'uploaded' | 'type';
  const ALL_FILE_COLS: FileColKey[] = ['category', 'task', 'purchase', 'room', 'vendor', 'invoiceDate', 'invoiceAmount', 'rotAmount', 'summary', 'size', 'uploaded', 'type'];
  const [hiddenFileCols, setHiddenFileCols] = useState<Set<FileColKey>>(() => {
    try {
      const saved = localStorage.getItem('files_hidden_cols');
      return saved ? new Set(JSON.parse(saved) as FileColKey[]) : new Set<FileColKey>(['type', 'room', 'invoiceDate', 'invoiceAmount', 'rotAmount', 'vendor', 'summary']);
    } catch { return new Set<FileColKey>(['type', 'room', 'invoiceDate', 'invoiceAmount', 'rotAmount', 'vendor', 'summary']); }
  });
  const fileColLabels: Record<FileColKey, string> = {
    category: t('files.category', 'Kategori'),
    task: t('common.task', 'Arbete'),
    purchase: t('nav.purchases', 'Inköp'),
    room: t('common.room', 'Rum'),
    invoiceDate: t('files.invoiceDate', 'Fakturadatum'),
    invoiceAmount: t('files.invoiceAmount', 'Belopp'),
    rotAmount: t('files.rotAmount', 'ROT-avdrag'),
    vendor: t('files.vendor', 'Leverantör'),
    summary: t('files.aiSummary', 'AI-sammanfattning'),
    type: t('budget.type', 'Typ'),
    size: t('files.size', 'Storlek'),
    uploaded: t('files.uploaded', 'Uppladdad'),
  };

  // Fetch file-entity links for the project
  interface FileLink {
    id?: string;
    file_path: string;
    task_id: string | null;
    material_id: string | null;
    room_id: string | null;
    file_type: string;
    invoice_date?: string | null;
    invoice_amount?: number | null;
    rot_amount?: number | null;
    vendor_name?: string | null;
    ai_summary?: string | null;
    task_name?: string;
    material_name?: string;
    room_name?: string;
  }
  const [fileLinks, setFileLinks] = useState<FileLink[]>([]);
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      const { data } = await supabase
        .from('task_file_links')
        .select('id, file_path, task_id, material_id, room_id, file_type, invoice_date, invoice_amount, rot_amount, vendor_name, ai_summary')
        .eq('project_id', projectId);
      if (!data) return;

      // Fetch names for linked entities
      const taskIds = [...new Set(data.filter(d => d.task_id).map(d => d.task_id!))];
      const matIds = [...new Set(data.filter(d => d.material_id).map(d => d.material_id!))];
      const roomIds = [...new Set(data.filter(d => d.room_id).map(d => d.room_id!))];

      const [tasksRes, matsRes, roomsRes] = await Promise.all([
        taskIds.length > 0 ? supabase.from('tasks').select('id, title').in('id', taskIds) : { data: [] },
        matIds.length > 0 ? supabase.from('materials').select('id, name').in('id', matIds) : { data: [] },
        roomIds.length > 0 ? supabase.from('rooms').select('id, name').in('id', roomIds) : { data: [] },
      ]);

      const taskMap = new Map((tasksRes.data || []).map(t => [t.id, t.title]));
      const matMap = new Map((matsRes.data || []).map(m => [m.id, m.name]));
      const roomMap = new Map((roomsRes.data || []).map(r => [r.id, r.name]));

      setFileLinks(data.map(d => ({
        ...d,
        task_name: d.task_id ? taskMap.get(d.task_id) || undefined : undefined,
        material_name: d.material_id ? matMap.get(d.material_id) || undefined : undefined,
        room_name: d.room_id ? roomMap.get(d.room_id) || undefined : undefined,
      })));
    })();
  }, [projectId, files]);

  // Precomputed Map for O(1) lookups instead of O(n) filter per cell
  const fileLinksMap = useMemo(() => {
    const map = new Map<string, typeof fileLinks>();
    for (const link of fileLinks) {
      const arr = map.get(link.file_path);
      if (arr) arr.push(link);
      else map.set(link.file_path, [link]);
    }
    return map;
  }, [fileLinks]);

  const getFileLinksForPath = useCallback(
    (path: string) => fileLinksMap.get(path) || [],
    [fileLinksMap],
  );

  // Available entities for linking dropdowns
  const [availTasks, setAvailTasks] = useState<Array<{ id: string; name: string }>>([]);
  const [availMaterials, setAvailMaterials] = useState<Array<{ id: string; name: string }>>([]);
  const [availRooms, setAvailRooms] = useState<Array<{ id: string; name: string }>>([]);
  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      supabase.from('tasks').select('id, title').eq('project_id', projectId).order('title'),
      supabase.from('materials').select('id, name').eq('project_id', projectId).order('name'),
      supabase.from('rooms').select('id, name').eq('project_id', projectId).order('name'),
    ]).then(([t, m, r]) => {
      setAvailTasks((t.data || []).map(x => ({ id: x.id, name: x.title })));
      setAvailMaterials((m.data || []).map(x => ({ id: x.id, name: x.name })));
      setAvailRooms((r.data || []).map(x => ({ id: x.id, name: x.name })));
    });
  }, [projectId]);

  // Category overrides (localStorage since no DB column for standalone file category)
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('files_cat_overrides') || '{}'); } catch { return {}; }
  });
  const setCategoryForFile = (path: string, cat: string) => {
    setCategoryOverrides(prev => {
      const next = { ...prev, [path]: cat };
      localStorage.setItem('files_cat_overrides', JSON.stringify(next));
      return next;
    });
  };
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('files_custom_cats') || '[]'); } catch { return []; }
  });

  // Get current user profile ID for linking
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('profiles').select('id').eq('user_id', user.id).single().then(({ data }) => {
        if (data) setCurrentProfileId(data.id);
      });
    });
  }, []);

  // Link/unlink a file to an entity
  const linkFileToEntity = async (file: ProjectFile, entityType: 'task' | 'material' | 'room', entityId: string) => {
    if (!currentProfileId) return;
    const field = entityType === 'task' ? 'task_id' : entityType === 'material' ? 'material_id' : 'room_id';
    await supabase.from('task_file_links').insert({
      project_id: projectId,
      [field]: entityId,
      file_path: file.path,
      file_name: file.name,
      file_type: 'other',
      file_size: file.size,
      mime_type: file.type,
      linked_by_user_id: currentProfileId,
    });
    // Refresh links
    const { data } = await supabase.from('task_file_links').select('file_path, task_id, material_id, room_id, file_type, id').eq('project_id', projectId);
    if (data) {
      const tIds = [...new Set(data.filter(d => d.task_id).map(d => d.task_id!))];
      const mIds = [...new Set(data.filter(d => d.material_id).map(d => d.material_id!))];
      const rIds = [...new Set(data.filter(d => d.room_id).map(d => d.room_id!))];
      const [tR, mR, rR] = await Promise.all([
        tIds.length > 0 ? supabase.from('tasks').select('id, title').in('id', tIds) : { data: [] },
        mIds.length > 0 ? supabase.from('materials').select('id, name').in('id', mIds) : { data: [] },
        rIds.length > 0 ? supabase.from('rooms').select('id, name').in('id', rIds) : { data: [] },
      ]);
      const tMap = new Map((tR.data || []).map(x => [x.id, x.title]));
      const mMap = new Map((mR.data || []).map(x => [x.id, x.name]));
      const rMap = new Map((rR.data || []).map(x => [x.id, x.name]));
      setFileLinks(data.map(d => ({
        ...d,
        task_name: d.task_id ? tMap.get(d.task_id) || undefined : undefined,
        material_name: d.material_id ? mMap.get(d.material_id) || undefined : undefined,
        room_name: d.room_id ? rMap.get(d.room_id) || undefined : undefined,
      })));
    }
  };

  const unlinkFileEntity = async (file: ProjectFile, entityType: 'task' | 'material' | 'room', entityId: string) => {
    const field = entityType === 'task' ? 'task_id' : entityType === 'material' ? 'material_id' : 'room_id';
    await supabase.from('task_file_links').delete()
      .eq('project_id', projectId)
      .eq('file_path', file.path)
      .eq(field, entityId);
    setFileLinks(prev => prev.filter(l => !(l.file_path === file.path && (l as Record<string, unknown>)[field] === entityId)));
  };

  // Update invoice/ROT fields on a file link
  const updateFileLink = async (linkId: string, updates: Record<string, unknown>) => {
    await supabase.from('task_file_links').update(updates).eq('id', linkId);
    setFileLinks(prev => prev.map(l => l.id === linkId ? { ...l, ...updates } as FileLink : l));
  };

  // Ensure a file has at least one task_file_link record (for storing invoice metadata)
  const ensureFileLink = async (file: ProjectFile): Promise<string | null> => {
    const existing = fileLinks.find(l => l.file_path === file.path);
    if (existing?.id) return existing.id;
    const { data, error } = await supabase.from('task_file_links').insert({
      project_id: projectId,
      file_path: file.path,
      file_name: file.name || file.path.split('/').pop() || 'unknown',
    }).select('id').single();
    if (error) {
      console.error('ensureFileLink failed:', error.message, file.path);
      return null;
    }
    return data?.id || null;
  };

  // Smart tolk — adaptive AI analysis per file
  const [smartTolkLoading, setSmartTolkLoading] = useState<string | null>(null);
  const runSmartTolk = async (file: ProjectFile) => {
    setSmartTolkLoading(file.path);
    toast({ title: `${t('files.smartTolk', 'Smart tolk')}...`, description: file.name });
    try {
    // Fast path: let edge function fetch file directly from storage (no client download)
    const { data: result } = await supabase.functions.invoke('classify-document', {
      body: { filePath: file.path, fileName: file.name },
    });
    if (!result) throw new Error('No classification result returned');

    // Auto-update category
    if (result.type && result.confidence > 0.6) {
      const catMap: Record<string, string> = {
        quote: 'Offert', invoice: 'Faktura', receipt: 'Kvitto',
        floor_plan: 'Ritning', contract: 'Kontrakt', specification: 'Specifikation',
        product_image: 'Bild',
      };
      if (catMap[result.type]) setCategoryForFile(file.path, catMap[result.type]);
    }

    // Auto-fill extracted metadata (invoice date/amount, vendor, summary)
    if (result.invoice_date || result.invoice_amount || result.vendor_name || result.summary) {
      const linkId = await ensureFileLink(file);
      if (linkId) {
        const updates: Record<string, unknown> = {};
        if (result.invoice_date) updates.invoice_date = result.invoice_date;
        if (result.invoice_amount) updates.invoice_amount = result.invoice_amount;
        if (result.vendor_name) updates.vendor_name = result.vendor_name;
        if (result.summary) updates.ai_summary = result.summary;
        await updateFileLink(linkId, updates);
      }
    }

    // For floor plans: offer canvas import
    if (result.type === 'floor_plan' && result.suggested_action === 'import_to_canvas') {
      setFloorPlanImportFile(file);
    } else {
      // For all other file types: open linking modal (task/purchase/room)
      setDocumentImportFile(file);
    }

    toast({ title: t('files.smartTolkDone', 'Fil tolkad'), description: `${file.name}: ${result.type || 'okänd typ'}` });
    } catch (err) {
      console.error('Smart tolk failed:', err);
      toast({ title: t('files.smartTolkError', 'Smart tolk misslyckades'), description: file.name, variant: 'destructive' });
    } finally {
      setSmartTolkLoading(null);
    }
  };

  const toggleSelectAll = () => {
    if (selectedFiles.size === filteredFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredFiles.map(f => f.path)));
    }
  };

  // Batch Smart Tolk — opens dialog with parallel classification + linking
  const [batchTolkFiles, setBatchTolkFiles] = useState<ProjectFile[]>([]);
  const handleBatchSmartTolk = () => {
    const filesToProcess = filteredFiles.filter(f => selectedFiles.has(f.path));
    if (filesToProcess.length === 0) return;
    setBatchTolkFiles(filesToProcess);
  };

  const visibleFileCols = ALL_FILE_COLS.filter(k => !hiddenFileCols.has(k));
  const toggleFileCol = (key: FileColKey) => {
    setHiddenFileCols(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      localStorage.setItem('files_hidden_cols', JSON.stringify([...next]));
      return next;
    });
  };

  // Map DB file_type to Swedish display label
  const FILE_TYPE_LABELS: Record<string, string> = {
    quote: 'Offert',
    invoice: 'Faktura',
    receipt: 'Kvitto',
    contract: 'Kontrakt',
    specification: 'Specifikation',
    floor_plan: 'Ritning',
  };

  // Guess file category: prioritize AI/DB classification, then path heuristics
  const guessCategory = (file: ProjectFile): string => {
    // Check if any link for this file has a meaningful file_type from AI classification
    const links = getFileLinksForPath(file.path);
    for (const link of links) {
      const label = FILE_TYPE_LABELS[link.file_type];
      if (label) return label;
    }

    // Path-based heuristics
    const p = file.path.toLowerCase();
    if (p.includes('/offerter/') || p.includes('offert')) return 'Offert';
    if (p.includes('/fakturor/') || p.includes('faktura') || p.includes('invoice')) return 'Faktura';
    if (p.includes('/kvitton/') || p.includes('kvitto') || p.includes('receipt')) return 'Kvitto';
    if (p.includes('/ritningar/') || p.includes('ritning') || p.includes('floor-plan')) return 'Ritning';
    if (p.includes('/kontrakt/') || p.includes('kontrakt') || p.includes('contract')) return 'Kontrakt';

    // No meaningful category — show nothing instead of redundant "Bild"/"Dokument"
    return '';
  };

  // Helper to check if file is a document (PDF, DOC, DOCX, TXT)
  const checkIsDocumentFile = (file: ProjectFile) => {
    return isDocumentFile(file.name, file.type);
  };

  // Helper to check if file is an image
  const checkIsImageFile = (file: ProjectFile) => {
    return file.type.startsWith('image/');
  };

  useEffect(() => {
    fetchFiles();
    fetchFolders();
  }, [projectId, currentFolder]);

  const fetchFolders = async () => {
    try {
      const basePath = `projects/${projectId}${currentFolder}`;
      const { data: folderList, error } = await supabase.storage
        .from('project-files')
        .list(basePath);

      if (error) throw error;

      if (folderList) {
        const foldersOnly = folderList
          .filter(item => !item.name.includes('.') && item.name !== '.emptyFolderPlaceholder')
          .map(folder => ({
            id: folder.id || folder.name,
            name: folder.name,
            path: `${currentFolder}/${folder.name}`.replace(/^\//, ''),
          }));
        
        setFolders(foldersOnly);
      }
    } catch (error: unknown) {
      console.error('Error fetching folders:', error);
    }
  };

  const fetchFiles = async () => {
    try {
      setLoading(true);
      
      const basePath = `projects/${projectId}${currentFolder}`;
      const { data: fileList, error: listError } = await supabase.storage
        .from('project-files')
        .list(basePath, {
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (listError) throw listError;

      if (fileList) {
        const filesWithDetails: ProjectFile[] = [];
        
        for (const file of fileList) {
          // Skip folders and placeholder files
          if (!file.name.includes('.') || file.name === '.emptyFolderPlaceholder') continue;
          
          const filePath = `${basePath}/${file.name}`;
          let thumbnailUrl: string | undefined;
          
          // Generate thumbnail for images
          if (file.metadata?.mimetype?.startsWith('image/')) {
            const { data: { publicUrl } } = supabase.storage
              .from('project-files')
              .getPublicUrl(filePath, {
                transform: {
                  width: 100,
                  height: 100,
                  resize: 'cover'
                }
              });
            thumbnailUrl = publicUrl;
          }
          
          filesWithDetails.push({
            id: file.id || file.name,
            name: file.name,
            path: filePath,
            size: file.metadata?.size || 0,
            type: file.metadata?.mimetype || 'unknown',
            uploaded_at: file.created_at || new Date().toISOString(),
            uploaded_by: '',
            folder: currentFolder,
            thumbnail_url: thumbnailUrl,
          });
        }

        setFiles(filesWithDetails);
      }
    } catch (error: unknown) {
      console.error('Error fetching files:', error);
      toast({
        title: t('files.error'),
        description: t('files.errorLoadingFiles'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const folderPath = `projects/${projectId}${currentFolder}/${newFolderName}/.emptyFolderPlaceholder`;
      
      const { error } = await supabase.storage
        .from('project-files')
        .upload(folderPath, new Blob(['']));

      if (error) throw error;

      toast({
        title: t('files.folderCreated'),
        description: newFolderName,
      });

      setNewFolderName('');
      setShowNewFolderDialog(false);
      await fetchFolders();
    } catch (error: unknown) {
      console.error('Error creating folder:', error);
      toast({
        title: t('files.error'),
        description: t('files.errorCreatingFolder'),
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    let lastUploadedDocumentFile: ProjectFile | null = null;
    let lastUploadedImageFile: ProjectFile | null = null;

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const timestamp = Date.now();
        const filePath = `projects/${projectId}${currentFolder}/${timestamp}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const uploadedFileInfo: ProjectFile = {
          id: `${timestamp}-${file.name}`,
          name: file.name,
          path: filePath,
          size: file.size,
          type: file.type,
          uploaded_at: new Date().toISOString(),
          uploaded_by: '',
        };

        // Track document files for AI suggestion
        if (isDocumentFile(file.name, file.type)) {
          lastUploadedDocumentFile = uploadedFileInfo;
        }
        // Track image files for floor plan suggestion
        else if (file.type.startsWith('image/')) {
          lastUploadedImageFile = uploadedFileInfo;
        }
      }

      toast({
        title: t('files.filesUploaded'),
        description: t('files.filesUploadedDescription', { count: selectedFiles.length }),
      });

      await fetchFiles();

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Show AI suggestion - prioritize document over image if both uploaded
      if (lastUploadedDocumentFile) {
        setShowDocumentUploadSuggestion(lastUploadedDocumentFile);
      } else if (lastUploadedImageFile) {
        setShowImageUploadSuggestion(lastUploadedImageFile);
      }
    } catch (error: unknown) {
      console.error('Error uploading files:', error);
      toast({
        title: t('files.uploadError'),
        description: error instanceof Error ? error.message : t('files.errorUploadingFiles'),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handlePreview = async (file: ProjectFile) => {
    try {
      const { data: { publicUrl } } = supabase.storage
        .from('project-files')
        .getPublicUrl(file.path);

      setPreviewUrl(publicUrl);
      setPreviewFile(file);
      setImageZoom(100);
      setImageRotation(0);
    } catch (error: unknown) {
      console.error('Error previewing file:', error);
      toast({
        title: t('files.error'),
        description: t('files.errorPreviewingFile'),
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (file: ProjectFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .download(file.path);

      if (error) throw error;

      // Create download link
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: t('files.downloadStarted'),
        description: file.name,
      });
    } catch (error: unknown) {
      console.error('Error downloading file:', error);
      toast({
        title: t('files.downloadError'),
        description: t('files.errorDownloadingFile'),
        variant: "destructive",
      });
    }
  };

  const closePreview = () => {
    setPreviewFile(null);
    setPreviewUrl('');
    setImageZoom(100);
    setImageRotation(0);
  };

  const handleDelete = async () => {
    if (!fileToDelete) return;

    try {
      const { error } = await supabase.storage
        .from('project-files')
        .remove([fileToDelete.path]);

      if (error) throw error;

      toast({
        title: t('files.fileDeleted'),
        description: fileToDelete.name,
      });

      await fetchFiles();
      setFileToDelete(null);
    } catch (error: unknown) {
      console.error('Error deleting file:', error);
      toast({
        title: t('files.deleteError'),
        description: t('files.errorDeletingFile'),
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (file: ProjectFile) => {
    // Show clickable thumbnail for images
    if (file.type.startsWith('image/') && file.thumbnail_url) {
      return (
        <img
          src={file.thumbnail_url}
          alt={file.name}
          className="h-8 w-8 object-cover rounded shrink-0 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
          onClick={(e) => {
            e.stopPropagation();
            handlePreview(file);
          }}
          title={t('files.clickToPreview')}
        />
      );
    } else if (file.type.startsWith('image/')) {
      return <ImageIcon className="h-5 w-5 text-blue-500" />;
    } else if (file.type.includes('pdf')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    } else {
      return <FileIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getBreadcrumbs = () => {
    if (!currentFolder) return [];
    return currentFolder.split('/').filter(Boolean);
  };

  const navigateToFolder = (index: number) => {
    const breadcrumbs = getBreadcrumbs();
    const newPath = '/' + breadcrumbs.slice(0, index + 1).join('/');
    setCurrentFolder(newPath);
  };

  // Drag-and-drop handlers for external file upload (not internal moves)
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current++;
    // Only show upload overlay for external files, not internal moves
    if (e.dataTransfer.types.includes('Files') && !e.dataTransfer.types.includes('text/x-internal-path')) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current--;
    if (dragCountRef.current <= 0) { setIsDragOver(false); dragCountRef.current = 0; }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Filtered files/folders for search
  const searchQ = fileSearch.toLowerCase().trim();
  const filteredFolders = searchQ ? folders.filter(f => f.name.toLowerCase().includes(searchQ)) : folders;
  const filteredFiles = searchQ ? files.filter(f => {
    if (f.name.toLowerCase().includes(searchQ)) return true;
    const cat = (categoryOverrides[f.path] || guessCategory(f)).toLowerCase();
    if (cat.includes(searchQ)) return true;
    const links = getFileLinksForPath(f.path);
    return links.some(l => l.task_name?.toLowerCase().includes(searchQ) || l.material_name?.toLowerCase().includes(searchQ) || l.room_name?.toLowerCase().includes(searchQ));
  }) : files;

  // Sorted files
  const sortedFiles = useMemo(() => {
    if (!fileSortKey) return filteredFiles;
    const sorted = [...filteredFiles].sort((a, b) => {
      let aVal = '';
      let bVal = '';
      if (fileSortKey === 'name') {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else if (fileSortKey === 'category') {
        aVal = (categoryOverrides[a.path] || guessCategory(a)).toLowerCase();
        bVal = (categoryOverrides[b.path] || guessCategory(b)).toLowerCase();
      } else if (fileSortKey === 'type') {
        aVal = (a.type || '').toLowerCase();
        bVal = (b.type || '').toLowerCase();
      } else if (fileSortKey === 'size') {
        return fileSortDir === 'asc' ? (a.size || 0) - (b.size || 0) : (b.size || 0) - (a.size || 0);
      } else if (fileSortKey === 'uploaded') {
        aVal = a.uploaded_at || '';
        bVal = b.uploaded_at || '';
      } else {
        // Link-based columns
        const aLinks = fileLinksMap.get(a.path) || [];
        const bLinks = fileLinksMap.get(b.path) || [];
        const field = fileSortKey === 'task' ? 'task_name' : fileSortKey === 'purchase' ? 'material_name' : fileSortKey === 'room' ? 'room_name' : fileSortKey === 'vendor' ? 'vendor_name' : fileSortKey === 'summary' ? 'ai_summary' : fileSortKey === 'invoiceDate' ? 'invoice_date' : fileSortKey === 'invoiceAmount' ? 'invoice_amount' : 'rot_amount';
        aVal = String((aLinks[0] as Record<string, unknown>)?.[field] || '').toLowerCase();
        bVal = String((bLinks[0] as Record<string, unknown>)?.[field] || '').toLowerCase();
      }
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return fileSortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [filteredFiles, fileSortKey, fileSortDir, categoryOverrides, fileLinksMap]);

  // Flat list of all previewable files (expanded folder files + top-level files)
  const allPreviewableFiles = useMemo(() => {
    const result: ProjectFile[] = [];
    for (const folder of filteredFolders) {
      if (expandedFolders.has(folder.path)) {
        const subFiles = folderContents.get(folder.path) || [];
        result.push(...subFiles);
      }
    }
    result.push(...filteredFiles);
    return result;
  }, [filteredFolders, filteredFiles, expandedFolders, folderContents]);

  const previewFileIndex = previewFile ? allPreviewableFiles.findIndex(f => f.path === previewFile.path) : -1;
  const hasPrevFile = previewFileIndex > 0;
  const hasNextFile = previewFileIndex >= 0 && previewFileIndex < allPreviewableFiles.length - 1;

  const goToPrevFile = useCallback(() => {
    if (hasPrevFile) handlePreview(allPreviewableFiles[previewFileIndex - 1]);
  }, [hasPrevFile, previewFileIndex, allPreviewableFiles]);

  const goToNextFile = useCallback(() => {
    if (hasNextFile) handlePreview(allPreviewableFiles[previewFileIndex + 1]);
  }, [hasNextFile, previewFileIndex, allPreviewableFiles]);

  // Keyboard navigation in preview (left/right arrows)
  useEffect(() => {
    if (!previewFile) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goToPrevFile(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goToNextFile(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [previewFile, goToPrevFile, goToNextFile]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCountRef.current = 0;

    // Ignore internal drag-and-drop (handled by folder drop targets)
    if (e.dataTransfer.types.includes('text/x-internal-path')) return;

    if (!canEdit) return;
    const droppedFiles = await readDroppedItems(e.dataTransfer);
    if (droppedFiles.length === 0) return;

    setBatchFiles(droppedFiles);
    setShowBatchUpload(true);
  }, [canEdit]);

  return (
    <div
      className="h-full bg-background p-6 relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drop overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/5 border-2 border-dashed border-primary rounded-lg pointer-events-none">
          <div className="text-center">
            <Upload className="h-12 w-12 mx-auto text-primary mb-3" />
            <p className="text-lg font-semibold text-primary">
              {t('files.dropToUpload', 'Släpp filer här')}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('files.dropHint', 'Filer och mappar analyseras automatiskt')}
            </p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-4">
        {/* Hidden file inputs */}
        {canEdit && (
          <>
            <Input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
          </>
        )}

        {/* Unified Files Card — header merged in */}
        <Card>
          <CardHeader className="pb-3">
            {/* Row 1: Title + view switcher */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FolderOpen className="h-5 w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <CardTitle className="text-base sm:text-lg font-semibold truncate">{t('files.title')}</CardTitle>
                  <CardDescription className="text-xs truncate">{projectName}</CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* View switcher — always visible */}
                <div className="flex rounded-md border">
                  <Button
                    variant={viewMode === 'folder' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 w-7 p-0 rounded-r-none border-0"
                    onClick={() => changeViewMode('folder')}
                    title={t('files.viewFolder', 'Mappar')}
                  >
                    <List className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 w-7 p-0 rounded-none border-0"
                    onClick={() => changeViewMode('grid')}
                    title={t('files.viewGrid', 'Rutnät')}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant={viewMode === 'flat' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 w-7 p-0 rounded-l-none border-0"
                    onClick={() => changeViewMode('flat')}
                    title={t('files.viewFlat', 'Alla filer')}
                  >
                    <Layers className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Upload button */}
                {canEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" className="h-7 px-2" disabled={uploading}>
                        {uploading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                        <span className="hidden sm:inline ml-1.5">
                          {uploading ? t('files.uploading') : t('files.upload', 'Ladda upp')}
                        </span>
                        <ChevronDown className="h-3 w-3 ml-0.5 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-4 w-4 mr-2" />
                        {t('files.regularUpload', 'Vanlig uppladdning')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowSmartUpload(true)}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        {t('smartUpload.title', 'Smart uppladdning')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => cameraInputRef.current?.click()}>
                        <Camera className="h-4 w-4 mr-2" />
                        {t('files.takePhoto', 'Ta foto')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* More actions — compact, new folder, help (hidden on mobile as individual buttons) */}
                {canEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {viewMode !== 'grid' && (
                        <DropdownMenuItem onClick={toggleCompact}>
                          <AlignJustify className="h-4 w-4 mr-2" />
                          {t('tasksTable.compactRows', 'Kompakt vy')}
                          {compactRows && <Check className="h-3.5 w-3.5 ml-auto" />}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => setShowNewFolderDialog(true)}>
                        <FolderPlus className="h-4 w-4 mr-2" />
                        {t('files.newFolder')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5">
                        <p className="text-xs font-medium mb-1">{t('files.supportedFormats')}</p>
                        <p className="text-[11px] text-muted-foreground">JPEG, PNG, GIF, WebP, PDF</p>
                        <p className="text-[11px] text-muted-foreground">{t('files.maxSize')}: {t('files.maxSizeValue')}</p>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            {/* Row 2: Search (only when files exist) */}
            {(files.length > 0 || folders.length > 0) && (
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={fileSearch}
                  onChange={(e) => setFileSearch(e.target.value)}
                  placeholder={t('files.search', 'Sök filer...')}
                  className="h-8 pl-8 text-sm"
                />
              </div>
            )}

            {/* Breadcrumbs — also serve as drop targets for moving files up */}
            {currentFolder && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentFolder('')}
                  className={`h-7 px-2 transition-colors ${dropTarget === '__root__' ? 'bg-primary/10 ring-2 ring-primary/40' : ''}`}
                  onDragOver={(e) => handleFolderDragOver(e, '__root__')}
                  onDragLeave={handleFolderDragLeave}
                  onDrop={(e) => handleFolderDrop(e, '')}
                >
                  <FolderOpen className="h-3.5 w-3.5 mr-1" />
                  {t('files.home')}
                </Button>
                {getBreadcrumbs().map((folder, index) => {
                  const bcPath = getBreadcrumbs().slice(0, index + 1).join('/');
                  return (
                    <div key={index} className="flex items-center gap-1">
                      <ChevronRight className="h-3.5 w-3.5" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigateToFolder(index)}
                        className={`h-7 px-2 transition-colors ${dropTarget === bcPath ? 'bg-primary/10 ring-2 ring-primary/40' : ''}`}
                        onDragOver={(e) => handleFolderDragOver(e, bcPath)}
                        onDragLeave={handleFolderDragLeave}
                        onDrop={(e) => handleFolderDrop(e, bcPath)}
                      >
                        {folder}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredFolders.length === 0 && filteredFiles.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">{t('files.noFilesOrFolders')}</p>
                {canEdit && (
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => setShowNewFolderDialog(true)}
                    >
                      <FolderPlus className="h-4 w-4 mr-2" />
                      {t('files.createFolder')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {t('files.uploadFile')}
                    </Button>
                  </div>
                )}
              </div>
            ) : viewMode === 'grid' ? (
                /* Grid view — visual card layout */
                <FilesGridView
                  folders={filteredFolders}
                  files={sortedFiles}
                  selectedFiles={selectedFiles}
                  toggleFileSelection={toggleFileSelection}
                  onPreview={handlePreview}
                  onNavigateToFolder={(path) => setCurrentFolder('/' + path)}
                  onDownload={handleDownload}
                  onDelete={(file) => setFileToDelete(file as ProjectFile)}
                  onSmartTolk={(file) => runSmartTolk(file as ProjectFile)}
                  onLinkFile={(file) => setLinkFile(file as ProjectFile)}
                  formatFileSize={formatFileSize}
                  canEdit={canEdit}
                  onDragStart={handleInternalDragStart}
                  onDragEnd={handleInternalDragEnd}
                  onFolderDragOver={handleFolderDragOver}
                  onFolderDragLeave={handleFolderDragLeave}
                  onFolderDrop={handleFolderDrop}
                  dropTarget={dropTarget}
                />
            ) : viewMode === 'flat' ? (
                /* Flat view — all files across all folders */
                <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0 relative">
                  {loadingFlat ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <Table className={compactRows ? 'text-xs' : ''}>
                      <TableHeader>
                        <TableRow className={compactRows ? '[&>th]:py-1.5' : ''}>
                          <TableHead className="w-12 sticky left-0 bg-background z-20">
                            <Checkbox
                              checked={allProjectFiles.length > 0 && selectedFiles.size === allProjectFiles.length}
                              onCheckedChange={() => {
                                if (selectedFiles.size === allProjectFiles.length) setSelectedFiles(new Set());
                                else setSelectedFiles(new Set(allProjectFiles.map(f => f.path)));
                              }}
                              className="h-4 w-4"
                            />
                          </TableHead>
                          <TableHead className="sticky left-12 bg-background z-20 max-w-[220px]">{t('common.name')}</TableHead>
                          <TableHead className="whitespace-nowrap">{t('files.folder', 'Mapp')}</TableHead>
                          {visibleFileCols.map(col => (
                            <TableHead key={col} className="whitespace-nowrap">
                              {fileColLabels[col]}
                            </TableHead>
                          ))}
                          <TableHead className="w-8 text-right sticky right-0 bg-white dark:bg-card z-10">
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => changeViewMode('folder')}>
                              <X className="h-3 w-3" />
                            </Button>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allProjectFiles
                          .filter(f => !fileSearch || f.name.toLowerCase().includes(fileSearch.toLowerCase()) || (f.folder || '').toLowerCase().includes(fileSearch.toLowerCase()))
                          .map((file) => (
                          <TableRow
                            key={file.path}
                            className={`group ${compactRows ? '[&>td]:py-1 [&>td]:text-xs' : ''} ${selectedFiles.has(file.path) ? 'bg-primary/5' : ''}`}
                            draggable
                            onDragStart={(e) => handleInternalDragStart(e, file.path, file.name, false)}
                            onDragEnd={handleInternalDragEnd}
                          >
                            <TableCell className="w-12 sticky left-0 bg-background z-10">
                              <span className="inline-flex items-center gap-1.5">
                                <Checkbox
                                  checked={selectedFiles.has(file.path)}
                                  onCheckedChange={() => toggleFileSelection(file.path)}
                                  className="h-4 w-4"
                                />
                                {smartTolkLoading === file.path ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : getFileIcon(file)}
                              </span>
                            </TableCell>
                            <TableCell className="font-medium sticky left-12 bg-background z-10 max-w-[220px]">
                              <button
                                type="button"
                                className="text-left hover:text-primary hover:underline transition-colors truncate block w-full"
                                onClick={() => handlePreview(file)}
                                title={file.name}
                              >
                                {file.name}
                              </button>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-muted-foreground text-xs truncate max-w-[120px]">
                              {file.folder || '/'}
                            </TableCell>
                            {visibleFileCols.map(col => {
                              if (col === 'category') {
                                return <TableCell key={col} className="whitespace-nowrap"><Badge variant="outline">{categoryOverrides[file.path] || guessCategory(file)}</Badge></TableCell>;
                              }
                              if (col === 'size') {
                                return <TableCell key={col} className="whitespace-nowrap text-muted-foreground">{file.size ? formatFileSize(file.size) : '–'}</TableCell>;
                              }
                              if (col === 'uploaded') {
                                return <TableCell key={col} className="whitespace-nowrap text-muted-foreground">{file.uploaded_at ? formatDate(file.uploaded_at) : '–'}</TableCell>;
                              }
                              if (col === 'type') {
                                return <TableCell key={col} className="whitespace-nowrap"><Badge variant="outline">{file.type.split('/')[1] || '?'}</Badge></TableCell>;
                              }
                              return <TableCell key={col} className="whitespace-nowrap text-muted-foreground">–</TableCell>;
                            })}
                            <TableCell className="text-right sticky right-0 bg-white dark:bg-card z-10">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handlePreview(file)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    {t('files.preview', 'Förhandsgranska')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDownload(file)}>
                                    <Download className="h-4 w-4 mr-2" />
                                    {t('common.download', 'Ladda ner')}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onSelect={() => runSmartTolk(file)}>
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    {t('files.smartTolk', 'Smart tolk')}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  <p className="text-xs text-muted-foreground text-center py-2">
                    {allProjectFiles.length} {t('files.totalFiles', 'filer totalt')}
                  </p>
                </div>
              ) : (<>
              {/* Batch action bar — above table, not inside overflow container */}
              {selectedFiles.size > 0 && (
                <div className="sticky top-0 z-30 flex items-center gap-2 px-3 py-1.5 mb-1 bg-background border shadow-sm rounded-lg w-fit">
                  <span className="text-xs font-medium tabular-nums">
                    {selectedFiles.size} {t('files.selected', 'valda')}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 text-xs"
                    onClick={handleBatchSmartTolk}
                  >
                    <Sparkles className="h-3 w-3" />
                    {t('files.smartTolk', 'Smart tolk')} ({selectedFiles.size})
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => setSelectedFiles(new Set())}
                  >
                    {t('common.cancel', 'Avbryt')}
                  </Button>
                </div>
              )}

              <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0 relative">
              <Table className={compactRows ? 'text-xs' : ''}>
                <TableHeader>
                  <TableRow className={compactRows ? '[&>th]:py-1.5' : ''}>
                    <TableHead className="w-12 sticky left-0 bg-background z-20">
                      <Checkbox
                        checked={filteredFiles.length > 0 && selectedFiles.size === filteredFiles.length}
                        onCheckedChange={toggleSelectAll}
                        className="h-4 w-4"
                      />
                    </TableHead>
                    <TableHead
                      className={`max-w-[220px] bg-white dark:bg-card z-20 ${pinnedCol === 'name' ? 'sticky left-12' : ''}`}
                    >
                      <div className="flex items-center gap-1 group/hdr">
                        <button type="button" onClick={() => toggleFileSort('name')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                          {t('common.name')}
                          {fileSortKey === 'name' ? (fileSortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-0 group-hover/hdr:opacity-40" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPinnedCol(pinnedCol === 'name' ? null : 'name')}
                          className={`h-4 w-4 flex items-center justify-center rounded transition-opacity ${pinnedCol === 'name' ? 'opacity-50' : 'opacity-0 group-hover/hdr:opacity-30'}`}
                          title={pinnedCol === 'name' ? 'Lossa kolumn' : 'Fäst kolumn'}
                        >
                          <Pin className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    </TableHead>
                    {visibleFileCols.map(col => (
                      <TableHead key={col} className={`whitespace-nowrap ${pinnedCol === col ? 'sticky left-12 bg-white dark:bg-card z-20' : ''}`}>
                        <div className="flex items-center gap-1 group/hdr">
                          <button type="button" onClick={() => toggleFileSort(col as FileSortKey)} className="flex items-center gap-1 hover:text-foreground transition-colors whitespace-nowrap">
                            {fileColLabels[col]}
                            {fileSortKey === col ? (fileSortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-0 group-hover/hdr:opacity-40" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPinnedCol(pinnedCol === col ? null : col as FileSortKey)}
                            className={`h-4 w-4 flex items-center justify-center rounded transition-opacity ${pinnedCol === col ? 'opacity-50' : 'opacity-0 group-hover/hdr:opacity-30'}`}
                            title={pinnedCol === col ? 'Lossa kolumn' : 'Fäst kolumn'}
                          >
                            <Pin className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="w-8 text-right sticky right-0 bg-white dark:bg-card z-10">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs -mr-2">
                            <Settings2 className="h-3 w-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-44 p-2">
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            {t('declaration.toggleColumns', 'Visa/dölj kolumner')}
                          </p>
                          {ALL_FILE_COLS.map(key => (
                            <label key={key} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer text-sm">
                              <input
                                type="checkbox"
                                checked={!hiddenFileCols.has(key)}
                                onChange={() => toggleFileCol(key)}
                                className="h-3.5 w-3.5 rounded border-gray-300"
                              />
                              {fileColLabels[key]}
                            </label>
                          ))}
                        </PopoverContent>
                      </Popover>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Folders — expandable with inline sub-files */}
                  {filteredFolders.map((folder) => {
                    const isExpanded = expandedFolders.has(folder.path);
                    const subFiles = folderContents.get(folder.path) || [];
                    return (
                      <Fragment key={folder.id}>
                        <TableRow
                          className={`cursor-pointer hover:bg-muted/50 ${compactRows ? '[&>td]:py-1 [&>td]:text-xs' : ''} ${dropTarget === folder.path ? 'bg-primary/10 ring-1 ring-primary/40' : ''}`}
                          onDragOver={(e) => handleFolderDragOver(e, folder.path)}
                          onDragLeave={handleFolderDragLeave}
                          onDrop={(e) => handleFolderDrop(e, folder.path)}
                        >
                          <TableCell
                            className="w-12 sticky left-0 z-10 bg-white dark:bg-card"
                            onClick={(e) => { e.stopPropagation(); toggleFolder(folder.path); }}
                          >
                            <span className="inline-flex items-center gap-1">
                              {isExpanded
                                ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                              <Folder className="h-4 w-4 text-yellow-500" />
                            </span>
                          </TableCell>
                          <TableCell
                            className={`font-medium bg-white dark:bg-card ${pinnedCol === 'name' ? 'sticky left-12 z-10' : ''}`}
                            onClick={() => setCurrentFolder('/' + folder.path)}
                          >
                            {folder.name}
                            {subFiles.length > 0 && (
                              <span className="text-xs text-muted-foreground ml-1.5">({subFiles.length})</span>
                            )}
                          </TableCell>
                          {visibleFileCols.map(col => (
                            <TableCell key={col} className="whitespace-nowrap text-muted-foreground">
                              {col === 'category' ? <Badge variant="secondary">{t('files.folder')}</Badge> : '–'}
                            </TableCell>
                          ))}
                          <TableCell className="sticky right-0 bg-white dark:bg-card z-10"></TableCell>
                        </TableRow>
                        {/* Expanded sub-files — draggable to move between folders */}
                        {isExpanded && subFiles.map((sf) => {
                          const sfBg = selectedFiles.has(sf.path) ? 'bg-primary/5' : 'bg-muted/20';
                          return (
                          <TableRow
                            key={sf.id}
                            className={`group ${sfBg} ${compactRows ? '[&>td]:py-1 [&>td]:text-xs' : ''}`}
                            draggable
                            onDragStart={(e) => handleInternalDragStart(e, sf.path, sf.name, false)}
                            onDragEnd={handleInternalDragEnd}
                          >
                            <TableCell className={`w-12 sticky left-0 z-10 ${sfBg}`}>
                              <span className="inline-flex items-center gap-1.5 pl-4">
                                <Checkbox
                                  checked={selectedFiles.has(sf.path)}
                                  onCheckedChange={() => toggleFileSelection(sf.path)}
                                  className="h-4 w-4"
                                />
                                {smartTolkLoading === sf.path ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : getFileIcon(sf)}
                              </span>
                            </TableCell>
                            <TableCell className={`font-medium ${sfBg} max-w-[220px] ${pinnedCol === 'name' ? 'sticky left-12 z-10' : ''}`}>
                              <button
                                type="button"
                                className="text-left hover:text-primary hover:underline transition-colors truncate block w-full"
                                onClick={() => handlePreview(sf)}
                                title={sf.name}
                              >
                                {sf.name}
                              </button>
                            </TableCell>
                            {visibleFileCols.map(col => {
                              const links = getFileLinksForPath(sf.path);
                              const DEFAULT_CATS = ['Offert', 'Faktura', 'Kvitto', 'Ritning', 'Kontrakt', 'Specifikation'];
                              const allCats = [...DEFAULT_CATS, ...customCategories.filter(c => !DEFAULT_CATS.includes(c))];
                              const fileCat = categoryOverrides[sf.path] || guessCategory(sf);

                              if (col === 'category') {
                                return (
                                  <TableCell key={col} className="whitespace-nowrap">
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <button type="button" className="text-xs hover:bg-muted px-1.5 py-0.5 rounded transition-colors">
                                          {fileCat ? <Badge variant="outline">{fileCat}</Badge> : <span className="text-muted-foreground/40">–</span>}
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-40 p-1" align="start">
                                        {allCats.map(cat => (
                                          <button key={cat} type="button"
                                            onClick={() => setCategoryForFile(sf.path, cat)}
                                            className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted flex items-center gap-2 ${fileCat === cat ? 'bg-muted font-medium' : ''}`}
                                          >
                                            {fileCat === cat && <Check className="h-3 w-3 text-primary" />}
                                            <span className={fileCat === cat ? '' : 'pl-5'}>{cat}</span>
                                          </button>
                                        ))}
                                        <div className="border-t mt-1 pt-1">
                                          <button type="button"
                                            onClick={() => {
                                              const name = prompt(t('files.newCategory', 'Ny kategori:'));
                                              if (name?.trim()) {
                                                const trimmed = name.trim();
                                                setCustomCategories(prev => {
                                                  const next = [...new Set([...prev, trimmed])];
                                                  localStorage.setItem('files_custom_cats', JSON.stringify(next));
                                                  return next;
                                                });
                                                setCategoryForFile(sf.path, trimmed);
                                              }
                                            }}
                                            className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted flex items-center gap-2 text-primary"
                                          >
                                            <Plus className="h-3 w-3" />
                                            {t('files.addCategory', 'Ny kategori...')}
                                          </button>
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  </TableCell>
                                );
                              }

                              if (col === 'task' || col === 'purchase' || col === 'room') {
                                const entityType = col === 'task' ? 'task' : col === 'purchase' ? 'material' : 'room';
                                const nameField = col === 'task' ? 'task_name' : col === 'purchase' ? 'material_name' : 'room_name';
                                const idField = col === 'task' ? 'task_id' : col === 'purchase' ? 'material_id' : 'room_id';
                                const options = col === 'task' ? availTasks : col === 'purchase' ? availMaterials : availRooms;
                                const linkedEntities = links.filter(l => (l as Record<string, unknown>)[nameField]);
                                const linkedIds = new Set(links.map(l => (l as Record<string, unknown>)[idField] as string).filter(Boolean));

                                return (
                                  <TableCell key={col} className="whitespace-nowrap">
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <button type="button" className="text-xs hover:bg-muted px-1.5 py-0.5 rounded transition-colors min-w-[40px] max-w-[180px] text-left">
                                          {linkedEntities.length > 0
                                            ? <span className="text-foreground truncate block">
                                                {linkedEntities.slice(0, 2).map(l => (l as Record<string, unknown>)[nameField]).join(', ')}
                                                {linkedEntities.length > 2 && <span className="text-muted-foreground ml-1">+{linkedEntities.length - 2}</span>}
                                              </span>
                                            : <span className="text-muted-foreground/40">–</span>}
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-52 p-1 max-h-64 overflow-y-auto" align="start">
                                        {options.length === 0 ? (
                                          <p className="text-xs text-muted-foreground p-2">{t('common.noResults', 'Inga resultat')}</p>
                                        ) : options.map(opt => {
                                          const isLinked = linkedIds.has(opt.id);
                                          return (
                                            <button key={opt.id} type="button"
                                              onClick={() => isLinked
                                                ? unlinkFileEntity(sf, entityType, opt.id)
                                                : linkFileToEntity(sf, entityType, opt.id)
                                              }
                                              className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted flex items-center gap-2 ${isLinked ? 'bg-primary/5 font-medium' : ''}`}
                                            >
                                              {isLinked && <Check className="h-3 w-3 text-primary shrink-0" />}
                                              <span className={isLinked ? '' : 'pl-5'} title={opt.name}>{opt.name}</span>
                                            </button>
                                          );
                                        })}
                                      </PopoverContent>
                                    </Popover>
                                  </TableCell>
                                );
                              }

                              if (col === 'vendor') {
                                const link = links[0];
                                const vendor = link?.vendor_name;
                                return (
                                  <TableCell key={col} className="whitespace-nowrap text-xs truncate max-w-[120px]">
                                    {vendor || <span className="text-muted-foreground/40">–</span>}
                                  </TableCell>
                                );
                              }

                              if (col === 'summary') {
                                const link = links[0];
                                const summary = link?.ai_summary;
                                return (
                                  <TableCell key={col} className="whitespace-nowrap text-xs text-muted-foreground truncate max-w-[180px]" title={summary || ''}>
                                    {summary || <span className="text-muted-foreground/40">–</span>}
                                  </TableCell>
                                );
                              }

                              if (col === 'invoiceDate' || col === 'invoiceAmount' || col === 'rotAmount') {
                                const link = links[0];
                                const dbField = col === 'invoiceDate' ? 'invoice_date' : col === 'invoiceAmount' ? 'invoice_amount' : 'rot_amount';
                                const currentVal = link ? (link as Record<string, unknown>)[dbField] : null;
                                const isDate = col === 'invoiceDate';
                                const displayVal = isDate
                                  ? (currentVal ? String(currentVal).slice(0, 10) : null)
                                  : (currentVal != null ? `${Number(currentVal).toLocaleString('sv-SE')} kr` : null);

                                return (
                                  <TableCell key={col} className="whitespace-nowrap">
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <button type="button" className="text-xs hover:bg-muted px-1.5 py-0.5 rounded transition-colors min-w-[40px]">
                                          {displayVal || <span className="text-muted-foreground/40">–</span>}
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-48 p-3" align="start">
                                        <div className="space-y-2">
                                          <Label className="text-xs">{fileColLabels[col]}</Label>
                                          <Input
                                            type={isDate ? 'date' : 'number'}
                                            step={isDate ? undefined : '1'}
                                            defaultValue={currentVal != null ? String(currentVal) : ''}
                                            className="h-8 text-sm"
                                            autoFocus
                                            onBlur={async (e) => {
                                              const val = e.target.value;
                                              let linkId = link?.id;
                                              if (!linkId) linkId = await ensureFileLink(sf) || undefined;
                                              if (!linkId) return;
                                              await updateFileLink(linkId, {
                                                [dbField]: isDate ? (val || null) : (val ? parseFloat(val) : null),
                                              });
                                            }}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                            }}
                                          />
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  </TableCell>
                                );
                              }

                              return (
                                <TableCell key={col} className="whitespace-nowrap text-muted-foreground">
                                  {col === 'type' && <Badge variant="outline">{sf.type?.split('/')[1] || '?'}</Badge>}
                                  {col === 'size' && sf.size ? formatFileSize(sf.size) : ''}
                                  {col === 'uploaded' && sf.uploaded_at ? formatDate(sf.uploaded_at) : ''}
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-right sticky right-0 bg-white dark:bg-card z-10">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handlePreview(sf)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    {t('files.preview', 'Förhandsgranska')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDownload(sf)}>
                                    <Download className="h-4 w-4 mr-2" />
                                    {t('common.download', 'Ladda ner')}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onSelect={() => runSmartTolk(sf)}>
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    {t('files.smartTolk', 'Smart tolk')}
                                  </DropdownMenuItem>
                                  {sf.type?.startsWith('image/') && onUseAsBackground && (
                                    <DropdownMenuItem onClick={() => {
                                      const { data: { publicUrl } } = supabase.storage
                                        .from('project-files')
                                        .getPublicUrl(sf.path);
                                      onUseAsBackground(publicUrl, sf.name);
                                    }}>
                                      <Layers className="h-4 w-4 mr-2" />
                                      {t('files.useAsBackground', 'Använd som planritning')}
                                    </DropdownMenuItem>
                                  )}
                                  {canEdit && (
                                    <DropdownMenuItem onClick={() => setLinkFile(sf)}>
                                      <Link className="h-4 w-4 mr-2" />
                                      {t('files.linkToTask', 'Koppla till arbete')}
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => setSelectedFileForComments(sf)}>
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    {t('common.comments', 'Kommentarer')}
                                  </DropdownMenuItem>
                                  {canEdit && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => setFileToDelete(sf)}
                                        className="text-destructive focus:text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        {t('common.delete', 'Ta bort')}
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                          );
                        })}
                      </Fragment>
                    );
                  })}

                  {/* Files — draggable to move into folders */}
                  {sortedFiles.map((file) => (
                    <TableRow
                      key={file.id}
                      className={`group ${compactRows ? '[&>td]:py-1 [&>td]:text-xs' : ''} ${selectedFiles.has(file.path) ? 'bg-primary/5' : ''}`}
                      draggable
                      onDragStart={(e) => handleInternalDragStart(e, file.path, file.name, false)}
                      onDragEnd={handleInternalDragEnd}
                    >
                      <TableCell className="w-12 sticky left-0 z-10 bg-white dark:bg-card">
                        <span className="inline-flex items-center gap-1.5">
                          <Checkbox
                            checked={selectedFiles.has(file.path)}
                            onCheckedChange={() => toggleFileSelection(file.path)}
                            className="h-4 w-4"
                          />
                          {smartTolkLoading === file.path ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : getFileIcon(file)}
                        </span>
                      </TableCell>
                      <TableCell className={`font-medium bg-white dark:bg-card max-w-[220px] ${pinnedCol === 'name' ? 'sticky left-12 z-10' : ''}`}>
                        <button
                          type="button"
                          className="text-left hover:text-primary hover:underline transition-colors truncate block w-full"
                          onClick={() => handlePreview(file)}
                          title={file.name}
                        >
                          {file.name}
                        </button>
                      </TableCell>
                      {visibleFileCols.map(col => {
                        const links = getFileLinksForPath(file.path);
                        const DEFAULT_CATS = ['Offert', 'Faktura', 'Kvitto', 'Ritning', 'Kontrakt', 'Specifikation'];
                        const allCats = [...DEFAULT_CATS, ...customCategories.filter(c => !DEFAULT_CATS.includes(c))];
                        const fileCat = categoryOverrides[file.path] || guessCategory(file);

                        if (col === 'category') {
                          return (
                            <TableCell key={col} className="whitespace-nowrap">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button type="button" className="text-xs hover:bg-muted px-1.5 py-0.5 rounded transition-colors">
                                    {fileCat ? <Badge variant="outline">{fileCat}</Badge> : <span className="text-muted-foreground/40">–</span>}
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-40 p-1" align="start">
                                  {allCats.map(cat => (
                                    <button key={cat} type="button"
                                      onClick={() => setCategoryForFile(file.path, cat)}
                                      className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted flex items-center gap-2 ${fileCat === cat ? 'bg-muted font-medium' : ''}`}
                                    >
                                      {fileCat === cat && <Check className="h-3 w-3 text-primary" />}
                                      <span className={fileCat === cat ? '' : 'pl-5'}>{cat}</span>
                                    </button>
                                  ))}
                                  <div className="border-t mt-1 pt-1">
                                    <button type="button"
                                      onClick={() => {
                                        const name = prompt(t('files.newCategory', 'Ny kategori:'));
                                        if (name?.trim()) {
                                          const trimmed = name.trim();
                                          setCustomCategories(prev => {
                                            const next = [...new Set([...prev, trimmed])];
                                            localStorage.setItem('files_custom_cats', JSON.stringify(next));
                                            return next;
                                          });
                                          setCategoryForFile(file.path, trimmed);
                                        }
                                      }}
                                      className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted flex items-center gap-2 text-primary"
                                    >
                                      <Plus className="h-3 w-3" />
                                      {t('files.addCategory', 'Ny kategori...')}
                                    </button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                          );
                        }

                        if (col === 'task' || col === 'purchase' || col === 'room') {
                          const entityType = col === 'task' ? 'task' : col === 'purchase' ? 'material' : 'room';
                          const nameField = col === 'task' ? 'task_name' : col === 'purchase' ? 'material_name' : 'room_name';
                          const idField = col === 'task' ? 'task_id' : col === 'purchase' ? 'material_id' : 'room_id';
                          const options = col === 'task' ? availTasks : col === 'purchase' ? availMaterials : availRooms;
                          const linkedEntities = links.filter(l => (l as Record<string, unknown>)[nameField]);
                          const linkedIds = new Set(links.map(l => (l as Record<string, unknown>)[idField] as string).filter(Boolean));

                          return (
                            <TableCell key={col} className="whitespace-nowrap">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button type="button" className="text-xs hover:bg-muted px-1.5 py-0.5 rounded transition-colors min-w-[40px] max-w-[180px] text-left">
                                    {linkedEntities.length > 0
                                      ? <span className="text-foreground truncate block">
                                          {linkedEntities.slice(0, 2).map(l => (l as Record<string, unknown>)[nameField]).join(', ')}
                                          {linkedEntities.length > 2 && <span className="text-muted-foreground ml-1">+{linkedEntities.length - 2}</span>}
                                        </span>
                                      : <span className="text-muted-foreground/40">–</span>}
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-52 p-1 max-h-64 overflow-y-auto" align="start">
                                  {options.length === 0 ? (
                                    <p className="text-xs text-muted-foreground p-2">{t('common.noResults', 'Inga resultat')}</p>
                                  ) : options.map(opt => {
                                    const isLinked = linkedIds.has(opt.id);
                                    return (
                                      <button key={opt.id} type="button"
                                        onClick={() => isLinked
                                          ? unlinkFileEntity(file, entityType, opt.id)
                                          : linkFileToEntity(file, entityType, opt.id)
                                        }
                                        className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted flex items-center gap-2 ${isLinked ? 'bg-primary/5 font-medium' : ''}`}
                                      >
                                        {isLinked && <Check className="h-3 w-3 text-primary shrink-0" />}
                                        <span className={isLinked ? '' : 'pl-5'} title={opt.name}>{opt.name}</span>
                                      </button>
                                    );
                                  })}
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                          );
                        }

                        // Vendor name (read-only from AI)
                        if (col === 'vendor') {
                          const link = links[0];
                          const vendor = link?.vendor_name;
                          return (
                            <TableCell key={col} className="whitespace-nowrap text-xs truncate max-w-[120px]">
                              {vendor || <span className="text-muted-foreground/40">–</span>}
                            </TableCell>
                          );
                        }

                        // AI summary (read-only from AI)
                        if (col === 'summary') {
                          const link = links[0];
                          const summary = link?.ai_summary;
                          return (
                            <TableCell key={col} className="whitespace-nowrap text-xs text-muted-foreground truncate max-w-[180px]" title={summary || ''}>
                              {summary || <span className="text-muted-foreground/40">–</span>}
                            </TableCell>
                          );
                        }

                        // Invoice date, amount, ROT — inline editable
                        if (col === 'invoiceDate' || col === 'invoiceAmount' || col === 'rotAmount') {
                          const link = links[0]; // use first link for invoice data
                          const dbField = col === 'invoiceDate' ? 'invoice_date' : col === 'invoiceAmount' ? 'invoice_amount' : 'rot_amount';
                          const currentVal = link ? (link as Record<string, unknown>)[dbField] : null;
                          const isDate = col === 'invoiceDate';
                          const displayVal = isDate
                            ? (currentVal ? String(currentVal).slice(0, 10) : null)
                            : (currentVal != null ? `${Number(currentVal).toLocaleString('sv-SE')} kr` : null);

                          return (
                            <TableCell key={col} className="whitespace-nowrap">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button type="button" className="text-xs hover:bg-muted px-1.5 py-0.5 rounded transition-colors min-w-[40px]">
                                    {displayVal || <span className="text-muted-foreground/40">–</span>}
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-48 p-3" align="start">
                                  <div className="space-y-2">
                                    <Label className="text-xs">{fileColLabels[col]}</Label>
                                    <Input
                                      type={isDate ? 'date' : 'number'}
                                      step={isDate ? undefined : '1'}
                                      defaultValue={currentVal != null ? String(currentVal) : ''}
                                      className="h-8 text-sm"
                                      autoFocus
                                      onBlur={async (e) => {
                                        const val = e.target.value;
                                        let linkId = link?.id;
                                        if (!linkId) linkId = await ensureFileLink(file) || undefined;
                                        if (!linkId) return;
                                        await updateFileLink(linkId, {
                                          [dbField]: isDate ? (val || null) : (val ? parseFloat(val) : null),
                                        });
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                      }}
                                    />
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                          );
                        }

                        return (
                          <TableCell key={col} className="whitespace-nowrap text-muted-foreground">
                            {col === 'type' && <Badge variant="outline">{file.type.split('/')[1] || '?'}</Badge>}
                            {col === 'size' && formatFileSize(file.size)}
                            {col === 'uploaded' && formatDate(file.uploaded_at)}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right sticky right-0 bg-white dark:bg-card z-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handlePreview(file)}>
                              <Eye className="h-4 w-4 mr-2" />
                              {t('files.preview', 'Förhandsgranska')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload(file)}>
                              <Download className="h-4 w-4 mr-2" />
                              {t('common.download', 'Ladda ner')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => runSmartTolk(file)}>
                              <Sparkles className="h-4 w-4 mr-2" />
                              {t('files.smartTolk', 'Smart tolk')}
                            </DropdownMenuItem>
                            {file.type.startsWith('image/') && onUseAsBackground && (
                              <DropdownMenuItem onClick={() => {
                                const { data: { publicUrl } } = supabase.storage
                                  .from('project-files')
                                  .getPublicUrl(file.path);
                                onUseAsBackground(publicUrl, file.name);
                              }}>
                                <Layers className="h-4 w-4 mr-2" />
                                {t('files.useAsBackground', 'Använd som planritning')}
                              </DropdownMenuItem>
                            )}
                            {canEdit && (
                              <DropdownMenuItem onClick={() => setLinkFile(file)}>
                                <Link className="h-4 w-4 mr-2" />
                                {t('files.linkToTask', 'Koppla till arbete')}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => setSelectedFileForComments(file)}>
                              <MessageSquare className="h-4 w-4 mr-2" />
                              {t('common.comments', 'Kommentarer')}
                            </DropdownMenuItem>
                            {canEdit && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setFileToDelete(file)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  {t('common.delete', 'Radera')}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </>)}
          </CardContent>
        </Card>

      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!fileToDelete} onOpenChange={() => setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('files.deleteFile')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('files.deleteFileConfirmation', { name: fileToDelete?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Folder Dialog */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('files.createNewFolder')}</DialogTitle>
            <DialogDescription>
              {t('files.newFolderDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">{t('files.folderName')}</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="t.ex. Ritningar"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    createFolder();
                  }
                }}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={createFolder} disabled={!newFolderName.trim()}>
              <FolderPlus className="h-4 w-4 mr-2" />
              {t('common.create')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* File Comments Dialog - Higher z-index to appear above preview */}
      <Dialog 
        open={!!selectedFileForComments} 
        onOpenChange={() => setSelectedFileForComments(null)}
      >
        <DialogContent className="w-full md:max-w-3xl max-h-[90vh] overflow-y-auto z-[100]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {t('files.commentsOn', { name: selectedFileForComments?.name })}
            </DialogTitle>
            <DialogDescription>
              {t('files.commentsDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh]">
            {selectedFileForComments && (
              <CommentsSection
                projectId={projectId}
                entityId={selectedFileForComments.id}
                entityType="file"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog with Zoom */}
      <Dialog open={!!previewFile} onOpenChange={closePreview}>
        <DialogContent className="!w-[calc(100%-2rem)] !max-w-[calc(100%-2rem)] !h-[calc(100vh-2rem)] !max-h-[calc(100vh-2rem)] !p-0 !rounded-xl">
          <DialogTitle className="sr-only">{previewFile?.name || t('files.imagePreview')}</DialogTitle>
          <div className="relative h-full">
            {/* Header with controls */}
            <div className="absolute top-0 left-0 right-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-semibold">{previewFile?.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {previewFile && formatFileSize(previewFile.size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Zoom/Rotate controls — only for images */}
                  {previewFile && !previewFile.type?.includes('pdf') && (
                    <>
                      <div className="flex items-center gap-1 border rounded-md p-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setImageZoom(Math.max(25, imageZoom - 25))}
                          disabled={imageZoom <= 25}
                        >
                          <ZoomOut className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium min-w-[60px] text-center">
                          {imageZoom}%
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setImageZoom(Math.min(400, imageZoom + 25))}
                          disabled={imageZoom >= 400}
                        >
                          <ZoomIn className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setImageRotation((imageRotation + 90) % 360)}
                        title={t('files.rotate')}
                      >
                        <RotateCw className="h-4 w-4" />
                      </Button>
                    </>
                  )}

                  <div className="h-6 w-px bg-border mx-1" />

                  {/* Comments */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => previewFile && setSelectedFileForComments(previewFile)}
                    title={t('common.comments')}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>

                  {/* Download */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => previewFile && handleDownload(previewFile)}
                    title={t('common.download')}
                  >
                    <Download className="h-4 w-4" />
                  </Button>

                  {/* Close */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={closePreview}
                    title={t('common.close')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Prev/Next navigation arrows */}
            {hasPrevFile && (
              <button
                type="button"
                onClick={goToPrevFile}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-background/80 hover:bg-background backdrop-blur rounded-full p-2 shadow-lg border transition-colors"
                title={t('files.previousFile', 'Föregående fil')}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {hasNextFile && (
              <button
                type="button"
                onClick={goToNextFile}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-background/80 hover:bg-background backdrop-blur rounded-full p-2 shadow-lg border transition-colors"
                title={t('files.nextFile', 'Nästa fil')}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}

            {/* Content container */}
            <div className="pt-16 pb-8 px-0 h-[calc(100vh-4rem)] overflow-auto bg-muted/30">
              <div className="flex items-center justify-center min-h-full">
                {previewUrl && previewFile?.type?.includes('pdf') ? (
                  <iframe
                    src={`${previewUrl}#navpanes=0&scrollbar=1&view=FitH`}
                    title={previewFile?.name}
                    className="w-full h-full border-0 rounded"
                    style={{ minHeight: 'calc(100vh - 6rem)' }}
                  />
                ) : previewUrl && (
                  <img
                    src={previewUrl}
                    alt={previewFile?.name}
                    className="max-w-full h-auto transition-all duration-200"
                    style={{
                      transform: `scale(${imageZoom / 100}) rotate(${imageRotation}deg)`,
                      transformOrigin: 'center',
                    }}
                  />
                )}
              </div>
            </div>

            {/* Footer with navigation info */}
            <div className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t p-2">
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                {allPreviewableFiles.length > 1 && (
                  <>
                    <span>{previewFileIndex + 1} / {allPreviewableFiles.length}</span>
                    <span>•</span>
                    <span>← → {t('files.navigateFiles', 'bläddra mellan filer')}</span>
                    <span>•</span>
                  </>
                )}
                <span>{t('files.scrollToPan')}</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Document Import Modal */}
      <AIDocumentImportModal
        projectId={projectId}
        file={documentImportFile}
        open={!!documentImportFile}
        onOpenChange={(open) => {
          if (!open) setDocumentImportFile(null);
        }}
        onImportComplete={() => {
          toast({
            title: t('files.importDocDone'),
            description: t('files.importDocDescription'),
          });
          fetchFiles();
        }}
      />

      {/* Batch Smart Tolk Dialog */}
      <BatchSmartTolkDialog
        open={batchTolkFiles.length > 0}
        onOpenChange={(open) => { if (!open) setBatchTolkFiles([]); }}
        files={batchTolkFiles}
        projectId={projectId}
        onComplete={() => { setBatchTolkFiles([]); setSelectedFiles(new Set()); fetchFiles(); }}
      />

      {/* Document Upload AI Suggestion Dialog */}
      <AlertDialog
        open={!!showDocumentUploadSuggestion}
        onOpenChange={() => setShowDocumentUploadSuggestion(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {t('files.extractWithAIQuestion')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('files.extractWithAIDescription', { name: showDocumentUploadSuggestion?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('files.noThanks')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (showDocumentUploadSuggestion) {
                  setDocumentImportFile(showDocumentUploadSuggestion);
                }
                setShowDocumentUploadSuggestion(null);
              }}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {t('files.extractWithAI')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Upload Floor Plan Suggestion Dialog */}
      <AlertDialog
        open={!!showImageUploadSuggestion}
        onOpenChange={() => setShowImageUploadSuggestion(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              {t('files.floorPlanQuestion')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('files.floorPlanDescription', { name: showImageUploadSuggestion?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('files.noThanks')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (showImageUploadSuggestion) {
                  setFloorPlanImportFile(showImageUploadSuggestion);
                }
                setShowImageUploadSuggestion(null);
              }}
            >
              <Wand2 className="h-4 w-4 mr-2" />
              {t('files.importToFloorPlan')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AI Floor Plan Import from file list */}
      {/* Link File to Task Dialog */}
      <LinkFileToTaskDialog
        projectId={projectId}
        file={linkFile ? { name: linkFile.name, path: linkFile.path, size: linkFile.size, type: linkFile.type } : null}
        open={!!linkFile}
        onOpenChange={(open) => { if (!open) setLinkFile(null); }}
        onLinked={() => setLinkFile(null)}
      />

      {floorPlanImportFile && (
        <AIFloorPlanImport
          projectId={projectId}
          open={!!floorPlanImportFile}
          onOpenChange={(open) => {
            if (!open) setFloorPlanImportFile(null);
          }}
          initialImageUrl={(() => {
            const { data: { publicUrl } } = supabase.storage
              .from('project-files')
              .getPublicUrl(floorPlanImportFile.path);
            return publicUrl;
          })()}
          initialFileName={floorPlanImportFile.name}
          onImportComplete={() => {
            toast({
              title: t('files.importDone'),
              description: t('files.importDoneShort'),
            });
            setFloorPlanImportFile(null);
            if (onNavigateToFloorPlan) {
              setTimeout(() => onNavigateToFloorPlan(), 500);
            }
          }}
        />
      )}

      {/* Link Purchase Dialog (invoice/receipt) */}
      <LinkPurchaseDialog
        projectId={projectId}
        open={!!purchaseFile}
        onOpenChange={(o) => { if (!o) setPurchaseFile(null); }}
        file={purchaseFile?.file || null}
        documentType={purchaseFile?.type || "receipt"}
        onComplete={() => fetchFiles()}
      />

      {/* Quote Review Dialog */}
      <QuoteReviewDialog
        projectId={projectId}
        open={!!quoteReviewFile}
        onOpenChange={(o) => { if (!o) setQuoteReviewFile(null); }}
        file={quoteReviewFile}
        onImportComplete={() => {
          fetchFiles();
          toast({
            title: t("quoteReview.importDone", "Offert importerad"),
            description: t("quoteReview.importDoneDesc", "Arbeten och rum har skapats i projektet."),
          });
        }}
      />

      {/* Batch Smart Upload Dialog (drag-and-drop) */}
      <BatchSmartUploadDialog
        open={showBatchUpload}
        onOpenChange={setShowBatchUpload}
        files={batchFiles}
        projectId={projectId}
        currentFolder={currentFolder}
        onComplete={fetchFiles}
      />

      {/* Smart Upload Dialog */}
      <SmartUploadDialog
        open={showSmartUpload}
        onOpenChange={setShowSmartUpload}
        projectId={projectId}
        onAction={(action: SmartUploadAction) => {
          switch (action.type) {
            case "extract_tasks":
              setQuoteReviewFile(action.file);
              break;
            case "extract_purchase":
              setPurchaseFile({
                file: action.file,
                type: action.classification.type === "invoice" ? "invoice" : "receipt",
              });
              break;
            case "import_to_canvas":
              // Upload to storage first for permanent URL, then use as canvas background
              (async () => {
                try {
                  const ts = Date.now();
                  const safeName = action.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
                  const path = `projects/${projectId}/floor-plans/${ts}-${safeName}`;
                  await supabase.storage.from("project-files").upload(path, action.file);
                  const { data: urlData } = supabase.storage.from("project-files").getPublicUrl(path);
                  if (onUseAsBackground) {
                    onUseAsBackground(urlData.publicUrl, action.file.name);
                  }
                  toast({
                    title: t("smartUpload.actions.importCanvas"),
                    description: t("linkPurchase.canvasAdded", "Ritningen har lagts till på canvas-ytan."),
                  });
                  fetchFiles();
                } catch (err) {
                  console.error("Canvas upload error:", err);
                  // Fallback to blob URL
                  if (onUseAsBackground) {
                    onUseAsBackground(URL.createObjectURL(action.file), action.file.name);
                  }
                }
              })();
              break;
            case "store_only":
            default:
              // Upload to current folder via existing flow
              if (fileInputRef.current) {
                const dt = new DataTransfer();
                dt.items.add(action.file);
                fileInputRef.current.files = dt.files;
                fileInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
              }
              break;
          }
        }}
      />
    </div>
  );
};

export default ProjectFilesTab;

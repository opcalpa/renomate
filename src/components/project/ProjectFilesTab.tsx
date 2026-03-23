import { useState, useEffect, useRef, useCallback, Fragment } from "react";
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
                .map(f => ({
                  id: f.id || f.name,
                  name: f.name,
                  path: `${basePath}/${f.name}`,
                  size: (f.metadata as Record<string, unknown>)?.size as number || 0,
                  type: (f.metadata as Record<string, unknown>)?.mimetype as string || '',
                  uploaded_at: f.created_at || '',
                })) as ProjectFile[];
              setFolderContents(prev => new Map(prev).set(folderPath, subFiles));
            });
        }
      }
      return next;
    });
  }, [projectId, folderContents]);

  const { toast } = useToast();
  const { t } = useTranslation();

  // Search filter
  const [fileSearch, setFileSearch] = useState('');

  // Compact row toggle
  const [compactRows, setCompactRows] = useState(() => localStorage.getItem('files_compact') === 'true');
  const toggleCompact = () => {
    setCompactRows(prev => { const next = !prev; localStorage.setItem('files_compact', String(next)); return next; });
  };

  // Batch selection
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 });

  const toggleFileSelection = (path: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  };

  // Configurable file table columns
  type FileColKey = 'category' | 'task' | 'purchase' | 'room' | 'invoiceDate' | 'invoiceAmount' | 'rotAmount' | 'size' | 'uploaded' | 'type';
  const ALL_FILE_COLS: FileColKey[] = ['category', 'task', 'purchase', 'room', 'invoiceDate', 'invoiceAmount', 'rotAmount', 'size', 'uploaded', 'type'];
  const [hiddenFileCols, setHiddenFileCols] = useState<Set<FileColKey>>(() => {
    try {
      const saved = localStorage.getItem('files_hidden_cols');
      return saved ? new Set(JSON.parse(saved) as FileColKey[]) : new Set<FileColKey>(['type', 'room', 'invoiceDate', 'invoiceAmount', 'rotAmount']);
    } catch { return new Set<FileColKey>(['type', 'room', 'invoiceDate', 'invoiceAmount', 'rotAmount']); }
  });
  const fileColLabels: Record<FileColKey, string> = {
    category: t('files.category', 'Kategori'),
    task: t('common.task', 'Arbete'),
    purchase: t('nav.purchases', 'Inköp'),
    room: t('common.room', 'Rum'),
    invoiceDate: t('files.invoiceDate', 'Fakturadatum'),
    invoiceAmount: t('files.invoiceAmount', 'Belopp'),
    rotAmount: t('files.rotAmount', 'ROT-avdrag'),
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
        .select('id, file_path, task_id, material_id, room_id, file_type, invoice_date, invoice_amount, rot_amount')
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

  const getFileLinksForPath = (path: string) => fileLinks.filter(l => l.file_path === path);

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
    if (!currentProfileId) return null;
    const { data, error } = await supabase.from('task_file_links').insert({
      project_id: projectId,
      file_path: file.path,
      file_name: file.name,
      file_type: 'invoice',
      file_size: file.size,
      mime_type: file.type,
      linked_by_user_id: currentProfileId,
    }).select('id').single();
    if (error || !data) return null;
    return data.id;
  };

  // Smart tolk — adaptive AI analysis per file
  const runSmartTolk = async (file: ProjectFile) => {
    const { data: { publicUrl } } = supabase.storage.from('project-files').getPublicUrl(file.path);
    const isImage = file.type.startsWith('image/');
    const isDoc = isDocumentFile(file.name, file.type);

    const body: Record<string, string> = { fileName: file.name };
    if (isImage) {
      const res = await fetch(publicUrl);
      const blob = await res.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1] || '');
        reader.readAsDataURL(blob);
      });
      body.image = base64;
    } else {
      const { data: textData } = await supabase.functions.invoke('extract-document-text', {
        body: { fileUrl: publicUrl, fileName: file.name, mimeType: file.type },
      });
      if (textData?.text) body.text = textData.text.slice(0, 5000);
    }

    const { data: result } = await supabase.functions.invoke('classify-document', { body });
    if (!result) return;

    // Auto-update category
    if (result.type && result.confidence > 0.6) {
      const catMap: Record<string, string> = {
        quote: 'Offert', invoice: 'Faktura', receipt: 'Kvitto',
        floor_plan: 'Ritning', contract: 'Kontrakt', specification: 'Specifikation',
        product_image: 'Bild',
      };
      if (catMap[result.type]) setCategoryForFile(file.path, catMap[result.type]);
    }

    // Auto-fill invoice metadata
    if (result.invoice_date || result.invoice_amount) {
      const linkId = await ensureFileLink(file);
      if (linkId) {
        const updates: Record<string, unknown> = {};
        if (result.invoice_date) updates.invoice_date = result.invoice_date;
        if (result.invoice_amount) updates.invoice_amount = result.invoice_amount;
        await updateFileLink(linkId, updates);
      }
    }

    // For floor plans: offer import
    if (result.type === 'floor_plan' && result.suggested_action === 'import_to_canvas') {
      setFloorPlanImportFile(file);
    }
    // For docs: offer task extraction
    if (isDoc && result.suggested_action === 'extract_tasks') {
      setDocumentImportFile(file);
    }
  };

  const toggleSelectAll = () => {
    if (selectedFiles.size === filteredFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredFiles.map(f => f.path)));
    }
  };

  const handleBatchSmartTolk = async () => {
    const filesToProcess = filteredFiles.filter(f => selectedFiles.has(f.path));
    if (filesToProcess.length === 0) return;
    setBatchProcessing(true);
    setBatchProgress({ done: 0, total: filesToProcess.length });
    for (const file of filesToProcess) {
      try { await runSmartTolk(file); } catch (err) { console.error("Smart tolk failed:", err); }
      setBatchProgress(prev => ({ ...prev, done: prev.done + 1 }));
    }
    setBatchProcessing(false);
    setSelectedFiles(new Set());
    toast({ title: t('files.smartTolkComplete', 'Smart tolk klar'), description: t('files.smartTolkCompleteDesc', '{{count}} filer tolkade', { count: filesToProcess.length }) });
    fetchFiles();
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

  // Guess file category from path/name/type
  const guessCategory = (file: ProjectFile): string => {
    const p = file.path.toLowerCase();
    if (p.includes('/offerter/') || p.includes('offert')) return 'Offert';
    if (p.includes('/fakturor/') || p.includes('faktura') || p.includes('invoice')) return 'Faktura';
    if (p.includes('/kvitton/') || p.includes('kvitto') || p.includes('receipt')) return 'Kvitto';
    if (p.includes('/ritningar/') || p.includes('ritning') || p.includes('floor-plan')) return 'Ritning';
    if (p.includes('/kontrakt/') || p.includes('kontrakt') || p.includes('contract')) return 'Kontrakt';
    if (file.type.startsWith('image/')) return 'Bild';
    if (file.type === 'application/pdf') return 'Dokument';
    return 'Övrigt';
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
      // For PDF, open in new tab
      if (file.type.includes('pdf')) {
        const { data: { publicUrl } } = supabase.storage
          .from('project-files')
          .getPublicUrl(file.path);
        
        window.open(publicUrl, '_blank');
        return;
      }

      // For images, show in modal with zoom
      if (file.type.startsWith('image/')) {
        const { data: { publicUrl } } = supabase.storage
          .from('project-files')
          .getPublicUrl(file.path);
        
        setPreviewUrl(publicUrl);
        setPreviewFile(file);
        setImageZoom(100);
        setImageRotation(0);
        return;
      }

      // For other files, download
      handleDownload(file);
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
          className="h-10 w-10 object-cover rounded cursor-pointer hover:ring-2 hover:ring-primary transition-all"
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

  // Drag-and-drop handlers for the entire files area
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current++;
    if (e.dataTransfer.types.includes('Files')) setIsDragOver(true);
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

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCountRef.current = 0;

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

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <FolderOpen className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <div>
              <h1 className="text-xl sm:text-3xl font-bold">{t('files.title')}</h1>
              <p className="text-muted-foreground text-sm sm:text-base">{projectName}</p>
            </div>
          </div>

          {canEdit && (
            <div className="flex gap-2">
              {/* Hidden file inputs */}
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

              {/* New folder — icon only */}
              <Button
                variant="outline"
                onClick={() => setShowNewFolderDialog(true)}
                size="sm"
                title={t('files.newFolder')}
              >
                <FolderPlus className="h-4 w-4" />
              </Button>

              {/* Compact rows toggle */}
              <Button
                variant={compactRows ? "secondary" : "outline"}
                size="sm"
                onClick={toggleCompact}
                title={t('tasksTable.compactRows', 'Kompakt vy')}
              >
                <AlignJustify className="h-4 w-4" />
              </Button>

              {/* Unified upload dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" disabled={uploading}>
                    {uploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {uploading ? t('files.uploading') : t('files.upload', 'Ladda upp')}
                    <ChevronDown className="h-3 w-3 ml-1 opacity-60" />
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
            </div>
          )}
        </div>

        {/* Breadcrumbs */}
        {currentFolder && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentFolder('')}
              className="h-8"
            >
              <FolderOpen className="h-4 w-4 mr-1" />
              {t('files.home')}
            </Button>
            {getBreadcrumbs().map((folder, index) => (
              <div key={index} className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateToFolder(index)}
                  className="h-8"
                >
                  {folder}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Files Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>{t('files.uploadedFiles')}</CardTitle>
                <CardDescription>{t('files.filesDescription')}</CardDescription>
              </div>
              {(files.length > 0 || folders.length > 0) && (
                <div className="relative w-48 sm:w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={fileSearch}
                    onChange={(e) => setFileSearch(e.target.value)}
                    placeholder={t('files.search', 'Sök filer...')}
                    className="h-8 pl-8 text-sm"
                  />
                </div>
              )}
            </div>
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
            ) : (
              <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0 relative">
                {/* Batch action bar — floating overlay above table */}
                {selectedFiles.size > 0 && (
                  <div className="absolute top-1 left-10 z-20 flex items-center gap-2 px-3 py-1.5 bg-background border shadow-sm rounded-lg">
                    <span className="text-xs font-medium tabular-nums">
                      {selectedFiles.size} {t('files.selected', 'valda')}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1.5 text-xs"
                      disabled={batchProcessing}
                      onClick={handleBatchSmartTolk}
                    >
                      {batchProcessing ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          {batchProgress.done}/{batchProgress.total}
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3" />
                          {t('files.smartTolk', 'Smart tolk')} ({selectedFiles.size})
                        </>
                      )}
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

              <Table className={compactRows ? 'text-xs' : ''}>
                <TableHeader>
                  <TableRow className={compactRows ? '[&>th]:py-1.5' : ''}>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={filteredFiles.length > 0 && selectedFiles.size === filteredFiles.length}
                        onCheckedChange={toggleSelectAll}
                        className="h-4 w-4"
                      />
                    </TableHead>
                    <TableHead>{t('common.name')}</TableHead>
                    {visibleFileCols.map(col => (
                      <TableHead key={col} className="hidden md:table-cell">
                        {fileColLabels[col]}
                      </TableHead>
                    ))}
                    <TableHead className="w-12 text-right sticky right-0 bg-background z-10">
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
                          className={`cursor-pointer hover:bg-muted/50 ${compactRows ? '[&>td]:py-1 [&>td]:text-xs' : ''}`}
                        >
                          <TableCell
                            className="w-12"
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
                            className="font-medium"
                            onClick={() => setCurrentFolder('/' + folder.path)}
                          >
                            {folder.name}
                            {subFiles.length > 0 && (
                              <span className="text-xs text-muted-foreground ml-1.5">({subFiles.length})</span>
                            )}
                          </TableCell>
                          {visibleFileCols.map(col => (
                            <TableCell key={col} className="hidden md:table-cell text-muted-foreground">
                              {col === 'category' ? <Badge variant="secondary">{t('files.folder')}</Badge> : '–'}
                            </TableCell>
                          ))}
                          <TableCell className="sticky right-0 bg-background"></TableCell>
                        </TableRow>
                        {/* Expanded sub-files */}
                        {isExpanded && subFiles.map((sf) => (
                          <TableRow key={sf.id} className={`group bg-muted/20 ${compactRows ? '[&>td]:py-1 [&>td]:text-xs' : ''}`}>
                            <TableCell className="w-12"></TableCell>
                            <TableCell className="pl-6 text-sm truncate">{sf.name}</TableCell>
                            {visibleFileCols.map(col => (
                              <TableCell key={col} className="hidden md:table-cell text-muted-foreground text-xs">
                                {col === 'size' && sf.size ? formatFileSize(sf.size) : ''}
                                {col === 'uploaded' && sf.uploaded_at ? formatDate(sf.uploaded_at) : ''}
                                {col === 'type' && sf.type ? <Badge variant="outline">{sf.type.split('/')[1] || '?'}</Badge> : ''}
                                {col === 'category' ? '' : ''}
                              </TableCell>
                            ))}
                            <TableCell className="text-right sticky right-0 bg-muted/20">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => {
                                    const { data: { publicUrl } } = supabase.storage.from('project-files').getPublicUrl(sf.path);
                                    if (sf.type?.startsWith('image/')) { setPreviewUrl(publicUrl); setPreviewFile(sf); setImageZoom(100); }
                                    else window.open(publicUrl, '_blank');
                                  }}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    {t('files.preview', 'Förhandsgranska')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    const { data: { publicUrl } } = supabase.storage.from('project-files').getPublicUrl(sf.path);
                                    const a = document.createElement('a'); a.href = publicUrl; a.download = sf.name; a.click();
                                  }}>
                                    <Download className="h-4 w-4 mr-2" />
                                    {t('common.download', 'Ladda ner')}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </Fragment>
                    );
                  })}

                  {/* Files */}
                  {filteredFiles.map((file) => (
                    <TableRow key={file.id} className={`group ${compactRows ? '[&>td]:py-1 [&>td]:text-xs' : ''} ${selectedFiles.has(file.path) ? 'bg-primary/5' : ''}`}>
                      <TableCell className="w-12">
                        <span className="inline-flex items-center gap-1.5">
                          <Checkbox
                            checked={selectedFiles.has(file.path)}
                            onCheckedChange={() => toggleFileSelection(file.path)}
                            className="h-4 w-4"
                          />
                          {getFileIcon(file)}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium truncate max-w-[200px] lg:max-w-none">{file.name}</TableCell>
                      {visibleFileCols.map(col => {
                        const links = getFileLinksForPath(file.path);
                        const DEFAULT_CATS = ['Offert', 'Faktura', 'Kvitto', 'Ritning', 'Kontrakt', 'Specifikation', 'Bild', 'Dokument', 'Övrigt'];
                        const allCats = [...DEFAULT_CATS, ...customCategories.filter(c => !DEFAULT_CATS.includes(c))];
                        const fileCat = categoryOverrides[file.path] || guessCategory(file);

                        if (col === 'category') {
                          return (
                            <TableCell key={col} className="hidden md:table-cell">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button type="button" className="text-xs hover:bg-muted px-1.5 py-0.5 rounded transition-colors">
                                    <Badge variant="outline">{fileCat}</Badge>
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
                            <TableCell key={col} className="hidden md:table-cell">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button type="button" className="text-xs hover:bg-muted px-1.5 py-0.5 rounded transition-colors min-w-[40px]">
                                    {linkedEntities.length > 0
                                      ? <span className="text-foreground">{linkedEntities.map(l => (l as Record<string, unknown>)[nameField]).join(', ')}</span>
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
                            <TableCell key={col} className="hidden md:table-cell">
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
                          <TableCell key={col} className="hidden md:table-cell text-muted-foreground">
                            {col === 'type' && <Badge variant="outline">{file.type.split('/')[1] || '?'}</Badge>}
                            {col === 'size' && formatFileSize(file.size)}
                            {col === 'uploaded' && formatDate(file.uploaded_at)}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right sticky right-0 bg-background z-10">
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
                            <DropdownMenuItem onClick={() => runSmartTolk(file)}>
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
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('files.supportedFormats')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground mb-1">{t('files.images')}</p>
                <p>JPEG, PNG, GIF, WebP</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">{t('files.documents')}</p>
                <p>PDF</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">{t('files.maxSize')}</p>
                <p>{t('files.maxSizeValue')}</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">{t('files.storage')}</p>
                <p>{t('files.storageValue')}</p>
              </div>
            </div>
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
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
          <DialogTitle className="sr-only">{previewFile?.name || t('files.imagePreview')}</DialogTitle>
          <div className="relative h-full">
            {/* Header with controls */}
            <div className="absolute top-0 left-0 right-0 z-10 bg-background/95 backdrop-blur border-b p-4">
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
                  {/* Zoom controls */}
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

                  {/* Rotate */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setImageRotation((imageRotation + 90) % 360)}
                    title={t('files.rotate')}
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>

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

            {/* Image container */}
            <div className="pt-20 pb-4 px-4 h-[85vh] overflow-auto bg-muted/30">
              <div className="flex items-center justify-center min-h-full">
                {previewUrl && (
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

            {/* Footer with info */}
            <div className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t p-2">
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span>{t('files.scrollToPan')}</span>
                <span>•</span>
                <span>{t('files.useZoomControls')}</span>
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

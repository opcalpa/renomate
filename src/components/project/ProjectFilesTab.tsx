import { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { AIFloorPlanImport } from "./AIFloorPlanImport";
import { AIDocumentImportModal } from "./AIDocumentImportModal";
import { LinkFileToTaskDialog } from "./LinkFileToTaskDialog";
import { isDocumentFile } from "@/services/aiDocumentService";

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
  onNavigateToFloorPlan?: () => void;
  onUseAsBackground?: (imageUrl: string, fileName: string) => void;
}

const ProjectFilesTab = ({ projectId, projectName, onNavigateToFloorPlan, onUseAsBackground }: ProjectFilesTabProps) => {
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
  const [floorPlanImportFile, setFloorPlanImportFile] = useState<ProjectFile | null>(null);
  const [linkFile, setLinkFile] = useState<ProjectFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const timestamp = Date.now();
        const filePath = `projects/${projectId}${currentFolder}/${timestamp}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Track document files for AI suggestion
        if (isDocumentFile(file.name, file.type)) {
          lastUploadedDocumentFile = {
            id: `${timestamp}-${file.name}`,
            name: file.name,
            path: filePath,
            size: file.size,
            type: file.type,
            uploaded_at: new Date().toISOString(),
            uploaded_by: '',
          };
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

      // Show AI extraction suggestion for document files
      if (lastUploadedDocumentFile) {
        setShowDocumentUploadSuggestion(lastUploadedDocumentFile);
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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

  return (
    <div className="h-full bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FolderOpen className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">{t('files.title')}</h1>
              <p className="text-muted-foreground">{projectName}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <AIFloorPlanImport 
              projectId={projectId}
              onImportComplete={() => {
                toast({
                  title: t('files.importDone'),
                  description: t('files.importDoneDescription'),
                });
                // Navigate to Floor Plan tab after short delay
                setTimeout(() => {
                  if (onNavigateToFloorPlan) {
                    onNavigateToFloorPlan();
                  }
                }, 500);
              }}
            />
            <Button
              variant="outline"
              onClick={() => setShowNewFolderDialog(true)}
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              {t('files.newFolder')}
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('files.uploading')}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {t('files.uploadFiles')}
                </>
              )}
            </Button>
          </div>
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
            <CardTitle>{t('files.uploadedFiles')}</CardTitle>
            <CardDescription>
              {t('files.filesDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : folders.length === 0 && files.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">{t('files.noFilesOrFolders')}</p>
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
              </div>
            ) : (
              <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16"></TableHead>
                    <TableHead>{t('common.name')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('budget.type')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('files.size')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('files.uploaded')}</TableHead>
                    <TableHead className="text-right">{t('files.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Folders */}
                  {folders.map((folder) => (
                    <TableRow 
                      key={folder.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setCurrentFolder('/' + folder.path)}
                    >
                      <TableCell>
                        <Folder className="h-5 w-5 text-yellow-500" />
                      </TableCell>
                      <TableCell className="font-medium">{folder.name}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="secondary">{t('files.folder')}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">-</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">-</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  ))}
                  
                  {/* Files */}
                  {files.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell>{getFileIcon(file)}</TableCell>
                      <TableCell className="font-medium">{file.name}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline">
                          {file.type.split('/')[1] || 'unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {formatFileSize(file.size)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {formatDate(file.uploaded_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePreview(file)}
                            title={
                              file.type.includes('pdf')
                                ? t('files.openInNewTab')
                                : file.type.startsWith('image/')
                                ? t('files.preview')
                                : t('files.viewDownload')
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {checkIsDocumentFile(file) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDocumentImportFile(file)}
                              title={t('files.extractWithAI')}
                              className="text-primary hover:text-primary"
                            >
                              <Sparkles className="h-4 w-4" />
                            </Button>
                          )}
                          {checkIsImageFile(file) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setFloorPlanImportFile(file)}
                              title={t('files.convertWithAI')}
                              className="text-primary hover:text-primary"
                            >
                              <Wand2 className="h-4 w-4" />
                            </Button>
                          )}
                          {file.type.startsWith('image/') && onUseAsBackground && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const { data: { publicUrl } } = supabase.storage
                                  .from('project-files')
                                  .getPublicUrl(file.path);
                                onUseAsBackground(publicUrl, file.name);
                              }}
                              title={t('files.useAsBackground')}
                            >
                              <Layers className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLinkFile(file)}
                            title={t('files.linkToTask')}
                          >
                            <Link className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedFileForComments(file)}
                            title={t('common.comments')}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(file)}
                            title={t('common.download')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFileToDelete(file)}
                            title={t('common.delete')}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
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
    </div>
  );
};

export default ProjectFilesTab;

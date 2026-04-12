import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Folder as FolderIcon,
  FileText,
  FileIcon,
  ImageIcon,
  MoreVertical,
  Eye,
  Download,
  Trash2,
  Sparkles,
  Link,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface GridFile {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  uploaded_at: string;
  thumbnail_url?: string;
}

interface GridFolder {
  id: string;
  name: string;
  path: string;
}

interface FilesGridViewProps {
  folders: GridFolder[];
  files: GridFile[];
  selectedFiles: Set<string>;
  toggleFileSelection: (path: string) => void;
  onPreview: (file: GridFile) => void;
  onNavigateToFolder: (folderPath: string) => void;
  onDownload: (file: GridFile) => void;
  onDelete: (file: GridFile) => void;
  onSmartTolk: (file: GridFile) => void;
  onLinkFile: (file: GridFile) => void;
  formatFileSize: (bytes: number) => string;
  canEdit: boolean;
}

function getGridThumbnail(file: GridFile): string | null {
  if (!file.thumbnail_url) return null;
  return file.thumbnail_url
    .replace("width=100", "width=320")
    .replace("height=100", "height=320");
}

function getFileTypeBadge(type: string): string {
  const mime = type.toLowerCase();
  if (mime.includes("pdf")) return "PDF";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "JPG";
  if (mime.includes("png")) return "PNG";
  if (mime.includes("gif")) return "GIF";
  if (mime.includes("webp")) return "WebP";
  if (mime.includes("svg")) return "SVG";
  const ext = mime.split("/").pop();
  return ext ? ext.toUpperCase() : "?";
}

function getLargeIcon(type: string): ReactNode {
  if (type.startsWith("image/")) {
    return <ImageIcon className="h-10 w-10 text-blue-400" />;
  }
  if (type.includes("pdf")) {
    return <FileText className="h-10 w-10 text-red-400" />;
  }
  return <FileIcon className="h-10 w-10 text-gray-400" />;
}

export function FilesGridView({
  folders,
  files,
  selectedFiles,
  toggleFileSelection,
  onPreview,
  onNavigateToFolder,
  onDownload,
  onDelete,
  onSmartTolk,
  onLinkFile,
  formatFileSize,
  canEdit,
}: FilesGridViewProps) {
  const { t } = useTranslation();
  const anySelected = selectedFiles.size > 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {/* Folders */}
      {folders.map((folder) => (
        <button
          key={folder.id}
          type="button"
          onClick={() => onNavigateToFolder(folder.path)}
          className="group relative flex flex-col items-center justify-center gap-2 rounded-lg border bg-card p-4 h-[140px] hover:border-primary/50 hover:bg-muted/50 transition-colors cursor-pointer text-center"
        >
          <FolderIcon className="h-10 w-10 text-amber-500" />
          <span className="text-sm font-medium truncate w-full px-1">
            {folder.name}
          </span>
        </button>
      ))}

      {/* Files */}
      {files.map((file) => {
        const thumb = getGridThumbnail(file);
        const isSelected = selectedFiles.has(file.path);

        return (
          <div
            key={file.path}
            className={`group relative flex flex-col rounded-lg border bg-card overflow-hidden hover:border-primary/50 transition-colors cursor-pointer ${
              isSelected ? "ring-2 ring-primary border-primary" : ""
            }`}
            onClick={() => onPreview(file)}
          >
            {/* Thumbnail area */}
            <div className="relative h-[120px] bg-muted/30 flex items-center justify-center overflow-hidden">
              {thumb ? (
                <img
                  src={thumb}
                  alt={file.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                getLargeIcon(file.type)
              )}

              {/* Checkbox overlay — always visible when any selected, else on hover */}
              <div
                className={`absolute top-2 left-2 ${
                  anySelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                } transition-opacity`}
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleFileSelection(file.path)}
                  className="h-4 w-4 bg-background/80 border-muted-foreground/40"
                />
              </div>

              {/* Actions menu */}
              <div
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-7 w-7 bg-background/80 hover:bg-background"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onPreview(file)}>
                      <Eye className="h-4 w-4 mr-2" />
                      {t("files.preview", "Förhandsgranska")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDownload(file)}>
                      <Download className="h-4 w-4 mr-2" />
                      {t("common.download", "Ladda ner")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onSmartTolk(file)}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      {t("files.smartTolk", "Smart tolk")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onLinkFile(file)}>
                      <Link className="h-4 w-4 mr-2" />
                      {t("files.linkFile", "Länka fil")}
                    </DropdownMenuItem>
                    {canEdit && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => onDelete(file)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t("common.delete", "Ta bort")}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Type badge */}
              <div className="absolute bottom-2 right-2">
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-5 bg-background/80"
                >
                  {getFileTypeBadge(file.type)}
                </Badge>
              </div>
            </div>

            {/* File info */}
            <div className="px-2.5 py-2 min-w-0">
              <p className="text-xs font-medium truncate" title={file.name}>
                {file.name}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {formatFileSize(file.size)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

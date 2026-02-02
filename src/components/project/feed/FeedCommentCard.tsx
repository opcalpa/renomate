import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { getDateLocale } from "@/lib/dateFnsLocale";
import { CheckSquare, Package, Home, Pencil, MessageSquare, Reply } from "lucide-react";
import type { FeedComment, FeedContextType } from "./types";
import { getContextType, getContextLabel, renderContentWithMentions } from "./utils";

const contextIcons: Record<FeedContextType, React.ReactNode> = {
  task: <CheckSquare className="h-3 w-3" />,
  material: <Package className="h-3 w-3" />,
  room: <Home className="h-3 w-3" />,
  drawing_object: <Pencil className="h-3 w-3" />,
  project: <MessageSquare className="h-3 w-3" />,
};

const contextColors: Record<FeedContextType, string> = {
  task: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  material: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  room: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  drawing_object: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  project: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

interface FeedCommentCardProps {
  comment: FeedComment;
  compact?: boolean;
  translatedContent?: string;
  onReply?: (comment: FeedComment) => void;
  onNavigate?: (comment: FeedComment) => void;
}

export const FeedCommentCard = ({ comment, compact, translatedContent, onReply, onNavigate }: FeedCommentCardProps) => {
  const { t, i18n } = useTranslation();
  const contextType = getContextType(comment);
  const contextLabel = getContextLabel(comment);
  const isEntityComment = contextType !== "project";

  return (
    <div className="flex gap-3 p-3 rounded-lg border bg-card">
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className="text-xs">
          {comment.creator?.name?.charAt(0) || "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{comment.creator?.name}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), {
              addSuffix: true,
              locale: getDateLocale(i18n.language),
            })}
          </span>
          {!compact && (
            <Badge
              variant="outline"
              className={`text-xs gap-1 px-1.5 py-0 ${contextColors[contextType]} ${isEntityComment && onNavigate ? "cursor-pointer hover:underline" : ""}`}
              onClick={isEntityComment && onNavigate ? () => onNavigate(comment) : undefined}
              role={isEntityComment && onNavigate ? "button" : undefined}
            >
              {contextIcons[contextType]}
              <span>{t(`feed.contextTypes.${contextType}`)}</span>
              {contextLabel && (
                <>
                  <span className="opacity-50">·</span>
                  <span className="truncate max-w-[120px]">{contextLabel}</span>
                </>
              )}
            </Badge>
          )}
        </div>
        <p className="text-sm whitespace-pre-wrap break-words">{renderContentWithMentions(translatedContent || comment.content)}</p>
        {comment.images && comment.images.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {comment.images.map((image) => (
              <img
                key={image.id}
                src={image.url}
                alt={image.filename}
                className="max-w-32 max-h-32 object-cover rounded border cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(image.url, "_blank")}
              />
            ))}
          </div>
        )}
        {isEntityComment && onReply && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onReply(comment)}
          >
            <Reply className="h-3 w-3 mr-1" />
            {t("feed.reply")}
          </Button>
        )}
      </div>
    </div>
  );
};

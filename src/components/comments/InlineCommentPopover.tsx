/**
 * InlineCommentPopover - Google Docs-style inline comment thread
 *
 * A compact popover that shows near the object, allowing users to:
 * - View existing comments in a thread
 * - Add new comments
 * - Mark the thread as resolved/done
 *
 * Unlike a modal dialog, this stays in context with the view.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Send, Check, MessageCircle, Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { getDateLocale } from '@/lib/dateFnsLocale';
import { cn } from '@/lib/utils';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  created_by_user_id: string;
  is_resolved?: boolean;
  creator: {
    name: string;
    email: string;
  };
}

interface InlineCommentPopoverProps {
  /** The ID of the drawing object (shape) this comment thread is for */
  objectId: string;
  /** Project ID for context */
  projectId: string;
  /** Position to show the popover (screen coordinates) */
  position: { x: number; y: number };
  /** Callback when popover should close */
  onClose: () => void;
  /** Callback when comment count changes */
  onCommentCountChange?: (count: number) => void;
  /** Callback when resolved state changes */
  onResolvedChange?: (isResolved: boolean) => void;
  /** Initial resolved state */
  isResolved?: boolean;
}

export const InlineCommentPopover: React.FC<InlineCommentPopoverProps> = ({
  objectId,
  projectId,
  position,
  onClose,
  onCommentCountChange,
  onResolvedChange,
  isResolved: initialIsResolved = false,
}) => {
  const { t, i18n } = useTranslation();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isResolved, setIsResolved] = useState(initialIsResolved);
  const popoverRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Calculate position to keep popover on screen
  const getAdjustedPosition = useCallback(() => {
    const popoverWidth = 320;
    const popoverHeight = 400;
    const padding = 16;

    let x = position.x;
    let y = position.y;

    // Keep within viewport
    if (typeof window !== 'undefined') {
      if (x + popoverWidth > window.innerWidth - padding) {
        x = window.innerWidth - popoverWidth - padding;
      }
      if (x < padding) {
        x = padding;
      }
      if (y + popoverHeight > window.innerHeight - padding) {
        y = window.innerHeight - popoverHeight - padding;
      }
      if (y < padding) {
        y = padding;
      }
    }

    return { x, y };
  }, [position]);

  // Fetch comments for this object
  const fetchComments = useCallback(async () => {
    try {
      // Try with is_resolved column first
      let result = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          created_by_user_id,
          is_resolved,
          creator:profiles(name, email)
        `)
        .eq('drawing_object_id', objectId)
        .order('created_at', { ascending: true });

      // Fallback if is_resolved column doesn't exist yet
      if (result.error?.code === '42703') {
        result = await supabase
          .from('comments')
          .select(`
            id,
            content,
            created_at,
            created_by_user_id,
            creator:profiles(name, email)
          `)
          .eq('drawing_object_id', objectId)
          .order('created_at', { ascending: true });
      }

      if (result.error) throw result.error;

      setComments(result.data || []);
      onCommentCountChange?.(result.data?.length || 0);

      // Check if any comment is marked as resolved
      const hasResolved = result.data?.some((c: Comment) => c.is_resolved) || false;
      setIsResolved(hasResolved);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  }, [objectId, onCommentCountChange]);

  // Initial fetch
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Scroll to bottom when comments change
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // Focus textarea on mount
  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Submit new comment
  const handleSubmit = async () => {
    if (!newComment.trim() || posting) return;

    setPosting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Try inserting with is_resolved, fallback without it
      let result = await supabase
        .from('comments')
        .insert({
          content: newComment.trim(),
          created_by_user_id: profile.id,
          drawing_object_id: objectId,
          is_resolved: false,
        });

      // Fallback if is_resolved column doesn't exist
      if (result.error?.code === '42703') {
        result = await supabase
          .from('comments')
          .insert({
            content: newComment.trim(),
            created_by_user_id: profile.id,
            drawing_object_id: objectId,
          });
      }

      if (result.error) throw result.error;

      setNewComment('');
      fetchComments();
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setPosting(false);
    }
  };

  // Mark thread as resolved/done
  const handleToggleResolved = async () => {
    try {
      const newResolved = !isResolved;

      // Update all comments for this object
      const { error } = await supabase
        .from('comments')
        .update({ is_resolved: newResolved })
        .eq('drawing_object_id', objectId);

      // If column doesn't exist, just update local state (feature not available yet)
      if (error?.code === '42703') {
        console.warn('is_resolved column not available yet');
        setIsResolved(newResolved);
        onResolvedChange?.(newResolved);
        return;
      }

      if (error) throw error;

      setIsResolved(newResolved);
      onResolvedChange?.(newResolved);
      fetchComments();
    } catch (error) {
      console.error('Error toggling resolved:', error);
    }
  };

  // Handle Enter to submit (Shift+Enter for newline)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const adjustedPosition = getAdjustedPosition();
  const dateLocale = getDateLocale(i18n.language);

  return (
    <div
      ref={popoverRef}
      className={cn(
        "fixed z-[9999] w-80 bg-white rounded-lg shadow-2xl border border-gray-200",
        "flex flex-col max-h-[400px] overflow-hidden",
        isResolved && "opacity-80"
      )}
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between px-3 py-2 border-b",
        isResolved ? "bg-green-50" : "bg-blue-50"
      )}>
        <div className="flex items-center gap-2">
          {isResolved ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <MessageCircle className="h-4 w-4 text-blue-600" />
          )}
          <span className="text-sm font-medium">
            {isResolved
              ? t('comments.resolved', 'Klar')
              : t('comments.thread', 'Kommentarer')
            }
          </span>
          {comments.length > 0 && (
            <span className="text-xs text-gray-500">({comments.length})</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {comments.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-2 text-xs",
                isResolved
                  ? "text-gray-500 hover:text-gray-700"
                  : "text-green-600 hover:text-green-700 hover:bg-green-50"
              )}
              onClick={handleToggleResolved}
            >
              <Check className="h-3 w-3 mr-1" />
              {isResolved
                ? t('comments.reopen', 'Öppna igen')
                : t('comments.markDone', 'Markera klar')
              }
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[100px]">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{t('comments.noComments', 'Inga kommentarer än')}</p>
            <p className="text-xs mt-1">{t('comments.beFirst', 'Bli först att kommentera!')}</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className={cn(
                "flex gap-2",
                isResolved && "opacity-60"
              )}
            >
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                  {comment.creator?.name?.charAt(0).toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium truncate">
                    {comment.creator?.name || t('common.unknown', 'Okänd')}
                  </span>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {formatDistanceToNow(new Date(comment.created_at), {
                      addSuffix: true,
                      locale: dateLocale
                    })}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                  {comment.content}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* Input area */}
      {!isResolved && (
        <div className="p-3 border-t bg-gray-50">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('comments.placeholder', 'Skriv en kommentar...')}
              className="min-h-[60px] max-h-[120px] resize-none text-sm"
              disabled={posting}
            />
          </div>
          <div className="flex justify-end mt-2">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!newComment.trim() || posting}
              className="h-8"
            >
              {posting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-3 w-3 mr-1" />
                  {t('comments.send', 'Skicka')}
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Resolved input hint */}
      {isResolved && (
        <div className="p-3 border-t bg-green-50 text-center">
          <p className="text-xs text-green-700">
            {t('comments.resolvedHint', 'Tråden är markerad som klar. Klicka "Öppna igen" för att fortsätta diskutera.')}
          </p>
        </div>
      )}
    </div>
  );
};

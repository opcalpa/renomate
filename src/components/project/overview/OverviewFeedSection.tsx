import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, MessageSquare, Loader2 } from "lucide-react";
import { FeedCommentCard } from "../feed/FeedCommentCard";
import { ActivityCard } from "../feed/ActivityCard";
import { FeedReplyInput } from "../feed/FeedReplyInput";
import { fetchAllProjectComments, fetchProjectActivities, mergeIntoUnifiedFeed } from "../feed/utils";
import type { FeedComment, ActivityLogItem, UnifiedFeedItem, FeedFilterMode } from "../feed/types";
import type { OverviewNavigation } from "./types";

interface OverviewFeedSectionProps {
  projectId: string;
  navigation: OverviewNavigation;
  onNavigateToEntity?: (comment: FeedComment) => void;
}

const ITEMS_LIMIT = 10;

export function OverviewFeedSection({ projectId, navigation, onNavigateToEntity }: OverviewFeedSectionProps) {
  const { t } = useTranslation();
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [activities, setActivities] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<FeedFilterMode>("all");
  const [replyingTo, setReplyingTo] = useState<FeedComment | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [commentsData, activitiesData] = await Promise.all([
        fetchAllProjectComments(projectId),
        fetchProjectActivities(projectId),
      ]);
      setComments(commentsData);
      setActivities(activitiesData);
    } catch (error) {
      console.error("Failed to load feed data:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleReply = (comment: FeedComment) => {
    setReplyingTo(comment);
  };

  const handleReplyPosted = () => {
    setReplyingTo(null);
    loadData();
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            {t("feed.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const unifiedFeed = mergeIntoUnifiedFeed(comments, activities);

  // Apply filter
  let filteredFeed: UnifiedFeedItem[];
  if (filterMode === "comments") {
    filteredFeed = unifiedFeed.filter((i) => i.type === "comment");
  } else if (filterMode === "activity") {
    filteredFeed = unifiedFeed.filter((i) => i.type === "activity");
  } else {
    filteredFeed = unifiedFeed;
  }

  // Limit to recent items
  const displayedItems = filteredFeed.slice(0, ITEMS_LIMIT);
  const hasMore = filteredFeed.length > ITEMS_LIMIT;

  const renderFeedItem = (item: UnifiedFeedItem) => {
    if (item.type === "comment" && item.comment) {
      const isReplyingToThis = replyingTo?.id === item.comment.id;
      return (
        <div key={`c-${item.comment.id}`} className="space-y-2">
          <FeedCommentCard
            comment={item.comment}
            onNavigate={onNavigateToEntity}
            onReply={handleReply}
          />
          {isReplyingToThis && (
            <div className="ml-11">
              <FeedReplyInput
                projectId={projectId}
                parentComment={item.comment}
                onPosted={handleReplyPosted}
                onCancel={handleCancelReply}
              />
            </div>
          )}
        </div>
      );
    }
    if (item.type === "activity" && item.activity) {
      return (
        <ActivityCard key={`a-${item.activity.id}`} activity={item.activity} />
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            {t("feed.title")}
          </CardTitle>
          {/* Filter buttons */}
          <div className="flex gap-1">
            {(["all", "comments", "activity"] as const).map((mode) => (
              <Button
                key={mode}
                variant={filterMode === mode ? "default" : "outline"}
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => setFilterMode(mode)}
              >
                {t(`feed.filter${mode.charAt(0).toUpperCase() + mode.slice(1)}`)}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {displayedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mb-2" />
            <p className="text-sm">
              {filterMode === "comments"
                ? t("feed.noComments")
                : filterMode === "activity"
                ? t("overview.recentActivity.noActivity")
                : t("feed.noActivity", "No activity yet")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedItems.map(renderFeedItem)}
          </div>
        )}

        {/* View all button */}
        <div className="mt-3 pt-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => navigation.onNavigateToFeed()}
          >
            {hasMore
              ? t("overview.recentActivity.viewAllActivity")
              : t("feed.viewFullFeed", "Go to full feed")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, MessageSquare, AtSign, CheckSquare, Package, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useNotifications, NotificationItem } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function NotificationIcon({ type }: { type: NotificationItem["type"] }) {
  const cls = "h-4 w-4 shrink-0";
  switch (type) {
    case "mention":
      return <AtSign className={cn(cls, "text-blue-500")} />;
    case "comment":
      return <MessageSquare className={cn(cls, "text-green-500")} />;
    case "task":
      return <CheckSquare className={cn(cls, "text-orange-500")} />;
    case "material":
      return <Package className={cn(cls, "text-purple-500")} />;
  }
}

function notificationLabel(item: NotificationItem, t: (key: string, fallback?: string) => string): string {
  const entitySuffix = item.entityName ? ` — ${item.entityName}` : "";
  switch (item.type) {
    case "mention":
      return `${item.title} ${t("notifications.mentionedYou", "mentioned you")}${entitySuffix}`;
    case "comment":
      return `${t("notifications.newComment", "New comment")} - ${item.title}${entitySuffix}`;
    case "task":
      return `${t("notifications.newTask", "New task assigned")}`;
    case "material":
      return `${t("notifications.newPurchaseOrder", "New purchase order")}`;
  }
}

export function NotificationBell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { notifications, unreadCount, markAllRead, markOneRead, loading } = useNotifications();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleItemClick = (item: NotificationItem) => {
    markOneRead(item.id);
    setOpen(false);
    const base = `/projects/${item.projectId}`;
    const entityParam = item.entityId ? `&entityId=${item.entityId}` : "";
    if (item.entityType === "task") {
      navigate(`${base}?tab=tasks${entityParam}`);
    } else if (item.entityType === "material") {
      navigate(`${base}?tab=purchases${entityParam}`);
    } else if (item.type === "comment" || item.type === "mention") {
      navigate(`${base}?tab=feed`);
    } else {
      navigate(`${base}?tab=overview`);
    }
  };

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        className="relative h-10 w-10 md:h-9 md:w-9"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={t("notifications.title", "Notifications")}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div
          ref={panelRef}
          className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto top-14 sm:top-full sm:mt-2 w-auto sm:w-80 max-h-[70vh] sm:max-h-[28rem] overflow-hidden rounded-lg border border-border bg-popover shadow-lg z-50 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold">
              {t("notifications.title", "Notifications")}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {t("notifications.markAllRead", "Mark all as read")}
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {loading && notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {t("common.loading", "Loading...")}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {t("notifications.noNotifications", "No new notifications")}
              </div>
            ) : (
              notifications.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    "w-full text-left px-4 py-3 flex gap-3 hover:bg-accent/50 transition-colors border-b border-border/50 last:border-b-0",
                    item.isUnread && "bg-accent/30"
                  )}
                >
                  <div className="mt-0.5">
                    <NotificationIcon type={item.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug">
                      <span className={cn(item.isUnread && "font-semibold")}>
                        {notificationLabel(item, t)}
                      </span>
                    </p>
                    {item.preview && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {item.preview}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.projectName && (
                        <span>
                          {t("notifications.inProject", "in {{project}}", { project: item.projectName })}
                          {" \u00b7 "}
                        </span>
                      )}
                      {formatRelativeTime(item.createdAt)}
                    </p>
                  </div>
                  {item.isUnread && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

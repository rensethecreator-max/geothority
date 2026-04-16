"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell, CheckCheck, Info, CheckCircle2, AlertTriangle, XCircle, ChevronRight,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

type NotifType = "info" | "success" | "warning" | "error";

interface Notification {
  id: number;
  user_id: string;
  type: NotifType;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  limit: number;
  offset: number;
}

const TYPE_CONFIG: Record<NotifType, { icon: React.ElementType; colorClass: string; bgClass: string }> = {
  info: { icon: Info, colorClass: "text-blue-400", bgClass: "bg-blue-500/10" },
  success: { icon: CheckCircle2, colorClass: "text-emerald-400", bgClass: "bg-emerald-500/10" },
  warning: { icon: AlertTriangle, colorClass: "text-yellow-400", bgClass: "bg-yellow-500/10" },
  error: { icon: XCircle, colorClass: "text-destructive", bgClass: "bg-destructive/10" },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type as NotifType] ?? TYPE_CONFIG.info;
}

interface NotificationCenterProps {
  maxVisible?: number;
  pollIntervalMs?: number;
}

export default function NotificationCenter({
  maxVisible = 8,
  pollIntervalMs = 30_000,
}: NotificationCenterProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery<NotificationsResponse>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) return { notifications: [], unreadCount: 0, limit: 20, offset: 0 };
      return res.json();
    },
    refetchInterval: open ? 10_000 : pollIntervalMs,
    refetchIntervalInBackground: false,
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const visible = notifications.slice(0, maxVisible);

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to mark as read", variant: "destructive" });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", "/api/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "Done", description: "All notifications marked as read" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to mark all as read", variant: "destructive" });
    },
  });

  function handleNotifClick(notif: Notification) {
    if (!notif.read) markReadMutation.mutate(notif.id);
    if (notif.link) {
      setOpen(false);
      if (notif.link.startsWith("http")) {
        window.open(notif.link, "_blank", "noreferrer");
      } else {
        router.push(notif.link);
      }
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-electric-500 text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-80 p-0 shadow-xl border-border">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[420px]">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : visible.length > 0 ? (
            <div className="divide-y divide-border">
              {visible.map((notif) => {
                const cfg = getTypeConfig(notif.type);
                const Icon = cfg.icon;
                const isUnread = !notif.read;
                const hasLink = !!notif.link;

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`flex gap-3 px-4 py-3 transition-colors ${
                      hasLink ? "cursor-pointer hover:bg-muted/50" : ""
                    } ${isUnread ? "bg-muted/20" : ""}`}
                    role={hasLink ? "button" : undefined}
                    tabIndex={hasLink ? 0 : undefined}
                  >
                    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${cfg.bgClass}`}>
                      <Icon className={`h-4 w-4 ${cfg.colorClass}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium truncate ${isUnread ? "text-foreground" : "text-muted-foreground"}`}>
                          {notif.title}
                        </p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {isUnread && <span className="h-1.5 w-1.5 rounded-full bg-electric-500" />}
                          {hasLink && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                      <p className="text-[11px] text-muted-foreground/70 mt-1">
                        {notif.created_at
                          ? formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })
                          : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <Bell className="h-8 w-8 text-muted-foreground mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                Audit results, ranking alerts, and updates appear here
              </p>
            </div>
          )}
        </ScrollArea>

        {notifications.length > maxVisible && (
          <div className="border-t border-border px-4 py-2.5">
            <p className="text-xs text-center text-muted-foreground">
              Showing {maxVisible} of {notifications.length} notifications
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

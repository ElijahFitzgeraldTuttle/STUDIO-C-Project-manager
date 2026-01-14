import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import { Bell, Check, CheckCheck, MessageSquare, AlertCircle, Info, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { NotificationItem } from "@/lib/types";

interface NotificationsCenterProps {
    notifications: NotificationItem[];
    onMarkAsRead: (id: number) => void;
    onMarkAllAsRead: () => void;
    onDelete: (id: number) => void;
    onNotificationClick?: (notification: NotificationItem) => void;
    isLoading?: boolean;
}

const typeIcons: Record<string, React.ElementType> = {
    comment: MessageSquare,
    warning: AlertCircle,
    info: Info,
    success: Check,
};

const typeColors: Record<string, { bg: string; text: string }> = {
    comment: { bg: "bg-blue-100 dark:bg-blue-500/20", text: "text-blue-500" },
    warning: { bg: "bg-amber-100 dark:bg-amber-500/20", text: "text-amber-500" },
    info: { bg: "bg-slate-100 dark:bg-slate-500/20", text: "text-slate-500" },
    success: { bg: "bg-green-100 dark:bg-green-500/20", text: "text-green-500" },
};

export function NotificationsCenter({
    notifications,
    onMarkAsRead,
    onMarkAllAsRead,
    onDelete,
    onNotificationClick,
    isLoading,
}: NotificationsCenterProps) {
    const { theme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);

    const unreadCount = notifications.filter(n => !n.read).length;
    const sortedNotifications = [...notifications].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "relative",
                        theme === "dark" ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900"
                    )}
                >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                className={cn(
                    "w-96 p-0",
                    theme === "dark" && "bg-slate-800 border-slate-700"
                )}
            >
                {/* Header */}
                <div className={cn(
                    "px-4 py-3 border-b flex items-center justify-between",
                    theme === "dark" ? "border-slate-700" : "border-slate-200"
                )}>
                    <h3 className={cn(
                        "font-semibold",
                        theme === "dark" ? "text-slate-100" : "text-slate-900"
                    )}>
                        Notifications
                        {unreadCount > 0 && (
                            <span className="ml-2 text-xs font-normal text-slate-500">
                                ({unreadCount} unread)
                            </span>
                        )}
                    </h3>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onMarkAllAsRead}
                            className="text-xs gap-1"
                        >
                            <CheckCheck className="w-3.5 h-3.5" />
                            Mark all read
                        </Button>
                    )}
                </div>

                {/* Notifications List */}
                <ScrollArea className="max-h-[400px]">
                    {isLoading ? (
                        <div className="p-8 text-center text-slate-500">
                            Loading...
                        </div>
                    ) : sortedNotifications.length === 0 ? (
                        <div className="p-8 text-center">
                            <Bell className={cn(
                                "w-8 h-8 mx-auto mb-2",
                                theme === "dark" ? "text-slate-600" : "text-slate-300"
                            )} />
                            <p className={cn(
                                "text-sm",
                                theme === "dark" ? "text-slate-500" : "text-slate-400"
                            )}>
                                No notifications yet
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-200 dark:divide-slate-700">
                            {sortedNotifications.map((notification) => {
                                const Icon = typeIcons[notification.type] || Info;
                                const colors = typeColors[notification.type] || typeColors.info;

                                return (
                                    <div
                                        key={notification.id}
                                        className={cn(
                                            "px-4 py-3 flex gap-3 transition-colors cursor-pointer group",
                                            !notification.read && (theme === "dark" ? "bg-slate-700/30" : "bg-indigo-50/50"),
                                            theme === "dark" ? "hover:bg-slate-700/50" : "hover:bg-slate-50"
                                        )}
                                        onClick={() => {
                                            if (!notification.read) onMarkAsRead(notification.id);
                                            onNotificationClick?.(notification);
                                        }}
                                    >
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                            colors.bg
                                        )}>
                                            <Icon className={cn("w-4 h-4", colors.text)} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={cn(
                                                "text-sm font-medium",
                                                theme === "dark" ? "text-slate-200" : "text-slate-700"
                                            )}>
                                                {notification.title}
                                            </p>
                                            <p className={cn(
                                                "text-xs mt-0.5 line-clamp-2",
                                                theme === "dark" ? "text-slate-400" : "text-slate-500"
                                            )}>
                                                {notification.message}
                                            </p>
                                            <p className={cn(
                                                "text-[10px] mt-1",
                                                theme === "dark" ? "text-slate-500" : "text-slate-400"
                                            )}>
                                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDelete(notification.id);
                                            }}
                                            className={cn(
                                                "p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity",
                                                theme === "dark"
                                                    ? "hover:bg-slate-600 text-slate-400"
                                                    : "hover:bg-slate-200 text-slate-400"
                                            )}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}

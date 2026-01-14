import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import {
    Clock,
    Plus,
    Trash2,
    Archive,
    RotateCcw,
    MoveRight,
    UserPlus,
    UserMinus,
    MessageSquare,
    CheckSquare,
    DollarSign
} from "lucide-react";
import type { ActivityLogEntry } from "@/lib/types";
import { activityActionLabels } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ActivityLogViewerProps {
    activities: ActivityLogEntry[];
    isLoading?: boolean;
    maxHeight?: string;
}

const actionIcons: Record<string, React.ElementType> = {
    task_created: Plus,
    task_updated: Clock,
    task_deleted: Trash2,
    task_archived: Archive,
    task_restored: RotateCcw,
    task_moved: MoveRight,
    task_assigned: UserPlus,
    task_unassigned: UserMinus,
    comment_added: MessageSquare,
    comment_deleted: Trash2,
    subtask_created: Plus,
    subtask_completed: CheckSquare,
    subtask_deleted: Trash2,
    payout_updated: DollarSign,
    payee_added: Plus,
    payee_paid: DollarSign,
    tracking_updated: CheckSquare,
};

export function ActivityLogViewer({ activities, isLoading, maxHeight = "400px" }: ActivityLogViewerProps) {
    const { theme } = useTheme();

    if (isLoading) {
        return (
            <div className={cn(
                "p-6 rounded-lg border text-center",
                theme === "dark" ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"
            )}>
                <Clock className="w-6 h-6 mx-auto mb-2 animate-spin text-slate-400" />
                <p className="text-sm text-slate-500">Loading activity...</p>
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <div className={cn(
                "p-6 rounded-lg border text-center",
                theme === "dark" ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"
            )}>
                <Clock className={cn(
                    "w-6 h-6 mx-auto mb-2",
                    theme === "dark" ? "text-slate-500" : "text-slate-400"
                )} />
                <p className={cn(
                    "text-sm",
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
                )}>No activity yet</p>
            </div>
        );
    }

    return (
        <ScrollArea className={cn("pr-3")} style={{ maxHeight }}>
            <div className="space-y-3">
                {activities.map((activity) => {
                    const Icon = actionIcons[activity.action] || Clock;
                    const actionLabel = activityActionLabels[activity.action] || activity.action;

                    return (
                        <div
                            key={activity.id}
                            className={cn(
                                "flex gap-3 p-3 rounded-lg transition-colors",
                                theme === "dark"
                                    ? "bg-slate-800/50 hover:bg-slate-800"
                                    : "bg-slate-50 hover:bg-slate-100"
                            )}
                        >
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                activity.action.includes("deleted") || activity.action.includes("archived")
                                    ? theme === "dark" ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-500"
                                    : activity.action.includes("completed") || activity.action.includes("paid")
                                        ? theme === "dark" ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-500"
                                        : theme === "dark" ? "bg-indigo-500/20 text-indigo-400" : "bg-indigo-100 text-indigo-500"
                            )}>
                                <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={cn(
                                    "text-sm",
                                    theme === "dark" ? "text-slate-200" : "text-slate-700"
                                )}>
                                    <span className="font-semibold">{activity.userId}</span>
                                    {" "}{actionLabel}
                                    {activity.details?.taskTitle && (
                                        <span className="font-medium"> "{activity.details.taskTitle}"</span>
                                    )}
                                    {activity.details?.subtaskTitle && (
                                        <span className="font-medium"> "{activity.details.subtaskTitle}"</span>
                                    )}
                                    {activity.previousValue && activity.newValue && (
                                        <span className="text-slate-500">
                                            {" "}from "{activity.previousValue}" to "{activity.newValue}"
                                        </span>
                                    )}
                                </p>
                                <p className={cn(
                                    "text-xs mt-1",
                                    theme === "dark" ? "text-slate-500" : "text-slate-400"
                                )}>
                                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </ScrollArea>
    );
}

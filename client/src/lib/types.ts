import type { Task as DBTask, Comment as DBComment, ActivityLog as DBActivityLog, Notification as DBNotification, TeamMember as DBTeamMember } from "@shared/schema";
import { CheckCircle2, Clock, FileText, Calendar, AlertCircle, Flag } from "lucide-react";

export type Status = "prospect" | "scheduled" | "in-progress" | "complete";
export type PriorityLevel = "low" | "medium" | "high" | "urgent";

export type TaskTracking = Record<string, boolean>;

export interface Task {
  id: number;
  title: string;
  description: string;
  status: Status;
  priority: PriorityLevel;
  assignees: string[];
  tags: string[];
  tracking: TaskTracking;
  dueDate: string | null;
  dashboardId: number | null;
  archived: boolean;
  archivedAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: number;
  author: string;
  text: string;
  timestamp: string;
}

export interface ActivityLogEntry {
  id: number;
  taskId: number | null;
  dashboardId: number | null;
  userId: string;
  action: string;
  details: Record<string, any>;
  previousValue: string | null;
  newValue: string | null;
  createdAt: string;
}

export interface NotificationItem {
  id: number;
  userId: string;
  title: string;
  message: string;
  type: string;
  taskId: number | null;
  read: boolean;
  createdAt: string;
}

export interface TeamMember {
  id: number;
  name: string;
  email: string | null;
  avatarColor: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

// Helper function to convert DB task to frontend task
export function dbTaskToTask(dbTask: DBTask): Task {
  let tracking: TaskTracking = {};
  try {
    tracking = typeof dbTask.tracking === 'string' ? JSON.parse(dbTask.tracking) : dbTask.tracking || {};
  } catch (e) {
    console.error("Failed to parse tracking JSON", e);
  }

  return {
    id: dbTask.id,
    title: dbTask.title,
    description: dbTask.description,
    status: dbTask.status as Status,
    priority: (dbTask.priority || "medium") as PriorityLevel,
    assignees: dbTask.assignees,
    tags: dbTask.tags,
    tracking,
    dueDate: dbTask.dueDate ? (typeof dbTask.dueDate === 'string' ? dbTask.dueDate : dbTask.dueDate.toISOString()) : null,
    dashboardId: dbTask.dashboardId ?? null,
    archived: dbTask.archived || false,
    archivedAt: dbTask.archivedAt ? (typeof dbTask.archivedAt === 'string' ? dbTask.archivedAt : dbTask.archivedAt.toISOString()) : null,
    sortOrder: dbTask.sortOrder || 0,
    createdAt: dbTask.createdAt ? (typeof dbTask.createdAt === 'string' ? dbTask.createdAt : dbTask.createdAt.toISOString()) : new Date().toISOString(),
    updatedAt: dbTask.updatedAt ? (typeof dbTask.updatedAt === 'string' ? dbTask.updatedAt : dbTask.updatedAt.toISOString()) : new Date().toISOString(),
  };
}

// Helper function to convert frontend task to DB task
export function taskToDbTask(task: Partial<Task>): any {
  const dbTask: any = {};

  if (task.title !== undefined) dbTask.title = task.title;
  if (task.description !== undefined) dbTask.description = task.description;
  if (task.status !== undefined) dbTask.status = task.status;
  if (task.priority !== undefined) dbTask.priority = task.priority;
  if (task.assignees !== undefined) dbTask.assignees = task.assignees;
  if (task.tags !== undefined) dbTask.tags = task.tags;
  if (task.dueDate !== undefined) dbTask.dueDate = task.dueDate;
  if (task.archived !== undefined) dbTask.archived = task.archived;
  if (task.sortOrder !== undefined) dbTask.sortOrder = task.sortOrder;

  if (task.tracking) {
    dbTask.tracking = JSON.stringify(task.tracking);
  }

  return dbTask;
}

// Helper function to convert DB comment to frontend comment
export function dbCommentToComment(dbComment: DBComment): Comment {
  return {
    id: dbComment.id,
    author: dbComment.author,
    text: dbComment.text,
    timestamp: formatTimestamp(dbComment.createdAt),
  };
}

// Helper function to convert DB activity log to frontend
export function dbActivityLogToEntry(dbLog: DBActivityLog): ActivityLogEntry {
  let details = {};
  try {
    details = typeof dbLog.details === 'string' ? JSON.parse(dbLog.details) : dbLog.details || {};
  } catch (e) {
    console.error("Failed to parse activity log details", e);
  }

  return {
    id: dbLog.id,
    taskId: dbLog.taskId,
    dashboardId: dbLog.dashboardId,
    userId: dbLog.userId,
    action: dbLog.action,
    details,
    previousValue: dbLog.previousValue,
    newValue: dbLog.newValue,
    createdAt: typeof dbLog.createdAt === 'string' ? dbLog.createdAt : dbLog.createdAt.toISOString(),
  };
}

// Helper function to convert DB notification to frontend
export function dbNotificationToItem(dbNotification: DBNotification): NotificationItem {
  return {
    id: dbNotification.id,
    userId: dbNotification.userId,
    title: dbNotification.title,
    message: dbNotification.message,
    type: dbNotification.type,
    taskId: dbNotification.taskId,
    read: dbNotification.read,
    createdAt: typeof dbNotification.createdAt === 'string' ? dbNotification.createdAt : dbNotification.createdAt.toISOString(),
  };
}

// Helper function to convert DB team member to frontend
export function dbTeamMemberToMember(dbMember: DBTeamMember): TeamMember {
  return {
    id: dbMember.id,
    name: dbMember.name,
    email: dbMember.email,
    avatarColor: dbMember.avatarColor,
    role: dbMember.role,
    isActive: dbMember.isActive,
    createdAt: typeof dbMember.createdAt === 'string' ? dbMember.createdAt : dbMember.createdAt.toISOString(),
  };
}

function formatTimestamp(date: Date | string): string {
  const now = new Date();
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export const statusConfig = {
  prospect: {
    label: "Prospect",
    icon: FileText,
    color: "text-slate-500",
    bg: "bg-slate-100/50",
    borderColor: "border-slate-200"
  },
  scheduled: {
    label: "Scheduled",
    icon: Calendar,
    color: "text-amber-500",
    bg: "bg-amber-50/50",
    borderColor: "border-amber-200"
  },
  "in-progress": {
    label: "In Progress",
    icon: Clock,
    color: "text-blue-500",
    bg: "bg-blue-50/50",
    borderColor: "border-blue-200"
  },
  complete: {
    label: "Complete",
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-50/50",
    borderColor: "border-emerald-200"
  }
};

export const priorityConfig = {
  low: {
    label: "Low",
    icon: Flag,
    color: "text-slate-400",
    bg: "bg-slate-100",
    badgeColor: "bg-slate-100 text-slate-600"
  },
  medium: {
    label: "Medium",
    icon: Flag,
    color: "text-blue-500",
    bg: "bg-blue-100",
    badgeColor: "bg-blue-100 text-blue-600"
  },
  high: {
    label: "High",
    icon: Flag,
    color: "text-orange-500",
    bg: "bg-orange-100",
    badgeColor: "bg-orange-100 text-orange-600"
  },
  urgent: {
    label: "Urgent",
    icon: AlertCircle,
    color: "text-red-500",
    bg: "bg-red-100",
    badgeColor: "bg-red-100 text-red-600"
  }
};

// Activity action labels for display
export const activityActionLabels: Record<string, string> = {
  task_created: "created task",
  task_updated: "updated task",
  task_deleted: "deleted task",
  task_archived: "archived task",
  task_restored: "restored task",
  task_moved: "moved task",
  task_assigned: "assigned",
  task_unassigned: "unassigned",
  comment_added: "commented",
  comment_deleted: "deleted comment",
  subtask_created: "added subtask",
  subtask_completed: "completed subtask",
  subtask_deleted: "deleted subtask",
  payout_updated: "updated payout",
  payee_added: "added payee",
  payee_paid: "marked payee as paid",
  tracking_updated: "updated tracking",
};

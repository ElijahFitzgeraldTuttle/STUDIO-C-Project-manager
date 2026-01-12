import type { Task as DBTask, Comment as DBComment } from "@shared/schema";
import { CheckCircle2, Clock, FileText, Calendar } from "lucide-react";

export type Status = "prospect" | "scheduled" | "in-progress" | "complete";

export interface TaskTracking {
  delivered: boolean;
  invoiced: boolean;
  paid: boolean;
  distributed: boolean;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  status: Status;
  assignees: string[];
  tags: string[];
  tracking: TaskTracking;
  dueDate: string | null;
}

export interface Comment {
  id: number;
  author: string;
  text: string;
  timestamp: string;
}

// Helper function to convert DB task to frontend task
export function dbTaskToTask(dbTask: DBTask): Task {
  return {
    id: dbTask.id,
    title: dbTask.title,
    description: dbTask.description,
    status: dbTask.status as Status,
    assignees: dbTask.assignees,
    tags: dbTask.tags,
    tracking: {
      delivered: dbTask.deliveredTracking,
      invoiced: dbTask.invoicedTracking,
      paid: dbTask.paidTracking,
      distributed: dbTask.distributedTracking,
    },
    dueDate: dbTask.dueDate ? (typeof dbTask.dueDate === 'string' ? dbTask.dueDate : dbTask.dueDate.toISOString()) : null,
  };
}

// Helper function to convert frontend task to DB task
export function taskToDbTask(task: Partial<Task>): any {
  const dbTask: any = {};
  
  if (task.title !== undefined) dbTask.title = task.title;
  if (task.description !== undefined) dbTask.description = task.description;
  if (task.status !== undefined) dbTask.status = task.status;
  if (task.assignees !== undefined) dbTask.assignees = task.assignees;
  if (task.tags !== undefined) dbTask.tags = task.tags;
  if (task.dueDate !== undefined) dbTask.dueDate = task.dueDate;

  if (task.tracking) {
    dbTask.deliveredTracking = task.tracking.delivered;
    dbTask.invoicedTracking = task.tracking.invoiced;
    dbTask.paidTracking = task.tracking.paid;
    dbTask.distributedTracking = task.tracking.distributed;
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

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
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

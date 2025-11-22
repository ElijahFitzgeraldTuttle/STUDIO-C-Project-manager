import { CheckCircle2, Clock, CircleDashed, Plus, MoreHorizontal, Calendar, User } from "lucide-react";

export type Priority = "low" | "medium" | "high";
export type Status = "todo" | "in-progress" | "done";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  assignee?: string;
  dueDate?: string;
  tags: string[];
}

export const initialTasks: Task[] = [
  {
    id: "1",
    title: "Design System Audit",
    description: "Review current component library and identify inconsistencies in spacing and typography.",
    status: "in-progress",
    priority: "high",
    assignee: "Alex",
    dueDate: "Tomorrow",
    tags: ["Design", "Audit"]
  },
  {
    id: "2",
    title: "User Research Interviews",
    description: "Schedule and conduct interviews with 5 active users to gather feedback on the new dashboard.",
    status: "todo",
    priority: "medium",
    assignee: "Sam",
    dueDate: "Next Week",
    tags: ["Research"]
  },
  {
    id: "3",
    title: "Fix Navigation Bug",
    description: "Mobile menu doesn't close when clicking outside the drawer on iOS devices.",
    status: "todo",
    priority: "high",
    tags: ["Bug", "Mobile"]
  },
  {
    id: "4",
    title: "Q3 Marketing Plan",
    description: "Draft initial outline for Q3 content strategy and social media calendar.",
    status: "done",
    priority: "medium",
    assignee: "Jordan",
    dueDate: "Yesterday",
    tags: ["Marketing"]
  },
  {
    id: "5",
    title: "Update Dependencies",
    description: "Bump React and other core libraries to latest stable versions.",
    status: "done",
    priority: "low",
    tags: ["DevOps"]
  },
  {
    id: "6",
    title: "Dark Mode Implementation",
    description: "Define color tokens for dark mode and implement toggle switch.",
    status: "in-progress",
    priority: "high",
    assignee: "Alex",
    tags: ["Feature", "UI"]
  }
];

export const statusConfig = {
  todo: {
    label: "To Do",
    icon: CircleDashed,
    color: "text-slate-500",
    bg: "bg-slate-100/50",
    borderColor: "border-slate-200"
  },
  "in-progress": {
    label: "In Progress",
    icon: Clock,
    color: "text-blue-500",
    bg: "bg-blue-50/50",
    borderColor: "border-blue-200"
  },
  done: {
    label: "Done",
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-50/50",
    borderColor: "border-emerald-200"
  }
};

export const priorityConfig = {
  low: { color: "bg-slate-200 text-slate-700" },
  medium: { color: "bg-amber-100 text-amber-700" },
  high: { color: "bg-rose-100 text-rose-700" }
};

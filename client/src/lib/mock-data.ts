import { CheckCircle2, Clock, CircleDashed, Plus, MoreHorizontal, Calendar, User, FileText, LayoutDashboard, Send } from "lucide-react";

export type Status = "prospect" | "scheduled" | "in-progress" | "complete";

export interface TaskTracking {
  delivered: boolean;
  invoiced: boolean;
  paid: boolean;
  distributed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: Status;
  assignee?: string;
  dueDate?: string;
  tags: string[];
  tracking: TaskTracking;
}

export const initialTasks: Task[] = [
  {
    id: "1",
    title: "Design System Audit",
    description: "Review current component library and identify inconsistencies in spacing and typography.",
    status: "in-progress",
    assignee: "Alex",
    dueDate: "Tomorrow",
    tags: ["Design", "Audit"],
    tracking: {
      delivered: false,
      invoiced: false,
      paid: false,
      distributed: false
    }
  },
  {
    id: "2",
    title: "User Research Interviews",
    description: "Schedule and conduct interviews with 5 active users to gather feedback on the new dashboard.",
    status: "scheduled",
    assignee: "Sam",
    dueDate: "Next Week",
    tags: ["Research"],
    tracking: {
      delivered: false,
      invoiced: false,
      paid: false,
      distributed: false
    }
  },
  {
    id: "3",
    title: "Fix Navigation Bug",
    description: "Mobile menu doesn't close when clicking outside the drawer on iOS devices.",
    status: "prospect",
    tags: ["Bug", "Mobile"],
    tracking: {
      delivered: false,
      invoiced: false,
      paid: false,
      distributed: false
    }
  },
  {
    id: "4",
    title: "Q3 Marketing Plan",
    description: "Draft initial outline for Q3 content strategy and social media calendar.",
    status: "complete",
    assignee: "Jordan",
    dueDate: "Yesterday",
    tags: ["Marketing"],
    tracking: {
      delivered: true,
      invoiced: true,
      paid: false,
      distributed: false
    }
  },
  {
    id: "5",
    title: "Update Dependencies",
    description: "Bump React and other core libraries to latest stable versions.",
    status: "complete",
    tags: ["DevOps"],
    tracking: {
      delivered: true,
      invoiced: true,
      paid: true,
      distributed: true
    }
  },
  {
    id: "6",
    title: "Dark Mode Implementation",
    description: "Define color tokens for dark mode and implement toggle switch.",
    status: "in-progress",
    assignee: "Alex",
    tags: ["Feature", "UI"],
    tracking: {
      delivered: true,
      invoiced: false,
      paid: false,
      distributed: false
    }
  }
];

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

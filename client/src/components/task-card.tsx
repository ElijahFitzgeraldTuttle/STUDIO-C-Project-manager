import { Task, priorityConfig, statusConfig } from "@/lib/mock-data";
import { Calendar, MoreHorizontal, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TaskCardProps {
  task: Task;
  onStatusChange: (id: string, status: Task["status"]) => void;
}

export function TaskCard({ task, onStatusChange }: TaskCardProps) {
  const statusColors = statusConfig[task.status];

  return (
    <motion.div
      layoutId={task.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 cursor-default"
    >
      <div className="flex justify-between items-start mb-2">
        <span
          className={cn(
            "text-[10px] font-medium uppercase tracking-wider px-2 py-1 rounded-full",
            priorityConfig[task.priority].color
          )}
        >
          {task.priority}
        </span>
        
        <DropdownMenu>
          <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-100 rounded-md outline-none">
            <MoreHorizontal className="w-4 h-4 text-slate-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onStatusChange(task.id, "todo")}>
              Move to To Do
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange(task.id, "in-progress")}>
              Move to In Progress
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange(task.id, "done")}>
              Move to Done
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <h3 className="text-sm font-semibold text-slate-800 mb-1 leading-tight">
        {task.title}
      </h3>
      <p className="text-xs text-slate-500 line-clamp-2 mb-3">
        {task.description}
      </p>

      <div className="flex items-center justify-between pt-3 border-t border-slate-50 mt-auto">
        <div className="flex items-center gap-2">
          {task.assignee && (
            <div className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-md">
              <User className="w-3 h-3" />
              <span>{task.assignee}</span>
            </div>
          )}
        </div>
        
        {task.dueDate && (
          <div className={cn("flex items-center gap-1 text-xs", 
            task.status === 'done' ? "text-slate-400" : "text-orange-600/80"
          )}>
            <Calendar className="w-3 h-3" />
            <span>{task.dueDate}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

import { Task, statusConfig, TaskTracking } from "@/lib/mock-data";
import { Calendar, MoreHorizontal, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";

interface TaskCardProps {
  task: Task;
  onUpdate: (task: Task) => void;
}

export function TaskCard({ task, onUpdate }: TaskCardProps) {
  const statusColors = statusConfig[task.status];

  const handleTrackingChange = (key: keyof TaskTracking, checked: boolean) => {
    onUpdate({
      ...task,
      tracking: {
        ...task.tracking,
        [key]: checked
      }
    });
  };

  return (
    <motion.div
      layoutId={task.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 cursor-default"
    >
      <div className="flex justify-between items-start mb-2">
        <div /> {/* Spacer for removed priority */}
        
        <DropdownMenu>
          <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-100 rounded-md outline-none ml-auto">
            <MoreHorizontal className="w-4 h-4 text-slate-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onUpdate({ ...task, status: "prospect" })}>
              Move to Prospect
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdate({ ...task, status: "scheduled" })}>
              Move to Scheduled
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdate({ ...task, status: "in-progress" })}>
              Move to In Progress
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdate({ ...task, status: "complete" })}>
              Move to Complete
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

      {/* Tracking Checkboxes */}
      <div className="grid grid-cols-2 gap-2 mb-3 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
        {Object.entries(task.tracking).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <Checkbox 
              id={`tracking-${task.id}-${key}`} 
              checked={value}
              onCheckedChange={(checked) => handleTrackingChange(key as keyof TaskTracking, checked === true)}
              className="h-3 w-3"
            />
            <Label 
              htmlFor={`tracking-${task.id}-${key}`}
              className="text-[10px] text-slate-600 capitalize cursor-pointer font-medium"
            >
              {key}
            </Label>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 mt-auto">
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
            task.status === 'complete' ? "text-slate-400" : "text-orange-600/80"
          )}>
            <Calendar className="w-3 h-3" />
            <span>{task.dueDate}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

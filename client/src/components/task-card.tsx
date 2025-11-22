import { Task, statusConfig, TaskTracking } from "@/lib/mock-data";
import { Calendar, MoreHorizontal, User, Clock, CheckCircle2 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge"; // We will use standard badge if available, or style a div

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

  const StatusIcon = statusConfig[task.status].icon;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <motion.div
          layoutId={task.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="group relative bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer text-left w-full"
        >
          <div className="flex justify-between items-start gap-2 mb-1">
            <h3 className="text-sm font-semibold text-slate-800 leading-tight pt-1">
              {task.title}
            </h3>
            
            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-100 rounded-md outline-none shrink-0 -mr-1 -mt-1">
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
          </div>

          <p className="text-xs text-slate-500 line-clamp-2 mb-3">
            {task.description}
          </p>

          {/* Tracking Checkboxes */}
          <div 
            className="grid grid-cols-2 gap-2 mb-3 bg-slate-50/50 p-2 rounded-lg border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
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
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={cn("p-2 rounded-lg", statusConfig[task.status].bg)}>
              <StatusIcon className={cn("w-5 h-5", statusConfig[task.status].color)} />
            </div>
            <div className={cn("text-xs font-medium px-2.5 py-0.5 rounded-full border", 
              statusConfig[task.status].bg, 
              statusConfig[task.status].color,
              statusConfig[task.status].borderColor
            )}>
              {statusConfig[task.status].label}
            </div>
          </div>
          <DialogTitle className="text-xl">{task.title}</DialogTitle>
          <DialogDescription className="text-slate-500 pt-2">
            {task.description}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Tracking Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-slate-500" />
              Project Tracking
            </h4>
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              {Object.entries(task.tracking).map(([key, value]) => (
                <div key={key} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg transition-colors">
                  <Checkbox 
                    id={`modal-tracking-${task.id}-${key}`} 
                    checked={value}
                    onCheckedChange={(checked) => handleTrackingChange(key as keyof TaskTracking, checked === true)}
                    className="h-5 w-5 rounded-md border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                  />
                  <Label 
                    htmlFor={`modal-tracking-${task.id}-${key}`}
                    className="text-sm text-slate-700 capitalize cursor-pointer font-medium select-none"
                  >
                    {key}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 p-3 rounded-lg border border-slate-100 bg-white">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-medium uppercase tracking-wide">
                <User className="w-3.5 h-3.5" />
                Assignee
              </div>
              <div className="font-medium text-slate-900">
                {task.assignee || "Unassigned"}
              </div>
            </div>
            
            <div className="space-y-1.5 p-3 rounded-lg border border-slate-100 bg-white">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-medium uppercase tracking-wide">
                <Calendar className="w-3.5 h-3.5" />
                Due Date
              </div>
              <div className="font-medium text-slate-900">
                {task.dueDate || "No date set"}
              </div>
            </div>
          </div>
          
          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {task.tags.map(tag => (
              <span key={tag} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-md border border-slate-200">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

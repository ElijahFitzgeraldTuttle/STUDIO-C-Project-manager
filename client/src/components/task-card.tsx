import { Task, statusConfig, TaskTracking, Comment } from "@/lib/mock-data";
import { Calendar, MoreHorizontal, User, CheckCircle2, MessageSquare, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface TaskCardProps {
  task: Task;
  onUpdate: (task: Task) => void;
}

export function TaskCard({ task, onUpdate }: TaskCardProps) {
  const [newComment, setNewComment] = useState("");
  
  const handleTrackingChange = (key: keyof TaskTracking, checked: boolean) => {
    onUpdate({
      ...task,
      tracking: {
        ...task.tracking,
        [key]: checked
      }
    });
  };

  const handleAssigneeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({
      ...task,
      assignee: e.target.value
    });
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: Math.random().toString(36).substr(2, 9),
      author: "You", // Mock current user
      text: newComment,
      timestamp: "Just now"
    };

    onUpdate({
      ...task,
      comments: [...task.comments, comment]
    });
    setNewComment("");
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
            
            {task.comments.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <MessageSquare className="w-3 h-3" />
                <span>{task.comments.length}</span>
              </div>
            )}
          </div>
        </motion.div>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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

          {/* Assignee Section */}
          <div className="space-y-1.5 p-4 rounded-lg border border-slate-100 bg-white">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium uppercase tracking-wide mb-2">
              <User className="w-3.5 h-3.5" />
              Assignee
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-medium text-sm border border-indigo-200">
                {task.assignee ? task.assignee.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
              </div>
              <Input 
                value={task.assignee || ""} 
                onChange={handleAssigneeChange}
                placeholder="Add assignee..."
                className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 placeholder:text-slate-400 font-medium text-slate-900"
              />
            </div>
          </div>
          
          {/* Comments Section */}
          <div className="space-y-4">
             <h4 className="text-sm font-medium text-slate-900 flex items-center gap-2 border-t border-slate-100 pt-4">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              Comments
            </h4>
            
            <div className="space-y-4 max-h-[200px] overflow-y-auto pr-2">
              {task.comments.length === 0 ? (
                <p className="text-sm text-slate-400 italic text-center py-4">No comments yet</p>
              ) : (
                task.comments.map(comment => (
                  <div key={comment.id} className="flex gap-3 text-sm">
                     <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-medium text-xs border border-slate-200 shrink-0">
                      {comment.author.charAt(0)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium text-slate-900">{comment.author}</span>
                        <span className="text-xs text-slate-400">{comment.timestamp}</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">{comment.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} className="flex gap-2">
              <Input 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 bg-slate-50 border-slate-200 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500"
              />
              <Button type="submit" size="icon" disabled={!newComment.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
          
          {/* Tags */}
          <div className="flex flex-wrap gap-2 pt-2">
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

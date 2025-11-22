import { type Task, type TaskTracking, type Comment, statusConfig } from "@/lib/types";
import { MoreHorizontal, User, CheckCircle2, MessageSquare, Send } from "lucide-react";
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchComments, createComment } from "@/lib/api";
import { dbCommentToComment } from "@/lib/types";

interface TaskCardProps {
  task: Task;
  onUpdate: (task: Task) => void;
}

export function TaskCard({ task, onUpdate }: TaskCardProps) {
  const [newComment, setNewComment] = useState("");
  const queryClient = useQueryClient();
  
  const { data: dbComments = [] } = useQuery({
    queryKey: ["comments", task.id],
    queryFn: () => fetchComments(task.id),
    enabled: !!task.id,
  });

  const comments = dbComments.map(dbCommentToComment);

  const createCommentMutation = useMutation({
    mutationFn: (text: string) =>
      createComment(task.id, { author: "You", text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", task.id] });
    },
  });

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
    createCommentMutation.mutate(newComment);
    setNewComment("");
  };

  const StatusIcon = statusConfig[task.status].icon;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <motion.div
          layoutId={task.id.toString()}
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
            
            {comments.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <MessageSquare className="w-3 h-3" />
                <span>{comments.length}</span>
              </div>
            )}
          </div>
        </motion.div>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        <div className="grid grid-cols-1 md:grid-cols-5 h-full max-h-[80vh]">
          
          {/* Left Column: Task Details */}
          <div className="md:col-span-3 p-6 overflow-y-auto border-r border-slate-100">
            <DialogHeader className="mb-6">
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
              <DialogTitle className="text-xl leading-snug">{task.title}</DialogTitle>
              <DialogDescription className="text-slate-500 pt-2">
                {task.description}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Tracking Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-slate-500" />
                  Project Tracking
                </h4>
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
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
              
              {/* Tags */}
              <div className="flex flex-wrap gap-2 pt-2">
                {task.tags.map(tag => (
                  <span key={tag} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-md border border-slate-200">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Comments Bubble */}
          <div className="md:col-span-2 bg-slate-50/50 flex flex-col h-full max-h-[80vh]">
            <div className="p-4 border-b border-slate-200/60 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
              <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-500" />
                Comments
              </h4>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {comments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                  <MessageSquare className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-sm">No comments yet.<br/>Start the conversation!</p>
                </div>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="flex gap-3 text-sm group">
                     <div className="w-8 h-8 rounded-full bg-white text-slate-500 flex items-center justify-center font-bold text-xs border border-slate-200 shrink-0 shadow-sm">
                      {comment.author.charAt(0)}
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-baseline justify-between">
                        <span className="font-semibold text-slate-900 text-xs">{comment.author}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{comment.timestamp}</span>
                      </div>
                      <div className="bg-white p-3 rounded-tr-xl rounded-br-xl rounded-bl-xl border border-slate-100 shadow-sm text-slate-600 leading-relaxed">
                        {comment.text}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-white border-t border-slate-200/60">
              <form onSubmit={handleAddComment} className="relative">
                <Input 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="pr-10 bg-slate-50 border-slate-200 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 py-5"
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={!newComment.trim()} 
                  className="absolute right-1.5 top-1.5 h-7 w-7 bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 transition-all rounded-md"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </form>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}

import { type Task, type TaskTracking, type Comment, statusConfig } from "@/lib/types";
import type { Subtask, Payout, Payee } from "@shared/schema";
import { MoreHorizontal, User, CheckCircle2, MessageSquare, Send, Bell, ListTodo, X, Plus, DollarSign, Trash2 } from "lucide-react";
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
import { fetchComments, createComment, markAllTaskCommentsAsRead, fetchSubtasks, createSubtask, updateSubtask, deleteSubtask, fetchPayout, createOrUpdatePayout, addPayee, updatePayee, deletePayee } from "@/lib/api";
import { dbCommentToComment } from "@/lib/types";
import { useUser } from "@/contexts/UserContext";

interface TaskCardProps {
  task: Task;
  onUpdate: (task: Task) => void;
  unreadCount?: number;
}

export function TaskCard({ task, onUpdate, unreadCount = 0 }: TaskCardProps) {
  const [newComment, setNewComment] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [payoutTotal, setPayoutTotal] = useState("");
  const [newPayeeName, setNewPayeeName] = useState("");
  const [newPayeeAmount, setNewPayeeAmount] = useState("");
  const queryClient = useQueryClient();
  const { currentUser } = useUser();
  
  const { data: dbComments = [] } = useQuery({
    queryKey: ["comments", task.id],
    queryFn: () => fetchComments(task.id),
    enabled: !!task.id,
  });

  const { data: subtasks = [] } = useQuery({
    queryKey: ["subtasks", task.id],
    queryFn: () => fetchSubtasks(task.id),
    enabled: !!task.id,
  });

  const { data: payoutData } = useQuery({
    queryKey: ["payout", task.id],
    queryFn: () => fetchPayout(task.id),
    enabled: !!task.id,
  });

  // Initialize payoutTotal when payoutData loads
  if (payoutData && !payoutTotal) {
    setPayoutTotal(payoutData.totalAmount.toString());
  }

  const comments = dbComments.map(dbCommentToComment);

  const createCommentMutation = useMutation({
    mutationFn: (text: string) =>
      createComment(task.id, { author: currentUser!, text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", task.id] });
      queryClient.invalidateQueries({ queryKey: ["unreadCounts", currentUser] });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: () => markAllTaskCommentsAsRead(task.id, currentUser!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unreadCounts", currentUser] });
    },
  });

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && unreadCount > 0 && currentUser) {
      // Optimistically clear the unread count immediately
      queryClient.setQueryData(
        ["unreadCounts", currentUser],
        (old: Record<number, number> | undefined) => {
          if (!old) return old;
          const updated = { ...old };
          delete updated[task.id];
          return updated;
        }
      );
      
      // Mark comments as read in the background
      markAsReadMutation.mutate();
    }
  };

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

  // Subtask mutations
  const createSubtaskMutation = useMutation({
    mutationFn: (title: string) => createSubtask(task.id, { title, completed: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subtasks", task.id] });
      setNewSubtaskTitle("");
    },
  });

  const toggleSubtaskMutation = useMutation({
    mutationFn: ({ id, completed }: { id: number; completed: boolean }) =>
      updateSubtask(id, { completed }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subtasks", task.id] });
    },
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: deleteSubtask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subtasks", task.id] });
    },
  });

  // Payout mutations
  const updatePayoutTotalMutation = useMutation({
    mutationFn: (totalAmount: number) => createOrUpdatePayout(task.id, totalAmount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payout", task.id] });
    },
  });

  const addPayeeMutation = useMutation({
    mutationFn: ({ name, amount }: { name: string; amount: number }) => {
      if (!payoutData?.id) throw new Error("Payout must be created first");
      return addPayee(payoutData.id, { name, amount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payout", task.id] });
      setNewPayeeName("");
      setNewPayeeAmount("");
    },
  });

  const deletePayeeMutation = useMutation({
    mutationFn: deletePayee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payout", task.id] });
    },
  });

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    createSubtaskMutation.mutate(newSubtaskTitle);
  };

  const handleUpdatePayoutTotal = () => {
    const amount = parseInt(payoutTotal);
    if (isNaN(amount) || amount < 0) return;
    updatePayoutTotalMutation.mutate(amount);
  };

  const handleAddPayee = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(newPayeeAmount);
    if (!newPayeeName.trim() || isNaN(amount) || amount < 0) return;
    addPayeeMutation.mutate({ name: newPayeeName, amount });
  };

  const totalPaid = payoutData?.payees.reduce((sum, p) => sum + p.amount, 0) || 0;
  const remaining = (payoutData?.totalAmount || 0) - totalPaid;

  const StatusIcon = statusConfig[task.status].icon;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
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
            
            <div className="flex items-center gap-2">
              {comments.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <MessageSquare className="w-3 h-3" />
                  <span>{comments.length}</span>
                </div>
              )}
              {unreadCount > 0 && (
                <div className="relative">
                  <Bell className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-indigo-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                </div>
              )}
            </div>
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
              {/* Subtasks Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-slate-900 flex items-center gap-2">
                  <ListTodo className="w-4 h-4 text-slate-500" />
                  Subtasks
                  <span className="text-xs text-slate-500 font-normal">
                    ({subtasks.filter(s => s.completed).length}/{subtasks.length})
                  </span>
                </h4>
                <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {subtasks.map(subtask => (
                    <div key={subtask.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg transition-colors group">
                      <Checkbox 
                        checked={subtask.completed}
                        onCheckedChange={(checked) => toggleSubtaskMutation.mutate({ id: subtask.id, completed: checked === true })}
                        className="h-5 w-5 rounded-md border-slate-300"
                        data-testid={`checkbox-subtask-${subtask.id}`}
                      />
                      <span className={cn("flex-1 text-sm", subtask.completed && "line-through text-slate-400")}>
                        {subtask.title}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteSubtaskMutation.mutate(subtask.id)}
                        data-testid={`button-delete-subtask-${subtask.id}`}
                      >
                        <X className="w-3.5 h-3.5 text-slate-400" />
                      </Button>
                    </div>
                  ))}
                  <form onSubmit={handleAddSubtask} className="flex gap-2 mt-3">
                    <Input 
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      placeholder="Add subtask..."
                      className="h-9 bg-white"
                      data-testid="input-new-subtask"
                    />
                    <Button 
                      type="submit" 
                      size="sm"
                      disabled={!newSubtaskTitle.trim()}
                      data-testid="button-add-subtask"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              </div>

              {/* Payouts Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-slate-500" />
                  Payouts
                </h4>
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-600">Total Amount</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="number"
                        value={payoutTotal}
                        onChange={(e) => setPayoutTotal(e.target.value)}
                        onBlur={handleUpdatePayoutTotal}
                        placeholder="0"
                        className="h-9 bg-white"
                        data-testid="input-payout-total"
                      />
                    </div>
                  </div>

                  {payoutData && payoutData.payees.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-600">Payees</Label>
                      {payoutData.payees.map(payee => (
                        <div key={payee.id} className="flex items-center gap-2 p-2 bg-white rounded-lg group">
                          <span className="flex-1 text-sm font-medium text-slate-700">{payee.name}</span>
                          <span className="text-sm text-slate-600">${payee.amount}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => deletePayeeMutation.mutate(payee.id)}
                            data-testid={`button-delete-payee-${payee.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <form onSubmit={handleAddPayee} className="grid grid-cols-2 gap-2">
                    <Input 
                      value={newPayeeName}
                      onChange={(e) => setNewPayeeName(e.target.value)}
                      placeholder="Payee name"
                      className="h-9 bg-white"
                      data-testid="input-payee-name"
                    />
                    <div className="flex gap-2">
                      <Input 
                        type="number"
                        value={newPayeeAmount}
                        onChange={(e) => setNewPayeeAmount(e.target.value)}
                        placeholder="Amount"
                        className="h-9 bg-white"
                        data-testid="input-payee-amount"
                      />
                      <Button 
                        type="submit" 
                        size="sm"
                        disabled={!newPayeeName.trim() || !newPayeeAmount}
                        data-testid="button-add-payee"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </form>

                  {payoutData && (
                    <div className="pt-2 border-t border-slate-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-700">Remaining</span>
                        <span className={cn(
                          "text-sm font-bold",
                          remaining < 0 ? "text-red-600" : remaining > 0 ? "text-indigo-600" : "text-emerald-600"
                        )}>
                          ${remaining}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

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

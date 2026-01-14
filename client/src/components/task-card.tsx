import { type Task, type TaskTracking, type Comment, statusConfig, priorityConfig, type PriorityLevel } from "@/lib/types";
import type { Subtask, Payout, Payee, InsertPayee } from "@shared/schema";
import { MoreHorizontal, User, CheckCircle2, MessageSquare, Send, Bell, ListTodo, X, Plus, DollarSign, Trash2, GripVertical, Calendar, AlertCircle, FileText, Star, Clock, Archive, Flag, Loader2 } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { fetchComments, createComment, markAllTaskCommentsAsRead, fetchSubtasks, createSubtask, updateSubtask, deleteSubtask, fetchPayout, createOrUpdatePayout, addPayee, updatePayee, deletePayee, fetchTeamMembers, archiveTask } from "@/lib/api";
import { dbCommentToComment } from "@/lib/types";
import { useUser } from "@/contexts/UserContext";
import { useTheme } from "@/contexts/ThemeContext";

interface TaskCardProps {
  task: Task;
  onUpdate: (task: Task) => void;
  onDelete: (taskId: number) => void;
  unreadCount?: number;
  dragHandleProps?: any;
  trackingFields?: string[];
  trackingLabels?: Record<string, string>;
  isUpdating?: boolean;
}

const defaultTrackingLabels: Record<string, string> = {
  delivered: "Delivered",
  invoiced: "Deposit Paid",
  paid: "Fully Paid",
  distributed: "Distributed",
};

const defaultTrackingFields = ["delivered", "invoiced", "paid", "distributed"];

export function TaskCard({ task, onUpdate, onDelete, unreadCount = 0, dragHandleProps, trackingFields = defaultTrackingFields, trackingLabels, isUpdating = false }: TaskCardProps) {
  const effectiveLabels = { ...defaultTrackingLabels, ...trackingLabels };
  const [newComment, setNewComment] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [payoutTotal, setPayoutTotal] = useState("");
  const [newPayeeName, setNewPayeeName] = useState("");
  const [newPayeeReason, setNewPayeeReason] = useState("");
  const [newPayeeAmount, setNewPayeeAmount] = useState("");
  const queryClient = useQueryClient();
  const { currentUser } = useUser();
  const { theme } = useTheme();

  // Fetch team members instead of hardcoded list
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members"],
    queryFn: fetchTeamMembers,
  });

  // Get available users from team members
  const AVAILABLE_USERS = teamMembers.length > 0
    ? teamMembers.map(m => m.name)
    : ["Miles", "Eli", "Chase"]; // Fallback to defaults

  const priorityInfo = priorityConfig[task.priority as PriorityLevel] || priorityConfig.medium;

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

  const handleTrackingChange = (key: string, checked: boolean) => {
    onUpdate({
      ...task,
      tracking: {
        ...task.tracking,
        [key]: checked
      }
    });
  };

  const handleAssigneeToggle = (user: string) => {
    const currentAssignees = task.assignees || [];
    const updatedAssignees = currentAssignees.includes(user)
      ? currentAssignees.filter(a => a !== user)
      : [...currentAssignees, user];

    onUpdate({
      ...task,
      assignees: updatedAssignees
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
    mutationFn: ({ id, data }: { id: number; data: Partial<Subtask> }) =>
      updateSubtask(id, data),
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
    mutationFn: ({ name, reason, amount }: { name: string; reason: string; amount: number }) => {
      if (!payoutData?.id) throw new Error("Payout must be created first");
      return addPayee(payoutData.id, { name, reason, amount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payout", task.id] });
      setNewPayeeName("");
      setNewPayeeReason("");
      setNewPayeeAmount("");
    },
  });

  const updatePayeeMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Omit<InsertPayee, "payoutId">> }) =>
      updatePayee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payout", task.id] });
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
    addPayeeMutation.mutate({ name: newPayeeName, reason: newPayeeReason, amount });
  };

  const totalPaid = payoutData?.payees.reduce((sum, p) => sum + p.amount, 0) || 0;
  const remaining = (payoutData?.totalAmount || 0) - totalPaid;

  // Get status config with fallback for custom columns
  const currentStatusConfig = statusConfig[task.status as keyof typeof statusConfig] || {
    label: task.status,
    icon: FileText,
    color: "text-slate-500",
    bg: "bg-slate-100/50",
    borderColor: "border-slate-200"
  };
  const StatusIcon = currentStatusConfig.icon;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <div
          className={cn(
            "group relative p-5 rounded-2xl border-2 cursor-pointer text-left w-full",
            "transition-all duration-200 ease-out",
            "hover:-translate-y-1",
            theme === "light" && "bg-white border-slate-100 shadow-xl shadow-slate-200/50 hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-500/10",
            theme === "dark" && "bg-slate-800/80 backdrop-blur-md border-slate-700/50 shadow-2xl shadow-black/40 hover:border-indigo-500/50 hover:bg-slate-800"
          )}
        >
          <div className="flex justify-between items-start gap-2 mb-1">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              {dragHandleProps && (
                <div
                  {...dragHandleProps}
                  className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 transition-colors shrink-0 pt-1"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Drag to move task"
                  title="Drag to move task"
                  role="button"
                  tabIndex={0}
                >
                  <GripVertical className="w-4 h-4" />
                </div>
              )}
              <h3 className={cn(
                "text-lg font-black leading-tight pt-1 flex-1 min-w-0 drop-shadow-sm tracking-tight",
                theme === "dark" ? "text-white" : "text-slate-900"
              )}>
                {task.title}
              </h3>
            </div>

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
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(task.id)}
                    className="text-red-600 focus:text-red-600"
                    data-testid={`menu-delete-task-${task.id}`}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <p className={cn(
            "text-xs line-clamp-2 mb-4 font-bold leading-relaxed",
            theme === "dark" ? "text-slate-400" : "text-slate-600"
          )}>
            {task.description}
          </p>

          {/* Due Date Badge */}
          {task.dueDate && (
            <div className={cn(
              "flex items-center gap-1.5 text-xs mb-3 px-2 py-1 rounded-md w-fit",
              isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && "bg-red-100 text-red-600",
              isToday(new Date(task.dueDate)) && "bg-amber-100 text-amber-600",
              !isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && (theme === "dark" ? "bg-slate-700/50 text-slate-300" : "bg-slate-100 text-slate-600")
            )}>
              {isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && <AlertCircle className="w-3 h-3" />}
              <Calendar className="w-3 h-3" />
              <span>{format(new Date(task.dueDate), "MMM d")}</span>
            </div>
          )}

          {/* Subtasks Preview */}
          {subtasks.length > 0 && (
            <div
              className={cn(
                "mb-3 p-2 rounded-lg border",
                theme === "light" && "bg-slate-50/50 border-slate-100",
                theme === "dark" && "bg-slate-700/20 border-slate-600/50"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={cn(
                "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest mb-2",
                theme === "dark" ? "text-white/60" : "text-slate-900/60"
              )}>
                <ListTodo className="w-3 h-3" />
                <span>{subtasks.filter(s => s.completed).length}/{subtasks.length} subtasks</span>
              </div>
              <div className="space-y-1">
                {subtasks.slice(0, 3).map(subtask => {
                  const subtaskDueDate = subtask.dueDate ? new Date(subtask.dueDate) : null;
                  const isOverdue = subtaskDueDate && !subtask.completed && isPast(subtaskDueDate) && !isToday(subtaskDueDate);
                  return (
                    <div key={subtask.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={subtask.completed}
                        onCheckedChange={(checked) => toggleSubtaskMutation.mutate({ id: subtask.id, data: { completed: checked === true } })}
                        className="h-3.5 w-3.5 rounded border-slate-300"
                        data-testid={`card-checkbox-subtask-${subtask.id}`}
                      />
                      <span className={cn(
                        "flex-1 text-xs truncate font-bold uppercase tracking-tight",
                        subtask.completed && theme === "dark" && "line-through text-slate-300/70",
                        subtask.completed && theme === "light" && "line-through text-slate-500/80",
                        !subtask.completed && theme === "dark" && "text-white drop-shadow-sm",
                        !subtask.completed && theme === "light" && "text-slate-900"
                      )}>
                        {subtask.title}
                      </span>
                      {subtask.assignees && subtask.assignees.length > 0 && (
                        <div className="flex -space-x-1">
                          {subtask.assignees.slice(0, 2).map(a => (
                            <div
                              key={a}
                              className={cn(
                                "w-5 h-5 rounded-full text-[9px] flex items-center justify-center font-bold border-2 shadow-sm",
                                theme === "dark"
                                  ? "bg-indigo-500 text-white border-indigo-400"
                                  : "bg-indigo-500 text-white border-white"
                              )}
                              title={a}
                            >
                              {a.charAt(0)}
                            </div>
                          ))}
                        </div>
                      )}
                      {isOverdue && <AlertCircle className="w-3 h-3 text-red-500" />}
                    </div>
                  );
                })}
                {subtasks.length > 3 && (
                  <div className={cn(
                    "text-[10px] pl-5",
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
                  )}>
                    +{subtasks.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tracking Checkboxes */}
          <div
            className={cn(
              "grid grid-cols-2 gap-2 mb-3 p-3 rounded-lg border",
              theme === "light" && "bg-slate-50/50 border-slate-100",
              theme === "dark" && "bg-slate-700/30 border-slate-600/50"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {trackingFields.map((key) => {
              const value = task.tracking[key] ?? false;
              return (
                <div key={key} className="flex items-center gap-2 hover:bg-white/50 p-1.5 rounded transition-colors">
                  <Checkbox
                    id={`tracking-${task.id}-${key}`}
                    checked={value}
                    onCheckedChange={(checked) => handleTrackingChange(key, checked === true)}
                    className={cn(
                      "h-5 w-5 rounded-md border-2 transition-all",
                      theme === "dark"
                        ? "border-slate-500 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                        : "border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600",
                      "hover:border-indigo-400 data-[state=checked]:shadow-md data-[state=checked]:shadow-indigo-500/30"
                    )}
                  />
                  <Label
                    htmlFor={`tracking-${task.id}-${key}`}
                    className={cn(
                      "text-[10px] cursor-pointer font-black uppercase tracking-tight truncate max-w-[120px]",
                      theme === "dark" ? "text-indigo-400" : "text-indigo-700 font-black"
                    )}
                    title={effectiveLabels[key] || key}
                  >
                    {effectiveLabels[key] || key}
                  </Label>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2 mt-auto">
            <div className="flex items-center gap-2 flex-wrap">
              {task.assignees && task.assignees.length > 0 && (
                task.assignees.map(assignee => (
                  <div key={assignee} className={cn(
                    "flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md",
                    theme === "dark" ? "bg-slate-700/50 text-slate-300" : "bg-slate-50 text-slate-500"
                  )}>
                    <User className="w-3 h-3" />
                    <span>{assignee}</span>
                  </div>
                ))
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
        </div>
      </DialogTrigger>

      <DialogContent className={cn(
        "sm:max-w-[1100px] max-h-[90vh] overflow-y-auto flex flex-col p-0 gap-0",
        theme === "dark" && "bg-slate-800 border-slate-700"
      )}>
        <div className="grid grid-cols-1 md:grid-cols-5 h-full min-h-0">

          {/* Left Column: Task Details */}
          <div className={cn(
            "md:col-span-3 p-6 overflow-y-auto border-r",
            theme === "dark" ? "border-slate-700" : "border-slate-100"
          )}>
            <DialogHeader className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className={cn("p-2 rounded-lg", currentStatusConfig.bg)}>
                  <StatusIcon className={cn("w-5 h-5", currentStatusConfig.color)} />
                </div>
                <div className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border",
                  currentStatusConfig.bg,
                  theme === "dark" ? "text-white" : currentStatusConfig.color,
                  currentStatusConfig.borderColor
                )}>
                  {currentStatusConfig.label}
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-8 text-xs font-medium gap-1.5",
                        theme === "dark" && !task.dueDate && "bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600",
                        theme === "light" && !task.dueDate && "bg-white border-slate-300 text-slate-700",
                        task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && "border-red-400 text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400",
                        task.dueDate && isToday(new Date(task.dueDate)) && "border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400",
                        task.dueDate && !isPast(new Date(task.dueDate)) && theme === "dark" && "bg-slate-700 border-slate-600 text-slate-200",
                        task.dueDate && !isPast(new Date(task.dueDate)) && theme === "light" && "bg-white border-slate-300 text-slate-700"
                      )}
                      data-testid="button-task-due-date"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      {task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : "Set due date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={task.dueDate ? new Date(task.dueDate) : undefined}
                      onSelect={(date) => onUpdate({ ...task, dueDate: date ? date.toISOString() : null })}
                      initialFocus
                    />
                    {task.dueDate && (
                      <div className="p-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => onUpdate({ ...task, dueDate: null })}
                        >
                          Clear due date
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
              <DialogTitle className={cn(
                "text-lg leading-snug",
                theme === "dark" && "text-slate-100"
              )}>{task.title}</DialogTitle>
              <DialogDescription className={cn(
                "pt-1.5 text-xs font-bold leading-relaxed",
                theme === "dark" ? "text-slate-400" : "text-slate-600"
              )}>
                {task.description}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Subtasks Section */}
              <div className="space-y-3">
                <h4 className={cn(
                  "text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2",
                  theme === "dark" ? "text-indigo-400" : "text-indigo-600"
                )}>
                  <ListTodo className={cn("w-3.5 h-3.5", theme === "dark" ? "text-indigo-400" : "text-indigo-600")} />
                  Subtasks
                  <span className={cn(
                    "font-bold",
                    theme === "dark" ? "text-slate-500" : "text-slate-400"
                  )}>
                    [{subtasks.filter(s => s.completed).length}/{subtasks.length}]
                  </span>
                </h4>
                <div className={cn(
                  "space-y-2 p-4 rounded-xl border",
                  theme === "light" && "bg-slate-50 border-slate-100",
                  theme === "dark" && "bg-slate-700/30 border-slate-600/50"
                )}>
                  {subtasks.map(subtask => {
                    const subtaskDueDate = subtask.dueDate ? new Date(subtask.dueDate) : null;
                    const isOverdue = subtaskDueDate && !subtask.completed && isPast(subtaskDueDate) && !isToday(subtaskDueDate);
                    const isDueToday = subtaskDueDate && isToday(subtaskDueDate);
                    return (
                      <div key={subtask.id} className={cn(
                        "p-2 rounded-lg transition-colors group",
                        theme === "light" && "hover:bg-white",
                        theme === "dark" && "hover:bg-slate-600/30"
                      )}>
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={subtask.completed}
                            onCheckedChange={(checked) => toggleSubtaskMutation.mutate({ id: subtask.id, data: { completed: checked === true } })}
                            className="h-5 w-5 rounded-md border-slate-300"
                            data-testid={`checkbox-subtask-${subtask.id}`}
                          />
                          <span className={cn(
                            "flex-1 text-sm font-black uppercase tracking-tight",
                            subtask.completed && theme === "dark" && "line-through text-slate-300/70",
                            subtask.completed && theme === "light" && "line-through text-slate-500/80",
                            !subtask.completed && theme === "dark" && "text-white drop-shadow-sm",
                            !subtask.completed && theme === "light" && "text-slate-900"
                          )}>
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
                        <div className="flex items-center gap-2 mt-2 ml-8">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "h-7 text-[10px] font-black uppercase tracking-tighter gap-1 transition-all",
                                  isOverdue && "border-red-400 text-red-500 bg-red-500/10 hover:bg-red-500/20",
                                  isDueToday && "border-amber-400 text-amber-500 bg-amber-500/10 hover:bg-amber-500/20",
                                  !isOverdue && !isDueToday && (theme === "dark"
                                    ? "bg-slate-700/50 border-slate-500 text-white hover:bg-slate-600 hover:border-slate-400"
                                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")
                                )}
                              >
                                <Calendar className="w-3 h-3" />
                                {subtaskDueDate ? format(subtaskDueDate, "MMM d") : "Due date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={subtaskDueDate || undefined}
                                onSelect={(date) => toggleSubtaskMutation.mutate({ id: subtask.id, data: { dueDate: date || null } as any })}
                                initialFocus
                              />
                              {subtaskDueDate && (
                                <div className="p-2 border-t">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full text-xs"
                                    onClick={() => toggleSubtaskMutation.mutate({ id: subtask.id, data: { dueDate: null } })}
                                  >
                                    Clear due date
                                  </Button>
                                </div>
                              )}
                            </PopoverContent>
                          </Popover>
                          <div className="flex gap-1.5">
                            {AVAILABLE_USERS.map(user => (
                              <button
                                key={user}
                                onClick={() => {
                                  const currentAssignees = subtask.assignees || [];
                                  const newAssignees = currentAssignees.includes(user)
                                    ? currentAssignees.filter(a => a !== user)
                                    : [...currentAssignees, user];
                                  toggleSubtaskMutation.mutate({ id: subtask.id, data: { assignees: newAssignees } });
                                }}
                                className={cn(
                                  "w-7 h-7 rounded-full text-xs font-bold border-2 transition-all shadow-sm",
                                  subtask.assignees?.includes(user)
                                    ? "bg-indigo-500 text-white border-indigo-400 shadow-indigo-500/30"
                                    : theme === "dark"
                                      ? "bg-slate-600 text-slate-200 border-slate-500 hover:border-indigo-400 hover:bg-slate-500"
                                      : "bg-slate-100 text-slate-600 border-slate-300 hover:border-indigo-400"
                                )}
                                title={user}
                              >
                                {user.charAt(0)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <form onSubmit={handleAddSubtask} className="flex gap-2 mt-3">
                    <Input
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      placeholder="Add subtask..."
                      className={cn(
                        "h-10 font-bold placeholder:text-slate-400/50",
                        theme === "dark" ? "bg-slate-900/50 text-white border-slate-600 focus:border-indigo-500" : "bg-white"
                      )}
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
                <h4 className={cn(
                  "text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2",
                  theme === "dark" ? "text-indigo-400" : "text-indigo-600"
                )}>
                  <DollarSign className={cn("w-3.5 h-3.5", theme === "dark" ? "text-indigo-400" : "text-indigo-600")} />
                  Payouts
                </h4>
                <div className={cn(
                  "space-y-3 p-4 rounded-xl border",
                  theme === "light" && "bg-slate-50 border-slate-100",
                  theme === "dark" && "bg-slate-700/30 border-slate-600/50"
                )}>
                  <div className="space-y-2">
                    <Label className={cn(
                      "text-[10px] font-black uppercase tracking-tight",
                      theme === "dark" ? "text-indigo-400" : "text-indigo-600"
                    )}>Total Amount</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={payoutTotal}
                        onChange={(e) => setPayoutTotal(e.target.value)}
                        onBlur={handleUpdatePayoutTotal}
                        placeholder="0"
                        className={cn(
                          "h-10 font-black text-lg",
                          theme === "dark" ? "bg-slate-900/50 text-white border-slate-600 placeholder:text-slate-500" : "bg-white"
                        )}
                        data-testid="input-payout-total"
                      />
                    </div>
                  </div>

                  {payoutData && payoutData.payees.length > 0 && (
                    <div className="space-y-2">
                      <Label className={cn(
                        "text-[10px] font-black uppercase tracking-tight",
                        theme === "dark" ? "text-indigo-400" : "text-indigo-600"
                      )}>Payees</Label>
                      {payoutData.payees.map(payee => (
                        <div key={payee.id} className={cn(
                          "flex flex-col gap-1 p-2 rounded-lg group",
                          theme === "light" && "bg-white",
                          theme === "dark" && "bg-slate-600/30"
                        )}>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={payee.paid}
                              onCheckedChange={(checked) => {
                                updatePayeeMutation.mutate({
                                  id: payee.id,
                                  data: { paid: checked === true }
                                });
                              }}
                              data-testid={`checkbox-payee-paid-${payee.id}`}
                            />
                            <span className={cn(
                              "flex-1 text-sm font-medium",
                              payee.paid && "line-through opacity-60",
                              theme === "dark" ? "text-slate-200" : "text-slate-700"
                            )}>{payee.name}</span>
                            <span className={cn(
                              "text-sm font-black",
                              payee.paid && "opacity-40",
                              theme === "dark" ? "text-white" : "text-slate-900"
                            )}>${payee.amount}</span>
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
                          {payee.reason && (
                            <div className={cn(
                              "text-xs pl-6",
                              payee.paid && "line-through opacity-60",
                              theme === "dark" ? "text-slate-400" : "text-slate-500"
                            )}>
                              {payee.reason}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <form onSubmit={handleAddPayee} className="space-y-2">
                    <Input
                      value={newPayeeName}
                      onChange={(e) => setNewPayeeName(e.target.value)}
                      placeholder="Payee name"
                      className={cn(
                        "h-10 font-bold",
                        theme === "dark" ? "bg-slate-900/50 text-white border-slate-600 placeholder:text-slate-500" : "bg-white border-slate-200"
                      )}
                      data-testid="input-payee-name"
                    />
                    <Input
                      value={newPayeeReason}
                      onChange={(e) => setNewPayeeReason(e.target.value)}
                      placeholder="Reason for payment"
                      className={cn(
                        "h-10 font-bold",
                        theme === "dark" ? "bg-slate-900/50 text-white border-slate-600 placeholder:text-slate-500" : "bg-white border-slate-200"
                      )}
                      data-testid="input-payee-reason"
                    />
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={newPayeeAmount}
                        onChange={(e) => setNewPayeeAmount(e.target.value)}
                        placeholder="Amount"
                        className={cn(
                          "h-10 flex-1 font-bold",
                          theme === "dark" ? "bg-slate-900/50 text-white border-slate-600 placeholder:text-slate-500" : "bg-white border-slate-200"
                        )}
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
                    <div className={cn(
                      "pt-2 border-t",
                      theme === "dark" ? "border-slate-600" : "border-slate-200"
                    )}>
                      <div className="flex justify-between items-center">
                        <span className={cn(
                          "text-sm font-medium",
                          theme === "dark" ? "text-slate-200" : "text-slate-700"
                        )}>Remaining</span>
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
                <h4 className={cn(
                  "text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2",
                  theme === "dark" ? "text-indigo-400" : "text-indigo-600"
                )}>
                  <CheckCircle2 className={cn("w-3.5 h-3.5", theme === "dark" ? "text-indigo-400" : "text-indigo-600")} />
                  Project Tracking
                </h4>
                <div className={cn(
                  "grid grid-cols-2 gap-3 p-4 rounded-xl border",
                  theme === "light" && "bg-slate-50 border-slate-100",
                  theme === "dark" && "bg-slate-700/30 border-slate-600/50"
                )}>
                  {trackingFields.map((key) => {
                    const value = task.tracking[key as keyof TaskTracking] ?? false;
                    return (
                      <div key={key} className={cn(
                        "flex items-center gap-3 p-3 rounded-lg transition-all hover:scale-[1.02]",
                        theme === "light" && "hover:bg-white hover:shadow-sm",
                        theme === "dark" && "hover:bg-slate-600/30"
                      )}>
                        <Checkbox
                          id={`modal-tracking-${task.id}-${key}`}
                          checked={value}
                          onCheckedChange={(checked) => handleTrackingChange(key as keyof TaskTracking, checked === true)}
                          className={cn(
                            "h-6 w-6 rounded-lg border-2 transition-all",
                            theme === "dark"
                              ? "border-slate-500 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                              : "border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600",
                            "hover:border-indigo-400 data-[state=checked]:shadow-md data-[state=checked]:shadow-indigo-500/30"
                          )}
                        />
                        <Label
                          htmlFor={`modal-tracking-${task.id}-${key}`}
                          className={cn(
                            "text-sm cursor-pointer font-black uppercase tracking-tight select-none",
                            theme === "dark" ? "text-white" : "text-slate-900"
                          )}
                        >
                          {effectiveLabels[key] || key}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Assignee Section */}
              <div className={cn(
                "space-y-1.5 p-4 rounded-lg border",
                theme === "light" && "bg-white border-slate-100",
                theme === "dark" && "bg-slate-700/30 border-slate-600/50"
              )}>
                <div className={cn(
                  "flex items-center gap-2 text-xs font-medium uppercase tracking-wide mb-2",
                  theme === "dark" ? "text-slate-400" : "text-slate-500"
                )}>
                  <User className="w-3.5 h-3.5" />
                  Assignees
                </div>
                <div className="space-y-2">
                  {AVAILABLE_USERS.map(user => (
                    <div key={user} className={cn(
                      "flex items-center gap-3 p-2 rounded-lg transition-colors",
                      theme === "light" && "hover:bg-slate-50",
                      theme === "dark" && "hover:bg-slate-600/30"
                    )}>
                      <Checkbox
                        id={`assignee-${task.id}-${user}`}
                        checked={task.assignees?.includes(user) || false}
                        onCheckedChange={() => handleAssigneeToggle(user)}
                        className="h-4 w-4 rounded border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                        data-testid={`checkbox-assignee-${user.toLowerCase()}`}
                      />
                      <Label
                        htmlFor={`assignee-${task.id}-${user}`}
                        className={cn(
                          "text-sm cursor-pointer font-medium select-none flex items-center gap-2",
                          theme === "dark" ? "text-slate-200" : "text-slate-700"
                        )}
                      >
                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs border border-indigo-200">
                          {user.charAt(0).toUpperCase()}
                        </div>
                        {user}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 pt-2">
                {task.tags.map(tag => (
                  <span key={tag} className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-md border",
                    theme === "light" && "bg-slate-100 text-slate-600 border-slate-200",
                    theme === "dark" && "bg-slate-700/50 text-slate-300 border-slate-600"
                  )}>
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Comments Bubble */}
          <div className={cn(
            "md:col-span-2 flex flex-col h-full max-h-[80vh]",
            theme === "light" && "bg-slate-50/50",
            theme === "dark" && "bg-slate-900/30"
          )}>
            <div className={cn(
              "p-4 border-b backdrop-blur-sm sticky top-0 z-10",
              theme === "light" && "border-slate-200/60 bg-white/50",
              theme === "dark" && "border-slate-700/50 bg-slate-800/50"
            )}>
              <h4 className={cn(
                "text-sm font-semibold flex items-center gap-2",
                theme === "dark" ? "text-slate-100" : "text-slate-900"
              )}>
                <MessageSquare className="w-4 h-4 text-indigo-500" />
                Comments
              </h4>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {comments.length === 0 ? (
                <div className={cn(
                  "h-full flex flex-col items-center justify-center p-8 text-center",
                  theme === "dark" ? "text-slate-500" : "text-slate-400"
                )}>
                  <MessageSquare className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-sm">No comments yet.<br />Start the conversation!</p>
                </div>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="flex gap-3 text-sm group">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border shrink-0 shadow-sm",
                      theme === "light" && "bg-white text-slate-500 border-slate-200",
                      theme === "dark" && "bg-slate-700 text-slate-300 border-slate-600"
                    )}>
                      {comment.author.charAt(0)}
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-baseline justify-between">
                        <span className={cn(
                          "font-semibold text-xs",
                          theme === "dark" ? "text-slate-200" : "text-slate-900"
                        )}>{comment.author}</span>
                        <span className={cn(
                          "text-[10px] font-medium",
                          theme === "dark" ? "text-slate-500" : "text-slate-400"
                        )}>{comment.timestamp}</span>
                      </div>
                      <div className={cn(
                        "p-3 rounded-tr-xl rounded-br-xl rounded-bl-xl border shadow-sm leading-relaxed",
                        theme === "light" && "bg-white border-slate-100 text-slate-600",
                        theme === "dark" && "bg-slate-700/50 border-slate-600 text-slate-300"
                      )}>
                        {comment.text}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className={cn(
              "p-4 border-t",
              theme === "light" && "bg-white border-slate-200/60",
              theme === "dark" && "bg-slate-800/50 border-slate-700/50"
            )}>
              <form onSubmit={handleAddComment} className="relative">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className={cn(
                    "pr-10 border focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 py-5",
                    theme === "light" && "bg-slate-50 border-slate-200",
                    theme === "dark" && "bg-slate-700/50 border-slate-600 text-slate-100"
                  )}
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

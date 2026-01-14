import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TaskCard } from "@/components/task-card";
import { AnimatePresence, motion } from "framer-motion";
import { format, isPast, isToday, formatDistanceToNow } from "date-fns";
import { Plus, Search, SlidersHorizontal, LogOut, Mountain, X, Settings, Trash2, ChevronUp, ChevronDown, DollarSign, MoreVertical, Edit2, Palette, Apple, Sun, Moon, CheckSquare, Layout, Calendar, ListTodo, AlertCircle, ChevronRight, ChevronDown as ChevronDownIcon, Clock, Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchTasks, updateTask, getUnreadCounts, createTask, deleteTask, fetchDashboards, createDashboard, updateDashboard, deleteDashboard, fetchColumns, createColumn, updateColumn, deleteColumn, fetchSubtasks } from "@/lib/api";
import { dbTaskToTask, taskToDbTask, type Task, type Status, statusConfig } from "@/lib/types";
import { useUser } from "@/contexts/UserContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { DndContext, DragEndEvent, useDroppable, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FlappyBird } from "@/components/flappy-bird";
import { SlotsGame } from "@/components/slots-game";

function UserAvatar() {
  const { currentUser, logout } = useUser();

  if (!currentUser) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="outline-none">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-sm cursor-pointer hover:scale-105 transition-transform">
          {currentUser.charAt(0)}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5 text-sm">
          <div className="font-medium text-slate-900">{currentUser}</div>
          <div className="text-xs text-slate-500">Team Member</div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-red-600 cursor-pointer">
          <LogOut className="w-4 h-4 mr-2" />
          Switch User
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DraggableTask({ task, unreadCount, onUpdate, onDelete, repelMode, mousePixelPosition, trackingFields, trackingLabels }: { task: Task; unreadCount: number; onUpdate: (task: Task) => void; onDelete: (taskId: number) => void; repelMode?: boolean; mousePixelPosition?: { x: number; y: number }; trackingFields?: string[]; trackingLabels?: Record<string, string> }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id.toString() });

  const [cardElement, setCardElement] = useState<HTMLDivElement | null>(null);
  const [repelTransform, setRepelTransform] = useState({ x: 0, y: 0 });

  // Calculate repel effect
  useEffect(() => {
    if (!repelMode || !mousePixelPosition || !cardElement) {
      setRepelTransform({ x: 0, y: 0 });
      return;
    }

    const rect = cardElement.getBoundingClientRect();
    const cardCenterX = rect.left + rect.width / 2;
    const cardCenterY = rect.top + rect.height / 2;

    const deltaX = cardCenterX - mousePixelPosition.x;
    const deltaY = cardCenterY - mousePixelPosition.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    const repelRadius = 300; // Distance at which repel effect starts
    if (distance < repelRadius) {
      const repelStrength = (1 - distance / repelRadius) * 150; // Max 150px repel
      const angle = Math.atan2(deltaY, deltaX);
      setRepelTransform({
        x: Math.cos(angle) * repelStrength,
        y: Math.sin(angle) * repelStrength,
      });
    } else {
      setRepelTransform({ x: 0, y: 0 });
    }
  }, [repelMode, mousePixelPosition, cardElement]);

  const dragTransform = CSS.Transform.toString(transform);

  let finalTransform = dragTransform || undefined;

  if (repelMode && !isDragging) {
    finalTransform = `translate(${repelTransform.x}px, ${repelTransform.y}px)`;
  }

  const style: React.CSSProperties = {
    transform: finalTransform,
    transition: isDragging ? transition : repelMode ? 'transform 0.05s ease-out' : 'transform 0.1s ease-out',
    opacity: isDragging ? 0.5 : 1,
    pointerEvents: repelMode ? 'none' : 'auto',
  };

  return (
    <div ref={(node) => { setNodeRef(node); setCardElement(node); }} style={style} {...attributes}>
      <TaskCard
        task={task}
        onUpdate={onUpdate}
        onDelete={onDelete}
        unreadCount={unreadCount}
        dragHandleProps={listeners}
        trackingFields={trackingFields}
        trackingLabels={trackingLabels}
      />
    </div>
  );
}

function DroppableColumn({ id, children, className, style }: { id: string; children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(className, isOver && "ring-2 ring-indigo-400 ring-offset-2")}
      style={style}
    >
      {children}
    </div>
  );
}

// Enhanced Upcoming Task Item with subtasks, dashboard name, and expandable view
interface UpcomingTaskItemProps {
  task: Task;
  dashboardName: string;
  onUpdate: (task: Task) => void;
  onDelete: (taskId: number) => void;
  unreadCount: number;
  trackingFields?: string[];
  trackingLabels?: Record<string, string>;
  animationDelay?: number;
}

function UpcomingTaskItem({
  task,
  dashboardName,
  onUpdate,
  onDelete,
  unreadCount,
  trackingFields,
  trackingLabels,
  animationDelay = 0
}: UpcomingTaskItemProps) {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch subtasks for this task
  const { data: subtasks = [] } = useQuery({
    queryKey: ["subtasks", task.id],
    queryFn: () => fetchSubtasks(task.id),
    enabled: !!task.id,
  });

  const completedSubtasks = subtasks.filter(s => s.completed).length;
  const totalSubtasks = subtasks.length;

  // Due date calculations
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate);
  const isDueToday = dueDate && isToday(dueDate);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: animationDelay }}
    >
      {/* Trigger card that opens TaskCard dialog */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogTrigger asChild>
          <div
            className={cn(
              "p-4 rounded-xl border-2 cursor-pointer transition-all hover:translate-x-1 outline-none focus-within:ring-2 focus-within:ring-indigo-500",
              theme === "dark"
                ? "bg-slate-800/80 border-slate-700/50 hover:border-indigo-500/50 hover:bg-slate-800"
                : "bg-white border-slate-100 hover:border-indigo-200 hover:shadow-lg shadow-sm"
            )}
          >
            {/* Due Date - Prominently displayed at top */}
            {dueDate && (
              <div className={cn(
                "flex items-center gap-2 text-xs font-black px-2.5 py-1.5 rounded-lg mb-3 w-fit",
                isOverdue && "bg-red-500/15 text-red-500 border border-red-500/30",
                isDueToday && "bg-amber-500/15 text-amber-500 border border-amber-500/30",
                !isOverdue && !isDueToday && (theme === "dark"
                  ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                  : "bg-indigo-50 text-indigo-600 border border-indigo-200")
              )}>
                {isOverdue && <AlertCircle className="w-3.5 h-3.5" />}
                {isDueToday && <Clock className="w-3.5 h-3.5" />}
                {!isOverdue && !isDueToday && <Calendar className="w-3.5 h-3.5" />}
                <span className="uppercase tracking-tight">
                  {isOverdue && "Overdue: "}
                  {isDueToday && "Due Today: "}
                  {format(dueDate, "EEE, MMM d")}
                </span>
                {!isDueToday && dueDate && (
                  <span className="opacity-70">
                    ({formatDistanceToNow(dueDate, { addSuffix: true })})
                  </span>
                )}
              </div>
            )}
            {!dueDate && (
              <div className={cn(
                "flex items-center gap-2 text-xs font-medium px-2.5 py-1.5 rounded-lg mb-3 w-fit",
                theme === "dark" ? "bg-slate-700/50 text-slate-400" : "bg-slate-100 text-slate-500"
              )}>
                <Calendar className="w-3.5 h-3.5" />
                <span>No due date</span>
              </div>
            )}

            {/* Task Title */}
            <div className={cn(
              "text-sm font-black leading-tight drop-shadow-sm mb-2",
              theme === "dark" ? "text-white" : "text-slate-900"
            )}>{task.title}</div>

            {/* Dashboard Name Badge */}
            <div className={cn(
              "flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-md w-fit mb-3",
              theme === "dark" ? "bg-slate-700/50 text-slate-400" : "bg-slate-100 text-slate-500"
            )}>
              <Folder className="w-3 h-3" />
              <span>{dashboardName}</span>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2 mb-3">
              <span className={cn(
                "text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest",
                theme === "dark" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : "bg-indigo-50 text-indigo-700 border border-indigo-100"
              )}>{task.status}</span>
            </div>

            {/* Subtasks Section */}
            {totalSubtasks > 0 && (
              <div className={cn(
                "p-2.5 rounded-lg border",
                theme === "dark" ? "bg-slate-700/30 border-slate-600/50" : "bg-slate-50 border-slate-100"
              )}>
                <div className={cn(
                  "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest mb-2",
                  theme === "dark" ? "text-slate-300" : "text-slate-600"
                )}>
                  <ListTodo className="w-3 h-3" />
                  <span>{completedSubtasks}/{totalSubtasks} Subtasks</span>
                </div>
                {/* Progress bar */}
                <div className={cn(
                  "h-1.5 rounded-full overflow-hidden",
                  theme === "dark" ? "bg-slate-600" : "bg-slate-200"
                )}>
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
                    style={{ width: `${totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0}%` }}
                  />
                </div>
                {/* List first 2 incomplete subtasks */}
                <div className="mt-2 space-y-1">
                  {subtasks.filter(s => !s.completed).slice(0, 2).map(subtask => (
                    <div key={subtask.id} className={cn(
                      "flex items-center gap-2 text-xs",
                      theme === "dark" ? "text-slate-300" : "text-slate-600"
                    )}>
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        theme === "dark" ? "bg-indigo-400" : "bg-indigo-500"
                      )} />
                      <span className="truncate font-medium">{subtask.title}</span>
                    </div>
                  ))}
                  {subtasks.filter(s => !s.completed).length > 2 && (
                    <div className={cn(
                      "text-[10px] pl-3.5",
                      theme === "dark" ? "text-slate-500" : "text-slate-400"
                    )}>
                      +{subtasks.filter(s => !s.completed).length - 2} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Expand indicator */}
            <div className={cn(
              "flex items-center justify-center gap-1 mt-3 text-[10px] font-medium",
              theme === "dark" ? "text-slate-500" : "text-slate-400"
            )}>
              <span>Click to expand</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>
        </DialogTrigger>

        {/* Full Task Dialog - Uses TaskCard's dialog content style */}
        <DialogContent className={cn(
          "sm:max-w-[1100px] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0",
          theme === "dark" && "bg-slate-800 border-slate-700"
        )}>
          <div className="overflow-y-auto">
            <TaskCard
              task={task}
              onUpdate={onUpdate}
              onDelete={onDelete}
              unreadCount={unreadCount}
              trackingFields={trackingFields}
              trackingLabels={trackingLabels}
            />
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

export default function Home() {
  const queryClient = useQueryClient();
  const { currentUser } = useUser();
  const { theme, toggleDarkMode } = useTheme();
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState<Status>("prospect");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [currentDashboardId, setCurrentDashboardId] = useState<number | null>(null);
  const [newDashboardName, setNewDashboardName] = useState("");
  const [showDashboardInput, setShowDashboardInput] = useState(false);
  const [editingDashboardId, setEditingDashboardId] = useState<number | null>(null);
  const [editingDashboardName, setEditingDashboardName] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState("columns");
  const [editingColumnId, setEditingColumnId] = useState<number | null>(null);
  const [editingColumnName, setEditingColumnName] = useState("");
  const [editingColumnColor, setEditingColumnColor] = useState("");
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnColor, setNewColumnColor] = useState("#f1f5f9");
  const [newTrackingField, setNewTrackingField] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [mousePixelPosition, setMousePixelPosition] = useState({ x: 0, y: 0 });
  const [repelMode, setRepelMode] = useState(false);
  const [plainLayout, setPlainLayout] = useState(() => {
    return localStorage.getItem("plainLayout") === "true";
  });

  // Set repel mode based on user-specific localStorage key
  useEffect(() => {
    if (!currentUser) return;

    const userKey = `repelMode-${currentUser}`;
    const saved = localStorage.getItem(userKey);

    if (saved !== null) {
      setRepelMode(saved === "true");
    } else {
      // Only Miles gets repel mode enabled by default
      const defaultValue = currentUser === "Miles";
      setRepelMode(defaultValue);
      localStorage.setItem(userKey, String(defaultValue));
    }
  }, [currentUser]);

  const togglePlainLayout = () => {
    const newValue = !plainLayout;
    setPlainLayout(newValue);
    localStorage.setItem("plainLayout", String(newValue));
  };

  const cycleLayoutMode = () => {
    // Cycle through: Mountain background -> Plain Light -> Plain Dark -> Mountain
    if (!plainLayout) {
      // Currently showing mountain background, switch to plain light
      setPlainLayout(true);
      if (theme === "dark") {
        toggleDarkMode(); // Switch to light
      }
    } else if (theme === "light") {
      // Currently plain light, switch to plain dark
      toggleDarkMode();
    } else {
      // Currently plain dark, switch back to mountain background
      setPlainLayout(false);
    }
  };

  const toggleRepelMode = () => {
    if (!currentUser) return;

    const newValue = !repelMode;
    setRepelMode(newValue);
    localStorage.setItem(`repelMode-${currentUser}`, String(newValue));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    })
  );

  // Mouse tracking for repel mode
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePixelPosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const { data: dbTasks = [], isLoading } = useQuery({
    queryKey: ["tasks", currentDashboardId],
    queryFn: () => fetchTasks(currentDashboardId),
    enabled: currentDashboardId !== null,
  });

  // Fetch ALL tasks across all dashboards for the sidebar "My Upcoming Tasks"
  const { data: allDbTasks = [] } = useQuery({
    queryKey: ["tasks", null],
    queryFn: () => fetchTasks(null),
  });

  const { data: unreadCounts = {} } = useQuery({
    queryKey: ["unreadCounts", currentUser],
    queryFn: () => getUnreadCounts(currentUser!),
    enabled: !!currentUser,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const tasks = dbTasks.map(dbTaskToTask);
  const allTasks = allDbTasks.map(dbTaskToTask);

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Task> }) =>
      updateTask(id, taskToDbTask(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setIsAddTaskOpen(false);
      setNewTaskTitle("");
      setNewTaskDescription("");
    },
  });

  const { data: dashboards = [] } = useQuery({
    queryKey: ["dashboards"],
    queryFn: fetchDashboards,
  });

  const currentDashboard = dashboards.find(d => d.id === currentDashboardId);

  // Set current dashboard to first one when dashboards load
  useEffect(() => {
    if (dashboards.length > 0 && currentDashboardId === null) {
      setCurrentDashboardId(dashboards[0].id);
    }
  }, [dashboards, currentDashboardId]);

  const { data: columns = [] } = useQuery({
    queryKey: ["columns", currentDashboardId],
    queryFn: () => fetchColumns(currentDashboardId!),
    enabled: currentDashboardId !== null,
  });

  const createDashboardMutation = useMutation({
    mutationFn: createDashboard,
    onSuccess: (newDashboard) => {
      queryClient.invalidateQueries({ queryKey: ["dashboards"] });
      setCurrentDashboardId(newDashboard.id);
      setNewDashboardName("");
      setShowDashboardInput(false);
    },
  });

  const updateDashboardMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: { name?: string; trackingFields?: string[]; trackingLabels?: string } }) => updateDashboard(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboards"] });
      setEditingDashboardId(null);
      setEditingDashboardName("");
    },
  });

  const deleteDashboardMutation = useMutation({
    mutationFn: deleteDashboard,
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["dashboards"] });
      const remainingDashboards = dashboards.filter(d => d.id !== deletedId);
      if (remainingDashboards.length > 0) {
        setCurrentDashboardId(remainingDashboards[0].id);
      } else {
        setCurrentDashboardId(null);
      }
    },
  });

  const createColumnMutation = useMutation({
    mutationFn: (data: { dashboardId: number; name: string; color: string; order: number }) =>
      createColumn(data.dashboardId, { name: data.name, color: data.color, order: data.order }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["columns", currentDashboardId] });
      setNewColumnName("");
      setNewColumnColor("#f1f5f9");
    },
  });

  const updateColumnMutation = useMutation({
    mutationFn: (data: { id: number; updates: { name?: string; color?: string; order?: number } }) =>
      updateColumn(data.id, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["columns", currentDashboardId] });
      setEditingColumnId(null);
      setEditingColumnName("");
      setEditingColumnColor("");
    },
  });

  const deleteColumnMutation = useMutation({
    mutationFn: deleteColumn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["columns", currentDashboardId] });
    },
  });

  const handleCreateDashboard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDashboardName.trim()) return;
    createDashboardMutation.mutate({ name: newDashboardName });
  };

  const handleRenameDashboard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDashboardName.trim() || editingDashboardId === null) return;
    updateDashboardMutation.mutate({ id: editingDashboardId, updates: { name: editingDashboardName } });
  };

  const startEditingDashboard = (id: number, name: string) => {
    setEditingDashboardId(id);
    setEditingDashboardName(name);
  };

  const handleCreateColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnName.trim() || !currentDashboardId) return;
    const nextOrder = columns.length;
    createColumnMutation.mutate({
      dashboardId: currentDashboardId,
      name: newColumnName,
      color: newColumnColor,
      order: nextOrder,
    });
  };

  const handleUpdateColumn = (id: number) => {
    if (!editingColumnName.trim()) return;
    updateColumnMutation.mutate({
      id,
      updates: { name: editingColumnName, color: editingColumnColor },
    });
  };

  const handleMoveColumn = (id: number, direction: 'up' | 'down') => {
    const currentIndex = columns.findIndex(col => col.id === id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= columns.length) return;

    const currentColumn = columns[currentIndex];
    const targetColumn = columns[targetIndex];

    // Swap the order values
    updateColumnMutation.mutate({ id: currentColumn.id, updates: { order: targetColumn.order } });
    updateColumnMutation.mutate({ id: targetColumn.id, updates: { order: currentColumn.order } });
  };

  const handleDeleteColumn = (id: number, columnName: string) => {
    const tasksInColumn = tasks.filter(t => t.status === columnName);
    if (tasksInColumn.length > 0) {
      if (!confirm(`This column has ${tasksInColumn.length} task(s). Are you sure you want to delete it? The tasks will remain but may not be visible.`)) {
        return;
      }
    }
    deleteColumnMutation.mutate(id);
  };

  const handleUpdateTask = (updatedTask: Task) => {
    updateTaskMutation.mutate({ id: updatedTask.id, data: updatedTask });
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    createTaskMutation.mutate({
      title: newTaskTitle,
      description: newTaskDescription,
      status: newTaskStatus,
      assignees: [],
      tags: [],
      tracking: JSON.stringify({}),
      dashboardId: currentDashboardId,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const taskId = parseInt(active.id.toString());
    const newStatus = over.id as string;

    // Validate that the drop target is a valid column
    const validStatuses = columns.map(col => col.name);
    if (!validStatuses.includes(newStatus)) return;

    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
      handleUpdateTask({ ...task, status: newStatus as Status });
    }

    setActiveId(null);
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        className={cn(
          "min-h-screen font-sans transition-colors duration-500 relative isolate",
          theme === "light" && !plainLayout && "bg-slate-50 text-slate-900",
          theme === "light" && plainLayout && "bg-white text-slate-900",
          theme === "dark" && plainLayout && "bg-slate-950 text-slate-100",
          theme === "dark" && !plainLayout && "bg-transparent text-slate-100"
        )}
      >
        {/* Background Image (only when not in plain layout) */}
        {!plainLayout && (
          <div className="fixed inset-0 -z-10 pointer-events-none">
            <div
              className="w-full h-full bg-cover bg-center"
              style={{
                backgroundImage: 'url(/dark-bg-default.png)'
              }}
            />
            <div className={cn(
              "absolute inset-0",
              theme === "dark" && "bg-gradient-to-b from-slate-900/5 via-slate-900/10 to-slate-900/15",
              theme === "light" && "bg-gradient-to-b from-white/60 via-white/70 to-white/75"
            )}></div>
          </div>
        )}
        {/* Header */}
        {/* Header */}
        <header className={cn(
          "sticky top-0 z-30 backdrop-blur-xl border-b px-6 py-3 transition-all",
          theme === "light" && "bg-white/90 border-slate-200/60 shadow-sm",
          theme === "dark" && "bg-slate-900/90 border-slate-700/50 shadow-md"
        )}>
          <div className="max-w-[1800px] mx-auto flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={cn(
                "transition-transform active:scale-95",
                theme === "dark" ? "text-indigo-400 hover:bg-slate-800" : "text-indigo-600 hover:bg-slate-100"
              )}
            >
              <Layout className="w-5 h-5" />
            </Button>
            {/* Project List */}
            <div className="flex items-center gap-1 flex-1 overflow-x-auto no-scrollbar py-1">
              <div className="flex items-center gap-2 mr-4 text-slate-400 dark:text-slate-500 font-semibold text-xs tracking-wider uppercase pl-1">
                <Layout className="w-3.5 h-3.5" />
                <span>Projects</span>
              </div>
              {dashboards.map(dashboard => (
                editingDashboardId === dashboard.id ? (
                  <form key={dashboard.id} onSubmit={handleRenameDashboard} className="flex items-center gap-2">
                    <Input
                      value={editingDashboardName}
                      onChange={(e) => setEditingDashboardName(e.target.value)}
                      className="h-8 w-32"
                      autoFocus
                      onBlur={() => {
                        if (editingDashboardName.trim()) {
                          handleRenameDashboard(new Event('submit') as any);
                        } else {
                          setEditingDashboardId(null);
                          setEditingDashboardName("");
                        }
                      }}
                    />
                  </form>
                ) : (
                  <div
                    key={dashboard.id}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-all group relative flex items-center gap-1 cursor-pointer whitespace-nowrap",
                      currentDashboardId === dashboard.id
                        ? theme === "dark"
                          ? "bg-slate-800 text-white shadow-sm"
                          : "bg-slate-100 text-slate-900 shadow-sm"
                        : theme === "dark"
                          ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/50"
                    )}
                    onClick={() => setCurrentDashboardId(dashboard.id)}
                  >
                    <span>{dashboard.name}</span>
                    {currentDashboardId === dashboard.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            className="inline-flex items-center justify-center w-5 h-5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <MoreVertical className="w-3 h-3" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); startEditingDashboard(dashboard.id, dashboard.name); }}>
                            <Edit2 className="w-4 h-4 mr-2" /> Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); setIsSettingsOpen(true); setActiveSettingsTab("tracking"); }}>
                            <CheckSquare className="w-4 h-4 mr-2" /> Tracking Fields
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e: Event) => e.preventDefault()} className="text-red-600 focus:text-red-600">
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Dashboard?</AlertDialogTitle>
                                <AlertDialogDescription>Are you sure? All tasks and columns in "{dashboard.name}" will be permanently deleted.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteDashboardMutation.mutate(dashboard.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                )
              ))}

              {showDashboardInput ? (
                <form onSubmit={handleCreateDashboard} className="flex items-center gap-2">
                  <Input
                    value={newDashboardName}
                    onChange={(e) => setNewDashboardName(e.target.value)}
                    placeholder="New..."
                    className="h-8 w-24"
                    autoFocus
                  />
                </form>
              ) : (
                <button
                  onClick={() => setShowDashboardInput(true)}
                  className={cn(
                    "p-1.5 rounded-lg transition-all",
                    theme === "dark" ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600"
                  )}
                  title="New Dashboard"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 ml-auto">
              <Link href="/pending-payouts">
                <button
                  className={cn(
                    "p-2 rounded-lg transition-all flex items-center gap-2 text-sm font-medium",
                    theme === "dark" ? "text-slate-400 hover:bg-slate-800 hover:text-slate-200" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  )}
                  title="Payouts"
                >
                  <DollarSign className="w-4 h-4" />
                  <span className="hidden lg:inline">Payouts</span>
                </button>
              </Link>

              <button
                onClick={cycleLayoutMode}
                className={cn(
                  "p-2 rounded-lg transition-all flex items-center gap-2 text-sm font-medium",
                  theme === "dark" ? "text-slate-400 hover:bg-slate-800 hover:text-slate-200" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                )}
                title="Change Layout"
              >
                {!plainLayout ? <Mountain className="w-4 h-4" /> : theme === "light" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span className="hidden lg:inline font-bold">Layout</span>
              </button>

              <button
                onClick={() => {
                  setIsSettingsOpen(true);
                  setActiveSettingsTab("columns");
                }}
                className={cn(
                  "p-2 rounded-lg transition-all flex items-center gap-2 text-sm font-medium",
                  theme === "dark" ? "text-indigo-400 hover:bg-slate-800" : "text-indigo-600 hover:bg-slate-100"
                )}
                title="Settings"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden lg:inline font-bold">Settings</span>
              </button>

              <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
              <UserAvatar />
            </div>
          </div>
        </header>


        {/* Board */}
        <div className="flex flex-1 h-[calc(100vh-57px)] overflow-hidden">
          {/* Sidebar */}
          <AnimatePresence mode="popLayout">
            {isSidebarOpen && (
              <motion.aside
                initial={{ x: -320, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -320, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={cn(
                  "w-80 border-r flex flex-col transition-colors z-10 shadow-xl",
                  theme === "dark" ? "bg-slate-900/60 backdrop-blur-md border-slate-700/50" : "bg-white border-slate-200/60"
                )}
              >
                <div className="p-6 border-b flex items-center justify-between">
                  <h2 className={cn(
                    "text-sm font-black flex items-center gap-2 tracking-tight uppercase",
                    theme === "dark" ? "text-indigo-400" : "text-indigo-600"
                  )}>
                    <CheckSquare className="w-4 h-4" />
                    My Upcoming Tasks
                  </h2>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {allTasks.filter(t => t.assignees.includes(currentUser || "") && t.status !== "complete").sort((a, b) => {
                    // Sort by due date first (null dates last), then by title
                    if (!a.dueDate && !b.dueDate) return a.title.localeCompare(b.title);
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                  }).map((task, idx) => {
                    // Find the dashboard name for this task
                    const taskDashboard = dashboards.find(d => d.id === task.dashboardId);
                    const dashboardName = taskDashboard?.name || "Unknown Project";

                    return (
                      <UpcomingTaskItem
                        key={task.id}
                        task={task}
                        dashboardName={dashboardName}
                        onUpdate={handleUpdateTask}
                        onDelete={(taskId) => deleteTaskMutation.mutate(taskId)}
                        unreadCount={unreadCounts[task.id] || 0}
                        trackingFields={taskDashboard?.trackingFields}
                        trackingLabels={taskDashboard?.trackingLabels ? JSON.parse(taskDashboard.trackingLabels) : undefined}
                        animationDelay={idx * 0.05}
                      />
                    );
                  })}
                  {allTasks.filter(t => t.assignees.includes(currentUser || "") && t.status !== "complete").length === 0 && (
                    <div className="text-center py-12 px-6">
                      <div className="text-slate-400 text-xs font-medium bg-slate-400/10 py-4 rounded-xl border-2 border-dashed border-slate-400/20">
                        No upcoming tasks assigned to you.
                      </div>
                    </div>
                  )}
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Board */}
          <main className="flex-1 overflow-x-auto p-6 scrollbar-hide">
            <div className="flex gap-6 min-w-max h-full">
              {columns.map((column) => {
                // Use column name directly, fallback to statusConfig for icon only
                const columnTasks = tasks.filter(t => t.status === column.name);
                const defaultConfig = statusConfig[column.name as Status];
                const Icon = defaultConfig?.icon || SlidersHorizontal;

                return (
                  <div
                    key={column.id}
                    className="w-80 flex flex-col h-full"
                  >
                    {/* Column Header */}
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex items-center justify-between mb-4 p-4 rounded-xl border-2 transition-all shadow-md group",
                        theme === "light" && "bg-white border-slate-200 shadow-slate-200/50",
                        theme === "dark" && "bg-slate-800/90 border-slate-700/80 shadow-black/40"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg shadow-sm")} style={{ backgroundColor: column.color }}>
                          <Icon className={cn("w-5 h-5", defaultConfig?.color || "text-slate-600")} />
                        </div>
                        <h2 className={cn(
                          "font-black text-sm uppercase tracking-wider",
                          theme === "dark" ? "text-white" : "text-slate-800"
                        )}>{column.name}</h2>
                        <span className={cn(
                          "text-xs font-bold px-2 py-0.5 rounded-full border",
                          theme === "dark" ? "bg-slate-700/50 text-slate-300 border-slate-600/50" : "bg-slate-100 text-slate-600 border-slate-200"
                        )}>
                          {columnTasks.length}
                        </span>
                      </div>
                    </motion.div>

                    {/* Column Content */}
                    <DroppableColumn
                      id={column.name}
                      className={cn(
                        "flex-1 rounded-xl p-3 border flex flex-col gap-3 min-h-[500px] transition-all relative overflow-y-auto max-h-[calc(100vh-250px)]",
                        // Light theme
                        theme === "light" && "bg-slate-50/80 border-slate-200/80 shadow-inner",
                        // Dark theme
                        theme === "dark" && "bg-slate-900/30 backdrop-blur-sm border-slate-700/70 shadow-inner"
                      )}
                      style={{ backgroundColor: theme === "light" ? column.color + "10" : undefined }}
                      data-testid={`column-${column.name}`}
                    >
                      <SortableContext items={columnTasks.map(t => t.id.toString())} strategy={verticalListSortingStrategy}>
                        <AnimatePresence mode="popLayout">
                          {columnTasks.map((task) => (
                            <DraggableTask
                              key={task.id}
                              task={task}
                              onUpdate={handleUpdateTask}
                              onDelete={(taskId) => deleteTaskMutation.mutate(taskId)}
                              unreadCount={unreadCounts[task.id] || 0}
                              repelMode={repelMode}
                              mousePixelPosition={mousePixelPosition}
                              trackingFields={currentDashboard?.trackingFields}
                              trackingLabels={currentDashboard?.trackingLabels ? (typeof currentDashboard.trackingLabels === 'string' ? JSON.parse(currentDashboard.trackingLabels) : currentDashboard.trackingLabels) : undefined}
                            />
                          ))}
                        </AnimatePresence>
                      </SortableContext>

                      {columnTasks.length === 0 && (
                        <div className={cn(
                          "flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-xl mx-2 my-4 transition-all",
                          theme === "dark" ? "text-slate-500 border-slate-700/50 bg-slate-800/20" : "text-slate-400 border-slate-200 bg-slate-100/30"
                        )}>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em]">Add first task</p>
                        </div>
                      )}

                      <Dialog open={isAddTaskOpen && newTaskStatus === column.name} onOpenChange={(open) => {
                        if (!open) setIsAddTaskOpen(false);
                      }}>
                        <DialogTrigger asChild>
                          <button
                            onClick={() => {
                              setNewTaskStatus(column.name as Status);
                              setIsAddTaskOpen(true);
                            }}
                            className={cn(
                              "mt-2 flex items-center justify-center gap-2 py-3 w-full rounded-xl transition-all shadow-lg active:scale-95 group border-2 border-dashed",
                              theme === "dark"
                                ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/30 hover:border-indigo-500"
                                : "bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100 hover:border-indigo-300"
                            )}
                            data-testid={`button-add-task-${column.name}`}
                          >
                            <div className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Plus className="w-4 h-4" />
                            </div>
                            <span className="font-bold tracking-tight">Add New Task</span>
                          </button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                          <DialogHeader>
                            <DialogTitle>Create New Task</DialogTitle>
                            <DialogDescription>
                              Add a new task to {column.name}
                            </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleCreateTask} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="title">Title</Label>
                              <Input
                                id="title"
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                placeholder="Enter task title..."
                                data-testid="input-task-title"
                                autoFocus
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="description">Description</Label>
                              <Textarea
                                id="description"
                                value={newTaskDescription}
                                onChange={(e) => setNewTaskDescription(e.target.value)}
                                placeholder="Enter task description..."
                                rows={4}
                                data-testid="input-task-description"
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAddTaskOpen(false)}
                                data-testid="button-cancel-task"
                              >
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                disabled={!newTaskTitle.trim()}
                                data-testid="button-create-task"
                              >
                                Create Task
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </DroppableColumn>
                  </div>
                );
              })}
            </div>
          </main>

          {/* Combined Settings Dialog */}
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-black uppercase tracking-tight">Dashboard Settings</DialogTitle>
                <DialogDescription className="font-medium">
                  Customize workflow columns and tracking fields for <span className="text-indigo-500 font-bold">{currentDashboard?.name}</span>
                </DialogDescription>
              </DialogHeader>

              <Tabs value={activeSettingsTab} onValueChange={setActiveSettingsTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="columns" className="font-bold">Workflow Columns</TabsTrigger>
                  <TabsTrigger value="tracking" className="font-bold">Tracking Fields</TabsTrigger>
                </TabsList>

                <TabsContent value="columns" className="space-y-4">
                  <div className="space-y-3">
                    {columns.map((column, index) => (
                      <div key={column.id} className={cn(
                        "flex items-center gap-2 p-3 rounded-xl border-2 transition-all",
                        theme === "dark" ? "bg-slate-800/50 border-slate-700/50" : "bg-slate-50 border-slate-200"
                      )}>
                        {editingColumnId === column.id ? (
                          <>
                            <Input
                              value={editingColumnName}
                              onChange={(e) => setEditingColumnName(e.target.value)}
                              className="h-9 flex-1 font-bold"
                              placeholder="Column name"
                            />
                            <Input
                              type="color"
                              value={editingColumnColor}
                              onChange={(e) => setEditingColumnColor(e.target.value)}
                              className="h-9 w-20 p-1"
                            />
                            <Button
                              size="sm"
                              onClick={() => handleUpdateColumn(column.id)}
                              className="font-bold"
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingColumnId(null);
                                setEditingColumnName("");
                                setEditingColumnColor("");
                              }}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <div
                              className="w-8 h-8 rounded-lg shadow-sm"
                              style={{ backgroundColor: column.color }}
                            />
                            <span className="flex-1 font-black uppercase text-xs tracking-wider">{column.name}</span>
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-slate-500"
                                onClick={() => handleMoveColumn(column.id, 'up')}
                                disabled={index === 0}
                              >
                                <ChevronUp className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-slate-500"
                                onClick={() => handleMoveColumn(column.id, 'down')}
                                disabled={index === columns.length - 1}
                              >
                                <ChevronDown className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-indigo-500 hover:bg-indigo-50"
                                onClick={() => {
                                  setEditingColumnId(column.id);
                                  setEditingColumnName(column.name);
                                  setEditingColumnColor(column.color);
                                }}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => handleDeleteColumn(column.id, column.name)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleCreateColumn} className={cn(
                    "flex items-center gap-2 p-4 rounded-xl border-2 border-dashed transition-all",
                    theme === "dark" ? "bg-slate-900/50 border-slate-700" : "bg-slate-100 border-slate-300"
                  )}>
                    <Input
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      className="h-10 flex-1 bg-white font-bold"
                      placeholder="New column name..."
                    />
                    <Input
                      type="color"
                      value={newColumnColor}
                      onChange={(e) => setNewColumnColor(e.target.value)}
                      className="h-10 w-20 p-1 bg-white"
                    />
                    <Button
                      type="submit"
                      disabled={!newColumnName.trim()}
                      className="font-black uppercase tracking-tighter"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Column
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="tracking" className="space-y-4">
                  <div className="space-y-3">
                    {currentDashboard?.trackingFields?.map((key) => {
                      const trackingLabels = currentDashboard?.trackingLabels ?
                        (typeof currentDashboard.trackingLabels === 'string' ? JSON.parse(currentDashboard.trackingLabels) : currentDashboard.trackingLabels) : {};
                      const customLabel = trackingLabels[key] || key;
                      return (
                        <div key={key} className={cn(
                          "flex items-center gap-3 p-4 rounded-xl border-2 transition-all group",
                          theme === "dark" ? "bg-slate-800/50 border-slate-700/50" : "bg-white border-slate-200"
                        )}>
                          <div className="flex-1 flex items-center gap-3">
                            <div className="w-6 h-6 rounded-md bg-indigo-500/10 flex items-center justify-center">
                              <CheckSquare className="w-4 h-4 text-indigo-500" />
                            </div>
                            <Input
                              value={customLabel}
                              onChange={(e) => {
                                if (!currentDashboard) return;
                                const currentLabels = currentDashboard.trackingLabels ?
                                  (typeof currentDashboard.trackingLabels === 'string' ? JSON.parse(currentDashboard.trackingLabels) : currentDashboard.trackingLabels) : {};
                                const newLabels = { ...currentLabels, [key]: e.target.value };
                                updateDashboardMutation.mutate({ id: currentDashboard.id, updates: { trackingLabels: JSON.stringify(newLabels) } });
                              }}
                              placeholder={key}
                              className="flex-1 h-9 bg-transparent border-none focus-visible:ring-0 font-bold text-sm"
                            />
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              if (!currentDashboard) return;
                              const newFields = (currentDashboard.trackingFields || []).filter(f => f !== key);
                              updateDashboardMutation.mutate({ id: currentDashboard.id, updates: { trackingFields: newFields } });
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}

                    <div className={cn(
                      "flex items-center gap-2 p-4 rounded-xl border-2 border-dashed transition-all",
                      theme === "dark" ? "bg-slate-900/50 border-slate-700" : "bg-slate-100 border-slate-300"
                    )}>
                      <Input
                        value={newTrackingField}
                        onChange={(e) => setNewTrackingField(e.target.value)}
                        placeholder="New checkbox label (e.g. 'Delivered')"
                        className="flex-1 h-10 bg-white font-bold"
                      />
                      <Button
                        disabled={!newTrackingField.trim()}
                        onClick={() => {
                          if (!currentDashboard) return;
                          const cleanKey = newTrackingField.toLowerCase().replace(/\s+/g, '_');
                          const newFields = [...(currentDashboard.trackingFields || []), cleanKey];
                          const currentLabels = currentDashboard.trackingLabels ?
                            (typeof currentDashboard.trackingLabels === 'string' ? JSON.parse(currentDashboard.trackingLabels) : currentDashboard.trackingLabels) : {};
                          const newLabels = { ...currentLabels, [cleanKey]: newTrackingField };

                          updateDashboardMutation.mutate({
                            id: currentDashboard.id,
                            updates: {
                              trackingFields: newFields,
                              trackingLabels: JSON.stringify(newLabels)
                            }
                          });
                          setNewTrackingField("");
                        }}
                        className="font-black uppercase tracking-tighter"
                      >
                        <Plus className="w-4 h-4 mr-1" /> Add Field
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>

        {/* Mini-Games */}
        <FlappyBird />
        <SlotsGame />
      </div >
    </DndContext >
  );
}

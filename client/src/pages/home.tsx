import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TaskCard } from "@/components/task-card";
import { Plus, Search, SlidersHorizontal, LogOut, Sparkles, Moon, Sun, X, Settings, Trash2, ChevronUp, ChevronDown, DollarSign } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { fetchTasks, updateTask, getUnreadCounts, createTask, fetchDashboards, createDashboard, updateDashboard, deleteDashboard, fetchColumns, createColumn, updateColumn, deleteColumn } from "@/lib/api";
import { dbTaskToTask, taskToDbTask, type Task, type Status, statusConfig } from "@/lib/types";
import { useUser } from "@/contexts/UserContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useState, useMemo } from "react";
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

function DraggableTask({ task, unreadCount, onUpdate }: { task: Task; unreadCount: number; onUpdate: (task: Task) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <TaskCard 
        task={task} 
        onUpdate={onUpdate}
        unreadCount={unreadCount}
        dragHandleProps={listeners}
      />
    </div>
  );
}

function DroppableColumn({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div 
      ref={setNodeRef} 
      className={cn(className, isOver && "ring-2 ring-indigo-400 ring-offset-2")}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const queryClient = useQueryClient();
  const { currentUser } = useUser();
  const { theme, toggleGlassmorphism, toggleDarkMode } = useTheme();
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
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false);
  const [editingColumnId, setEditingColumnId] = useState<number | null>(null);
  const [editingColumnName, setEditingColumnName] = useState("");
  const [editingColumnColor, setEditingColumnColor] = useState("");
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnColor, setNewColumnColor] = useState("#f1f5f9");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    })
  );

  const { data: dbTasks = [], isLoading } = useQuery({
    queryKey: ["tasks", currentDashboardId],
    queryFn: () => fetchTasks(currentDashboardId),
    enabled: currentDashboardId !== null,
  });

  const { data: unreadCounts = {} } = useQuery({
    queryKey: ["unreadCounts", currentUser],
    queryFn: () => getUnreadCounts(currentUser!),
    enabled: !!currentUser,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const tasks = dbTasks.map(dbTaskToTask);

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Task> }) =>
      updateTask(id, taskToDbTask(data)),
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

  // Set current dashboard to first one when dashboards load
  if (dashboards.length > 0 && currentDashboardId === null) {
    setCurrentDashboardId(dashboards[0].id);
  }

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
    mutationFn: ({ id, name }: { id: number; name: string }) => updateDashboard(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboards"] });
      setEditingDashboardId(null);
      setEditingDashboardName("");
    },
  });

  const deleteDashboardMutation = useMutation({
    mutationFn: deleteDashboard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboards"] });
      if (dashboards.length > 0) {
        setCurrentDashboardId(dashboards[0].id);
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
    updateDashboardMutation.mutate({ id: editingDashboardId, name: editingDashboardName });
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
      deliveredTracking: false,
      invoicedTracking: false,
      paidTracking: false,
      distributedTracking: false,
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
      <div className={cn(
        "min-h-screen font-sans transition-colors duration-500 relative overflow-hidden",
        theme === "light" && "bg-slate-50/50 text-slate-900",
        theme === "glassmorphism" && "text-slate-900",
        theme === "dark" && "bg-transparent text-slate-100"
      )}>
        {/* Animated Gradient Background for Glassmorphism */}
        {theme === "glassmorphism" && (
          <div className="fixed inset-0 -z-10 overflow-hidden">
            <div className="absolute top-0 -left-20 w-96 h-96 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
            <div className="absolute top-0 -right-20 w-96 h-96 bg-gradient-to-br from-cyan-400 to-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-20 left-1/3 w-96 h-96 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
          </div>
        )}

        {/* Dark Mode Background */}
        {theme === "dark" && (
          <div key="dark-bg" className="fixed inset-0 -z-10">
            <div 
              className="w-full h-full bg-cover bg-center"
              style={{ backgroundImage: 'url(/dark-bg.jpg)' }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/10 via-slate-900/20 to-slate-900/30"></div>
          </div>
        )}
        {/* Header */}
        <header className={cn(
          "sticky top-0 z-10 backdrop-blur-md border-b px-6 py-4 transition-all",
          theme === "light" && "bg-white/80 border-slate-200/60",
          theme === "glassmorphism" && "bg-white/20 border-white/20 shadow-lg",
          theme === "dark" && "bg-slate-900/80 border-slate-700/50"
        )}>
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo and title removed per user request */}
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <div className="hidden md:flex items-center px-3 py-1.5 bg-slate-100/50 border border-slate-200/60 rounded-full text-sm text-slate-500 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/50 transition-all">
              <Search className="w-4 h-4 mr-2" />
              <input 
                type="text" 
                placeholder="Search tasks..." 
                className="bg-transparent border-none outline-none placeholder:text-slate-400 w-48"
              />
            </div>
            <Link href="/pending-payouts">
              <button 
                className={cn(
                  "p-2 rounded-full transition-all hover:bg-slate-100",
                  theme === "dark" ? "text-slate-400 hover:bg-slate-800" : "text-slate-500"
                )}
                title="Pending Payouts"
                data-testid="button-pending-payouts"
              >
                <DollarSign className="w-5 h-5" />
              </button>
            </Link>
            <button 
              onClick={toggleGlassmorphism}
              className={cn(
                "p-2 rounded-full transition-all",
                theme === "glassmorphism" 
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg" 
                  : "hover:bg-slate-100 text-slate-500"
              )}
              title="Toggle Glassmorphism"
              data-testid="button-glassmorphism"
            >
              <Sparkles className="w-5 h-5" />
            </button>
            <button 
              onClick={toggleDarkMode}
              className={cn(
                "p-2 rounded-full transition-all",
                theme === "dark" 
                  ? "bg-slate-800 text-amber-400 shadow-lg" 
                  : "hover:bg-slate-100 text-slate-500"
              )}
              title="Toggle Dark Mode"
              data-testid="button-dark-mode"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => setIsColumnSettingsOpen(true)}
              className={cn(
                "p-2 rounded-full transition-all hover:bg-slate-100",
                theme === "dark" ? "text-slate-400 hover:bg-slate-800" : "text-slate-500"
              )}
              title="Manage Columns"
              data-testid="button-column-settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <UserAvatar />
          </div>
        </div>
      </header>

      {/* Dashboard Tabs */}
      <div className={cn(
        "border-b px-6 py-2",
        theme === "light" && "border-slate-200/60 bg-white/50",
        theme === "glassmorphism" && "border-white/20 bg-white/10 backdrop-blur-md",
        theme === "dark" && "border-slate-700/50 bg-slate-900/50"
      )}>
        <div className="max-w-[1800px] mx-auto flex items-center gap-2">
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
                  data-testid={`input-rename-dashboard-${dashboard.id}`}
                />
              </form>
            ) : (
              <div
                key={dashboard.id}
                className={cn(
                  "px-4 py-2 rounded-t-lg text-sm font-medium transition-all group relative flex items-center gap-1 cursor-pointer",
                  currentDashboardId === dashboard.id
                    ? theme === "dark"
                      ? "bg-slate-800 text-white"
                      : "bg-white text-slate-900 shadow-sm"
                    : theme === "dark"
                      ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/50"
                )}
                onClick={() => setCurrentDashboardId(dashboard.id)}
                onDoubleClick={() => startEditingDashboard(dashboard.id, dashboard.name)}
                data-testid={`tab-dashboard-${dashboard.id}`}
              >
                <span className="flex-1">{dashboard.name}</span>
                {currentDashboardId === dashboard.id && dashboards.length > 1 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center justify-center w-4 h-4 rounded-sm opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700 transition-opacity"
                        data-testid={`button-delete-dashboard-${dashboard.id}`}
                        title="Delete dashboard"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Dashboard?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{dashboard.name}"? All tasks and columns in this dashboard will be permanently deleted. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel data-testid="button-cancel-delete-dashboard">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteDashboardMutation.mutate(dashboard.id)}
                          className="bg-red-600 hover:bg-red-700"
                          data-testid="button-confirm-delete-dashboard"
                        >
                          Delete Dashboard
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            )
          ))}
          {showDashboardInput ? (
            <form onSubmit={handleCreateDashboard} className="flex items-center gap-2">
              <Input
                value={newDashboardName}
                onChange={(e) => setNewDashboardName(e.target.value)}
                placeholder="Dashboard name"
                className="h-8 w-40"
                autoFocus
                data-testid="input-new-dashboard"
              />
              <Button type="submit" size="sm" className="h-8" data-testid="button-create-dashboard">
                Add
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={() => {
                  setShowDashboardInput(false);
                  setNewDashboardName("");
                }}
              >
                Cancel
              </Button>
            </form>
          ) : (
            <button
              onClick={() => setShowDashboardInput(true)}
              className={cn(
                "px-3 py-2 rounded-t-lg text-sm font-medium transition-all",
                theme === "dark"
                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
              )}
              data-testid="button-add-dashboard"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Board */}
      <main className="max-w-[1800px] mx-auto p-6 overflow-x-auto">
        <div className="flex gap-6 min-w-[1200px]">
          {columns.map((column) => {
            // Use column name directly, fallback to statusConfig for icon only
            const columnTasks = tasks.filter(t => t.status === column.name);
            const defaultConfig = statusConfig[column.name as Status];
            const Icon = defaultConfig?.icon || SlidersHorizontal;
            
            return (
              <div key={column.id} className="flex-1 min-w-[300px] flex flex-col h-full">
                {/* Column Header */}
                <div className="flex items-center justify-between mb-4 px-1">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded-md")} style={{ backgroundColor: column.color }}>
                      <Icon className={cn("w-4 h-4", defaultConfig?.color || "text-slate-600")} />
                    </div>
                    <h2 className={cn(
                      "font-semibold text-sm capitalize",
                      theme === "dark" ? "text-slate-200" : "text-slate-700"
                    )}>{column.name}</h2>
                    <span className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full",
                      theme === "dark" ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-500"
                    )}>
                      {columnTasks.length}
                    </span>
                  </div>
                </div>

                {/* Column Content */}
                <DroppableColumn
                  id={column.name}
                  className={cn(
                    "flex-1 rounded-xl p-3 border flex flex-col gap-3 min-h-[500px] transition-all",
                    // Light theme
                    theme === "light" && "bg-slate-100/50 border-slate-200/60",
                    // Glassmorphism theme
                    theme === "glassmorphism" && "bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl",
                    // Dark theme
                    theme === "dark" && "bg-slate-800/30 backdrop-blur-md border-slate-700/50"
                  )}
                  style={{ backgroundColor: theme === "light" ? column.color + "20" : undefined }}
                  data-testid={`column-${column.name}`}
                >
                  <SortableContext items={columnTasks.map(t => t.id.toString())} strategy={verticalListSortingStrategy}>
                    <AnimatePresence mode="popLayout">
                      {columnTasks.map((task) => (
                        <DraggableTask
                          key={task.id} 
                          task={task} 
                          onUpdate={handleUpdateTask}
                          unreadCount={unreadCounts[task.id] || 0}
                        />
                      ))}
                    </AnimatePresence>
                  </SortableContext>
                  
                  {columnTasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-32 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg mx-2 my-4">
                      <p className="text-xs font-medium">No tasks</p>
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
                        className="mt-auto flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-white/50 rounded-lg transition-all border border-transparent hover:border-slate-200/50 group"
                        data-testid={`button-add-task-${column.name}`}
                      >
                        <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        Add Task
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

      {/* Column Settings Dialog */}
      <Dialog open={isColumnSettingsOpen} onOpenChange={setIsColumnSettingsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Workflow Columns</DialogTitle>
            <DialogDescription>
              Add, edit, delete, and reorder columns for this dashboard
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 my-4">
            {columns.map((column, index) => (
              <div key={column.id} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                {editingColumnId === column.id ? (
                  <>
                    <Input
                      value={editingColumnName}
                      onChange={(e) => setEditingColumnName(e.target.value)}
                      className="h-9 flex-1"
                      placeholder="Column name"
                      data-testid={`input-column-name-${column.id}`}
                    />
                    <Input
                      type="color"
                      value={editingColumnColor}
                      onChange={(e) => setEditingColumnColor(e.target.value)}
                      className="h-9 w-20"
                      data-testid={`input-column-color-${column.id}`}
                    />
                    <Button
                      size="sm"
                      onClick={() => handleUpdateColumn(column.id)}
                      data-testid={`button-save-column-${column.id}`}
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
                      data-testid={`button-cancel-column-${column.id}`}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <div
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: column.color }}
                    />
                    <span className="flex-1 font-medium capitalize">{column.name}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleMoveColumn(column.id, 'up')}
                        disabled={index === 0}
                        data-testid={`button-move-up-${column.id}`}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleMoveColumn(column.id, 'down')}
                        disabled={index === columns.length - 1}
                        data-testid={`button-move-down-${column.id}`}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditingColumnId(column.id);
                          setEditingColumnName(column.name);
                          setEditingColumnColor(column.color);
                        }}
                        data-testid={`button-edit-column-${column.id}`}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteColumn(column.id, column.name)}
                        data-testid={`button-delete-column-${column.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleCreateColumn} className="flex items-center gap-2 p-3 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300">
            <Input
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              className="h-9 flex-1 bg-white"
              placeholder="New column name"
              data-testid="input-new-column-name"
            />
            <Input
              type="color"
              value={newColumnColor}
              onChange={(e) => setNewColumnColor(e.target.value)}
              className="h-9 w-20 bg-white"
              data-testid="input-new-column-color"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!newColumnName.trim()}
              data-testid="button-create-column"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Column
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    </DndContext>
  );
}

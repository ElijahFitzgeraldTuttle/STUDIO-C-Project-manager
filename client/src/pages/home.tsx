import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TaskCard } from "@/components/task-card";
import { Plus, Search, SlidersHorizontal, LogOut } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { fetchTasks, updateTask, getUnreadCounts, createTask } from "@/lib/api";
import { dbTaskToTask, taskToDbTask, type Task, type Status, statusConfig } from "@/lib/types";
import { useUser } from "@/contexts/UserContext";
import { useState } from "react";
import { DndContext, DragEndEvent, useDroppable } from "@dnd-kit/core";
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
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard 
        task={task} 
        onUpdate={onUpdate}
        unreadCount={unreadCount}
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
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState<Status>("prospect");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: dbTasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: fetchTasks,
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
      assignee: null,
      tags: [],
      deliveredTracking: false,
      invoicedTracking: false,
      paidTracking: false,
      distributedTracking: false,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const taskId = parseInt(active.id.toString());
    const newStatus = over.id as string;
    
    // Validate that the drop target is a valid status column
    const validStatuses: Status[] = ["prospect", "scheduled", "in-progress", "complete"];
    if (!validStatuses.includes(newStatus as Status)) return;
    
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
      handleUpdateTask({ ...task, status: newStatus as Status });
    }
    
    setActiveId(null);
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const columns: Status[] = ["prospect", "scheduled", "in-progress", "complete"];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-slate-50/50 font-sans text-slate-900">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-indigo-200 shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 font-heading">Project Flow</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center px-3 py-1.5 bg-slate-100/50 border border-slate-200/60 rounded-full text-sm text-slate-500 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/50 transition-all">
              <Search className="w-4 h-4 mr-2" />
              <input 
                type="text" 
                placeholder="Search tasks..." 
                className="bg-transparent border-none outline-none placeholder:text-slate-400 w-48"
              />
            </div>
            <button className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
              <SlidersHorizontal className="w-5 h-5" />
            </button>
            <UserAvatar />
          </div>
        </div>
      </header>

      {/* Board */}
      <main className="max-w-7xl mx-auto p-6 overflow-x-auto">
        <div className="flex gap-6 min-w-[1000px]">
          {columns.map((status) => {
            const config = statusConfig[status];
            const columnTasks = tasks.filter(t => t.status === status);
            
            return (
              <div key={status} className="flex-1 min-w-[300px] flex flex-col h-full">
                {/* Column Header */}
                <div className="flex items-center justify-between mb-4 px-1">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded-md", config.bg)}>
                      <config.icon className={cn("w-4 h-4", config.color)} />
                    </div>
                    <h2 className="font-semibold text-slate-700 text-sm">{config.label}</h2>
                    <span className="bg-slate-100 text-slate-500 text-xs font-medium px-2 py-0.5 rounded-full">
                      {columnTasks.length}
                    </span>
                  </div>
                  <button className="p-1 hover:bg-slate-200/50 rounded-md text-slate-400 hover:text-slate-600 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Column Content */}
                <DroppableColumn
                  id={status}
                  className={cn(
                    "flex-1 bg-slate-100/50 rounded-xl p-3 border border-slate-200/60 flex flex-col gap-3 min-h-[500px] transition-all",
                    status === 'prospect' && "bg-slate-50/80",
                    status === 'scheduled' && "bg-amber-50/30",
                    status === 'in-progress' && "bg-blue-50/30",
                    status === 'complete' && "bg-emerald-50/30"
                  )}
                  data-testid={`column-${status}`}
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
                  
                  <Dialog open={isAddTaskOpen && newTaskStatus === status} onOpenChange={(open) => {
                    if (!open) setIsAddTaskOpen(false);
                  }}>
                    <DialogTrigger asChild>
                      <button 
                        onClick={() => {
                          setNewTaskStatus(status);
                          setIsAddTaskOpen(true);
                        }}
                        className="mt-auto flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-white/50 rounded-lg transition-all border border-transparent hover:border-slate-200/50 group"
                        data-testid={`button-add-task-${status}`}
                      >
                        <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        Add Task
                      </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Create New Task</DialogTitle>
                        <DialogDescription>
                          Add a new task to {config.label}
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
    </div>
    </DndContext>
  );
}

import { useState } from "react";
import { Task, initialTasks, statusConfig, Status } from "@/lib/mock-data";
import { TaskCard } from "@/components/task-card";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  const columns: Status[] = ["todo", "in-progress", "done"];

  return (
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
            <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-medium text-sm">
              JD
            </div>
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
                <div className={cn(
                  "flex-1 bg-slate-100/50 rounded-xl p-3 border border-slate-200/60 flex flex-col gap-3 min-h-[500px]",
                  // Add distinct background tint per column for better visual separation
                  status === 'todo' && "bg-slate-50/80",
                  status === 'in-progress' && "bg-blue-50/30",
                  status === 'done' && "bg-emerald-50/30"
                )}>
                  <AnimatePresence mode="popLayout">
                    {columnTasks.map((task) => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        onUpdate={handleUpdateTask} 
                      />
                    ))}
                  </AnimatePresence>
                  
                  {columnTasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-32 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg mx-2 my-4">
                      <p className="text-xs font-medium">No tasks</p>
                    </div>
                  )}
                  
                  <button className="mt-auto flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-white/50 rounded-lg transition-all border border-transparent hover:border-slate-200/50 group">
                    <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    Add Task
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

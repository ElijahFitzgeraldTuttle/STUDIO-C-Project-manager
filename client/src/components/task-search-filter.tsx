import { useState } from "react";
import { Search, X, Filter, SortAsc, SortDesc } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import type { Task, PriorityLevel } from "@/lib/types";

export type SortField = "title" | "dueDate" | "priority" | "createdAt";
export type SortDirection = "asc" | "desc";

export interface FilterOptions {
    searchQuery: string;
    assignees: string[];
    priorities: PriorityLevel[];
    showArchived: boolean;
}

export interface SortOptions {
    field: SortField;
    direction: SortDirection;
}

interface TaskSearchFilterProps {
    filters: FilterOptions;
    sort: SortOptions;
    onFiltersChange: (filters: FilterOptions) => void;
    onSortChange: (sort: SortOptions) => void;
    availableAssignees: string[];
    taskCount: number;
    filteredCount: number;
}

const PRIORITY_OPTIONS: PriorityLevel[] = ["urgent", "high", "medium", "low"];

export function TaskSearchFilter({
    filters,
    sort,
    onFiltersChange,
    onSortChange,
    availableAssignees,
    taskCount,
    filteredCount,
}: TaskSearchFilterProps) {
    const { theme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);

    const hasActiveFilters =
        filters.searchQuery.length > 0 ||
        filters.assignees.length > 0 ||
        filters.priorities.length > 0 ||
        filters.showArchived;

    const clearFilters = () => {
        onFiltersChange({
            searchQuery: "",
            assignees: [],
            priorities: [],
            showArchived: false,
        });
    };

    const toggleAssignee = (assignee: string) => {
        const newAssignees = filters.assignees.includes(assignee)
            ? filters.assignees.filter(a => a !== assignee)
            : [...filters.assignees, assignee];
        onFiltersChange({ ...filters, assignees: newAssignees });
    };

    const togglePriority = (priority: PriorityLevel) => {
        const newPriorities = filters.priorities.includes(priority)
            ? filters.priorities.filter(p => p !== priority)
            : [...filters.priorities, priority];
        onFiltersChange({ ...filters, priorities: newPriorities });
    };

    const toggleSort = (field: SortField) => {
        if (sort.field === field) {
            onSortChange({ field, direction: sort.direction === "asc" ? "desc" : "asc" });
        } else {
            onSortChange({ field, direction: "asc" });
        }
    };

    return (
        <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1 max-w-xs">
                <Search className={cn(
                    "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4",
                    theme === "dark" ? "text-slate-500" : "text-slate-400"
                )} />
                <Input
                    value={filters.searchQuery}
                    onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
                    placeholder="Search tasks..."
                    className={cn(
                        "pl-9 h-9",
                        theme === "dark"
                            ? "bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                            : "bg-white"
                    )}
                />
                {filters.searchQuery && (
                    <button
                        onClick={() => onFiltersChange({ ...filters, searchQuery: "" })}
                        className={cn(
                            "absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors",
                            theme === "dark" ? "hover:bg-slate-700" : "hover:bg-slate-100"
                        )}
                    >
                        <X className="w-3 h-3" />
                    </button>
                )}
            </div>

            {/* Filter Dropdown */}
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                            "gap-1.5 h-9",
                            hasActiveFilters && "border-indigo-500 text-indigo-600",
                            theme === "dark" && "bg-slate-800/50 border-slate-700 hover:bg-slate-700"
                        )}
                    >
                        <Filter className="w-4 h-4" />
                        Filters
                        {hasActiveFilters && (
                            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-indigo-500 text-white rounded-full">
                                {filters.assignees.length + filters.priorities.length + (filters.showArchived ? 1 : 0)}
                            </span>
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className={cn(
                    "w-56",
                    theme === "dark" && "bg-slate-800 border-slate-700"
                )}>
                    <DropdownMenuLabel>Filter by Assignee</DropdownMenuLabel>
                    {availableAssignees.map(assignee => (
                        <DropdownMenuCheckboxItem
                            key={assignee}
                            checked={filters.assignees.includes(assignee)}
                            onCheckedChange={() => toggleAssignee(assignee)}
                        >
                            {assignee}
                        </DropdownMenuCheckboxItem>
                    ))}

                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Filter by Priority</DropdownMenuLabel>
                    {PRIORITY_OPTIONS.map(priority => (
                        <DropdownMenuCheckboxItem
                            key={priority}
                            checked={filters.priorities.includes(priority)}
                            onCheckedChange={() => togglePriority(priority)}
                        >
                            <span className="capitalize">{priority}</span>
                        </DropdownMenuCheckboxItem>
                    ))}

                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                        checked={filters.showArchived}
                        onCheckedChange={(checked) => onFiltersChange({ ...filters, showArchived: checked })}
                    >
                        Show Archived
                    </DropdownMenuCheckboxItem>

                    {hasActiveFilters && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={clearFilters} className="text-red-500">
                                <X className="w-4 h-4 mr-2" />
                                Clear All Filters
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort Dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                            "gap-1.5 h-9",
                            theme === "dark" && "bg-slate-800/50 border-slate-700 hover:bg-slate-700"
                        )}
                    >
                        {sort.direction === "asc" ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                        Sort
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className={cn(
                    "w-48",
                    theme === "dark" && "bg-slate-800 border-slate-700"
                )}>
                    <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => toggleSort("title")}>
                        Title {sort.field === "title" && (sort.direction === "asc" ? "↑" : "↓")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleSort("dueDate")}>
                        Due Date {sort.field === "dueDate" && (sort.direction === "asc" ? "↑" : "↓")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleSort("priority")}>
                        Priority {sort.field === "priority" && (sort.direction === "asc" ? "↑" : "↓")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleSort("createdAt")}>
                        Created {sort.field === "createdAt" && (sort.direction === "asc" ? "↑" : "↓")}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Result Count */}
            {(hasActiveFilters || filters.searchQuery) && (
                <span className={cn(
                    "text-xs font-medium",
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
                )}>
                    {filteredCount} of {taskCount} tasks
                </span>
            )}
        </div>
    );
}

// Helper function to apply filters and sort to tasks
export function filterAndSortTasks(
    tasks: Task[],
    filters: FilterOptions,
    sort: SortOptions
): Task[] {
    let result = [...tasks];

    // Apply search filter
    if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        result = result.filter(task =>
            task.title.toLowerCase().includes(query) ||
            task.description.toLowerCase().includes(query)
        );
    }

    // Apply assignee filter
    if (filters.assignees.length > 0) {
        result = result.filter(task =>
            task.assignees.some(a => filters.assignees.includes(a))
        );
    }

    // Apply priority filter
    if (filters.priorities.length > 0) {
        result = result.filter(task =>
            filters.priorities.includes(task.priority as PriorityLevel)
        );
    }

    // Apply archived filter
    if (!filters.showArchived) {
        result = result.filter(task => !task.archived);
    }

    // Apply sorting
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };

    result.sort((a, b) => {
        let comparison = 0;

        switch (sort.field) {
            case "title":
                comparison = a.title.localeCompare(b.title);
                break;
            case "dueDate":
                if (!a.dueDate && !b.dueDate) comparison = 0;
                else if (!a.dueDate) comparison = 1;
                else if (!b.dueDate) comparison = -1;
                else comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                break;
            case "priority":
                comparison = (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) -
                    (priorityOrder[b.priority as keyof typeof priorityOrder] || 2);
                break;
            case "createdAt":
                comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
                break;
        }

        return sort.direction === "asc" ? comparison : -comparison;
    });

    return result;
}

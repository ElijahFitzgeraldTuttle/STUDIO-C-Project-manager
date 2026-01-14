import { User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserAvatar() {
    const { currentUser, logout } = useUser();
    const { theme } = useTheme();

    if (!currentUser) return null;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="outline-none">
                <div className={cn(
                    "w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 border-2 shadow-md flex items-center justify-center text-white font-bold text-sm cursor-pointer hover:scale-105 transition-transform",
                    theme === "dark" ? "border-slate-700" : "border-white"
                )}>
                    {currentUser.charAt(0)}
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={cn(
                "w-48",
                theme === "dark" && "bg-slate-800 border-slate-700"
            )}>
                <div className="px-2 py-1.5 text-sm">
                    <div className={cn(
                        "font-medium",
                        theme === "dark" ? "text-slate-100" : "text-slate-900"
                    )}>{currentUser}</div>
                    <div className={cn(
                        "text-xs",
                        theme === "dark" ? "text-slate-400" : "text-slate-500"
                    )}>Team Member</div>
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

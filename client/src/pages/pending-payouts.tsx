import { useQuery } from "@tanstack/react-query";
import { fetchUnpaidPayouts } from "../lib/api";
import { ArrowLeft, DollarSign } from "lucide-react";
import { Link } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

export default function PendingPayouts() {
  const { theme } = useTheme();
  const { data: unpaidPayouts, isLoading } = useQuery({
    queryKey: ["unpaid-payouts"],
    queryFn: fetchUnpaidPayouts,
  });

  if (isLoading) {
    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center font-sans transition-colors duration-500 relative overflow-hidden",
        theme === "light" && "bg-slate-50/50 text-slate-900",
        theme === "glassmorphism" && "text-slate-900",
        theme === "dark" && "bg-transparent text-slate-100"
      )}>
        {/* Animated Gradient Background for Glassmorphism */}
        {theme === "glassmorphism" && (
          <div className="fixed inset-0 -z-10 overflow-hidden bg-slate-900">
            <div className="w-full h-full">
              <div className="absolute top-0 -left-40 w-[600px] h-[600px] bg-gradient-to-br from-blue-600 to-purple-700 rounded-full mix-blend-normal filter blur-3xl opacity-60 animate-blob"></div>
              <div className="absolute top-0 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-purple-600 to-blue-800 rounded-full mix-blend-normal filter blur-3xl opacity-60 animate-blob animation-delay-2000"></div>
              <div className="absolute -bottom-40 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-indigo-700 to-purple-800 rounded-full mix-blend-normal filter blur-3xl opacity-60 animate-blob animation-delay-4000"></div>
              <div className="absolute bottom-1/3 -right-20 w-[500px] h-[500px] bg-gradient-to-br from-blue-700 to-indigo-900 rounded-full mix-blend-normal filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-br from-purple-700 to-blue-900 rounded-full mix-blend-normal filter blur-3xl opacity-40 animate-blob"></div>
            </div>
          </div>
        )}

        {/* Dark Mode Background */}
        {theme === "dark" && (
          <div key="dark-bg" className="fixed inset-0 -z-10">
            <div 
              className="w-full h-full bg-cover bg-center"
              style={{ backgroundImage: 'url(/dark-bg-default.png)' }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/10 via-slate-900/20 to-slate-900/30"></div>
          </div>
        )}
        <div className="text-lg">Loading pending payouts...</div>
      </div>
    );
  }

  const totalAllPayees = unpaidPayouts?.reduce((sum, payee) => sum + payee.totalUnpaid, 0) || 0;

  return (
    <div className={cn(
      "min-h-screen p-8 font-sans transition-colors duration-500 relative overflow-hidden",
      theme === "light" && "bg-slate-50/50 text-slate-900",
      theme === "glassmorphism" && "text-slate-900",
      theme === "dark" && "bg-transparent text-slate-100"
    )}>
      {/* Animated Gradient Background for Glassmorphism */}
      {theme === "glassmorphism" && (
        <div className="fixed inset-0 -z-10 overflow-hidden bg-slate-900">
          <div className="w-full h-full">
            <div className="absolute top-0 -left-40 w-[600px] h-[600px] bg-gradient-to-br from-blue-600 to-purple-700 rounded-full mix-blend-normal filter blur-3xl opacity-60 animate-blob"></div>
            <div className="absolute top-0 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-purple-600 to-blue-800 rounded-full mix-blend-normal filter blur-3xl opacity-60 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-40 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-indigo-700 to-purple-800 rounded-full mix-blend-normal filter blur-3xl opacity-60 animate-blob animation-delay-4000"></div>
            <div className="absolute bottom-1/3 -right-20 w-[500px] h-[500px] bg-gradient-to-br from-blue-700 to-indigo-900 rounded-full mix-blend-normal filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-br from-purple-700 to-blue-900 rounded-full mix-blend-normal filter blur-3xl opacity-40 animate-blob"></div>
          </div>
        </div>
      )}

      {/* Dark Mode Background */}
      {theme === "dark" && (
        <div key="dark-bg" className="fixed inset-0 -z-10">
          <div 
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: 'url(/dark-bg-default.png)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/10 via-slate-900/20 to-slate-900/30"></div>
        </div>
      )}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" data-testid="link-back-home">
            <button
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                theme === "light" && "hover:bg-slate-100 text-slate-700",
                theme === "glassmorphism" && "bg-white/40 backdrop-blur-sm hover:bg-white/60 border border-white/30",
                theme === "dark" && "hover:bg-slate-800/50 text-slate-300"
              )}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </Link>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Pending Payouts</h1>
        </div>

        {unpaidPayouts && unpaidPayouts.length > 0 ? (
          <>
            <div className={cn(
              "mb-6 p-6 rounded-lg border",
              theme === "light" && "bg-blue-50 border-blue-200",
              theme === "glassmorphism" && "bg-white/40 backdrop-blur-md border-white/30 shadow-lg",
              theme === "dark" && "bg-blue-900/20 border-blue-800/50"
            )}>
              <div className="flex items-center gap-3">
                <DollarSign className={cn(
                  "w-6 h-6",
                  theme === "dark" ? "text-blue-400" : "text-blue-600"
                )} />
                <div>
                  <div className={cn(
                    "text-sm",
                    theme === "light" && "text-gray-600",
                    theme === "glassmorphism" && "text-slate-700",
                    theme === "dark" && "text-gray-400"
                  )}>Total Unpaid Across All Payees</div>
                  <div className={cn(
                    "text-2xl font-bold",
                    theme === "dark" ? "text-blue-400" : "text-blue-600"
                  )} data-testid="text-total-unpaid">
                    ${totalAllPayees.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {unpaidPayouts.map((payeeGroup) => (
                <div
                  key={payeeGroup.name}
                  className={cn(
                    "rounded-lg border overflow-hidden",
                    theme === "light" && "bg-white border-slate-200",
                    theme === "glassmorphism" && "bg-white/40 backdrop-blur-md border-white/30 shadow-lg",
                    theme === "dark" && "bg-slate-800/50 border-slate-700/50"
                  )}
                  data-testid={`card-payee-${payeeGroup.name}`}
                >
                  <div className={cn(
                    "px-6 py-4 border-b",
                    theme === "light" && "bg-slate-50 border-slate-200",
                    theme === "glassmorphism" && "bg-white/30 border-white/20",
                    theme === "dark" && "bg-slate-900/50 border-slate-700/50"
                  )}>
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold" data-testid={`text-payee-name-${payeeGroup.name}`}>
                        {payeeGroup.name}
                      </h2>
                      <div className={cn(
                        "text-lg font-bold",
                        theme === "dark" ? "text-red-400" : "text-red-600"
                      )} data-testid={`text-payee-total-${payeeGroup.name}`}>
                        ${payeeGroup.totalUnpaid.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className={cn(
                    "divide-y",
                    theme === "light" && "divide-slate-200",
                    theme === "glassmorphism" && "divide-white/20",
                    theme === "dark" && "divide-slate-700/50"
                  )}>
                    {payeeGroup.tasks.map((task) => (
                      <div
                        key={`${task.taskId}-${task.reason}`}
                        className={cn(
                          "px-6 py-4 transition-colors",
                          theme === "light" && "hover:bg-slate-50",
                          theme === "glassmorphism" && "hover:bg-white/30",
                          theme === "dark" && "hover:bg-slate-900/30"
                        )}
                        data-testid={`row-task-${task.taskId}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="font-medium mb-1" data-testid={`text-task-title-${task.taskId}`}>
                              {task.taskTitle}
                            </div>
                            <div className={cn(
                              "text-sm",
                              theme === "light" && "text-gray-600",
                              theme === "glassmorphism" && "text-slate-700",
                              theme === "dark" && "text-gray-400"
                            )} data-testid={`text-task-reason-${task.taskId}`}>
                              {task.reason}
                            </div>
                          </div>
                          <div className="font-semibold" data-testid={`text-task-amount-${task.taskId}`}>
                            ${task.amount.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div className={cn(
              "text-lg",
              theme === "light" && "text-gray-500",
              theme === "glassmorphism" && "text-slate-600",
              theme === "dark" && "text-gray-400"
            )} data-testid="text-no-pending">
              No pending payouts
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

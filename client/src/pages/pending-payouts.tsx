import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchUnpaidPayouts, fetchReceivables, createReceivable, updateReceivable, deleteReceivable } from "../lib/api";
import { ArrowLeft, DollarSign, Plus, Trash2, Check, Receipt } from "lucide-react";
import { Link } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { Receivable } from "@shared/schema";

export default function PendingPayouts() {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [plainLayout] = useState(() => {
    return localStorage.getItem("plainLayout") === "true";
  });

  const [newClientName, setNewClientName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: unpaidPayouts, isLoading: payoutsLoading } = useQuery({
    queryKey: ["unpaid-payouts"],
    queryFn: fetchUnpaidPayouts,
  });

  const { data: receivables, isLoading: receivablesLoading } = useQuery({
    queryKey: ["receivables"],
    queryFn: fetchReceivables,
  });

  const createReceivableMutation = useMutation({
    mutationFn: createReceivable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
      setNewClientName("");
      setNewDescription("");
      setNewAmount("");
      setShowAddForm(false);
    },
  });

  const updateReceivableMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Receivable> }) =>
      updateReceivable(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
    },
  });

  const deleteReceivableMutation = useMutation({
    mutationFn: deleteReceivable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
    },
  });

  const handleAddReceivable = () => {
    const amount = parseInt(newAmount) || 0;
    if (newClientName.trim() && amount > 0) {
      createReceivableMutation.mutate({
        clientName: newClientName.trim(),
        description: newDescription.trim(),
        amount,
      });
    }
  };

  const isLoading = payoutsLoading || receivablesLoading;

  if (isLoading) {
    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center font-sans transition-colors duration-500 relative",
        theme === "light" && !plainLayout && "bg-slate-50 text-slate-900",
        theme === "light" && plainLayout && "bg-white text-slate-900",
        theme === "dark" && plainLayout && "bg-slate-950 text-slate-100",
        theme === "dark" && !plainLayout && "bg-transparent text-slate-100"
      )}>
        {!plainLayout && (
          <div className="fixed inset-0 -z-10 pointer-events-none">
            <div
              className="w-full h-full bg-cover bg-center"
              style={{ backgroundImage: 'url(/dark-bg-default.png)' }}
            />
            <div className={cn(
              "absolute inset-0",
              theme === "dark" && "bg-gradient-to-b from-slate-900/5 via-slate-900/10 to-slate-900/15",
              theme === "light" && "bg-gradient-to-b from-white/60 via-white/70 to-white/75"
            )}></div>
          </div>
        )}
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const totalAllPayees = unpaidPayouts?.reduce((sum, payee) => sum + payee.totalUnpaid, 0) || 0;
  const pendingReceivables = receivables?.filter(r => !r.received) || [];
  const totalReceivables = pendingReceivables.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className={cn(
      "min-h-screen p-8 font-sans transition-colors duration-500 relative isolate",
      theme === "light" && !plainLayout && "bg-slate-50 text-slate-900",
      theme === "light" && plainLayout && "bg-white text-slate-900",
      theme === "dark" && plainLayout && "bg-slate-950 text-slate-100",
      theme === "dark" && !plainLayout && "bg-transparent text-slate-100"
    )}>
      {!plainLayout && (
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <div
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: 'url(/dark-bg-default.png)' }}
          />
          <div className={cn(
            "absolute inset-0",
            theme === "dark" && "bg-gradient-to-b from-slate-900/5 via-slate-900/10 to-slate-900/15",
            theme === "light" && "bg-gradient-to-b from-white/60 via-white/70 to-white/75"
          )}></div>
        </div>
      )}
      <div className={cn(
        "max-w-6xl mx-auto p-6 rounded-2xl",
        !plainLayout && "bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 shadow-2xl"
      )}>
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" data-testid="link-back-home">
            <button
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-bold",
                theme === "light" && "hover:bg-slate-100 text-slate-700",
                theme === "dark" && "bg-slate-800/70 hover:bg-slate-700 text-white"
              )}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </Link>
          <h1 className={cn(
            "text-3xl font-black uppercase tracking-tight drop-shadow-lg",
            theme === "dark" ? "text-white" : "text-slate-900"
          )} data-testid="text-page-title">Pending Payouts</h1>
        </div>

        {/* Receivables Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className={cn(
              "text-xl font-black uppercase tracking-tight flex items-center gap-3 drop-shadow-md",
              theme === "dark" ? "text-green-400" : "text-green-700"
            )} data-testid="text-receivables-header">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Receipt className="w-5 h-5" />
              </div>
              Receivables (Waiting on Clients)
            </h2>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                theme === "light" && "bg-green-100 hover:bg-green-200 text-green-700",
                theme === "dark" && "bg-green-900/70 hover:bg-green-900/90 text-green-300"
              )}
              data-testid="button-add-receivable"
            >
              <Plus className="w-4 h-4" />
              Add Receivable
            </button>
          </div>

          {showAddForm && (
            <div className={cn(
              "mb-6 p-4 rounded-lg border",
              theme === "light" && "bg-white border-slate-200",
              theme === "dark" && "bg-slate-800/90 border-slate-700/50"
            )}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Client Name"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className={cn(
                    "px-4 py-3 rounded-xl border-2 outline-none font-bold transition-all",
                    theme === "light" && "bg-white border-slate-200 focus:border-green-500 text-slate-900 placeholder:text-slate-400",
                    theme === "dark" && "bg-slate-900/50 border-slate-600 focus:border-green-400 text-white placeholder:text-slate-500"
                  )}
                  data-testid="input-client-name"
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className={cn(
                    "px-4 py-3 rounded-xl border-2 outline-none font-bold transition-all",
                    theme === "light" && "bg-white border-slate-200 focus:border-green-500 text-slate-900 placeholder:text-slate-400",
                    theme === "dark" && "bg-slate-900/50 border-slate-600 focus:border-green-400 text-white placeholder:text-slate-500"
                  )}
                  data-testid="input-description"
                />
                <input
                  type="number"
                  placeholder="Amount ($)"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className={cn(
                    "px-4 py-3 rounded-xl border-2 outline-none font-black text-lg transition-all",
                    theme === "light" && "bg-white border-slate-200 focus:border-green-500 text-slate-900 placeholder:text-slate-400",
                    theme === "dark" && "bg-slate-900/50 border-slate-600 focus:border-green-400 text-white placeholder:text-slate-500"
                  )}
                  data-testid="input-amount"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddReceivable}
                  disabled={!newClientName.trim() || !newAmount}
                  className={cn(
                    "px-4 py-2 rounded-lg transition-colors",
                    theme === "light" && "bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-300",
                    theme === "dark" && "bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-600"
                  )}
                  data-testid="button-save-receivable"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className={cn(
                    "px-4 py-2 rounded-lg transition-colors",
                    theme === "light" && "bg-gray-200 hover:bg-gray-300 text-gray-700",
                    theme === "dark" && "bg-slate-700 hover:bg-slate-600 text-gray-300"
                  )}
                  data-testid="button-cancel-receivable"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {pendingReceivables.length > 0 && (
            <div className={cn(
              "mb-6 p-6 rounded-lg border",
              theme === "light" && "bg-green-50 border-green-200",
              theme === "dark" && "bg-green-900/70 border-green-800/50"
            )}>
              <div className="flex items-center gap-3">
                <DollarSign className={cn(
                  "w-6 h-6",
                  theme === "dark" ? "text-green-400" : "text-green-600"
                )} />
                <div>
                  <div className={cn(
                    "text-[10px] font-black uppercase tracking-[0.15em]",
                    theme === "light" && "text-green-600/70",
                    theme === "dark" && "text-green-300/70"
                  )}>Total Pending Receivables</div>
                  <div className={cn(
                    "text-3xl font-black",
                    theme === "dark" ? "text-white" : "text-green-800"
                  )} data-testid="text-total-receivables">
                    ${totalReceivables.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {pendingReceivables.length > 0 ? (
            <div className={cn(
              "rounded-lg border overflow-hidden",
              theme === "light" && "bg-white border-slate-200",
              theme === "dark" && "bg-slate-800/90 border-slate-700/50"
            )}>
              <div className={cn(
                "divide-y",
                theme === "light" && "divide-slate-200",
                theme === "dark" && "divide-slate-700/50"
              )}>
                {pendingReceivables.map((receivable) => (
                  <div
                    key={receivable.id}
                    className={cn(
                      "px-6 py-4 flex items-center justify-between gap-4 transition-colors",
                      theme === "light" && "hover:bg-slate-50",
                      theme === "dark" && "hover:bg-slate-900/50"
                    )}
                    data-testid={`row-receivable-${receivable.id}`}
                  >
                    <div className="flex-1">
                      <div className={cn(
                        "font-black text-base uppercase tracking-tight",
                        theme === "dark" ? "text-white" : "text-slate-900"
                      )} data-testid={`text-receivable-client-${receivable.id}`}>
                        {receivable.clientName}
                      </div>
                      {receivable.description && (
                        <div className={cn(
                          "text-sm font-bold",
                          theme === "light" && "text-slate-600",
                          theme === "dark" && "text-slate-400"
                        )} data-testid={`text-receivable-desc-${receivable.id}`}>
                          {receivable.description}
                        </div>
                      )}
                    </div>
                    <div className={cn(
                      "font-black text-xl",
                      theme === "dark" ? "text-green-400" : "text-green-700"
                    )} data-testid={`text-receivable-amount-${receivable.id}`}>
                      ${receivable.amount.toLocaleString()}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateReceivableMutation.mutate({ id: receivable.id, data: { received: true } })}
                        className={cn(
                          "p-2 rounded-lg transition-colors",
                          theme === "light" && "bg-green-100 hover:bg-green-200 text-green-700",
                          theme === "dark" && "bg-green-900/50 hover:bg-green-900/70 text-green-400"
                        )}
                        title="Mark as received"
                        data-testid={`button-mark-received-${receivable.id}`}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteReceivableMutation.mutate(receivable.id)}
                        className={cn(
                          "p-2 rounded-lg transition-colors",
                          theme === "light" && "bg-red-100 hover:bg-red-200 text-red-700",
                          theme === "dark" && "bg-red-900/50 hover:bg-red-900/70 text-red-400"
                        )}
                        title="Delete"
                        data-testid={`button-delete-receivable-${receivable.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className={cn(
              "text-center py-8 rounded-xl border-2",
              theme === "light" && "bg-white/90 border-slate-200 text-slate-600",
              theme === "dark" && "bg-slate-800 border-slate-600 text-slate-300"
            )} data-testid="text-no-receivables">
              <span className="font-bold">No pending receivables</span>
            </div>
          )}
        </div>

        {/* Payouts Section */}
        <div>
          <h2 className={cn(
            "text-xl font-black uppercase tracking-tight mb-4 flex items-center gap-3 drop-shadow-md",
            theme === "dark" ? "text-blue-400" : "text-blue-700"
          )} data-testid="text-payouts-header">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
            Payouts (Owed to Payees)
          </h2>

          {unpaidPayouts && unpaidPayouts.length > 0 ? (
            <>
              <div className={cn(
                "mb-6 p-6 rounded-lg border",
                theme === "light" && "bg-blue-50 border-blue-200",
                theme === "dark" && "bg-blue-900/70 border-blue-800/50"
              )}>
                <div className="flex items-center gap-3">
                  <DollarSign className={cn(
                    "w-6 h-6",
                    theme === "dark" ? "text-blue-400" : "text-blue-600"
                  )} />
                  <div>
                    <div className={cn(
                      "text-[10px] font-black uppercase tracking-[0.15em]",
                      theme === "light" && "text-blue-600/70",
                      theme === "dark" && "text-blue-300/70"
                    )}>Total Unpaid Across All Payees</div>
                    <div className={cn(
                      "text-3xl font-black",
                      theme === "dark" ? "text-white" : "text-blue-800"
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
                      theme === "dark" && "bg-slate-800/90 border-slate-700/50"
                    )}
                    data-testid={`card-payee-${payeeGroup.name}`}
                  >
                    <div className={cn(
                      "px-6 py-4 border-b",
                      theme === "light" && "bg-slate-50 border-slate-200",
                      theme === "dark" && "bg-slate-900/80 border-slate-700/50"
                    )}>
                      <div className="flex items-center justify-between">
                        <h2 className={cn(
                          "text-lg font-black uppercase tracking-tight",
                          theme === "dark" ? "text-white" : "text-slate-900"
                        )} data-testid={`text-payee-name-${payeeGroup.name}`}>
                          {payeeGroup.name}
                        </h2>
                        <div className={cn(
                          "text-xl font-black",
                          theme === "dark" ? "text-red-400" : "text-red-700"
                        )} data-testid={`text-payee-total-${payeeGroup.name}`}>
                          ${payeeGroup.totalUnpaid.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className={cn(
                      "divide-y",
                      theme === "light" && "divide-slate-200",
                      theme === "dark" && "divide-slate-700/50"
                    )}>
                      {payeeGroup.tasks.map((task) => (
                        <div
                          key={`${task.taskId}-${task.reason}`}
                          className={cn(
                            "px-6 py-4 transition-colors",
                            theme === "light" && "hover:bg-slate-50",
                            theme === "dark" && "hover:bg-slate-900/50"
                          )}
                          data-testid={`row-task-${task.taskId}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className={cn(
                                "font-black uppercase tracking-tight mb-1",
                                theme === "dark" ? "text-white" : "text-slate-900"
                              )} data-testid={`text-task-title-${task.taskId}`}>
                                {task.taskTitle}
                              </div>
                              <div className={cn(
                                "text-sm font-bold",
                                theme === "light" && "text-slate-600",
                                theme === "dark" && "text-slate-400"
                              )} data-testid={`text-task-reason-${task.taskId}`}>
                                {task.reason}
                              </div>
                            </div>
                            <div className={cn(
                              "font-black text-lg",
                              theme === "dark" ? "text-indigo-400" : "text-indigo-700"
                            )} data-testid={`text-task-amount-${task.taskId}`}>
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
            <div className={cn(
              "text-center py-8 rounded-xl border-2",
              theme === "light" && "bg-white/90 border-slate-200 text-slate-600",
              theme === "dark" && "bg-slate-800 border-slate-600 text-slate-300"
            )} data-testid="text-no-pending">
              <span className="font-bold">No pending payouts</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

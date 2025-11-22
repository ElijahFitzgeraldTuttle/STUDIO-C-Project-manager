import { useQuery } from "@tanstack/react-query";
import { fetchUnpaidPayouts } from "../lib/api";
import { ArrowLeft, DollarSign } from "lucide-react";
import { Link } from "wouter";

export default function PendingPayouts() {
  const { data: unpaidPayouts, isLoading } = useQuery({
    queryKey: ["unpaid-payouts"],
    queryFn: fetchUnpaidPayouts,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading pending payouts...</div>
      </div>
    );
  }

  const totalAllPayees = unpaidPayouts?.reduce((sum, payee) => sum + payee.totalUnpaid, 0) || 0;

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" data-testid="link-back-home">
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
            <div className="mb-6 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Unpaid Across All Payees</div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-total-unpaid">
                    ${totalAllPayees.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {unpaidPayouts.map((payeeGroup) => (
                <div
                  key={payeeGroup.name}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                  data-testid={`card-payee-${payeeGroup.name}`}
                >
                  <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold" data-testid={`text-payee-name-${payeeGroup.name}`}>
                        {payeeGroup.name}
                      </h2>
                      <div className="text-lg font-bold text-red-600 dark:text-red-400" data-testid={`text-payee-total-${payeeGroup.name}`}>
                        ${payeeGroup.totalUnpaid.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {payeeGroup.tasks.map((task) => (
                      <div
                        key={`${task.taskId}-${task.reason}`}
                        className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                        data-testid={`row-task-${task.taskId}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="font-medium mb-1" data-testid={`text-task-title-${task.taskId}`}>
                              {task.taskTitle}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400" data-testid={`text-task-reason-${task.taskId}`}>
                              {task.reason}
                            </div>
                          </div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100" data-testid={`text-task-amount-${task.taskId}`}>
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
            <div className="text-gray-500 dark:text-gray-400 text-lg" data-testid="text-no-pending">
              No pending payouts
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

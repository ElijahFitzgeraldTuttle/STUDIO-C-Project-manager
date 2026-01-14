import type {
  Task, Comment, InsertTask, InsertComment, Subtask, InsertSubtask,
  Payout, Payee, InsertPayee, Dashboard, InsertDashboard, Column, InsertColumn,
  Receivable, InsertReceivable, TeamMember, InsertTeamMember,
  ActivityLog, InsertActivityLog, Notification, InsertNotification, SlotsCredits
} from "@shared/schema";

const API_BASE = "/api";

// Pagination interface
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

// Task API functions
export async function fetchTasks(dashboardId?: number | null): Promise<Task[]> {
  const url = dashboardId ? `${API_BASE}/tasks?dashboardId=${dashboardId}` : `${API_BASE}/tasks`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch tasks");
  return response.json();
}

export async function fetchTasksPaginated(
  dashboardId?: number | null,
  params?: PaginationParams & { includeArchived?: boolean; search?: string }
): Promise<PaginatedResponse<Task>> {
  const searchParams = new URLSearchParams();
  if (dashboardId) searchParams.set("dashboardId", dashboardId.toString());
  if (params?.page) searchParams.set("page", params.page.toString());
  if (params?.pageSize) searchParams.set("pageSize", params.pageSize.toString());
  if (params?.includeArchived) searchParams.set("includeArchived", "true");
  if (params?.search) searchParams.set("search", params.search);

  const response = await fetch(`${API_BASE}/tasks/paginated?${searchParams.toString()}`);
  if (!response.ok) throw new Error("Failed to fetch tasks");
  return response.json();
}

export async function createTask(task: InsertTask): Promise<Task> {
  const response = await fetch(`${API_BASE}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });
  if (!response.ok) throw new Error("Failed to create task");
  return response.json();
}

export async function updateTask(id: number, task: Partial<InsertTask>): Promise<Task> {
  const response = await fetch(`${API_BASE}/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });
  if (!response.ok) throw new Error("Failed to update task");
  return response.json();
}

export async function deleteTask(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/tasks/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete task");
}

export async function archiveTask(id: number): Promise<Task> {
  const response = await fetch(`${API_BASE}/tasks/${id}/archive`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Failed to archive task");
  return response.json();
}

export async function restoreTask(id: number): Promise<Task> {
  const response = await fetch(`${API_BASE}/tasks/${id}/restore`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Failed to restore task");
  return response.json();
}

export async function reorderTasks(taskIds: number[]): Promise<void> {
  const response = await fetch(`${API_BASE}/tasks/reorder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskIds }),
  });
  if (!response.ok) throw new Error("Failed to reorder tasks");
}

// Comment API functions
export async function fetchComments(taskId: number): Promise<Comment[]> {
  const response = await fetch(`${API_BASE}/tasks/${taskId}/comments`);
  if (!response.ok) throw new Error("Failed to fetch comments");
  return response.json();
}

export async function createComment(taskId: number, comment: Omit<InsertComment, "taskId">): Promise<Comment> {
  const response = await fetch(`${API_BASE}/tasks/${taskId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(comment),
  });
  if (!response.ok) throw new Error("Failed to create comment");
  return response.json();
}

export async function markAllTaskCommentsAsRead(taskId: number, userName: string): Promise<void> {
  const response = await fetch(`${API_BASE}/tasks/${taskId}/comments/read-all`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userName }),
  });
  if (!response.ok) throw new Error("Failed to mark comments as read");
}

export async function getUnreadCounts(userName: string): Promise<Record<number, number>> {
  const response = await fetch(`${API_BASE}/unread-counts?userName=${encodeURIComponent(userName)}`);
  if (!response.ok) throw new Error("Failed to fetch unread counts");
  return response.json();
}

// Subtask API functions
export async function fetchSubtasks(taskId: number): Promise<Subtask[]> {
  const response = await fetch(`${API_BASE}/tasks/${taskId}/subtasks`);
  if (!response.ok) throw new Error("Failed to fetch subtasks");
  return response.json();
}

export async function createSubtask(taskId: number, subtask: Omit<InsertSubtask, "taskId">): Promise<Subtask> {
  const response = await fetch(`${API_BASE}/tasks/${taskId}/subtasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subtask),
  });
  if (!response.ok) throw new Error("Failed to create subtask");
  return response.json();
}

export async function updateSubtask(id: number, subtask: Partial<InsertSubtask>): Promise<Subtask> {
  const response = await fetch(`${API_BASE}/subtasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subtask),
  });
  if (!response.ok) throw new Error("Failed to update subtask");
  return response.json();
}

export async function deleteSubtask(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/subtasks/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete subtask");
}

// Payout API functions
export async function fetchPayout(taskId: number): Promise<(Payout & { payees: Payee[] }) | null> {
  const response = await fetch(`${API_BASE}/tasks/${taskId}/payout`);
  if (!response.ok) throw new Error("Failed to fetch payout");
  return response.json();
}

export async function createOrUpdatePayout(taskId: number, totalAmount: number): Promise<Payout> {
  const response = await fetch(`${API_BASE}/tasks/${taskId}/payout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ totalAmount }),
  });
  if (!response.ok) throw new Error("Failed to create/update payout");
  return response.json();
}

export async function addPayee(payoutId: number, payee: Omit<InsertPayee, "payoutId">): Promise<Payee> {
  const response = await fetch(`${API_BASE}/payouts/${payoutId}/payees`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payee),
  });
  if (!response.ok) throw new Error("Failed to add payee");
  return response.json();
}

export async function updatePayee(id: number, payee: Partial<Omit<InsertPayee, "payoutId">>): Promise<Payee> {
  const response = await fetch(`${API_BASE}/payees/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payee),
  });
  if (!response.ok) throw new Error("Failed to update payee");
  return response.json();
}

export async function deletePayee(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/payees/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete payee");
}

export async function fetchUnpaidPayouts(): Promise<Array<{ name: string; totalUnpaid: number; tasks: Array<{ taskId: number; taskTitle: string; amount: number; reason: string }> }>> {
  const response = await fetch(`${API_BASE}/unpaid-payouts`);
  if (!response.ok) throw new Error("Failed to fetch unpaid payouts");
  return response.json();
}

// Dashboard API functions
export async function fetchDashboards(): Promise<Dashboard[]> {
  const response = await fetch(`${API_BASE}/dashboards`);
  if (!response.ok) throw new Error("Failed to fetch dashboards");
  return response.json();
}

export async function createDashboard(dashboard: InsertDashboard): Promise<Dashboard> {
  const response = await fetch(`${API_BASE}/dashboards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dashboard),
  });
  if (!response.ok) throw new Error("Failed to create dashboard");
  return response.json();
}

export async function updateDashboard(id: number, dashboard: Partial<InsertDashboard>): Promise<Dashboard> {
  const response = await fetch(`${API_BASE}/dashboards/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dashboard),
  });
  if (!response.ok) throw new Error("Failed to update dashboard");
  return response.json();
}

export async function deleteDashboard(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/dashboards/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete dashboard");
}

// Column API functions
export async function fetchColumns(dashboardId: number): Promise<Column[]> {
  const response = await fetch(`${API_BASE}/dashboards/${dashboardId}/columns`);
  if (!response.ok) throw new Error("Failed to fetch columns");
  return response.json();
}

export async function createColumn(dashboardId: number, column: Omit<InsertColumn, "dashboardId">): Promise<Column> {
  const response = await fetch(`${API_BASE}/dashboards/${dashboardId}/columns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(column),
  });
  if (!response.ok) throw new Error("Failed to create column");
  return response.json();
}

export async function updateColumn(id: number, column: Partial<InsertColumn>): Promise<Column> {
  const response = await fetch(`${API_BASE}/columns/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(column),
  });
  if (!response.ok) throw new Error("Failed to update column");
  return response.json();
}

export async function deleteColumn(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/columns/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete column");
}

// Receivable API functions
export async function fetchReceivables(): Promise<Receivable[]> {
  const response = await fetch(`${API_BASE}/receivables`);
  if (!response.ok) throw new Error("Failed to fetch receivables");
  return response.json();
}

export async function createReceivable(receivable: InsertReceivable): Promise<Receivable> {
  const response = await fetch(`${API_BASE}/receivables`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(receivable),
  });
  if (!response.ok) throw new Error("Failed to create receivable");
  return response.json();
}

export async function updateReceivable(id: number, receivable: Partial<InsertReceivable>): Promise<Receivable> {
  const response = await fetch(`${API_BASE}/receivables/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(receivable),
  });
  if (!response.ok) throw new Error("Failed to update receivable");
  return response.json();
}

export async function deleteReceivable(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/receivables/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete receivable");
}

// Team Members API functions
export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const response = await fetch(`${API_BASE}/team-members`);
  if (!response.ok) throw new Error("Failed to fetch team members");
  return response.json();
}

export async function createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
  const response = await fetch(`${API_BASE}/team-members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(member),
  });
  if (!response.ok) throw new Error("Failed to create team member");
  return response.json();
}

export async function updateTeamMember(id: number, member: Partial<InsertTeamMember>): Promise<TeamMember> {
  const response = await fetch(`${API_BASE}/team-members/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(member),
  });
  if (!response.ok) throw new Error("Failed to update team member");
  return response.json();
}

export async function deleteTeamMember(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/team-members/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete team member");
}

// Activity Log API functions
export async function fetchActivityLog(
  params?: PaginationParams & { taskId?: number; dashboardId?: number }
): Promise<PaginatedResponse<ActivityLog>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", params.page.toString());
  if (params?.pageSize) searchParams.set("pageSize", params.pageSize.toString());
  if (params?.taskId) searchParams.set("taskId", params.taskId.toString());
  if (params?.dashboardId) searchParams.set("dashboardId", params.dashboardId.toString());

  const response = await fetch(`${API_BASE}/activity-log?${searchParams.toString()}`);
  if (!response.ok) throw new Error("Failed to fetch activity log");
  return response.json();
}

export async function fetchTaskActivityLog(taskId: number, params?: PaginationParams): Promise<ActivityLog[]> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", params.page.toString());
  if (params?.pageSize) searchParams.set("pageSize", params.pageSize.toString());

  const response = await fetch(`${API_BASE}/tasks/${taskId}/activity?${searchParams.toString()}`);
  if (!response.ok) throw new Error("Failed to fetch task activity");
  return response.json();
}

// Notification API functions
export async function fetchNotifications(userId: string, params?: PaginationParams): Promise<Notification[]> {
  const searchParams = new URLSearchParams();
  searchParams.set("userId", userId);
  if (params?.page) searchParams.set("page", params.page.toString());
  if (params?.pageSize) searchParams.set("pageSize", params.pageSize.toString());

  const response = await fetch(`${API_BASE}/notifications?${searchParams.toString()}`);
  if (!response.ok) throw new Error("Failed to fetch notifications");
  return response.json();
}

export async function markNotificationAsRead(id: number): Promise<Notification> {
  const response = await fetch(`${API_BASE}/notifications/${id}/read`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Failed to mark notification as read");
  return response.json();
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/notifications/read-all`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  if (!response.ok) throw new Error("Failed to mark all notifications as read");
}

export async function deleteNotification(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/notifications/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete notification");
}

// Slots Game API functions
export async function fetchSlotsCredits(userId: string, username: string): Promise<SlotsCredits> {
  const searchParams = new URLSearchParams();
  searchParams.set("userId", userId);
  searchParams.set("username", username);

  const response = await fetch(`${API_BASE}/slots/credits?${searchParams.toString()}`);
  if (!response.ok) throw new Error("Failed to fetch slots credits");
  return response.json();
}

export async function spinSlots(userId: string, username: string, creditsChange: number, isWin: boolean): Promise<SlotsCredits> {
  const response = await fetch(`${API_BASE}/slots/spin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, username, creditsChange, isWin }),
  });
  if (!response.ok) throw new Error("Failed to record slot spin");
  return response.json();
}

export async function resetSlotsCredits(userId: string, username: string): Promise<SlotsCredits> {
  const response = await fetch(`${API_BASE}/slots/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, username }),
  });
  if (!response.ok) throw new Error("Failed to reset slots credits");
  return response.json();
}

export async function fetchSlotsLeaderboard(limit?: number): Promise<SlotsCredits[]> {
  const searchParams = new URLSearchParams();
  if (limit) searchParams.set("limit", limit.toString());

  const response = await fetch(`${API_BASE}/slots/leaderboard?${searchParams.toString()}`);
  if (!response.ok) throw new Error("Failed to fetch leaderboard");
  return response.json();
}

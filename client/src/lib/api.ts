import type { Task, Comment, InsertTask, InsertComment, Subtask, InsertSubtask, Payout, Payee, InsertPayee, Dashboard, InsertDashboard, Column, InsertColumn } from "@shared/schema";

const API_BASE = "/api";

export async function fetchTasks(dashboardId?: number | null): Promise<Task[]> {
  const url = dashboardId ? `${API_BASE}/tasks?dashboardId=${dashboardId}` : `${API_BASE}/tasks`;
  const response = await fetch(url);
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

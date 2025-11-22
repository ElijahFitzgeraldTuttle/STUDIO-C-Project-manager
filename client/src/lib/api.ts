import type { Task, Comment, InsertTask, InsertComment } from "@shared/schema";

const API_BASE = "/api";

export async function fetchTasks(): Promise<Task[]> {
  const response = await fetch(`${API_BASE}/tasks`);
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

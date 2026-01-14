import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import {
  insertTaskSchema, insertCommentSchema, insertSubtaskSchema,
  insertPayeeSchema, insertDashboardSchema, insertColumnSchema,
  insertReceivableSchema, insertTeamMemberSchema, insertActivityLogSchema,
  insertNotificationSchema
} from "@shared/schema";
import { z } from "zod";

// Custom error class for API errors
class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// Error handler middleware
function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  console.error(`[${new Date().toISOString()}] Error:`, err.message);

  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: "Validation failed",
      details: err.errors
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  return res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
}

// Async wrapper for route handlers
function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
}

// WebSocket clients for real-time updates
const wsClients = new Set<WebSocket>();

function broadcast(type: string, data: unknown) {
  const message = JSON.stringify({ type, data, timestamp: Date.now() });
  wsClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // ============== TASK ROUTES ==============

  // Get all tasks
  app.get("/api/tasks", asyncHandler(async (req, res) => {
    const dashboardId = req.query.dashboardId ? parseInt(req.query.dashboardId as string) : undefined;
    const tasks = await storage.getTasks(dashboardId);
    res.json(tasks);
  }));

  // Get tasks with pagination
  app.get("/api/tasks/paginated", asyncHandler(async (req, res) => {
    const result = await storage.getTasksPaginated({
      dashboardId: req.query.dashboardId ? parseInt(req.query.dashboardId as string) : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 50,
      includeArchived: req.query.includeArchived === 'true',
      search: req.query.search as string | undefined,
    });
    res.json(result);
  }));

  // Get a single task
  app.get("/api/tasks/:id", asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const task = await storage.getTask(id);
    if (!task) {
      throw new ApiError(404, "Task not found");
    }
    res.json(task);
  }));

  // Create a new task
  app.post("/api/tasks", asyncHandler(async (req, res) => {
    const body = { ...req.body };
    if (body.dueDate !== undefined) {
      body.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    }
    const validatedData = insertTaskSchema.parse(body);
    const task = await storage.createTask(validatedData);

    // Log activity
    await storage.logActivity({
      taskId: task.id,
      dashboardId: task.dashboardId ?? undefined,
      userId: req.body.createdBy || 'System',
      action: 'task_created',
      details: JSON.stringify({ taskTitle: task.title }),
    });

    broadcast('task_created', task);
    res.status(201).json(task);
  }));

  // Update a task
  app.patch("/api/tasks/:id", asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const body = { ...req.body };
    if (body.dueDate !== undefined) {
      body.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    }

    const previousTask = await storage.getTask(id);
    const validatedData = insertTaskSchema.partial().parse(body);
    const task = await storage.updateTask(id, validatedData);

    if (!task) {
      throw new ApiError(404, "Task not found");
    }

    // Log activity for status changes
    if (previousTask && body.status && previousTask.status !== body.status) {
      await storage.logActivity({
        taskId: task.id,
        dashboardId: task.dashboardId ?? undefined,
        userId: req.body.updatedBy || 'System',
        action: 'task_moved',
        previousValue: previousTask.status,
        newValue: body.status,
        details: JSON.stringify({ taskTitle: task.title }),
      });
    }

    broadcast('task_updated', task);
    res.json(task);
  }));

  // Delete a task
  app.delete("/api/tasks/:id", asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const task = await storage.getTask(id);

    if (task) {
      await storage.logActivity({
        taskId: id,
        dashboardId: task.dashboardId ?? undefined,
        userId: 'System',
        action: 'task_deleted',
        details: JSON.stringify({ taskTitle: task.title }),
      });
    }

    await storage.deleteTask(id);
    broadcast('task_deleted', { id });
    res.status(204).send();
  }));

  // Archive a task
  app.post("/api/tasks/:id/archive", asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const task = await storage.archiveTask(id);

    if (!task) {
      throw new ApiError(404, "Task not found");
    }

    await storage.logActivity({
      taskId: task.id,
      dashboardId: task.dashboardId ?? undefined,
      userId: req.body.userId || 'System',
      action: 'task_archived',
      details: JSON.stringify({ taskTitle: task.title }),
    });

    broadcast('task_archived', task);
    res.json(task);
  }));

  // Restore a task
  app.post("/api/tasks/:id/restore", asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const task = await storage.restoreTask(id);

    if (!task) {
      throw new ApiError(404, "Task not found");
    }

    await storage.logActivity({
      taskId: task.id,
      dashboardId: task.dashboardId ?? undefined,
      userId: req.body.userId || 'System',
      action: 'task_restored',
      details: JSON.stringify({ taskTitle: task.title }),
    });

    broadcast('task_restored', task);
    res.json(task);
  }));

  // Reorder tasks
  app.post("/api/tasks/reorder", asyncHandler(async (req, res) => {
    const { taskIds } = req.body;
    if (!Array.isArray(taskIds)) {
      throw new ApiError(400, "taskIds must be an array");
    }
    await storage.reorderTasks(taskIds);
    broadcast('tasks_reordered', { taskIds });
    res.json({ success: true });
  }));

  // Get task activity
  app.get("/api/tasks/:id/activity", asyncHandler(async (req, res) => {
    const taskId = parseInt(req.params.id);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const activities = await storage.getTaskActivityLog(taskId, limit);
    res.json(activities);
  }));

  // ============== COMMENT ROUTES ==============

  app.get("/api/tasks/:id/comments", asyncHandler(async (req, res) => {
    const taskId = parseInt(req.params.id);
    const comments = await storage.getCommentsByTaskId(taskId);
    res.json(comments);
  }));

  app.post("/api/tasks/:id/comments", asyncHandler(async (req, res) => {
    const taskId = parseInt(req.params.id);
    const validatedData = insertCommentSchema.parse({
      ...req.body,
      taskId,
    });
    const comment = await storage.createComment(validatedData);

    // Log activity
    await storage.logActivity({
      taskId,
      userId: req.body.author,
      action: 'comment_added',
      details: JSON.stringify({ commentId: comment.id }),
    });

    // Create notifications for task assignees
    const task = await storage.getTask(taskId);
    if (task && task.assignees) {
      for (const assignee of task.assignees) {
        if (assignee !== req.body.author) {
          await storage.createNotification({
            userId: assignee,
            title: 'New Comment',
            message: `${req.body.author} commented on "${task.title}"`,
            type: 'comment',
            taskId,
          });
        }
      }
    }

    broadcast('comment_created', { taskId, comment });
    res.status(201).json(comment);
  }));

  app.post("/api/comments/:id/read", asyncHandler(async (req, res) => {
    const commentId = parseInt(req.params.id);
    const { userName } = req.body;

    if (!userName) {
      throw new ApiError(400, "userName is required");
    }

    await storage.markCommentAsRead(commentId, userName);
    res.status(200).json({ success: true });
  }));

  app.post("/api/tasks/:id/comments/read-all", asyncHandler(async (req, res) => {
    const taskId = parseInt(req.params.id);
    const { userName } = req.body;

    if (!userName) {
      throw new ApiError(400, "userName is required");
    }

    await storage.markAllTaskCommentsAsRead(taskId, userName);
    res.status(200).json({ success: true });
  }));

  app.get("/api/unread-counts", asyncHandler(async (req, res) => {
    const userName = req.query.userName as string;

    if (!userName) {
      throw new ApiError(400, "userName is required");
    }

    const counts = await storage.getUnreadCommentCounts(userName);
    const countsObj = Object.fromEntries(counts);
    res.json(countsObj);
  }));

  // ============== SUBTASK ROUTES ==============

  app.get("/api/tasks/:id/subtasks", asyncHandler(async (req, res) => {
    const taskId = parseInt(req.params.id);
    const subtasks = await storage.getSubtasksByTaskId(taskId);
    res.json(subtasks);
  }));

  app.post("/api/tasks/:id/subtasks", asyncHandler(async (req, res) => {
    const taskId = parseInt(req.params.id);
    const body = { ...req.body };
    if (body.dueDate !== undefined) {
      body.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    }
    const validatedData = insertSubtaskSchema.parse({
      ...body,
      taskId,
    });
    const subtask = await storage.createSubtask(validatedData);

    await storage.logActivity({
      taskId,
      userId: req.body.createdBy || 'System',
      action: 'subtask_created',
      details: JSON.stringify({ subtaskTitle: subtask.title }),
    });

    broadcast('subtask_created', { taskId, subtask });
    res.status(201).json(subtask);
  }));

  app.patch("/api/subtasks/:id", asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const body = { ...req.body };
    if (body.dueDate !== undefined) {
      body.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    }

    const previousSubtask = await storage.getSubtasksByTaskId(0); // We need to get the subtask first
    const validatedData = insertSubtaskSchema.partial().parse(body);
    const subtask = await storage.updateSubtask(id, validatedData);

    if (!subtask) {
      throw new ApiError(404, "Subtask not found");
    }

    // Log completion
    if (body.completed !== undefined) {
      await storage.logActivity({
        taskId: subtask.taskId,
        userId: req.body.updatedBy || 'System',
        action: body.completed ? 'subtask_completed' : 'subtask_created',
        details: JSON.stringify({ subtaskTitle: subtask.title }),
      });
    }

    broadcast('subtask_updated', subtask);
    res.json(subtask);
  }));

  app.delete("/api/subtasks/:id", asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteSubtask(id);
    broadcast('subtask_deleted', { id });
    res.status(204).send();
  }));

  // ============== PAYOUT ROUTES ==============

  app.get("/api/tasks/:id/payout", asyncHandler(async (req, res) => {
    const taskId = parseInt(req.params.id);
    const payout = await storage.getPayoutByTaskId(taskId);
    res.json(payout);
  }));

  app.post("/api/tasks/:id/payout", asyncHandler(async (req, res) => {
    const taskId = parseInt(req.params.id);
    const { totalAmount } = req.body;

    if (typeof totalAmount !== 'number') {
      throw new ApiError(400, "totalAmount is required and must be a number");
    }

    const payout = await storage.createOrUpdatePayout(taskId, totalAmount);

    await storage.logActivity({
      taskId,
      userId: req.body.updatedBy || 'System',
      action: 'payout_updated',
      newValue: totalAmount.toString(),
    });

    broadcast('payout_updated', { taskId, payout });
    res.json(payout);
  }));

  app.post("/api/payouts/:id/payees", asyncHandler(async (req, res) => {
    const payoutId = parseInt(req.params.id);
    const validatedData = insertPayeeSchema.omit({ payoutId: true }).parse(req.body);
    const payee = await storage.addPayee(payoutId, validatedData);

    await storage.logActivity({
      userId: req.body.createdBy || 'System',
      action: 'payee_added',
      details: JSON.stringify({ payeeName: payee.name, amount: payee.amount }),
    });

    broadcast('payee_added', payee);
    res.status(201).json(payee);
  }));

  app.patch("/api/payees/:id", asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const validatedData = insertPayeeSchema.omit({ payoutId: true }).partial().parse(req.body);
    const payee = await storage.updatePayee(id, validatedData);

    if (!payee) {
      throw new ApiError(404, "Payee not found");
    }

    if (req.body.paid === true) {
      await storage.logActivity({
        userId: req.body.updatedBy || 'System',
        action: 'payee_paid',
        details: JSON.stringify({ payeeName: payee.name, amount: payee.amount }),
      });
    }

    broadcast('payee_updated', payee);
    res.json(payee);
  }));

  app.delete("/api/payees/:id", asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deletePayee(id);
    broadcast('payee_deleted', { id });
    res.status(204).send();
  }));

  app.get("/api/unpaid-payouts", asyncHandler(async (req, res) => {
    const unpaidPayouts = await storage.getUnpaidPayouts();
    res.json(unpaidPayouts);
  }));

  // ============== DASHBOARD ROUTES ==============

  app.get("/api/dashboards", asyncHandler(async (req, res) => {
    const dashboards = await storage.getDashboards();
    res.json(dashboards);
  }));

  app.post("/api/dashboards", asyncHandler(async (req, res) => {
    const validatedData = insertDashboardSchema.parse(req.body);
    const dashboard = await storage.createDashboard(validatedData);
    broadcast('dashboard_created', dashboard);
    res.status(201).json(dashboard);
  }));

  app.patch("/api/dashboards/:id", asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const validatedData = insertDashboardSchema.partial().parse(req.body);
    const dashboard = await storage.updateDashboard(id, validatedData);

    if (!dashboard) {
      throw new ApiError(404, "Dashboard not found");
    }

    broadcast('dashboard_updated', dashboard);
    res.json(dashboard);
  }));

  app.delete("/api/dashboards/:id", asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteDashboard(id);
    broadcast('dashboard_deleted', { id });
    res.status(204).send();
  }));

  // ============== COLUMN ROUTES ==============

  app.get("/api/dashboards/:dashboardId/columns", asyncHandler(async (req, res) => {
    const dashboardId = parseInt(req.params.dashboardId);
    const cols = await storage.getColumns(dashboardId);
    res.json(cols);
  }));

  app.post("/api/dashboards/:dashboardId/columns", asyncHandler(async (req, res) => {
    const dashboardId = parseInt(req.params.dashboardId);
    const validatedData = insertColumnSchema.parse({ ...req.body, dashboardId });
    const column = await storage.createColumn(validatedData);
    broadcast('column_created', column);
    res.status(201).json(column);
  }));

  app.patch("/api/columns/:id", asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const validatedData = insertColumnSchema.partial().parse(req.body);
    const column = await storage.updateColumn(id, validatedData);

    if (!column) {
      throw new ApiError(404, "Column not found");
    }

    broadcast('column_updated', column);
    res.json(column);
  }));

  app.delete("/api/columns/:id", asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteColumn(id);
    broadcast('column_deleted', { id });
    res.status(204).send();
  }));

  // ============== RECEIVABLE ROUTES ==============

  app.get("/api/receivables", asyncHandler(async (req, res) => {
    const receivables = await storage.getReceivables();
    res.json(receivables);
  }));

  app.post("/api/receivables", asyncHandler(async (req, res) => {
    const validatedData = insertReceivableSchema.parse(req.body);
    const receivable = await storage.createReceivable(validatedData);
    broadcast('receivable_created', receivable);
    res.status(201).json(receivable);
  }));

  app.patch("/api/receivables/:id", asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const validatedData = insertReceivableSchema.partial().parse(req.body);
    const receivable = await storage.updateReceivable(id, validatedData);

    if (!receivable) {
      throw new ApiError(404, "Receivable not found");
    }

    broadcast('receivable_updated', receivable);
    res.json(receivable);
  }));

  app.delete("/api/receivables/:id", asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteReceivable(id);
    broadcast('receivable_deleted', { id });
    res.status(204).send();
  }));

  // ============== TEAM MEMBER ROUTES ==============

  app.get("/api/team-members", asyncHandler(async (req, res) => {
    const members = await storage.getTeamMembers();
    res.json(members);
  }));

  app.post("/api/team-members", asyncHandler(async (req, res) => {
    const validatedData = insertTeamMemberSchema.parse(req.body);
    const member = await storage.createTeamMember(validatedData);
    broadcast('team_member_created', member);
    res.status(201).json(member);
  }));

  app.patch("/api/team-members/:id", asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const validatedData = insertTeamMemberSchema.partial().parse(req.body);
    const member = await storage.updateTeamMember(id, validatedData);

    if (!member) {
      throw new ApiError(404, "Team member not found");
    }

    broadcast('team_member_updated', member);
    res.json(member);
  }));

  app.delete("/api/team-members/:id", asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteTeamMember(id);
    broadcast('team_member_deleted', { id });
    res.status(204).send();
  }));

  // ============== ACTIVITY LOG ROUTES ==============

  app.get("/api/activity-log", asyncHandler(async (req, res) => {
    const result = await storage.getActivityLog({
      taskId: req.query.taskId ? parseInt(req.query.taskId as string) : undefined,
      dashboardId: req.query.dashboardId ? parseInt(req.query.dashboardId as string) : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 50,
    });
    res.json(result);
  }));

  // ============== NOTIFICATION ROUTES ==============

  app.get("/api/notifications", asyncHandler(async (req, res) => {
    const userId = req.query.userId as string;

    if (!userId) {
      throw new ApiError(400, "userId is required");
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const notifs = await storage.getNotifications(userId, limit);
    res.json(notifs);
  }));

  app.post("/api/notifications/:id/read", asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const notification = await storage.markNotificationAsRead(id);

    if (!notification) {
      throw new ApiError(404, "Notification not found");
    }

    res.json(notification);
  }));

  app.post("/api/notifications/read-all", asyncHandler(async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
      throw new ApiError(400, "userId is required");
    }

    await storage.markAllNotificationsAsRead(userId);
    res.json({ success: true });
  }));

  app.delete("/api/notifications/:id", asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteNotification(id);
    res.status(204).send();
  }));

  // ============== SLOTS GAME ROUTES ==============

  // Get user's slots credits (or create new account with 100 credits)
  app.get("/api/slots/credits", asyncHandler(async (req, res) => {
    const userId = req.query.userId as string;
    const username = req.query.username as string;

    if (!userId || !username) {
      throw new ApiError(400, "userId and username are required");
    }

    const credits = await storage.getOrCreateSlotsCredits(userId, username);
    res.json(credits);
  }));

  // Update user's slots credits after a spin
  app.post("/api/slots/spin", asyncHandler(async (req, res) => {
    const { userId, username, creditsChange, isWin } = req.body;

    if (!userId || !username) {
      throw new ApiError(400, "userId and username are required");
    }

    if (typeof creditsChange !== 'number') {
      throw new ApiError(400, "creditsChange must be a number");
    }

    // Get or create user's credits
    const currentCredits = await storage.getOrCreateSlotsCredits(userId, username);

    const newCredits = currentCredits.credits + creditsChange;
    const newHighScore = Math.max(currentCredits.highScore, newCredits);
    const newBiggestWin = isWin && creditsChange > 0
      ? Math.max(currentCredits.biggestWin, creditsChange)
      : currentCredits.biggestWin;

    const updated = await storage.updateSlotsCredits(userId, {
      credits: Math.max(0, newCredits), // Don't go below 0
      highScore: newHighScore,
      gamesPlayed: currentCredits.gamesPlayed + 1,
      biggestWin: newBiggestWin,
    });

    broadcast('slots_spin', { userId, username, creditsChange, newCredits: updated?.credits });
    res.json(updated);
  }));

  // Reset user's credits to 100 (when they hit 0)
  app.post("/api/slots/reset", asyncHandler(async (req, res) => {
    const { userId, username } = req.body;

    if (!userId || !username) {
      throw new ApiError(400, "userId and username are required");
    }

    // Get or create to ensure user exists
    await storage.getOrCreateSlotsCredits(userId, username);

    const updated = await storage.updateSlotsCredits(userId, {
      credits: 100,
    });

    broadcast('slots_reset', { userId, username });
    res.json(updated);
  }));

  // Get leaderboard
  app.get("/api/slots/leaderboard", asyncHandler(async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const leaderboard = await storage.getSlotsLeaderboard(limit);
    res.json(leaderboard);
  }));

  // Error handler middleware (must be last)
  app.use(errorHandler);

  // Create HTTP server
  const httpServer = createServer(app);

  // Create WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    wsClients.add(ws);

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      wsClients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      wsClients.delete(ws);
    });

    // Send initial connection confirmation
    ws.send(JSON.stringify({ type: 'connected', timestamp: Date.now() }));
  });

  return httpServer;
}

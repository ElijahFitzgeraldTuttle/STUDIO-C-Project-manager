import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTaskSchema, insertCommentSchema, insertSubtaskSchema, insertPayeeSchema, insertDashboardSchema, insertColumnSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all tasks
  app.get("/api/tasks", async (req, res) => {
    try {
      const dashboardId = req.query.dashboardId ? parseInt(req.query.dashboardId as string) : undefined;
      const tasks = await storage.getTasks(dashboardId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  // Get a single task
  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch task" });
    }
  });

  // Create a new task
  app.post("/api/tasks", async (req, res) => {
    try {
      const validatedData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(validatedData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  // Update a task
  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertTaskSchema.partial().parse(req.body);
      const task = await storage.updateTask(id, validatedData);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  // Delete a task
  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTask(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // Get comments for a task
  app.get("/api/tasks/:id/comments", async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const comments = await storage.getCommentsByTaskId(taskId);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // Create a comment
  app.post("/api/tasks/:id/comments", async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const validatedData = insertCommentSchema.parse({
        ...req.body,
        taskId,
      });
      const comment = await storage.createComment(validatedData);
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  // Mark comment as read
  app.post("/api/comments/:id/read", async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      const { userName } = req.body;
      
      if (!userName) {
        return res.status(400).json({ error: "userName is required" });
      }

      await storage.markCommentAsRead(commentId, userName);
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark comment as read" });
    }
  });

  // Mark all task comments as read
  app.post("/api/tasks/:id/comments/read-all", async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const { userName } = req.body;
      
      if (!userName) {
        return res.status(400).json({ error: "userName is required" });
      }

      await storage.markAllTaskCommentsAsRead(taskId, userName);
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark comments as read" });
    }
  });

  // Get unread comment counts per task
  app.get("/api/unread-counts", async (req, res) => {
    try {
      const userName = req.query.userName as string;
      
      if (!userName) {
        return res.status(400).json({ error: "userName is required" });
      }

      const counts = await storage.getUnreadCommentCounts(userName);
      const countsObj = Object.fromEntries(counts);
      res.json(countsObj);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch unread counts" });
    }
  });

  // Subtask routes
  app.get("/api/tasks/:id/subtasks", async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const subtasks = await storage.getSubtasksByTaskId(taskId);
      res.json(subtasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch subtasks" });
    }
  });

  app.post("/api/tasks/:id/subtasks", async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const validatedData = insertSubtaskSchema.parse({
        ...req.body,
        taskId,
      });
      const subtask = await storage.createSubtask(validatedData);
      res.status(201).json(subtask);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create subtask" });
    }
  });

  app.patch("/api/subtasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertSubtaskSchema.partial().parse(req.body);
      const subtask = await storage.updateSubtask(id, validatedData);
      if (!subtask) {
        return res.status(404).json({ error: "Subtask not found" });
      }
      res.json(subtask);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update subtask" });
    }
  });

  app.delete("/api/subtasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSubtask(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete subtask" });
    }
  });

  // Payout routes
  app.get("/api/tasks/:id/payout", async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const payout = await storage.getPayoutByTaskId(taskId);
      res.json(payout);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payout" });
    }
  });

  app.post("/api/tasks/:id/payout", async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const { totalAmount } = req.body;
      
      if (typeof totalAmount !== 'number') {
        return res.status(400).json({ error: "totalAmount is required and must be a number" });
      }

      const payout = await storage.createOrUpdatePayout(taskId, totalAmount);
      res.json(payout);
    } catch (error) {
      res.status(500).json({ error: "Failed to create/update payout" });
    }
  });

  app.post("/api/payouts/:id/payees", async (req, res) => {
    try {
      const payoutId = parseInt(req.params.id);
      const validatedData = insertPayeeSchema.omit({ payoutId: true }).parse(req.body);
      const payee = await storage.addPayee(payoutId, validatedData);
      res.status(201).json(payee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to add payee" });
    }
  });

  app.patch("/api/payees/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertPayeeSchema.omit({ payoutId: true }).partial().parse(req.body);
      const payee = await storage.updatePayee(id, validatedData);
      if (!payee) {
        return res.status(404).json({ error: "Payee not found" });
      }
      res.json(payee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update payee" });
    }
  });

  app.delete("/api/payees/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePayee(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete payee" });
    }
  });

  // Dashboard routes
  app.get("/api/dashboards", async (req, res) => {
    try {
      const dashboards = await storage.getDashboards();
      res.json(dashboards);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboards" });
    }
  });

  app.post("/api/dashboards", async (req, res) => {
    try {
      const validatedData = insertDashboardSchema.parse(req.body);
      const dashboard = await storage.createDashboard(validatedData);
      res.status(201).json(dashboard);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create dashboard" });
    }
  });

  app.patch("/api/dashboards/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertDashboardSchema.partial().parse(req.body);
      const dashboard = await storage.updateDashboard(id, validatedData);
      if (!dashboard) {
        return res.status(404).json({ error: "Dashboard not found" });
      }
      res.json(dashboard);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update dashboard" });
    }
  });

  app.delete("/api/dashboards/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteDashboard(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete dashboard" });
    }
  });

  // Column routes
  app.get("/api/dashboards/:dashboardId/columns", async (req, res) => {
    try {
      const dashboardId = parseInt(req.params.dashboardId);
      const columns = await storage.getColumns(dashboardId);
      res.json(columns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch columns" });
    }
  });

  app.post("/api/dashboards/:dashboardId/columns", async (req, res) => {
    try {
      const dashboardId = parseInt(req.params.dashboardId);
      const validatedData = insertColumnSchema.parse({ ...req.body, dashboardId });
      const column = await storage.createColumn(validatedData);
      res.status(201).json(column);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create column" });
    }
  });

  app.patch("/api/columns/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertColumnSchema.partial().parse(req.body);
      const column = await storage.updateColumn(id, validatedData);
      if (!column) {
        return res.status(404).json({ error: "Column not found" });
      }
      res.json(column);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update column" });
    }
  });

  app.delete("/api/columns/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteColumn(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete column" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

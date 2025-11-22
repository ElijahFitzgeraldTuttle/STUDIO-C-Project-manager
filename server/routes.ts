import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTaskSchema, insertCommentSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all tasks
  app.get("/api/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTasks();
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

  const httpServer = createServer(app);
  return httpServer;
}

import { db } from "../db";
import { tasks, comments, commentReads, type Task, type InsertTask, type Comment, type InsertComment, type InsertCommentRead } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";

export interface IStorage {
  // Task operations
  getTasks(): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<void>;

  // Comment operations
  getCommentsByTaskId(taskId: number): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  
  // Comment read tracking
  markCommentAsRead(commentId: number, userName: string): Promise<void>;
  markAllTaskCommentsAsRead(taskId: number, userName: string): Promise<void>;
  getUnreadCommentCounts(userName: string): Promise<Map<number, number>>;
}

export class DatabaseStorage implements IStorage {
  async getTasks(): Promise<Task[]> {
    return await db.select().from(tasks).orderBy(tasks.createdAt);
  }

  async getTask(id: number): Promise<Task | undefined> {
    const result = await db.select().from(tasks).where(eq(tasks.id, id));
    return result[0];
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const result = await db.insert(tasks).values(insertTask).returning();
    return result[0];
  }

  async updateTask(id: number, updateData: Partial<InsertTask>): Promise<Task | undefined> {
    const result = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();
    return result[0];
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async getCommentsByTaskId(taskId: number): Promise<Comment[]> {
    return await db
      .select()
      .from(comments)
      .where(eq(comments.taskId, taskId))
      .orderBy(comments.createdAt);
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const result = await db.insert(comments).values(insertComment).returning();
    return result[0];
  }

  async markCommentAsRead(commentId: number, userName: string): Promise<void> {
    // Check if already marked as read
    const existing = await db
      .select()
      .from(commentReads)
      .where(and(eq(commentReads.commentId, commentId), eq(commentReads.userName, userName)));

    if (existing.length === 0) {
      await db.insert(commentReads).values({ commentId, userName });
    }
  }

  async markAllTaskCommentsAsRead(taskId: number, userName: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Get all comments for this task
      const taskComments = await tx
        .select({ id: comments.id })
        .from(comments)
        .where(eq(comments.taskId, taskId));

      const commentIds = taskComments.map(c => c.id);

      if (commentIds.length === 0) {
        return;
      }

      // Get already read comment IDs
      const alreadyRead = await tx
        .select({ commentId: commentReads.commentId })
        .from(commentReads)
        .where(and(
          eq(commentReads.userName, userName),
          inArray(commentReads.commentId, commentIds)
        ));

      const alreadyReadIds = new Set(alreadyRead.map(r => r.commentId));
      
      // Mark unread comments as read
      const toMarkAsRead = commentIds.filter(id => !alreadyReadIds.has(id));
      
      if (toMarkAsRead.length > 0) {
        await tx.insert(commentReads).values(
          toMarkAsRead.map(commentId => ({ commentId, userName }))
        );
      }
    });
  }

  async getUnreadCommentCounts(userName: string): Promise<Map<number, number>> {
    // Get all comments with their task IDs
    const allComments = await db
      .select({
        id: comments.id,
        taskId: comments.taskId,
        author: comments.author,
      })
      .from(comments);

    // Get all comments this user has read
    const readComments = await db
      .select({ commentId: commentReads.commentId })
      .from(commentReads)
      .where(eq(commentReads.userName, userName));

    const readCommentIds = new Set(readComments.map(r => r.commentId));

    // Count unread comments per task (excluding comments authored by the user)
    const unreadCounts = new Map<number, number>();
    
    for (const comment of allComments) {
      // Skip comments by the current user
      if (comment.author === userName) continue;
      
      // Skip already read comments
      if (readCommentIds.has(comment.id)) continue;

      const currentCount = unreadCounts.get(comment.taskId) || 0;
      unreadCounts.set(comment.taskId, currentCount + 1);
    }

    return unreadCounts;
  }
}

export const storage = new DatabaseStorage();

import { db } from "../db";
import { tasks, comments, commentReads, subtasks, payouts, payees, type Task, type InsertTask, type Comment, type InsertComment, type InsertCommentRead, type Subtask, type InsertSubtask, type Payout, type InsertPayout, type Payee, type InsertPayee } from "@shared/schema";
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

  // Subtask operations
  getSubtasksByTaskId(taskId: number): Promise<Subtask[]>;
  createSubtask(subtask: InsertSubtask): Promise<Subtask>;
  updateSubtask(id: number, subtask: Partial<InsertSubtask>): Promise<Subtask | undefined>;
  deleteSubtask(id: number): Promise<void>;

  // Payout operations
  getPayoutByTaskId(taskId: number): Promise<(Payout & { payees: Payee[] }) | null>;
  createOrUpdatePayout(taskId: number, totalAmount: number): Promise<Payout>;
  addPayee(payoutId: number, payee: Omit<InsertPayee, "payoutId">): Promise<Payee>;
  updatePayee(id: number, payee: Partial<Omit<InsertPayee, "payoutId">>): Promise<Payee | undefined>;
  deletePayee(id: number): Promise<void>;
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

  async getSubtasksByTaskId(taskId: number): Promise<Subtask[]> {
    return await db
      .select()
      .from(subtasks)
      .where(eq(subtasks.taskId, taskId))
      .orderBy(subtasks.createdAt);
  }

  async createSubtask(insertSubtask: InsertSubtask): Promise<Subtask> {
    const result = await db.insert(subtasks).values(insertSubtask).returning();
    return result[0];
  }

  async updateSubtask(id: number, subtaskUpdate: Partial<InsertSubtask>): Promise<Subtask | undefined> {
    const result = await db
      .update(subtasks)
      .set(subtaskUpdate)
      .where(eq(subtasks.id, id))
      .returning();
    return result[0];
  }

  async deleteSubtask(id: number): Promise<void> {
    await db.delete(subtasks).where(eq(subtasks.id, id));
  }

  async getPayoutByTaskId(taskId: number): Promise<(Payout & { payees: Payee[] }) | null> {
    const payout = await db
      .select()
      .from(payouts)
      .where(eq(payouts.taskId, taskId))
      .limit(1);

    if (payout.length === 0) return null;

    const payeeList = await db
      .select()
      .from(payees)
      .where(eq(payees.payoutId, payout[0].id));

    return {
      ...payout[0],
      payees: payeeList,
    };
  }

  async createOrUpdatePayout(taskId: number, totalAmount: number): Promise<Payout> {
    const existing = await db
      .select()
      .from(payouts)
      .where(eq(payouts.taskId, taskId))
      .limit(1);

    if (existing.length > 0) {
      const result = await db
        .update(payouts)
        .set({ totalAmount })
        .where(eq(payouts.id, existing[0].id))
        .returning();
      return result[0];
    } else {
      const result = await db
        .insert(payouts)
        .values({ taskId, totalAmount })
        .returning();
      return result[0];
    }
  }

  async addPayee(payoutId: number, payee: Omit<InsertPayee, "payoutId">): Promise<Payee> {
    const result = await db
      .insert(payees)
      .values({ ...payee, payoutId })
      .returning();
    return result[0];
  }

  async updatePayee(id: number, payeeUpdate: Partial<Omit<InsertPayee, "payoutId">>): Promise<Payee | undefined> {
    const result = await db
      .update(payees)
      .set(payeeUpdate)
      .where(eq(payees.id, id))
      .returning();
    return result[0];
  }

  async deletePayee(id: number): Promise<void> {
    await db.delete(payees).where(eq(payees.id, id));
  }
}

export const storage = new DatabaseStorage();

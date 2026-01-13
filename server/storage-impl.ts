
import { db } from "../db";
import { tasks, comments, commentReads, subtasks, payouts, payees, dashboards, columns, receivables, type Task, type InsertTask, type Comment, type InsertComment, type InsertCommentRead, type Subtask, type InsertSubtask, type Payout, type InsertPayout, type Payee, type InsertPayee, type Dashboard, type InsertDashboard, type Column, type InsertColumn, type Receivable, type InsertReceivable } from "@shared/schema";
import { eq, and, inArray, isNull } from "drizzle-orm";

export interface IStorage {
    // Task operations
    getTasks(dashboardId?: number | null): Promise<Task[]>;
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
    getUnpaidPayouts(): Promise<Array<{ name: string; totalUnpaid: number; tasks: Array<{ taskId: number; taskTitle: string; amount: number; reason: string }> }>>;

    // Dashboard operations
    getDashboards(): Promise<Dashboard[]>;
    createDashboard(dashboard: InsertDashboard): Promise<Dashboard>;
    updateDashboard(id: number, dashboard: Partial<InsertDashboard>): Promise<Dashboard | undefined>;
    deleteDashboard(id: number): Promise<void>;

    // Column operations
    getColumns(dashboardId: number): Promise<Column[]>;
    createColumn(column: InsertColumn): Promise<Column>;
    updateColumn(id: number, column: Partial<InsertColumn>): Promise<Column | undefined>;
    deleteColumn(id: number): Promise<void>;

    // Receivable operations
    getReceivables(): Promise<Receivable[]>;
    createReceivable(receivable: InsertReceivable): Promise<Receivable>;
    updateReceivable(id: number, receivable: Partial<InsertReceivable>): Promise<Receivable | undefined>;
    deleteReceivable(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
    async getTasks(dashboardId?: number | null): Promise<Task[]> {
        if (dashboardId !== undefined) {
            if (dashboardId === null) {
                return await db.select().from(tasks).where(isNull(tasks.dashboardId)).orderBy(tasks.createdAt);
            }
            return await db.select().from(tasks).where(eq(tasks.dashboardId, dashboardId)).orderBy(tasks.createdAt);
        }
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
        const data: any = { ...updateData };
        if (data.dueDate !== undefined) {
            if (typeof data.dueDate === 'string') {
                data.dueDate = data.dueDate ? new Date(data.dueDate) : null;
            }
        }
        const result = await db
            .update(tasks)
            .set(data)
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
        const updateData: any = { ...subtaskUpdate };
        if (updateData.dueDate !== undefined) {
            if (typeof updateData.dueDate === 'string') {
                updateData.dueDate = updateData.dueDate ? new Date(updateData.dueDate) : null;
            }
        }
        const result = await db
            .update(subtasks)
            .set(updateData)
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

    async getUnpaidPayouts(): Promise<Array<{ name: string; totalUnpaid: number; tasks: Array<{ taskId: number; taskTitle: string; amount: number; reason: string }> }>> {
        // Get all unpaid payees with their task information
        const unpaidPayees = await db
            .select({
                payeeName: payees.name,
                payeeAmount: payees.amount,
                payeeReason: payees.reason,
                taskId: tasks.id,
                taskTitle: tasks.title,
            })
            .from(payees)
            .innerJoin(payouts, eq(payees.payoutId, payouts.id))
            .innerJoin(tasks, eq(payouts.taskId, tasks.id))
            .where(eq(payees.paid, false));

        // Group by payee name
        const groupedByName = new Map<string, Array<{ taskId: number; taskTitle: string; amount: number; reason: string }>>();

        for (const record of unpaidPayees) {
            if (!groupedByName.has(record.payeeName)) {
                groupedByName.set(record.payeeName, []);
            }
            groupedByName.get(record.payeeName)!.push({
                taskId: record.taskId,
                taskTitle: record.taskTitle,
                amount: record.payeeAmount,
                reason: record.payeeReason,
            });
            গ্রুপী
        }

        // Convert to the expected format with totals
        return Array.from(groupedByName.entries()).map(([name, tasks]) => ({
            name,
            totalUnpaid: tasks.reduce((sum, task) => sum + task.amount, 0),
            tasks,
        }));
    }

    async getDashboards(): Promise<Dashboard[]> {
        return await db.select().from(dashboards).orderBy(dashboards.createdAt);
    }

    async createDashboard(insertDashboard: InsertDashboard): Promise<Dashboard> {
        const result = await db.insert(dashboards).values(insertDashboard).returning();
        const dashboard = result[0];

        // Create default columns for the new dashboard
        const defaultColumns = [
            { dashboardId: dashboard.id, name: "prospect", color: "#f1f5f9", order: 0 },
            { dashboardId: dashboard.id, name: "scheduled", color: "#fef3c7", order: 1 },
            { dashboardId: dashboard.id, name: "in-progress", color: "#dbeafe", order: 2 },
            { dashboardId: dashboard.id, name: "complete", color: "#d1fae5", order: 3 },
        ];

        await db.insert(columns).values(defaultColumns);

        return dashboard;
    }

    async updateDashboard(id: number, dashboardUpdate: Partial<InsertDashboard>): Promise<Dashboard | undefined> {
        const result = await db
            .update(dashboards)
            .set(dashboardUpdate)
            .where(eq(dashboards.id, id))
            .returning();
        return result[0];
    }

    async deleteDashboard(id: number): Promise<void> {
        await db.delete(dashboards).where(eq(dashboards.id, id));
    }

    async getColumns(dashboardId: number): Promise<Column[]> {
        return await db.select().from(columns).where(eq(columns.dashboardId, dashboardId)).orderBy(columns.order);
    }

    async createColumn(insertColumn: InsertColumn): Promise<Column> {
        const result = await db.insert(columns).values(insertColumn).returning();
        return result[0];
    }

    async updateColumn(id: number, columnUpdate: Partial<InsertColumn>): Promise<Column | undefined> {
        const result = await db
            .update(columns)
            .set(columnUpdate)
            .where(eq(columns.id, id))
            .returning();
        return result[0];
    }

    async deleteColumn(id: number): Promise<void> {
        await db.delete(columns).where(eq(columns.id, id));
    }

    async getReceivables(): Promise<Receivable[]> {
        return await db.select().from(receivables).orderBy(receivables.createdAt);
    }

    async createReceivable(insertReceivable: InsertReceivable): Promise<Receivable> {
        const result = await db.insert(receivables).values(insertReceivable).returning();
        return result[0];
    }

    async updateReceivable(id: number, receivableUpdate: Partial<InsertReceivable>): Promise<Receivable | undefined> {
        const result = await db
            .update(receivables)
            .set(receivableUpdate)
            .where(eq(receivables.id, id))
            .returning();
        return result[0];
    }

    async deleteReceivable(id: number): Promise<void> {
        await db.delete(receivables).where(eq(receivables.id, id));
    }
}

import { db } from "../db";
import {
    tasks, comments, commentReads, subtasks, payouts, payees,
    dashboards, columns, receivables, teamMembers, activityLog, notifications, slotsCredits,
    type Task, type InsertTask, type Comment, type InsertComment,
    type Subtask, type InsertSubtask, type Payout, type Payee, type InsertPayee,
    type Dashboard, type InsertDashboard, type Column, type InsertColumn,
    type Receivable, type InsertReceivable, type TeamMember, type InsertTeamMember,
    type ActivityLog, type InsertActivityLog, type Notification, type InsertNotification,
    type SlotsCredits, type InsertSlotsCredits
} from "@shared/schema";
import { eq, and, inArray, isNull, desc, asc, ilike, or, count, sql } from "drizzle-orm";

export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface IStorage {
    // Task operations
    getTasks(dashboardId?: number | null): Promise<Task[]>;
    getTasksPaginated(options: {
        dashboardId?: number | null;
        page?: number;
        pageSize?: number;
        includeArchived?: boolean;
        search?: string;
    }): Promise<PaginatedResult<Task>>;
    getTask(id: number): Promise<Task | undefined>;
    createTask(task: InsertTask): Promise<Task>;
    updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;
    deleteTask(id: number): Promise<void>;
    archiveTask(id: number): Promise<Task | undefined>;
    restoreTask(id: number): Promise<Task | undefined>;
    reorderTasks(taskIds: number[]): Promise<void>;

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

    // Team Member operations
    getTeamMembers(): Promise<TeamMember[]>;
    getTeamMember(id: number): Promise<TeamMember | undefined>;
    createTeamMember(member: InsertTeamMember): Promise<TeamMember>;
    updateTeamMember(id: number, member: Partial<InsertTeamMember>): Promise<TeamMember | undefined>;
    deleteTeamMember(id: number): Promise<void>;

    // Activity Log operations
    getActivityLog(options: {
        taskId?: number;
        dashboardId?: number;
        page?: number;
        pageSize?: number;
    }): Promise<PaginatedResult<ActivityLog>>;
    getTaskActivityLog(taskId: number, limit?: number): Promise<ActivityLog[]>;
    logActivity(log: InsertActivityLog): Promise<ActivityLog>;

    // Notification operations
    getNotifications(userId: string, limit?: number): Promise<Notification[]>;
    markNotificationAsRead(id: number): Promise<Notification | undefined>;
    markAllNotificationsAsRead(userId: string): Promise<void>;
    deleteNotification(id: number): Promise<void>;
    createNotification(notification: InsertNotification): Promise<Notification>;

    // Slots Credits operations (for mini-game leaderboard)
    getSlotsCredits(userId: string): Promise<SlotsCredits | undefined>;
    getOrCreateSlotsCredits(userId: string, username: string): Promise<SlotsCredits>;
    updateSlotsCredits(userId: string, updates: Partial<Omit<InsertSlotsCredits, 'userId' | 'username'>>): Promise<SlotsCredits | undefined>;
    getSlotsLeaderboard(limit?: number): Promise<SlotsCredits[]>;
}

export class DatabaseStorage implements IStorage {
    async getTasks(dashboardId?: number | null): Promise<Task[]> {
        if (dashboardId !== undefined) {
            if (dashboardId === null) {
                return await db.select().from(tasks)
                    .where(and(isNull(tasks.dashboardId), eq(tasks.archived, false)))
                    .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt));
            }
            return await db.select().from(tasks)
                .where(and(eq(tasks.dashboardId, dashboardId), eq(tasks.archived, false)))
                .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt));
        }
        return await db.select().from(tasks)
            .where(eq(tasks.archived, false))
            .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt));
    }

    async getTasksPaginated(options: {
        dashboardId?: number | null;
        page?: number;
        pageSize?: number;
        includeArchived?: boolean;
        search?: string;
    }): Promise<PaginatedResult<Task>> {
        const page = options.page || 1;
        const pageSize = options.pageSize || 50;
        const offset = (page - 1) * pageSize;

        const conditions = [];

        if (options.dashboardId !== undefined) {
            if (options.dashboardId === null) {
                conditions.push(isNull(tasks.dashboardId));
            } else {
                conditions.push(eq(tasks.dashboardId, options.dashboardId));
            }
        }

        if (!options.includeArchived) {
            conditions.push(eq(tasks.archived, false));
        }

        if (options.search) {
            conditions.push(
                or(
                    ilike(tasks.title, `%${options.search}%`),
                    ilike(tasks.description, `%${options.search}%`)
                )
            );
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const [data, totalResult] = await Promise.all([
            db.select().from(tasks)
                .where(whereClause)
                .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt))
                .limit(pageSize)
                .offset(offset),
            db.select({ count: count() }).from(tasks).where(whereClause)
        ]);

        const total = totalResult[0]?.count || 0;

        return {
            data,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize)
        };
    }

    async getTask(id: number): Promise<Task | undefined> {
        const result = await db.select().from(tasks).where(eq(tasks.id, id));
        return result[0];
    }

    async createTask(insertTask: InsertTask): Promise<Task> {
        const result = await db.insert(tasks).values({
            ...insertTask,
            updatedAt: new Date()
        }).returning();
        return result[0];
    }

    async updateTask(id: number, updateData: Partial<InsertTask>): Promise<Task | undefined> {
        const data: Record<string, unknown> = { ...updateData, updatedAt: new Date() };
        if (data.dueDate !== undefined) {
            if (typeof data.dueDate === 'string') {
                data.dueDate = data.dueDate ? new Date(data.dueDate as string) : null;
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

    async archiveTask(id: number): Promise<Task | undefined> {
        const result = await db
            .update(tasks)
            .set({ archived: true, archivedAt: new Date(), updatedAt: new Date() })
            .where(eq(tasks.id, id))
            .returning();
        return result[0];
    }

    async restoreTask(id: number): Promise<Task | undefined> {
        const result = await db
            .update(tasks)
            .set({ archived: false, archivedAt: null, updatedAt: new Date() })
            .where(eq(tasks.id, id))
            .returning();
        return result[0];
    }

    async reorderTasks(taskIds: number[]): Promise<void> {
        await db.transaction(async (tx) => {
            for (let i = 0; i < taskIds.length; i++) {
                await tx.update(tasks)
                    .set({ sortOrder: i })
                    .where(eq(tasks.id, taskIds[i]));
            }
        });
    }

    async getCommentsByTaskId(taskId: number): Promise<Comment[]> {
        return await db
            .select()
            .from(comments)
            .where(eq(comments.taskId, taskId))
            .orderBy(asc(comments.createdAt));
    }

    async createComment(insertComment: InsertComment): Promise<Comment> {
        const result = await db.insert(comments).values(insertComment).returning();
        return result[0];
    }

    async markCommentAsRead(commentId: number, userName: string): Promise<void> {
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
            const taskComments = await tx
                .select({ id: comments.id })
                .from(comments)
                .where(eq(comments.taskId, taskId));

            const commentIds = taskComments.map((c: { id: number }) => c.id);

            if (commentIds.length === 0) {
                return;
            }

            const alreadyRead = await tx
                .select({ commentId: commentReads.commentId })
                .from(commentReads)
                .where(and(
                    eq(commentReads.userName, userName),
                    inArray(commentReads.commentId, commentIds)
                ));

            const alreadyReadIds = new Set(alreadyRead.map((r: { commentId: number }) => r.commentId));
            const toMarkAsRead = commentIds.filter((id: number) => !alreadyReadIds.has(id));

            if (toMarkAsRead.length > 0) {
                await tx.insert(commentReads).values(
                    toMarkAsRead.map((commentId: number) => ({ commentId, userName }))
                );
            }
        });
    }

    async getUnreadCommentCounts(userName: string): Promise<Map<number, number>> {
        // Optimized query using SQL aggregation
        const result = await db
            .select({
                taskId: comments.taskId,
                unreadCount: count()
            })
            .from(comments)
            .leftJoin(
                commentReads,
                and(
                    eq(comments.id, commentReads.commentId),
                    eq(commentReads.userName, userName)
                )
            )
            .where(
                and(
                    isNull(commentReads.id),
                    sql`${comments.author} != ${userName}`
                )
            )
            .groupBy(comments.taskId);

        const unreadCounts = new Map<number, number>();
        for (const row of result) {
            unreadCounts.set(row.taskId, Number(row.unreadCount));
        }
        return unreadCounts;
    }

    async getSubtasksByTaskId(taskId: number): Promise<Subtask[]> {
        return await db
            .select()
            .from(subtasks)
            .where(eq(subtasks.taskId, taskId))
            .orderBy(asc(subtasks.createdAt));
    }

    async createSubtask(insertSubtask: InsertSubtask): Promise<Subtask> {
        const result = await db.insert(subtasks).values(insertSubtask).returning();
        return result[0];
    }

    async updateSubtask(id: number, subtaskUpdate: Partial<InsertSubtask>): Promise<Subtask | undefined> {
        const updateData: Record<string, unknown> = { ...subtaskUpdate };
        if (updateData.dueDate !== undefined) {
            if (typeof updateData.dueDate === 'string') {
                updateData.dueDate = updateData.dueDate ? new Date(updateData.dueDate as string) : null;
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
        }

        return Array.from(groupedByName.entries()).map(([name, taskList]) => ({
            name,
            totalUnpaid: taskList.reduce((sum, task) => sum + task.amount, 0),
            tasks: taskList,
        }));
    }

    async getDashboards(): Promise<Dashboard[]> {
        return await db.select().from(dashboards).orderBy(asc(dashboards.createdAt));
    }

    async createDashboard(insertDashboard: InsertDashboard): Promise<Dashboard> {
        const result = await db.insert(dashboards).values(insertDashboard).returning();
        const dashboard = result[0];

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
        return await db.select().from(columns)
            .where(eq(columns.dashboardId, dashboardId))
            .orderBy(asc(columns.order));
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
        return await db.select().from(receivables).orderBy(desc(receivables.createdAt));
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

    // Team Member operations
    async getTeamMembers(): Promise<TeamMember[]> {
        return await db.select().from(teamMembers)
            .where(eq(teamMembers.isActive, true))
            .orderBy(asc(teamMembers.name));
    }

    async getTeamMember(id: number): Promise<TeamMember | undefined> {
        const result = await db.select().from(teamMembers).where(eq(teamMembers.id, id));
        return result[0];
    }

    async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
        const result = await db.insert(teamMembers).values(member).returning();
        return result[0];
    }

    async updateTeamMember(id: number, member: Partial<InsertTeamMember>): Promise<TeamMember | undefined> {
        const result = await db
            .update(teamMembers)
            .set(member)
            .where(eq(teamMembers.id, id))
            .returning();
        return result[0];
    }

    async deleteTeamMember(id: number): Promise<void> {
        // Soft delete by marking as inactive
        await db.update(teamMembers)
            .set({ isActive: false })
            .where(eq(teamMembers.id, id));
    }

    // Activity Log operations
    async getActivityLog(options: {
        taskId?: number;
        dashboardId?: number;
        page?: number;
        pageSize?: number;
    }): Promise<PaginatedResult<ActivityLog>> {
        const page = options.page || 1;
        const pageSize = options.pageSize || 50;
        const offset = (page - 1) * pageSize;

        const conditions = [];

        if (options.taskId !== undefined) {
            conditions.push(eq(activityLog.taskId, options.taskId));
        }

        if (options.dashboardId !== undefined) {
            conditions.push(eq(activityLog.dashboardId, options.dashboardId));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const [data, totalResult] = await Promise.all([
            db.select().from(activityLog)
                .where(whereClause)
                .orderBy(desc(activityLog.createdAt))
                .limit(pageSize)
                .offset(offset),
            db.select({ count: count() }).from(activityLog).where(whereClause)
        ]);

        const total = totalResult[0]?.count || 0;

        return {
            data,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize)
        };
    }

    async getTaskActivityLog(taskId: number, limit: number = 50): Promise<ActivityLog[]> {
        return await db.select().from(activityLog)
            .where(eq(activityLog.taskId, taskId))
            .orderBy(desc(activityLog.createdAt))
            .limit(limit);
    }

    async logActivity(log: InsertActivityLog): Promise<ActivityLog> {
        const result = await db.insert(activityLog).values(log).returning();
        return result[0];
    }

    // Notification operations
    async getNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
        return await db.select().from(notifications)
            .where(eq(notifications.userId, userId))
            .orderBy(desc(notifications.createdAt))
            .limit(limit);
    }

    async markNotificationAsRead(id: number): Promise<Notification | undefined> {
        const result = await db
            .update(notifications)
            .set({ read: true })
            .where(eq(notifications.id, id))
            .returning();
        return result[0];
    }

    async markAllNotificationsAsRead(userId: string): Promise<void> {
        await db
            .update(notifications)
            .set({ read: true })
            .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
    }

    async deleteNotification(id: number): Promise<void> {
        await db.delete(notifications).where(eq(notifications.id, id));
    }

    async createNotification(notification: InsertNotification): Promise<Notification> {
        const result = await db.insert(notifications).values(notification).returning();
        return result[0];
    }

    // Slots Credits operations
    async getSlotsCredits(userId: string): Promise<SlotsCredits | undefined> {
        const result = await db.select().from(slotsCredits).where(eq(slotsCredits.userId, userId));
        return result[0];
    }

    async getOrCreateSlotsCredits(userId: string, username: string): Promise<SlotsCredits> {
        const existing = await this.getSlotsCredits(userId);
        if (existing) return existing;

        const result = await db.insert(slotsCredits).values({
            userId,
            username,
            credits: 100,
            highScore: 100,
            gamesPlayed: 0,
            biggestWin: 0,
        }).returning();
        return result[0];
    }

    async updateSlotsCredits(userId: string, updates: Partial<Omit<InsertSlotsCredits, 'userId' | 'username'>>): Promise<SlotsCredits | undefined> {
        const result = await db
            .update(slotsCredits)
            .set({ ...updates, lastPlayedAt: new Date() })
            .where(eq(slotsCredits.userId, userId))
            .returning();
        return result[0];
    }

    async getSlotsLeaderboard(limit: number = 10): Promise<SlotsCredits[]> {
        return await db.select().from(slotsCredits)
            .orderBy(desc(slotsCredits.highScore))
            .limit(limit);
    }
}

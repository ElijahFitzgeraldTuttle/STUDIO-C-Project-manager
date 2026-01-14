import {
  type Task, type InsertTask, type Comment, type InsertComment,
  type Subtask, type InsertSubtask, type Payout, type Payee, type InsertPayee,
  type Dashboard, type InsertDashboard, type Column, type InsertColumn,
  type Receivable, type InsertReceivable, type TeamMember, type InsertTeamMember,
  type ActivityLog, type InsertActivityLog, type Notification, type InsertNotification
} from "@shared/schema";
import type { IStorage, PaginatedResult } from "./storage-impl";

export class MemStorage implements IStorage {
  private tasks: Map<number, Task> = new Map();
  private comments: Map<number, Comment> = new Map();
  private commentReads: Map<number, { commentId: number; userName: string; readAt: Date }[]> = new Map();
  private subtasks: Map<number, Subtask> = new Map();
  private payouts: Map<number, Payout> = new Map();
  private payees: Map<number, Payee> = new Map();
  private dashboards: Map<number, Dashboard> = new Map();
  private columns: Map<number, Column> = new Map();
  private receivables: Map<number, Receivable> = new Map();
  private teamMembersMap: Map<number, TeamMember> = new Map();
  private activityLogMap: Map<number, ActivityLog> = new Map();
  private notificationsMap: Map<number, Notification> = new Map();

  private currentIds: Record<string, number> = {
    tasks: 1,
    comments: 1,
    commentReads: 1,
    subtasks: 1,
    payouts: 1,
    payees: 1,
    dashboards: 1,
    columns: 1,
    receivables: 1,
    teamMembers: 1,
    activityLog: 1,
    notifications: 1,
  };

  constructor() {
    this.seed();
  }

  private async seed() {
    // Seed Team Members (replaces hardcoded users)
    await this.createTeamMember({ name: "Miles", email: "miles@studioc.com", avatarColor: "#6366f1", role: "admin" });
    await this.createTeamMember({ name: "Eli", email: "eli@studioc.com", avatarColor: "#8b5cf6", role: "member" });
    await this.createTeamMember({ name: "Chase", email: "chase@studioc.com", avatarColor: "#ec4899", role: "member" });

    // Seed Dashboards
    const studioC = await this.createDashboard({ name: "Studio C Productions" });
    const marketing = await this.createDashboard({ name: "Marketing Campaign" });

    // Seed Tasks for Studio C
    const task1 = await this.createTask({
      title: "Commercial Shoot - Nike",
      description: "Full day shoot at downtown location. High priority for VFX team.",
      status: "in-progress",
      priority: "high",
      assignees: ["Eli", "Miles"],
      tags: ["production"],
      tracking: JSON.stringify({ delivered: true, invoiced: true, paid: false, distributed: false }),
      dashboardId: studioC.id,
      dueDate: new Date(Date.now() + 86400000 * 2),
    } as InsertTask);

    await this.createSubtask({
      taskId: task1.id,
      title: "Confirm crew list",
      completed: true,
      assignees: ["Eli"],
      dueDate: new Date(),
    });

    await this.createSubtask({
      taskId: task1.id,
      title: "Equipment check",
      completed: false,
      assignees: ["Miles"],
      dueDate: new Date(Date.now() + 86400000),
    });

    await this.createTask({
      title: "Post-Production: Coca Cola",
      description: "Color grading and sound design for the 30s spot.",
      status: "scheduled",
      priority: "medium",
      assignees: ["Chase"],
      tags: ["post"],
      tracking: JSON.stringify({ delivered: false, invoiced: false, paid: false, distributed: false }),
      dashboardId: studioC.id,
      dueDate: new Date(Date.now() + 86400000 * 5),
    } as InsertTask);

    await this.createTask({
      title: "Client Review Meeting",
      description: "Present the final cut to the marketing team.",
      status: "prospect",
      priority: "urgent",
      assignees: ["Miles"],
      tags: ["meeting"],
      tracking: JSON.stringify({}),
      dashboardId: studioC.id,
      dueDate: new Date(Date.now() + 86400000),
    } as InsertTask);

    // Seed Marketing Tasks
    await this.createTask({
      title: "Social Media Strategy",
      description: "Develop the Q1 strategy for Instagram and TikTok.",
      status: "prospect",
      priority: "low",
      assignees: ["Eli"],
      tags: ["marketing"],
      tracking: JSON.stringify({ strategy_approved: false, content_ready: false }),
      dashboardId: marketing.id,
      dueDate: new Date(Date.now() + 86400000 * 10),
    } as InsertTask);
  }

  // Task operations
  async getTasks(dashboardId?: number | null): Promise<Task[]> {
    const allTasks = Array.from(this.tasks.values());
    let filtered = allTasks.filter(t => !t.archived);
    if (dashboardId !== undefined) {
      filtered = filtered.filter(t => t.dashboardId === dashboardId);
    }
    return filtered.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }

  async getTasksPaginated(options: {
    dashboardId?: number | null;
    page?: number;
    pageSize?: number;
    includeArchived?: boolean;
    search?: string;
  }): Promise<PaginatedResult<Task>> {
    let allTasks = Array.from(this.tasks.values());

    if (!options.includeArchived) {
      allTasks = allTasks.filter(t => !t.archived);
    }

    if (options.dashboardId !== undefined) {
      allTasks = allTasks.filter(t => t.dashboardId === options.dashboardId);
    }

    if (options.search) {
      const search = options.search.toLowerCase();
      allTasks = allTasks.filter(t =>
        t.title.toLowerCase().includes(search) ||
        t.description.toLowerCase().includes(search)
      );
    }

    const page = options.page || 1;
    const pageSize = options.pageSize || 50;
    const start = (page - 1) * pageSize;
    const data = allTasks.slice(start, start + pageSize);

    return {
      data,
      total: allTasks.length,
      page,
      pageSize,
      totalPages: Math.ceil(allTasks.length / pageSize)
    };
  }

  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.currentIds.tasks++;
    const now = new Date();
    const task: Task = {
      ...insertTask,
      id,
      createdAt: now,
      updatedAt: now,
      archived: false,
      archivedAt: null,
      sortOrder: id,
      priority: insertTask.priority || "medium"
    } as Task;
    if (!task.assignees) task.assignees = [];
    if (!task.tags) task.tags = [];
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(id: number, taskUpdate: Partial<InsertTask>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    const updated = { ...task, ...taskUpdate, updatedAt: new Date() };
    this.tasks.set(id, updated as Task);
    return updated as Task;
  }

  async deleteTask(id: number): Promise<void> {
    this.tasks.delete(id);
  }

  async archiveTask(id: number): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    const updated = { ...task, archived: true, archivedAt: new Date(), updatedAt: new Date() };
    this.tasks.set(id, updated);
    return updated;
  }

  async restoreTask(id: number): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    const updated = { ...task, archived: false, archivedAt: null, updatedAt: new Date() };
    this.tasks.set(id, updated);
    return updated;
  }

  async reorderTasks(taskIds: number[]): Promise<void> {
    taskIds.forEach((taskId, index) => {
      const task = this.tasks.get(taskId);
      if (task) {
        this.tasks.set(taskId, { ...task, sortOrder: index });
      }
    });
  }

  // Comment operations
  async getCommentsByTaskId(taskId: number): Promise<Comment[]> {
    return Array.from(this.comments.values()).filter(c => c.taskId === taskId);
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const id = this.currentIds.comments++;
    const comment: Comment = { ...insertComment, id, createdAt: new Date() } as Comment;
    this.comments.set(id, comment);
    return comment;
  }

  async markCommentAsRead(commentId: number, userName: string): Promise<void> {
    let reads = this.commentReads.get(commentId) || [];
    if (!reads.some(r => r.userName === userName)) {
      reads.push({ commentId, userName, readAt: new Date() });
      this.commentReads.set(commentId, reads);
    }
  }

  async markAllTaskCommentsAsRead(taskId: number, userName: string): Promise<void> {
    const taskComments = await this.getCommentsByTaskId(taskId);
    for (const comment of taskComments) {
      await this.markCommentAsRead(comment.id, userName);
    }
  }

  async getUnreadCommentCounts(userName: string): Promise<Map<number, number>> {
    const unreadCounts = new Map<number, number>();
    for (const comment of Array.from(this.comments.values())) {
      if (comment.author === userName) continue;
      const reads = this.commentReads.get(comment.id) || [];
      if (!reads.some(r => r.userName === userName)) {
        unreadCounts.set(comment.taskId, (unreadCounts.get(comment.taskId) || 0) + 1);
      }
    }
    return unreadCounts;
  }

  // Subtask operations
  async getSubtasksByTaskId(taskId: number): Promise<Subtask[]> {
    return Array.from(this.subtasks.values()).filter(s => s.taskId === taskId);
  }

  async createSubtask(insertSubtask: InsertSubtask): Promise<Subtask> {
    const id = this.currentIds.subtasks++;
    const subtask: Subtask = {
      ...insertSubtask,
      id,
      completed: insertSubtask.completed || false,
      createdAt: new Date()
    } as Subtask;
    if (!subtask.assignees) subtask.assignees = [];
    this.subtasks.set(id, subtask);
    return subtask;
  }

  async updateSubtask(id: number, subtaskUpdate: Partial<InsertSubtask>): Promise<Subtask | undefined> {
    const subtask = this.subtasks.get(id);
    if (!subtask) return undefined;
    const updated = { ...subtask, ...subtaskUpdate };
    this.subtasks.set(id, updated as Subtask);
    return updated as Subtask;
  }

  async deleteSubtask(id: number): Promise<void> {
    this.subtasks.delete(id);
  }

  // Payout operations
  async getPayoutByTaskId(taskId: number): Promise<(Payout & { payees: Payee[] }) | null> {
    const payout = Array.from(this.payouts.values()).find(p => p.taskId === taskId);
    if (!payout) return null;
    const payeesList = Array.from(this.payees.values()).filter(p => p.payoutId === payout.id);
    return { ...payout, payees: payeesList };
  }

  async createOrUpdatePayout(taskId: number, totalAmount: number): Promise<Payout> {
    const existing = Array.from(this.payouts.values()).find(p => p.taskId === taskId);
    if (existing) {
      const updated = { ...existing, totalAmount };
      this.payouts.set(existing.id, updated);
      return updated;
    }
    const id = this.currentIds.payouts++;
    const payout: Payout = { id, taskId, totalAmount };
    this.payouts.set(id, payout);
    return payout;
  }

  async addPayee(payoutId: number, insertPayee: Omit<InsertPayee, "payoutId">): Promise<Payee> {
    const id = this.currentIds.payees++;
    const payee: Payee = { ...insertPayee, id, payoutId, paid: insertPayee.paid || false } as Payee;
    this.payees.set(id, payee);
    return payee;
  }

  async updatePayee(id: number, payeeUpdate: Partial<Omit<InsertPayee, "payoutId">>): Promise<Payee | undefined> {
    const payee = this.payees.get(id);
    if (!payee) return undefined;
    const updated = { ...payee, ...payeeUpdate };
    this.payees.set(id, updated as Payee);
    return updated as Payee;
  }

  async deletePayee(id: number): Promise<void> {
    this.payees.delete(id);
  }

  async getUnpaidPayouts(): Promise<Array<{ name: string; totalUnpaid: number; tasks: Array<{ taskId: number; taskTitle: string; amount: number; reason: string }> }>> {
    const unpaid = Array.from(this.payees.values()).filter(p => !p.paid);
    const groups = new Map<string, Array<{ taskId: number; taskTitle: string; amount: number; reason: string }>>();
    for (const payee of unpaid) {
      const payout = this.payouts.get(payee.payoutId);
      const task = payout ? this.tasks.get(payout.taskId) : null;
      if (!groups.has(payee.name)) groups.set(payee.name, []);
      groups.get(payee.name)!.push({
        taskId: task?.id || 0,
        taskTitle: task?.title || "Unknown Task",
        amount: payee.amount,
        reason: payee.reason,
      });
    }
    return Array.from(groups.entries()).map(([name, taskList]) => ({
      name,
      totalUnpaid: taskList.reduce((sum, t) => sum + t.amount, 0),
      tasks: taskList,
    }));
  }

  // Dashboard operations
  async getDashboards(): Promise<Dashboard[]> {
    return Array.from(this.dashboards.values());
  }

  async createDashboard(insertDashboard: InsertDashboard): Promise<Dashboard> {
    const id = this.currentIds.dashboards++;
    const dashboard: Dashboard = { ...insertDashboard, id, createdAt: new Date() } as Dashboard;
    if (!dashboard.trackingFields) dashboard.trackingFields = ['delivered', 'invoiced', 'paid', 'distributed'];
    if (!dashboard.trackingLabels) dashboard.trackingLabels = '{}';
    this.dashboards.set(id, dashboard);

    const defaultColumns = [
      { dashboardId: id, name: "prospect", color: "#f1f5f9", order: 0 },
      { dashboardId: id, name: "scheduled", color: "#fef3c7", order: 1 },
      { dashboardId: id, name: "in-progress", color: "#dbeafe", order: 2 },
      { dashboardId: id, name: "complete", color: "#d1fae5", order: 3 },
    ];
    for (const col of defaultColumns) {
      await this.createColumn(col as InsertColumn);
    }

    return dashboard;
  }

  async updateDashboard(id: number, dashboardUpdate: Partial<InsertDashboard>): Promise<Dashboard | undefined> {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) return undefined;
    const updated = { ...dashboard, ...dashboardUpdate };
    this.dashboards.set(id, updated as Dashboard);
    return updated as Dashboard;
  }

  async deleteDashboard(id: number): Promise<void> {
    this.dashboards.delete(id);
  }

  // Column operations
  async getColumns(dashboardId: number): Promise<Column[]> {
    return Array.from(this.columns.values())
      .filter(c => c.dashboardId === dashboardId)
      .sort((a, b) => a.order - b.order);
  }

  async createColumn(insertColumn: InsertColumn): Promise<Column> {
    const id = this.currentIds.columns++;
    const column: Column = { ...insertColumn, id, createdAt: new Date() } as Column;
    this.columns.set(id, column);
    return column;
  }

  async updateColumn(id: number, columnUpdate: Partial<InsertColumn>): Promise<Column | undefined> {
    const column = this.columns.get(id);
    if (!column) return undefined;
    const updated = { ...column, ...columnUpdate };
    this.columns.set(id, updated as Column);
    return updated as Column;
  }

  async deleteColumn(id: number): Promise<void> {
    this.columns.delete(id);
  }

  // Receivable operations
  async getReceivables(): Promise<Receivable[]> {
    return Array.from(this.receivables.values());
  }

  async createReceivable(insertReceivable: InsertReceivable): Promise<Receivable> {
    const id = this.currentIds.receivables++;
    const receivable: Receivable = {
      ...insertReceivable,
      id,
      createdAt: new Date(),
      received: insertReceivable.received || false
    } as Receivable;
    this.receivables.set(id, receivable);
    return receivable;
  }

  async updateReceivable(id: number, receivableUpdate: Partial<InsertReceivable>): Promise<Receivable | undefined> {
    const receivable = this.receivables.get(id);
    if (!receivable) return undefined;
    const updated = { ...receivable, ...receivableUpdate };
    this.receivables.set(id, updated as Receivable);
    return updated as Receivable;
  }

  async deleteReceivable(id: number): Promise<void> {
    this.receivables.delete(id);
  }

  // Team Member operations
  async getTeamMembers(): Promise<TeamMember[]> {
    return Array.from(this.teamMembersMap.values()).filter(m => m.isActive);
  }

  async getTeamMember(id: number): Promise<TeamMember | undefined> {
    return this.teamMembersMap.get(id);
  }

  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const id = this.currentIds.teamMembers++;
    const teamMember: TeamMember = {
      ...member,
      id,
      createdAt: new Date(),
      isActive: member.isActive ?? true,
      avatarColor: member.avatarColor || "#6366f1",
      role: member.role || "member"
    } as TeamMember;
    this.teamMembersMap.set(id, teamMember);
    return teamMember;
  }

  async updateTeamMember(id: number, member: Partial<InsertTeamMember>): Promise<TeamMember | undefined> {
    const existing = this.teamMembersMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...member };
    this.teamMembersMap.set(id, updated as TeamMember);
    return updated as TeamMember;
  }

  async deleteTeamMember(id: number): Promise<void> {
    const member = this.teamMembersMap.get(id);
    if (member) {
      this.teamMembersMap.set(id, { ...member, isActive: false });
    }
  }

  // Activity Log operations
  async getActivityLog(options: {
    taskId?: number;
    dashboardId?: number;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResult<ActivityLog>> {
    let logs = Array.from(this.activityLogMap.values());

    if (options.taskId !== undefined) {
      logs = logs.filter(l => l.taskId === options.taskId);
    }

    if (options.dashboardId !== undefined) {
      logs = logs.filter(l => l.dashboardId === options.dashboardId);
    }

    logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const page = options.page || 1;
    const pageSize = options.pageSize || 50;
    const start = (page - 1) * pageSize;
    const data = logs.slice(start, start + pageSize);

    return {
      data,
      total: logs.length,
      page,
      pageSize,
      totalPages: Math.ceil(logs.length / pageSize)
    };
  }

  async getTaskActivityLog(taskId: number, limit: number = 50): Promise<ActivityLog[]> {
    return Array.from(this.activityLogMap.values())
      .filter(l => l.taskId === taskId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async logActivity(log: InsertActivityLog): Promise<ActivityLog> {
    const id = this.currentIds.activityLog++;
    const activity: ActivityLog = { ...log, id, createdAt: new Date() } as ActivityLog;
    this.activityLogMap.set(id, activity);
    return activity;
  }

  // Notification operations
  async getNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    return Array.from(this.notificationsMap.values())
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const notification = this.notificationsMap.get(id);
    if (!notification) return undefined;
    const updated = { ...notification, read: true };
    this.notificationsMap.set(id, updated);
    return updated;
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    for (const [id, notification] of this.notificationsMap) {
      if (notification.userId === userId && !notification.read) {
        this.notificationsMap.set(id, { ...notification, read: true });
      }
    }
  }

  async deleteNotification(id: number): Promise<void> {
    this.notificationsMap.delete(id);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const id = this.currentIds.notifications++;
    const notif: Notification = {
      ...notification,
      id,
      createdAt: new Date(),
      read: notification.read || false,
      type: notification.type || "info"
    } as Notification;
    this.notificationsMap.set(id, notif);
    return notif;
  }
}

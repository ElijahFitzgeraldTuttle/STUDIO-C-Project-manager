
import { tasks, comments, commentReads, subtasks, payouts, payees, dashboards, columns, receivables, type Task, type InsertTask, type Comment, type InsertComment, type InsertCommentRead, type Subtask, type InsertSubtask, type Payout, type InsertPayout, type Payee, type InsertPayee, type Dashboard, type InsertDashboard, type Column, type InsertColumn, type Receivable, type InsertReceivable } from "@shared/schema";
import { IStorage } from "./storage";

export class MemStorage implements IStorage {
  private tasks: Map<number, Task> = new Map();
  private comments: Map<number, Comment> = new Map();
  private commentReads: Map<number, any[]> = new Map();
  private subtasks: Map<number, Subtask> = new Map();
  private payouts: Map<number, Payout> = new Map();
  private payees: Map<number, Payee> = new Map();
  private dashboards: Map<number, Dashboard> = new Map();
  private columns: Map<number, Column> = new Map();
  private receivables: Map<number, Receivable> = new Map();

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
  };

  constructor() {
    // Optionally seed some data
  }

  async getTasks(dashboardId?: number | null): Promise<Task[]> {
    const allTasks = Array.from(this.tasks.values());
    if (dashboardId !== undefined) {
      return allTasks.filter(t => t.dashboardId === dashboardId);
    }
    return allTasks;
  }

  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.currentIds.tasks++;
    const task: Task = { ...insertTask, id, createdAt: new Date() } as any;
    if (!task.assignees) task.assignees = [];
    if (!task.tags) task.tags = [];
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(id: number, taskUpdate: Partial<InsertTask>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    const updated = { ...task, ...taskUpdate };
    this.tasks.set(id, updated as any);
    return updated as any;
  }

  async deleteTask(id: number): Promise<void> {
    this.tasks.delete(id);
  }

  async getCommentsByTaskId(taskId: number): Promise<Comment[]> {
    return Array.from(this.comments.values()).filter(c => c.taskId === taskId);
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const id = this.currentIds.comments++;
    const comment: Comment = { ...insertComment, id, createdAt: new Date() } as any;
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

  async getSubtasksByTaskId(taskId: number): Promise<Subtask[]> {
    return Array.from(this.subtasks.values()).filter(s => s.taskId === taskId);
  }

  async createSubtask(insertSubtask: InsertSubtask): Promise<Subtask> {
    const id = this.currentIds.subtasks++;
    const subtask: Subtask = { ...insertSubtask, id, completed: insertSubtask.completed || false, createdAt: new Date() } as any;
    if (!subtask.assignees) subtask.assignees = [];
    this.subtasks.set(id, subtask);
    return subtask;
  }

  async updateSubtask(id: number, subtaskUpdate: Partial<InsertSubtask>): Promise<Subtask | undefined> {
    const subtask = this.subtasks.get(id);
    if (!subtask) return undefined;
    const updated = { ...subtask, ...subtaskUpdate };
    this.subtasks.set(id, updated as any);
    return updated as any;
  }

  async deleteSubtask(id: number): Promise<void> {
    this.subtasks.delete(id);
  }

  async getPayoutByTaskId(taskId: number): Promise<(Payout & { payees: Payee[] }) | null> {
    const payout = Array.from(this.payouts.values()).find(p => p.taskId === taskId);
    if (!payout) return null;
    const payees = Array.from(this.payees.values()).filter(p => p.payoutId === payout.id);
    return { ...payout, payees };
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
    const payee: Payee = { ...insertPayee, id, payoutId, paid: insertPayee.paid || false } as any;
    this.payees.set(id, payee);
    return payee;
  }

  async updatePayee(id: number, payeeUpdate: Partial<Omit<InsertPayee, "payoutId">>): Promise<Payee | undefined> {
    const payee = this.payees.get(id);
    if (!payee) return undefined;
    const updated = { ...payee, ...payeeUpdate };
    this.payees.set(id, updated as any);
    return updated as any;
  }

  async deletePayee(id: number): Promise<void> {
    this.payees.delete(id);
  }

  async getUnpaidPayouts(): Promise<Array<{ name: string; totalUnpaid: number; tasks: Array<{ taskId: number; taskTitle: string; amount: number; reason: string }> }>> {
    const unpaid = Array.from(this.payees.values()).filter(p => !p.paid);
    const groups = new Map<string, any[]>();
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
    return Array.from(groups.entries()).map(([name, tasks]) => ({
      name,
      totalUnpaid: tasks.reduce((sum, t) => sum + t.amount, 0),
      tasks,
    }));
  }

  async getDashboards(): Promise<Dashboard[]> {
    return Array.from(this.dashboards.values());
  }

  async createDashboard(insertDashboard: InsertDashboard): Promise<Dashboard> {
    const id = this.currentIds.dashboards++;
    const dashboard: Dashboard = { ...insertDashboard, id, createdAt: new Date() } as any;
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
      await this.createColumn(col as any);
    }

    return dashboard;
  }

  async updateDashboard(id: number, dashboardUpdate: Partial<InsertDashboard>): Promise<Dashboard | undefined> {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) return undefined;
    const updated = { ...dashboard, ...dashboardUpdate };
    this.dashboards.set(id, updated as any);
    return updated as any;
  }

  async deleteDashboard(id: number): Promise<void> {
    this.dashboards.delete(id);
  }

  async getColumns(dashboardId: number): Promise<Column[]> {
    return Array.from(this.columns.values()).filter(c => c.dashboardId === dashboardId).sort((a, b) => a.order - b.order);
  }

  async createColumn(insertColumn: InsertColumn): Promise<Column> {
    const id = this.currentIds.columns++;
    const column: Column = { ...insertColumn, id, createdAt: new Date() } as any;
    this.columns.set(id, column);
    return column;
  }

  async updateColumn(id: number, columnUpdate: Partial<InsertColumn>): Promise<Column | undefined> {
    const column = this.columns.get(id);
    if (!column) return undefined;
    const updated = { ...column, ...columnUpdate };
    this.columns.set(id, updated as any);
    return updated as any;
  }

  async deleteColumn(id: number): Promise<void> {
    this.columns.delete(id);
  }

  async getReceivables(): Promise<Receivable[]> {
    return Array.from(this.receivables.values());
  }

  async createReceivable(insertReceivable: InsertReceivable): Promise<Receivable> {
    const id = this.currentIds.receivables++;
    const receivable: Receivable = { ...insertReceivable, id, createdAt: new Date(), received: insertReceivable.received || false } as any;
    this.receivables.set(id, receivable);
    return receivable;
  }

  async updateReceivable(id: number, receivableUpdate: Partial<InsertReceivable>): Promise<Receivable | undefined> {
    const receivable = this.receivables.get(id);
    if (!receivable) return undefined;
    const updated = { ...receivable, ...receivableUpdate };
    this.receivables.set(id, updated as any);
    return updated as any;
  }

  async deleteReceivable(id: number): Promise<void> {
    this.receivables.delete(id);
  }
}

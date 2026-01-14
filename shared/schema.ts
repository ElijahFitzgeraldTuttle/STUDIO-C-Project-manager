import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Priority levels for tasks
export const PRIORITY_LEVELS = ["low", "medium", "high", "urgent"] as const;
export type PriorityLevel = typeof PRIORITY_LEVELS[number];

// Activity action types
export const ACTIVITY_ACTIONS = [
  "task_created", "task_updated", "task_deleted", "task_archived", "task_restored",
  "task_moved", "task_assigned", "task_unassigned",
  "comment_added", "comment_deleted",
  "subtask_created", "subtask_completed", "subtask_deleted",
  "payout_updated", "payee_added", "payee_paid",
  "tracking_updated"
] as const;
export type ActivityAction = typeof ACTIVITY_ACTIONS[number];

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Team members table - replaces hardcoded users
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  email: text("email"),
  avatarColor: text("avatar_color").notNull().default("#6366f1"),
  role: text("role").notNull().default("member"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("team_members_name_idx").on(table.name),
]);

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("prospect"),
  priority: text("priority").notNull().default("medium"),
  assignees: text("assignees").array().notNull().default(sql`ARRAY[]::text[]`),
  tags: text("tags").array().notNull().default(sql`ARRAY[]::text[]`),
  tracking: text("tracking").notNull().default('{}'),
  dashboardId: integer("dashboard_id").references(() => dashboards.id, { onDelete: "set null" }),
  dueDate: timestamp("due_date"),
  archived: boolean("archived").notNull().default(false),
  archivedAt: timestamp("archived_at"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("tasks_dashboard_idx").on(table.dashboardId),
  index("tasks_status_idx").on(table.status),
  index("tasks_archived_idx").on(table.archived),
  index("tasks_priority_idx").on(table.priority),
  index("tasks_due_date_idx").on(table.dueDate),
]);

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  author: text("author").notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("comments_task_idx").on(table.taskId),
]);

export const commentReads = pgTable("comment_reads", {
  id: serial("id").primaryKey(),
  commentId: integer("comment_id").notNull().references(() => comments.id, { onDelete: "cascade" }),
  userName: text("user_name").notNull(),
  readAt: timestamp("read_at").defaultNow().notNull(),
}, (table) => [
  index("comment_reads_comment_idx").on(table.commentId),
  index("comment_reads_user_idx").on(table.userName),
]);

export const subtasks = pgTable("subtasks", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  completed: boolean("completed").notNull().default(false),
  assignees: text("assignees").array().notNull().default(sql`ARRAY[]::text[]`),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("subtasks_task_idx").on(table.taskId),
]);

export const payouts = pgTable("payouts", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  totalAmount: integer("total_amount").notNull().default(0),
}, (table) => [
  index("payouts_task_idx").on(table.taskId),
]);

export const payees = pgTable("payees", {
  id: serial("id").primaryKey(),
  payoutId: integer("payout_id").notNull().references(() => payouts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  reason: text("reason").notNull().default(""),
  amount: integer("amount").notNull().default(0),
  paid: boolean("paid").notNull().default(false),
}, (table) => [
  index("payees_payout_idx").on(table.payoutId),
  index("payees_paid_idx").on(table.paid),
]);

export const dashboards = pgTable("dashboards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  trackingFields: text("tracking_fields").array().notNull().default(sql`ARRAY['delivered', 'invoiced', 'paid', 'distributed']::text[]`),
  trackingLabels: text("tracking_labels").default('{}'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const columns = pgTable("columns", {
  id: serial("id").primaryKey(),
  dashboardId: integer("dashboard_id").notNull().references(() => dashboards.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#f1f5f9"),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("columns_dashboard_idx").on(table.dashboardId),
]);

export const receivables = pgTable("receivables", {
  id: serial("id").primaryKey(),
  clientName: text("client_name").notNull(),
  description: text("description").notNull().default(""),
  amount: integer("amount").notNull().default(0),
  received: boolean("received").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Activity log for tracking all changes
export const activityLog = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  dashboardId: integer("dashboard_id").references(() => dashboards.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  action: text("action").notNull(),
  details: text("details").notNull().default('{}'),
  previousValue: text("previous_value"),
  newValue: text("new_value"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("activity_log_task_idx").on(table.taskId),
  index("activity_log_dashboard_idx").on(table.dashboardId),
  index("activity_log_user_idx").on(table.userId),
  index("activity_log_created_idx").on(table.createdAt),
]);

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"),
  taskId: integer("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("notifications_user_idx").on(table.userId),
  index("notifications_read_idx").on(table.read),
  index("notifications_created_idx").on(table.createdAt),
]);

// Slots game credits for leaderboard
export const slotsCredits = pgTable("slots_credits", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  username: text("username").notNull(),
  credits: integer("credits").notNull().default(100),
  highScore: integer("high_score").notNull().default(100),
  gamesPlayed: integer("games_played").notNull().default(0),
  biggestWin: integer("biggest_win").notNull().default(0),
  lastPlayedAt: timestamp("last_played_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("slots_credits_user_idx").on(table.userId),
  index("slots_credits_credits_idx").on(table.credits),
  index("slots_credits_high_score_idx").on(table.highScore),
]);

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  createdAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks, {
  dueDate: z.union([z.date(), z.null()]).optional(),
  priority: z.enum(PRIORITY_LEVELS).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});

export const insertCommentReadSchema = createInsertSchema(commentReads).omit({
  id: true,
  readAt: true,
});

export const insertSubtaskSchema = createInsertSchema(subtasks, {
  dueDate: z.union([z.date(), z.null()]).optional(),
}).omit({
  id: true,
  createdAt: true,
});

export const insertPayoutSchema = createInsertSchema(payouts).omit({
  id: true,
});

export const insertPayeeSchema = createInsertSchema(payees).omit({
  id: true,
});

export const insertDashboardSchema = createInsertSchema(dashboards).omit({
  id: true,
  createdAt: true,
});

export const insertColumnSchema = createInsertSchema(columns).omit({
  id: true,
  createdAt: true,
});

export const insertReceivableSchema = createInsertSchema(receivables).omit({
  id: true,
  createdAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLog).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertSlotsCreditsSchema = createInsertSchema(slotsCredits).omit({
  id: true,
  createdAt: true,
  lastPlayedAt: true,
});

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertCommentRead = z.infer<typeof insertCommentReadSchema>;
export type CommentRead = typeof commentReads.$inferSelect;
export type InsertSubtask = z.infer<typeof insertSubtaskSchema>;
export type Subtask = typeof subtasks.$inferSelect;
export type InsertPayout = z.infer<typeof insertPayoutSchema>;
export type Payout = typeof payouts.$inferSelect;
export type InsertPayee = z.infer<typeof insertPayeeSchema>;
export type Payee = typeof payees.$inferSelect;
export type InsertDashboard = z.infer<typeof insertDashboardSchema>;
export type Dashboard = typeof dashboards.$inferSelect;
export type InsertColumn = z.infer<typeof insertColumnSchema>;
export type Column = typeof columns.$inferSelect;
export type InsertReceivable = z.infer<typeof insertReceivableSchema>;
export type Receivable = typeof receivables.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLog.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertSlotsCredits = z.infer<typeof insertSlotsCreditsSchema>;
export type SlotsCredits = typeof slotsCredits.$inferSelect;

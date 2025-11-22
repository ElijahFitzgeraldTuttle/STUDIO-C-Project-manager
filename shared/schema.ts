import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("prospect"),
  assignees: text("assignees").array().notNull().default(sql`ARRAY[]::text[]`),
  tags: text("tags").array().notNull().default(sql`ARRAY[]::text[]`),
  deliveredTracking: boolean("delivered_tracking").notNull().default(false),
  invoicedTracking: boolean("invoiced_tracking").notNull().default(false),
  paidTracking: boolean("paid_tracking").notNull().default(false),
  distributedTracking: boolean("distributed_tracking").notNull().default(false),
  dashboardId: integer("dashboard_id").references(() => dashboards.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  taskId: serial("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  author: text("author").notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const commentReads = pgTable("comment_reads", {
  id: serial("id").primaryKey(),
  commentId: integer("comment_id").notNull().references(() => comments.id, { onDelete: "cascade" }),
  userName: text("user_name").notNull(),
  readAt: timestamp("read_at").defaultNow().notNull(),
});

export const subtasks = pgTable("subtasks", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payouts = pgTable("payouts", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  totalAmount: integer("total_amount").notNull().default(0),
});

export const payees = pgTable("payees", {
  id: serial("id").primaryKey(),
  payoutId: integer("payout_id").notNull().references(() => payouts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  amount: integer("amount").notNull().default(0),
});

export const dashboards = pgTable("dashboards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});

export const insertCommentReadSchema = createInsertSchema(commentReads).omit({
  id: true,
  readAt: true,
});

export const insertSubtaskSchema = createInsertSchema(subtasks).omit({
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

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
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

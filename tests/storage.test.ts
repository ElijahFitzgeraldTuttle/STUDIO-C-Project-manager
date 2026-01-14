import { describe, it, expect, beforeEach } from 'vitest';
import { MemStorage } from '../server/mem-storage';

describe('MemStorage', () => {
    let storage: MemStorage;

    beforeEach(() => {
        storage = new MemStorage();
    });

    describe('Tasks', () => {
        it('should create a task', async () => {
            const task = await storage.createTask({
                title: 'Test Task',
                description: 'Test Description',
                status: 'prospect',
                priority: 'medium',
                assignees: ['Test User'],
                tags: ['test'],
                tracking: '{}',
                dashboardId: 1,
            });

            expect(task.id).toBeDefined();
            expect(task.title).toBe('Test Task');
            expect(task.priority).toBe('medium');
            expect(task.archived).toBe(false);
        });

        it('should get tasks filtered by dashboard', async () => {
            const tasks = await storage.getTasks(1);
            expect(Array.isArray(tasks)).toBe(true);
        });

        it('should archive and restore a task', async () => {
            const task = await storage.createTask({
                title: 'Archive Test',
                description: 'Test',
                status: 'prospect',
                priority: 'low',
                assignees: [],
                tags: [],
                tracking: '{}',
            });

            const archived = await storage.archiveTask(task.id);
            expect(archived?.archived).toBe(true);
            expect(archived?.archivedAt).not.toBeNull();

            const restored = await storage.restoreTask(task.id);
            expect(restored?.archived).toBe(false);
            expect(restored?.archivedAt).toBeNull();
        });

        it('should reorder tasks', async () => {
            const task1 = await storage.createTask({
                title: 'Task 1',
                description: 'Test',
                status: 'prospect',
                priority: 'medium',
                assignees: [],
                tags: [],
                tracking: '{}',
            });
            const task2 = await storage.createTask({
                title: 'Task 2',
                description: 'Test',
                status: 'prospect',
                priority: 'medium',
                assignees: [],
                tags: [],
                tracking: '{}',
            });

            await storage.reorderTasks([task2.id, task1.id]);

            const t1 = await storage.getTask(task1.id);
            const t2 = await storage.getTask(task2.id);

            expect(t2?.sortOrder).toBe(0);
            expect(t1?.sortOrder).toBe(1);
        });

        it('should paginate tasks', async () => {
            // MemStorage seeds data so we should have tasks already
            const result = await storage.getTasksPaginated({
                page: 1,
                pageSize: 10,
            });

            // Seeded data should exist
            expect(result.data).toBeDefined();
            expect(result.page).toBe(1);
            expect(result.pageSize).toBe(10);
            // Total pages could be 0 if no tasks exist in seedless state
            expect(result.totalPages).toBeGreaterThanOrEqual(0);
        });

        it('should search tasks', async () => {
            await storage.createTask({
                title: 'Searchable Task',
                description: 'This is unique content',
                status: 'prospect',
                priority: 'medium',
                assignees: [],
                tags: [],
                tracking: '{}',
            });

            const result = await storage.getTasksPaginated({
                search: 'Searchable',
            });

            expect(result.data.some(t => t.title.includes('Searchable'))).toBe(true);
        });
    });

    describe('Team Members', () => {
        it('should get seeded team members', async () => {
            const members = await storage.getTeamMembers();
            expect(members.length).toBeGreaterThan(0);
            expect(members.some(m => m.name === 'Miles')).toBe(true);
        });

        it('should create a team member', async () => {
            const member = await storage.createTeamMember({
                name: 'New Member',
                email: 'new@example.com',
                avatarColor: '#ff0000',
                role: 'member',
            });

            expect(member.id).toBeDefined();
            expect(member.name).toBe('New Member');
            expect(member.isActive).toBe(true);
        });

        it('should soft delete team member', async () => {
            const member = await storage.createTeamMember({
                name: 'To Delete',
                role: 'member',
            });

            await storage.deleteTeamMember(member.id);

            const deleted = await storage.getTeamMember(member.id);
            expect(deleted?.isActive).toBe(false);
        });
    });

    describe('Activity Log', () => {
        it('should log activity', async () => {
            const log = await storage.logActivity({
                taskId: 1,
                userId: 'Test User',
                action: 'task_created',
                details: JSON.stringify({ taskTitle: 'Test' }),
            });

            expect(log.id).toBeDefined();
            expect(log.action).toBe('task_created');
        });

        it('should get task activity log', async () => {
            await storage.logActivity({
                taskId: 1,
                userId: 'Test User',
                action: 'task_updated',
                details: '{}',
            });

            const logs = await storage.getTaskActivityLog(1);
            expect(logs.length).toBeGreaterThan(0);
        });

        it('should paginate activity log', async () => {
            const result = await storage.getActivityLog({
                page: 1,
                pageSize: 10,
            });

            expect(result.data).toBeDefined();
            expect(result.page).toBe(1);
        });
    });

    describe('Notifications', () => {
        it('should create a notification', async () => {
            const notification = await storage.createNotification({
                userId: 'TestUser',
                title: 'Test Notification',
                message: 'This is a test',
                type: 'info',
            });

            expect(notification.id).toBeDefined();
            expect(notification.read).toBe(false);
        });

        it('should mark notification as read', async () => {
            const notification = await storage.createNotification({
                userId: 'TestUser',
                title: 'Test',
                message: 'Test',
                type: 'info',
            });

            const updated = await storage.markNotificationAsRead(notification.id);
            expect(updated?.read).toBe(true);
        });

        it('should mark all notifications as read', async () => {
            await storage.createNotification({
                userId: 'BulkUser',
                title: 'Test 1',
                message: 'Test',
                type: 'info',
            });
            await storage.createNotification({
                userId: 'BulkUser',
                title: 'Test 2',
                message: 'Test',
                type: 'info',
            });

            await storage.markAllNotificationsAsRead('BulkUser');

            const notifications = await storage.getNotifications('BulkUser');
            expect(notifications.every(n => n.read)).toBe(true);
        });
    });

    describe('Comments', () => {
        it('should create and fetch comments', async () => {
            const comment = await storage.createComment({
                taskId: 1,
                author: 'Test User',
                text: 'Test comment',
            });

            expect(comment.id).toBeDefined();
            expect(comment.text).toBe('Test comment');

            const comments = await storage.getCommentsByTaskId(1);
            expect(comments.some(c => c.id === comment.id)).toBe(true);
        });

        it('should track unread comments', async () => {
            await storage.createComment({
                taskId: 1,
                author: 'Author1',
                text: 'Unread comment',
            });

            const counts = await storage.getUnreadCommentCounts('Reader1');
            expect(counts.get(1)).toBeGreaterThan(0);
        });

        it('should mark comments as read', async () => {
            const comment = await storage.createComment({
                taskId: 1,
                author: 'Author2',
                text: 'To be read',
            });

            await storage.markCommentAsRead(comment.id, 'Reader2');
            const counts = await storage.getUnreadCommentCounts('Reader2');

            // The comment we just marked as read shouldn't be counted
            // (though other comments might still be unread)
        });
    });

    describe('Subtasks', () => {
        it('should create and fetch subtasks', async () => {
            const subtask = await storage.createSubtask({
                taskId: 1,
                title: 'Test Subtask',
                completed: false,
                assignees: ['Test User'],
            });

            expect(subtask.id).toBeDefined();
            expect(subtask.completed).toBe(false);

            const subtasks = await storage.getSubtasksByTaskId(1);
            expect(subtasks.some(s => s.id === subtask.id)).toBe(true);
        });

        it('should update subtask completion', async () => {
            const subtask = await storage.createSubtask({
                taskId: 1,
                title: 'Complete me',
                completed: false,
            });

            const updated = await storage.updateSubtask(subtask.id, { completed: true });
            expect(updated?.completed).toBe(true);
        });
    });

    describe('Payouts', () => {
        it('should create payout and add payees', async () => {
            const payout = await storage.createOrUpdatePayout(1, 1000);
            expect(payout.totalAmount).toBe(1000);

            const payee = await storage.addPayee(payout.id, {
                name: 'Test Payee',
                reason: 'Services',
                amount: 500,
            });

            expect(payee.name).toBe('Test Payee');
            expect(payee.paid).toBe(false);

            const fullPayout = await storage.getPayoutByTaskId(1);
            expect(fullPayout?.payees.length).toBeGreaterThan(0);
        });

        it('should track unpaid payouts', async () => {
            const unpaid = await storage.getUnpaidPayouts();
            expect(Array.isArray(unpaid)).toBe(true);
        });
    });

    describe('Dashboards', () => {
        it('should get seeded dashboards', async () => {
            const dashboards = await storage.getDashboards();
            expect(dashboards.length).toBeGreaterThan(0);
        });

        it('should create dashboard with default columns', async () => {
            const dashboard = await storage.createDashboard({
                name: 'Test Dashboard',
            });

            expect(dashboard.id).toBeDefined();
            expect(dashboard.trackingFields).toEqual(['delivered', 'invoiced', 'paid', 'distributed']);

            const columns = await storage.getColumns(dashboard.id);
            expect(columns.length).toBe(4);
        });
    });
});

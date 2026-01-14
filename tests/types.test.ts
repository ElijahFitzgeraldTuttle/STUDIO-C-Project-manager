import { describe, it, expect } from 'vitest';
import {
    dbTaskToTask,
    taskToDbTask,
    priorityConfig,
    statusConfig,
    activityActionLabels,
} from '../client/src/lib/types';

describe('Type Helpers', () => {
    describe('dbTaskToTask', () => {
        it('should convert DB task to frontend task', () => {
            const dbTask = {
                id: 1,
                title: 'Test Task',
                description: 'Test Description',
                status: 'in-progress',
                priority: 'high',
                assignees: ['User1', 'User2'],
                tags: ['tag1'],
                tracking: JSON.stringify({ delivered: true }),
                dueDate: new Date('2024-12-31'),
                archived: false,
                archivedAt: null,
                sortOrder: 0,
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-02'),
                dashboardId: 1,
            };

            const task = dbTaskToTask(dbTask as any);

            expect(task.id).toBe(1);
            expect(task.status).toBe('in-progress');
            expect(task.priority).toBe('high');
            expect(task.tracking.delivered).toBe(true);
            expect(task.archived).toBe(false);
        });

        it('should handle missing priority', () => {
            const dbTask = {
                id: 1,
                title: 'No Priority',
                description: '',
                status: 'prospect',
                assignees: [],
                tags: [],
                tracking: '{}',
                dueDate: null,
                archived: false,
                archivedAt: null,
                sortOrder: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
                dashboardId: null,
            };

            const task = dbTaskToTask(dbTask as any);
            expect(task.priority).toBe('medium');
        });

        it('should handle invalid tracking JSON', () => {
            const dbTask = {
                id: 1,
                title: 'Invalid Tracking',
                description: '',
                status: 'prospect',
                priority: 'low',
                assignees: [],
                tags: [],
                tracking: 'not valid json',
                dueDate: null,
                archived: false,
                archivedAt: null,
                sortOrder: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
                dashboardId: null,
            };

            const task = dbTaskToTask(dbTask as any);
            expect(task.tracking).toEqual({});
        });
    });

    describe('taskToDbTask', () => {
        it('should convert frontend task to DB task', () => {
            const task = {
                title: 'Test',
                description: 'Desc',
                status: 'complete' as const,
                priority: 'urgent' as const,
                assignees: ['User1'],
                tags: ['tag1'],
                tracking: { delivered: true, paid: false },
                dueDate: '2024-12-31',
                archived: true,
                sortOrder: 5,
            };

            const dbTask = taskToDbTask(task);

            expect(dbTask.title).toBe('Test');
            expect(dbTask.priority).toBe('urgent');
            expect(dbTask.tracking).toBe(JSON.stringify({ delivered: true, paid: false }));
            expect(dbTask.archived).toBe(true);
            expect(dbTask.sortOrder).toBe(5);
        });

        it('should only include defined fields', () => {
            const task = {
                title: 'Only Title',
            };

            const dbTask = taskToDbTask(task);

            expect(dbTask.title).toBe('Only Title');
            expect(dbTask.description).toBeUndefined();
            expect(dbTask.tracking).toBeUndefined();
        });
    });

    describe('Config Objects', () => {
        it('should have all status configs', () => {
            expect(statusConfig.prospect).toBeDefined();
            expect(statusConfig.scheduled).toBeDefined();
            expect(statusConfig['in-progress']).toBeDefined();
            expect(statusConfig.complete).toBeDefined();
        });

        it('should have all priority configs', () => {
            expect(priorityConfig.low).toBeDefined();
            expect(priorityConfig.medium).toBeDefined();
            expect(priorityConfig.high).toBeDefined();
            expect(priorityConfig.urgent).toBeDefined();
        });

        it('should have all activity action labels', () => {
            expect(activityActionLabels.task_created).toBeDefined();
            expect(activityActionLabels.task_archived).toBeDefined();
            expect(activityActionLabels.comment_added).toBeDefined();
            expect(activityActionLabels.subtask_completed).toBeDefined();
        });
    });
});

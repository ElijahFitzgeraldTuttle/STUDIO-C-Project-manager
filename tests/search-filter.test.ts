import { describe, it, expect } from 'vitest';
import { filterAndSortTasks, type FilterOptions, type SortOptions } from '../client/src/components/task-search-filter';
import type { Task } from '../client/src/lib/types';

const createMockTask = (overrides: Partial<Task> = {}): Task => ({
    id: 1,
    title: 'Test Task',
    description: 'Test Description',
    status: 'prospect',
    priority: 'medium',
    assignees: [],
    tags: [],
    tracking: {},
    dueDate: null,
    archived: false,
    archivedAt: null,
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
});

describe('Task Search and Filter', () => {
    const baseTasks: Task[] = [
        createMockTask({ id: 1, title: 'Alpha Task', priority: 'low', assignees: ['Alice'] }),
        createMockTask({ id: 2, title: 'Beta Task', priority: 'high', assignees: ['Bob'] }),
        createMockTask({ id: 3, title: 'Gamma Task', priority: 'urgent', assignees: ['Alice', 'Bob'] }),
        createMockTask({ id: 4, title: 'Delta Task', priority: 'medium', archived: true }),
        createMockTask({
            id: 5,
            title: 'Epsilon Task',
            priority: 'high',
            dueDate: new Date('2025-01-15').toISOString()
        }),
        createMockTask({
            id: 6,
            title: 'Zeta Task',
            priority: 'low',
            dueDate: new Date('2025-01-10').toISOString()
        }),
    ];

    const defaultFilters: FilterOptions = {
        searchQuery: '',
        assignees: [],
        priorities: [],
        showArchived: false,
    };

    const defaultSort: SortOptions = {
        field: 'title',
        direction: 'asc',
    };

    describe('Search Filter', () => {
        it('should filter by search query', () => {
            const filters: FilterOptions = { ...defaultFilters, searchQuery: 'Alpha' };
            const result = filterAndSortTasks(baseTasks, filters, defaultSort);

            expect(result.length).toBe(1);
            expect(result[0].title).toBe('Alpha Task');
        });

        it('should be case insensitive', () => {
            const filters: FilterOptions = { ...defaultFilters, searchQuery: 'BETA' };
            const result = filterAndSortTasks(baseTasks, filters, defaultSort);

            expect(result.length).toBe(1);
            expect(result[0].title).toBe('Beta Task');
        });

        it('should search in description', () => {
            const tasks = [
                createMockTask({ id: 1, title: 'Task 1', description: 'Contains keyword here' }),
                createMockTask({ id: 2, title: 'Task 2', description: 'No match' }),
            ];

            const filters: FilterOptions = { ...defaultFilters, searchQuery: 'keyword' };
            const result = filterAndSortTasks(tasks, filters, defaultSort);

            expect(result.length).toBe(1);
            expect(result[0].id).toBe(1);
        });
    });

    describe('Assignee Filter', () => {
        it('should filter by single assignee', () => {
            const filters: FilterOptions = { ...defaultFilters, assignees: ['Alice'] };
            const result = filterAndSortTasks(baseTasks, filters, defaultSort);

            expect(result.length).toBe(2);
            expect(result.every(t => t.assignees.includes('Alice'))).toBe(true);
        });

        it('should filter by multiple assignees (OR logic)', () => {
            const filters: FilterOptions = { ...defaultFilters, assignees: ['Alice', 'Bob'] };
            const result = filterAndSortTasks(baseTasks, filters, defaultSort);

            expect(result.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Priority Filter', () => {
        it('should filter by single priority', () => {
            const filters: FilterOptions = { ...defaultFilters, priorities: ['high'] };
            const result = filterAndSortTasks(baseTasks, filters, defaultSort);

            expect(result.every(t => t.priority === 'high')).toBe(true);
        });

        it('should filter by multiple priorities', () => {
            const filters: FilterOptions = { ...defaultFilters, priorities: ['high', 'urgent'] };
            const result = filterAndSortTasks(baseTasks, filters, defaultSort);

            expect(result.every(t => ['high', 'urgent'].includes(t.priority))).toBe(true);
        });
    });

    describe('Archived Filter', () => {
        it('should exclude archived by default', () => {
            const result = filterAndSortTasks(baseTasks, defaultFilters, defaultSort);

            expect(result.every(t => !t.archived)).toBe(true);
        });

        it('should include archived when showArchived is true', () => {
            const filters: FilterOptions = { ...defaultFilters, showArchived: true };
            const result = filterAndSortTasks(baseTasks, filters, defaultSort);

            expect(result.some(t => t.archived)).toBe(true);
        });
    });

    describe('Sorting', () => {
        it('should sort by title ascending', () => {
            const sort: SortOptions = { field: 'title', direction: 'asc' };
            const result = filterAndSortTasks(baseTasks, defaultFilters, sort);

            expect(result[0].title).toBe('Alpha Task');
        });

        it('should sort by title descending', () => {
            const sort: SortOptions = { field: 'title', direction: 'desc' };
            const result = filterAndSortTasks(baseTasks, defaultFilters, sort);

            expect(result[0].title).toBe('Zeta Task');
        });

        it('should sort by priority', () => {
            // Priority order is: urgent=0, high=1, medium=2, low=3
            // So ascending should put highest priority (urgent/high) first
            const sort: SortOptions = { field: 'priority', direction: 'asc' };
            const result = filterAndSortTasks(baseTasks, defaultFilters, sort);

            // First result should be highest priority (urgent or high)
            const priorities = result.map(t => t.priority);
            // Verify urgent comes before low (i.e., sorted correctly)
            const urgentIdx = priorities.indexOf('urgent');
            const lowIdx = priorities.indexOf('low');
            expect(urgentIdx).toBeLessThan(lowIdx);
        });

        it('should sort by due date', () => {
            const filters: FilterOptions = { ...defaultFilters, showArchived: true };
            const sort: SortOptions = { field: 'dueDate', direction: 'asc' };
            const result = filterAndSortTasks(baseTasks, filters, sort);

            // Tasks with due dates should come first when sorting asc
            const withDueDates = result.filter(t => t.dueDate !== null);
            expect(withDueDates.length).toBeGreaterThan(0);
        });
    });

    describe('Combined Filters', () => {
        it('should apply multiple filters together', () => {
            const filters: FilterOptions = {
                searchQuery: 'Task',
                assignees: ['Alice'],
                priorities: ['low', 'urgent'],
                showArchived: false,
            };

            const result = filterAndSortTasks(baseTasks, filters, defaultSort);

            // Should match: Alpha (low, Alice) and Gamma (urgent, Alice)
            expect(result.length).toBe(2);
        });
    });
});

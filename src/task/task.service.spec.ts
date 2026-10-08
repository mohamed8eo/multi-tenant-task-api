import { Test, TestingModule } from '@nestjs/testing';
import { TaskService } from './task.service.js';
import { tasks } from '../db/schema/tasks.js';

describe('TaskService', () => {
  let service: TaskService;

  const mockDb = {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    select: vi.fn(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        {
          provide: 'DrizzleDatabase',
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a task', async () => {
      const dto = {
        projectId: 'proj-1',
        title: 'New Task',
        description: 'Task desc',
        status: 'todo' as const,
        priority: 'medium' as const,
      };
      const createdTask = { id: 't-1', ...dto, organizationId: 'org-1', createdBy: 'u-1', createdAt: new Date(), updatedAt: new Date(), assigneeId: null, dueDate: null };

      mockDb.returning.mockResolvedValueOnce([createdTask]);

      const result = await service.create(dto, 'u-1', 'org-1');

      expect(mockDb.insert).toHaveBeenCalledWith(tasks);
      expect(mockDb.values).toHaveBeenCalledWith({
        title: dto.title,
        description: dto.description,
        status: dto.status,
        priority: dto.priority,
        projectId: dto.projectId,
        assigneeId: undefined,
        dueDate: undefined,
        organizationId: 'org-1',
        createdBy: 'u-1',
      });
      expect(result).toEqual(createdTask);
    });
  });

  describe('findAll', () => {
    it('should return paginated tasks and metadata', async () => {
      const orgId = 'org-1';
      const paginationQuery = { page: 1, limit: 10, offset: 0 };
      const taskList = [{ id: 't-1', title: 'Task 1', organizationId: orgId }];

      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValueOnce(taskList),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValueOnce([{ count: 1 }]),
          }),
        });

      const result = await service.findAll(orgId, paginationQuery);

      expect(result).toEqual({
        data: taskList,
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return a single task', async () => {
      const task = { id: 't-1', title: 'Task 1', organizationId: 'org-1' };
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce([task]),
        }),
      });

      const result = await service.findOne('t-1', 'org-1');
      expect(result).toEqual(task);
    });
  });

  describe('update', () => {
    it('should update task', async () => {
      const dto = { title: 'Updated Task' };

      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce(undefined),
        }),
      });

      await expect(service.update('t-1', dto, 'org-1')).resolves.toBeUndefined();
    });
  });

  describe('remove', () => {
    it('should delete task for owner/admin', async () => {
      mockDb.delete.mockReturnValueOnce({
        where: vi.fn().mockResolvedValueOnce(undefined),
      });

      await expect(service.remove('t-1', 'org-1', 'owner', 'u-1')).resolves.toBeUndefined();
    });
  });
});

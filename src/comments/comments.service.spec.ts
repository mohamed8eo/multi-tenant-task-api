import { Test, TestingModule } from '@nestjs/testing';
import { CommentsService } from './comments.service.js';
import { comments } from '../db/schema/comments.js';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('CommentsService', () => {
  let service: CommentsService;

  const mockDb = {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    select: vi.fn(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        {
          provide: 'DrizzleDatabase',
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a comment', async () => {
      const dto = { body: 'Test comment' };
      const created = { id: 'c-1', taskId: 't-1', organizationId: 'org-1', authorId: 'u-1', body: dto.body, createdAt: new Date(), updatedAt: new Date() };

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce([{ id: 't-1' }]),
        }),
      });

      mockDb.returning.mockResolvedValueOnce([created]);

      const result = await service.create('t-1', 'org-1', 'u-1', dto);

      expect(mockDb.insert).toHaveBeenCalledWith(comments);
      expect(mockDb.values).toHaveBeenCalledWith({
        taskId: 't-1',
        body: dto.body,
        organizationId: 'org-1',
        authorId: 'u-1',
      });
      expect(result).toEqual(created);
    });

    it('should throw NotFoundException if task does not exist', async () => {
      const dto = { body: 'Test comment' };

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce([]),
        }),
      });

      await expect(service.create('t-999', 'org-1', 'u-1', dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllByTask', () => {
    it('should return paginated comments', async () => {
      const commentList = [{ id: 'c-1', body: 'Comment 1' }];
      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValueOnce(commentList),
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValueOnce([{ count: 1 }]),
          }),
        });

      const result = await service.findAllByTask('t-1', 'org-1', { page: 1, limit: 10, offset: 0 });
      expect(result.data).toEqual(commentList);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('update', () => {
    it('should update comment if user is author', async () => {
      const existing = { id: 'c-1', authorId: 'u-1', organizationId: 'org-1', body: 'Old' };
      const updated = { ...existing, body: 'New' };

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce([existing]),
        }),
      });

      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValueOnce([updated]),
          }),
        }),
      });

      const result = await service.update('c-1', 'org-1', 'u-1', { body: 'New' });
      expect(result).toEqual(updated);
    });

    it('should throw ForbiddenException if user is not author', async () => {
      const existing = { id: 'c-1', authorId: 'u-2', organizationId: 'org-1', body: 'Old' };

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce([existing]),
        }),
      });

      await expect(service.update('c-1', 'org-1', 'u-1', { body: 'New' })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete comment if admin/owner', async () => {
      const existing = { id: 'c-1', authorId: 'u-2', organizationId: 'org-1', body: 'Old' };

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce([existing]),
        }),
      });

      mockDb.delete.mockReturnValueOnce({
        where: vi.fn().mockResolvedValueOnce(undefined),
      });

      await expect(service.remove('c-1', 'org-1', 'u-1', 'admin')).resolves.toBeUndefined();
    });
  });
});

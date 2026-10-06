import { Test, TestingModule } from '@nestjs/testing';
import { MembersService } from './members.service.js';
import { memberships } from '../db/schema/memberships.js';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('MembersService', () => {
  let service: MembersService;

  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    returning: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        {
          provide: 'DrizzleDatabase',
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<MembersService>(MembersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return the mapped list of members', async () => {
      const orgId = 'org-1';
      const members = [
        {
          userId: 'u-1',
          name: 'Alice',
          username: 'alice',
          email: 'alice@example.com',
          role: 'owner' as const,
          joinedAt: new Date(),
        },
      ];
      mockDb.orderBy.mockResolvedValueOnce(members);

      const result = await service.findAll(orgId);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalledWith(memberships);
      expect(mockDb.innerJoin).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.orderBy).toHaveBeenCalled();
      expect(result).toEqual(members);
    });
  });

  describe('updateRole', () => {
    it('should successfully update member role', async () => {
      const tenant = { organizationId: 'org-1', role: 'owner' as const };
      const dto = { role: 'admin' as const };
      const userId = 'u-2';

      mockDb.returning.mockResolvedValueOnce([{ userId, role: 'admin' }]);

      await expect(service.updateRole(tenant, dto, userId)).resolves.toBeUndefined();
      expect(mockDb.update).toHaveBeenCalledWith(memberships);
    });

    it('should throw NotFoundException if member not found', async () => {
      const tenant = { organizationId: 'org-1', role: 'owner' as const };
      const dto = { role: 'admin' as const };
      const userId = 'u-nonexistent';

      mockDb.returning.mockResolvedValueOnce([]);

      await expect(service.updateRole(tenant, dto, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('removeMember', () => {
    it('should successfully remove a member', async () => {
      const tenant = { organizationId: 'org-1', role: 'owner' as const };
      const userId = 'u-2';

      // select membership returns member with role 'member'
      mockDb.where.mockResolvedValueOnce([{ userId, role: 'member' }]);
      mockDb.where.mockResolvedValueOnce(undefined);

      await expect(service.removeMember(tenant, userId)).resolves.toBeUndefined();
    });

    it('should throw BadRequestException when trying to remove owner', async () => {
      const tenant = { organizationId: 'org-1', role: 'owner' as const };
      const userId = 'u-1';

      mockDb.where.mockResolvedValueOnce([{ userId, role: 'owner' }]);

      await expect(service.removeMember(tenant, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});

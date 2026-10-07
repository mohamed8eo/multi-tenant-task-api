import { Test, TestingModule } from '@nestjs/testing';
import { MembersService } from './members.service.js';
import { memberships } from '../db/schema/memberships.js';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

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
    returning: vi.fn().mockResolvedValue([{ userId: 'u-2', role: 'admin' }]),
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
    const owner = { organizationId: 'org-1', role: 'owner' as const };

    it('should update a member role', async () => {
      mockDb.where.mockResolvedValueOnce([{ userId: 'u-2', role: 'member' }]);

      await expect(service.updateRole(owner, { role: 'admin' }, 'u-2')).resolves.toBeUndefined();
      expect(mockDb.update).toHaveBeenCalledWith(memberships);
    });

    it('should throw NotFoundException if the member does not exist', async () => {
      mockDb.where.mockResolvedValueOnce([]);

      await expect(service.updateRole(owner, { role: 'admin' }, 'u-x')).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when the target is the owner", async () => {
      mockDb.where.mockResolvedValueOnce([{ userId: 'u-1', role: 'owner' }]);

      await expect(service.updateRole(owner, { role: 'member' }, 'u-1')).rejects.toThrow(ForbiddenException);
      expect(mockDb.update).not.toHaveBeenCalled();
    });
  });

  describe('removeMember', () => {
    const asOwner = { organizationId: 'org-1', role: 'owner' as const };
    const asAdmin = { organizationId: 'org-1', role: 'admin' as const };

    it('should let the owner remove an admin', async () => {
      mockDb.where.mockResolvedValueOnce([{ userId: 'u-2', role: 'admin' }]);
      await expect(service.removeMember(asOwner, 'u-2')).resolves.toBeUndefined();
      expect(mockDb.delete).toHaveBeenCalledWith(memberships);
    });

    it('should let an admin remove a member', async () => {
      mockDb.where.mockResolvedValueOnce([{ userId: 'u-3', role: 'member' }]);
      await expect(service.removeMember(asAdmin, 'u-3')).resolves.toBeUndefined();
    });

    it('should not let an admin remove another admin', async () => {
      mockDb.where.mockResolvedValueOnce([{ userId: 'u-2', role: 'admin' }]);
      await expect(service.removeMember(asAdmin, 'u-2')).rejects.toThrow(ForbiddenException);
      expect(mockDb.delete).not.toHaveBeenCalled();
    });

    it('should never remove the owner, even for the owner', async () => {
      mockDb.where.mockResolvedValueOnce([{ userId: 'u-1', role: 'owner' }]);
      await expect(service.removeMember(asOwner, 'u-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if the member does not exist', async () => {
      mockDb.where.mockResolvedValueOnce([]);
      await expect(service.removeMember(asOwner, 'u-x')).rejects.toThrow(NotFoundException);
    });
  });
});

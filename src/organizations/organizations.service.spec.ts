import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsService } from './organizations.service.js';
import { UnauthorizedException, InternalServerErrorException, Logger } from '@nestjs/common';
import { organizations } from '../db/schema/organizations.js';
import { memberships } from '../db/schema/memberships.js';

describe('OrganizationsService', () => {
  let service: OrganizationsService;

  const mockTx = {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
  };

  const mockDb = {
    transaction: vi.fn(async (cb) => cb(mockTx)),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        {
          provide: 'DrizzleDatabase',
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create an organization and membership', async () => {
      const dto = { name: 'Test Org' };
      const userId = 'user-1';
      const createdOrg = { id: 'org-1', name: 'Test Org', createdAt: new Date() };

      mockTx.returning.mockResolvedValueOnce([createdOrg]);

      const result = await service.create(dto, userId);

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockTx.insert).toHaveBeenCalledWith(organizations);
      expect(mockTx.values).toHaveBeenCalledWith({ name: dto.name });
      expect(mockTx.insert).toHaveBeenCalledWith(memberships);
      expect(mockTx.values).toHaveBeenCalledWith({
        organizationId: createdOrg.id,
        userId,
        role: 'owner',
      });
      expect(result).toEqual({ ...createdOrg, role: 'owner' });
    });

    it('should throw UnauthorizedException when user does not exist (pgCode 23503)', async () => {
      const dto = { name: 'Test Org' };
      const userId = 'non-existent-user';

      const pgError = Object.assign(new Error('FK violation'), { code: '23503' });
      mockDb.transaction.mockRejectedValueOnce(pgError);

      await expect(service.create(dto, userId)).rejects.toThrow(
        new UnauthorizedException('User no longer exists'),
      );
    });

    it('should throw UnauthorizedException when cause code is 23503', async () => {
      const dto = { name: 'Test Org' };
      const userId = 'non-existent-user';

      const pgError = Object.assign(new Error('FK violation'), { cause: { code: '23503' } });
      mockDb.transaction.mockRejectedValueOnce(pgError);

      await expect(service.create(dto, userId)).rejects.toThrow(
        new UnauthorizedException('User no longer exists'),
      );
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      const dto = { name: 'Test Org' };
      const userId = 'user-1';

      mockDb.transaction.mockRejectedValueOnce(new Error('Database error'));

      await expect(service.create(dto, userId)).rejects.toThrow(
        new InternalServerErrorException('Could not create organization'),
      );
    });
  });

  describe('findAllForUser', () => {
    it('should return list of organizations for user', async () => {
      const userId = 'user-1';
      const orgs = [
        { id: 'org-1', name: 'Org 1', role: 'owner', createdAt: new Date() },
      ];
      mockDb.orderBy.mockResolvedValueOnce(orgs);

      const result = await service.findAllForUser(userId);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalledWith(memberships);
      expect(mockDb.innerJoin).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.orderBy).toHaveBeenCalled();
      expect(result).toEqual(orgs);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { MembersService } from './members.service.js';
import { memberships } from '../db/schema/memberships.js';

describe('MembersService', () => {
  let service: MembersService;

  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn(),
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
});

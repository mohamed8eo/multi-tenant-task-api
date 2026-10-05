import { Test, TestingModule } from '@nestjs/testing';
import { InvitationService } from './invitation.service.js';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { invitations } from '../db/schema/invitations.js';

describe('InvitationService', () => {
  let service: InvitationService;

  const mockTx = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
  };

  const mockDb = {
    transaction: vi.fn(async (cb) => cb(mockTx)),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationService,
        {
          provide: 'DrizzleDatabase',
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<InvitationService>(InvitationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createInvitation', () => {
    it('should successfully create an invitation and revoke any existing pending ones', async () => {
      const dto = { email: 'test@example.com', role: 'member' as const };
      const orgId = 'org-1';
      const createdInvitation = {
        id: 'inv-1',
        email: dto.email,
        role: dto.role,
        expiresAt: new Date(),
      };

      // ensureNotMember returns no membership
      mockTx.where.mockResolvedValueOnce([]);
      // insert returning created invitation
      mockTx.returning.mockResolvedValueOnce([createdInvitation]);

      const result = await service.createInvitation(dto, orgId);

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockTx.insert).toHaveBeenCalledWith(invitations);
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('id', 'inv-1');
    });

    it('should throw ConflictException when the email already belongs to a member', async () => {
      const dto = { email: 'member@example.com', role: 'member' as const };
      const orgId = 'org-1';

      // ensureNotMember returns an existing membership
      mockTx.where.mockResolvedValueOnce([{ userId: 'user-1' }]);

      await expect(service.createInvitation(dto, orgId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('listPending', () => {
    it('should return pending invitations for the organization', async () => {
      const orgId = 'org-1';
      const pending = [
        {
          id: 'inv-1',
          email: 'test@example.com',
          role: 'member',
          expiresAt: new Date(),
          createdAt: new Date(),
          invitedBy: null,
        },
      ];

      mockDb.orderBy.mockResolvedValueOnce(pending);

      const result = await service.listPending(orgId);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalledWith(invitations);
      expect(mockDb.where).toHaveBeenCalled();
      expect(result).toEqual(pending);
    });
  });

  describe('revokeInvitation', () => {
    it('should successfully revoke an invitation', async () => {
      const orgId = 'org-1';
      const invId = 'inv-1';

      mockDb.returning.mockResolvedValueOnce([{ id: invId }]);

      await expect(service.revokeInvitation(orgId, invId)).resolves.toBeUndefined();
      expect(mockDb.update).toHaveBeenCalledWith(invitations);
    });

    it('should throw NotFoundException when invitation is not found or already processed', async () => {
      const orgId = 'org-1';
      const invId = 'inv-nonexistent';

      mockDb.returning.mockResolvedValueOnce([]);

      await expect(service.revokeInvitation(orgId, invId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

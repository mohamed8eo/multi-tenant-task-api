import { Test, TestingModule } from '@nestjs/testing';
import { InvitationService } from './invitation.service.js';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
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

      const result = await service.createInvitation(dto, orgId, 'u-1');

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

      await expect(service.createInvitation(dto, orgId, 'u-1')).rejects.toThrow(
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

  describe('acceptInvitation', () => {
    const userId = 'u-1';
    const token = 'valid-token';

    const invitation = {
      id: 'inv-1',
      organizationId: 'org-1',
      email: 'test@example.com',
      role: 'member',
      expiresAt: new Date(Date.now() + 86400000),
      acceptedAt: null,
      revokedAt: null,
    };

    it('should successfully accept an invitation and create membership', async () => {
      // claim UPDATE chain: update().set().where() must return the tx synchronously
      mockTx.where.mockReturnValueOnce(mockTx);
      // claim UPDATE returning the invitation
      mockTx.returning.mockResolvedValueOnce([invitation]);
      // select user
      mockTx.where.mockResolvedValueOnce([{ email: 'test@example.com' }]);
      // ensureNotMember returns no membership
      mockTx.where.mockResolvedValueOnce([]);
      // insert membership returning membership
      mockTx.returning.mockResolvedValueOnce([{ id: 'm-1', organizationId: 'org-1', userId, role: 'member' }]);

      const result = await service.acceptInvitation(userId, token);

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockTx.update).toHaveBeenCalledWith(invitations);
      expect(mockTx.set).toHaveBeenCalledWith({ acceptedAt: expect.any(Date) });
      expect(result).toHaveProperty('id', 'm-1');
    });

    it('should throw NotFoundException when invitation is invalid or expired', async () => {
      // claim UPDATE returns no row
      mockTx.returning.mockResolvedValueOnce([]);

      await expect(service.acceptInvitation(userId, token)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when the invitation belongs to a different email', async () => {
      mockTx.where.mockReturnValueOnce(mockTx);
      mockTx.returning.mockResolvedValueOnce([invitation]);
      // select user with a different email
      mockTx.where.mockResolvedValueOnce([{ email: 'other@example.com' }]);

      await expect(service.acceptInvitation(userId, token)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ConflictException when the user is already a member', async () => {
      mockTx.where.mockReturnValueOnce(mockTx);
      mockTx.returning.mockResolvedValueOnce([invitation]);
      mockTx.where.mockResolvedValueOnce([{ email: 'test@example.com' }]);
      // ensureNotMember finds an existing membership
      mockTx.where.mockResolvedValueOnce([{ id: 'm-0' }]);

      await expect(service.acceptInvitation(userId, token)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should map a unique violation on membership insert to ConflictException', async () => {
      mockTx.where.mockReturnValueOnce(mockTx);
      mockTx.returning.mockResolvedValueOnce([invitation]);
      mockTx.where.mockResolvedValueOnce([{ email: 'test@example.com' }]);
      mockTx.where.mockResolvedValueOnce([]);
      // insert membership hits unique(userId, organizationId)
      mockTx.returning.mockRejectedValueOnce(
        Object.assign(new Error('duplicate key value'), { cause: { code: '23505' } }),
      );

      await expect(service.acceptInvitation(userId, token)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});

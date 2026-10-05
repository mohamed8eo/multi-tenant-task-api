import {
  BadRequestException, ExecutionContext, ForbiddenException, UnauthorizedException,
} from '@nestjs/common';
import { TenantGuard } from './tenant.guard.js';

const ORG_ID = '0b1c7e1e-3f2a-4c1e-9a55-1b2c3d4e5f60';

const contextFor = (req: object) =>
  ({ switchToHttp: () => ({ getRequest: () => req }) }) as unknown as ExecutionContext;

describe('TenantGuard', () => {
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn(),
  };
  let guard: TenantGuard;

  beforeEach(() => {
    vi.clearAllMocks();
    guard = new TenantGuard(mockDb as any);
  });

  it('should throw 401 when there is no user on the request', async () => {
    const req = { headers: { 'x-tenant-id': ORG_ID } };
    await expect(guard.canActivate(contextFor(req))).rejects.toThrow(UnauthorizedException);
  });

  it('should throw 400 when the header is missing', async () => {
    const req = { user: { userId: 'u1' }, headers: {} };
    await expect(guard.canActivate(contextFor(req))).rejects.toThrow(BadRequestException);
  });

  it('should throw 400 when the header is not a UUID', async () => {
    const req = { user: { userId: 'u1' }, headers: { 'x-tenant-id': 'abc' } };
    await expect(guard.canActivate(contextFor(req))).rejects.toThrow(BadRequestException);
  });

  it('should throw 403 when the user is not a member', async () => {
    mockDb.where.mockResolvedValueOnce([]);
    const req = { user: { userId: 'u1' }, headers: { 'x-tenant-id': ORG_ID } };
    await expect(guard.canActivate(contextFor(req))).rejects.toThrow(ForbiddenException);
  });

  it('should allow a member and set req.tenant with their role', async () => {
    mockDb.where.mockResolvedValueOnce([{ role: 'admin' }]);
    const req: any = { user: { userId: 'u1' }, headers: { 'x-tenant-id': ORG_ID } };

    await expect(guard.canActivate(contextFor(req))).resolves.toBe(true);
    expect(req.tenant).toEqual({ organizationId: ORG_ID, role: 'admin' });
  });
});

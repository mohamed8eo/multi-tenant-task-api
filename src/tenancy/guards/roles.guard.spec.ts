import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const createContext = (tenant?: object): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ tenant }),
      }),
      getHandler: () => {},
      getClass: () => {},
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: vi.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow request when no roles are required', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createContext();

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException when tenant is missing', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = createContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when user role is not in required roles', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'owner']);
    const context = createContext({ organizationId: 'org-1', role: 'member' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow request when user role is in required roles', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'owner']);
    const context = createContext({ organizationId: 'org-1', role: 'admin' });

    expect(guard.canActivate(context)).toBe(true);
  });
});

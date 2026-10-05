import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsController } from './organizations.controller.js';
import { OrganizationsService } from './organizations.service.js';
import { TenantGuard } from '../tenancy/guards/tenant.guard.js';

describe('OrganizationsController', () => {
  let controller: OrganizationsController;
  let service: OrganizationsService;

  const mockOrganizationsService = {
    create: vi.fn(),
    findAllForUser: vi.fn(),
    findCurrent: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [
        {
          provide: OrganizationsService,
          useValue: mockOrganizationsService,
        },
      ],
    })
      .overrideGuard(TenantGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrganizationsController>(OrganizationsController);
    service = module.get<OrganizationsService>(OrganizationsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call organizationsService.create with dto and user.userId and return result', async () => {
      const dto = { name: 'Test Org' };
      const user = { userId: 'user-1', email: 'test@example.com' };
      const expectedResult = { id: 'org-1', name: 'Test Org', role: 'owner' as const, createdAt: new Date() };

      mockOrganizationsService.create.mockResolvedValueOnce(expectedResult);

      const result = await controller.create(dto, user as any);

      expect(service.create).toHaveBeenCalledWith(dto, user.userId);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAllForUser', () => {
    it('should call organizationsService.findAllForUser with user.userId and return list', async () => {
      const user = { userId: 'user-1', email: 'test@example.com' };
      const orgs = [{ id: 'org-1', name: 'Test Org', role: 'owner' as const, createdAt: new Date() }];

      mockOrganizationsService.findAllForUser.mockResolvedValueOnce(orgs);

      const result = await controller.findAllForUser(user as any);

      expect(service.findAllForUser).toHaveBeenCalledWith(user.userId);
      expect(result).toEqual(orgs);
    });
  });

  describe('findCurrent', () => {
    it('should call organizationsService.findCurrent with the tenant and return the result', async () => {
      const tenant = { organizationId: 'org-1', role: 'admin' as const };
      const expected = { id: 'org-1', name: 'Test Org', role: 'admin' as const, createdAt: new Date() };
      mockOrganizationsService.findCurrent.mockResolvedValueOnce(expected);

      const result = await controller.findCurrent(tenant);

      expect(service.findCurrent).toHaveBeenCalledWith(tenant);
      expect(result).toEqual(expected);
    });
  });
});

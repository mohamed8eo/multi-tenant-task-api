import { Test, TestingModule } from '@nestjs/testing';
import { ProjectService } from './project.service.js';
import { projects } from '../db/schema/projects.js';

describe('ProjectService', () => {
  let service: ProjectService;

  const mockDb = {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    where: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        {
          provide: 'DrizzleDatabase',
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a project', async () => {
      const dto = { name: 'Test Project', description: 'Desc', status: 'active' as const };
      const createdProject = { id: 'p-1', ...dto, organizationId: 'org-1', createdBy: 'u-1', createdAt: new Date() };

      mockDb.returning.mockResolvedValueOnce([createdProject]);

      const result = await service.create(dto, 'org-1', 'u-1');

      expect(mockDb.insert).toHaveBeenCalledWith(projects);
      expect(mockDb.values).toHaveBeenCalledWith({
        name: dto.name,
        description: dto.description,
        status: dto.status,
        organizationId: 'org-1',
        createdBy: 'u-1',
      });
      expect(result).toEqual(createdProject);
    });
  });

  describe('findAll', () => {
    it('should return paginated projects and metadata', async () => {
      const orgId = 'org-1';
      const paginationQuery = { page: 1, limit: 10, offset: 0 };
      const projectList = [{ id: 'p-1', name: 'Project 1', organizationId: orgId }];

      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValueOnce(projectList),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValueOnce([{ count: 1 }]),
          }),
        });

      const result = await service.findAll(orgId, paginationQuery);

      expect(result).toEqual({
        data: projectList,
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return a single project', async () => {
      const project = { id: 'p-1', name: 'Project 1', organizationId: 'org-1' };
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce([project]),
        }),
      });

      const result = await service.findOne('p-1', 'org-1');
      expect(result).toEqual(project);
    });
  });

  describe('update', () => {
    it('should update and return the project', async () => {
      const dto = { name: 'Updated Project' };
      const updatedProject = { id: 'p-1', name: 'Updated Project', organizationId: 'org-1' };

      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValueOnce([updatedProject]),
          }),
        }),
      });

      const result = await service.update('p-1', dto, 'org-1');
      expect(result).toEqual(updatedProject);
    });
  });

  describe('remove', () => {
    it('should delete the project', async () => {
      mockDb.delete.mockReturnValueOnce({
        where: vi.fn().mockResolvedValueOnce(undefined),
      });
      await expect(service.remove('p-1', 'org-1', 'u-1')).resolves.toBeUndefined();
    });
  });
});

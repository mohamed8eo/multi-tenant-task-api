import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import type { Response } from 'express';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    register: vi.fn(),
    login: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
  };

  const mockResponse = {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  } as unknown as Response;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a user, set cookie, and return user and access token', async () => {
      const dto = {
        email: 'test@example.com',
        username: 'testuser',
        name: 'Test User',
        password: 'Password123!',
      };

      const authResult = {
        user: {
          id: 'user-id-1',
          email: dto.email,
          username: dto.username,
          name: dto.name,
        },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      };

      mockAuthService.register.mockResolvedValueOnce(authResult);

      const result = await controller.register(dto, mockResponse);

      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        authResult.refreshToken,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000,
        }),
      );
      expect(result).toEqual({
        user: authResult.user,
        accessToken: authResult.accessToken,
      });
    });
  });

  describe('login', () => {
    it('should login a user, set cookie, and return user and access token', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      const authResult = {
        user: {
          id: 'user-id-1',
          email: dto.email,
          username: 'testuser',
          name: 'Test User',
        },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      };

      mockAuthService.login.mockResolvedValueOnce(authResult);

      const result = await controller.login(dto, mockResponse);

      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        authResult.refreshToken,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000,
        }),
      );
      expect(result).toEqual({
        user: authResult.user,
        accessToken: authResult.accessToken,
      });
    });

    it('should propagate exceptions thrown by authService.login', async () => {
      const dto = {
        email: 'wrong@example.com',
        password: 'wrong',
      };

      mockAuthService.login.mockRejectedValueOnce(
        new UnauthorizedException('Invalid credentials'),
      );

      await expect(controller.login(dto, mockResponse)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('should throw UnauthorizedException if refresh token cookie is missing', async () => {
      const req = { cookies: {} };

      await expect(controller.refresh(req, mockResponse)).rejects.toThrow(
        new UnauthorizedException('Refresh token not found'),
      );
    });

    it('should successfully refresh token and return access token', async () => {
      const req = { cookies: { refreshToken: 'old-refresh-token' } };
      const refreshResult = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      mockAuthService.refresh.mockResolvedValueOnce(refreshResult);

      const result = await controller.refresh(req, mockResponse);

      expect(mockAuthService.refresh).toHaveBeenCalledWith('old-refresh-token');
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        refreshResult.refreshToken,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000,
        }),
      );
      expect(result).toEqual({
        accessToken: refreshResult.accessToken,
      });
    });
  });

  describe('logout', () => {
    it('should logout user, clear cookie, and return success message', async () => {
      const req = { user: { userId: 'user-id-1' } };
      mockAuthService.logout.mockResolvedValueOnce(undefined);

      const result = await controller.logout(req, mockResponse);

      expect(mockAuthService.logout).toHaveBeenCalledWith('user-id-1');
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refreshToken');
      expect(result).toEqual({
        message: 'Logged out successfully',
      });
    });
  });
});

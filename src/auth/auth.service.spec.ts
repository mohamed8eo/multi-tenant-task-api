import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service.js';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';

vi.mock('argon2', () => ({
  hash: vi.fn().mockResolvedValue('hashed-password'),
  verify: vi.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const mockDb = {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    transaction: vi.fn(async (cb) => cb(mockDb)),
  };

  const mockJwtService = {
    signAsync: vi.fn().mockResolvedValue('mock-token'),
    verifyAsync: vi.fn(),
  };

  const mockConfigService = {
    getOrThrow: vi.fn((key: string) => {
      if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
      if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
      return null;
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: 'DrizzleDatabase',
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should successfully register a user and return tokens', async () => {
      const dto = {
        email: 'test@example.com',
        username: 'testuser',
        name: 'Test User',
        password: 'Password123!',
      };

      const createdUser = {
        id: 'user-id-1',
        email: dto.email,
        username: dto.username,
        name: dto.name,
        password: 'hashed-password',
      };

      mockDb.returning.mockResolvedValueOnce([createdUser]);

      const result = await service.register(dto);

      expect(argon2.hash).toHaveBeenCalledWith(dto.password);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith({
        id: expect.any(String),
        email: dto.email,
        username: dto.username,
        name: dto.name,
        password: 'hashed-password',
      });
      expect(mockDb.values).toHaveBeenCalledWith({
        id: expect.any(String),
        userId: createdUser.id,
        tokenHash: 'hashed-password',
        expiresAt: expect.any(Date),
      });
      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        user: {
          id: createdUser.id,
          email: createdUser.email,
          username: createdUser.username,
          name: createdUser.name,
        },
        accessToken: 'mock-token',
        refreshToken: 'mock-token',
      });
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      const dto = {
        email: 'nonexistent@example.com',
        password: 'Password123!',
      };

      mockDb.where.mockResolvedValueOnce([]);

      await expect(service.login(dto)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'WrongPassword',
      };

      const existingUser = {
        id: 'user-id-1',
        email: dto.email,
        username: 'testuser',
        name: 'Test User',
        password: 'hashed-password',
      };

      mockDb.where.mockResolvedValueOnce([existingUser]);
      vi.mocked(argon2.verify).mockResolvedValueOnce(false);

      await expect(service.login(dto)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
      expect(argon2.verify).toHaveBeenCalledWith(existingUser.password, dto.password);
    });

    it('should successfully login when credentials are valid', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      const existingUser = {
        id: 'user-id-1',
        email: dto.email,
        username: 'testuser',
        name: 'Test User',
        password: 'hashed-password',
      };

      mockDb.where.mockResolvedValueOnce([existingUser]);
      vi.mocked(argon2.verify).mockResolvedValueOnce(true);

      const result = await service.login(dto);

      expect(argon2.verify).toHaveBeenCalledWith(existingUser.password, dto.password);
      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        user: {
          id: existingUser.id,
          email: existingUser.email,
          username: existingUser.username,
          name: existingUser.name,
        },
        accessToken: 'mock-token',
        refreshToken: 'mock-token',
      });
    });
  });

  describe('refresh', () => {
    it('should throw UnauthorizedException if token verification fails', async () => {
      mockJwtService.verifyAsync.mockRejectedValueOnce(new Error('Invalid token'));

      await expect(service.refresh('invalid-token')).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });

    it('should throw UnauthorizedException if token payload lacks jti', async () => {
      mockJwtService.verifyAsync.mockResolvedValueOnce({ sub: 'user-id-1' });

      await expect(service.refresh('valid-jwt-no-jti')).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });

    it('should throw UnauthorizedException if no matching valid refresh token found in db', async () => {
      mockJwtService.verifyAsync.mockResolvedValueOnce({ sub: 'user-id-1', jti: 'token-id-1' });
      mockDb.where.mockResolvedValueOnce([]);

      await expect(service.refresh('valid-jwt-no-record')).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });

    it('should successfully refresh tokens when valid and revoke old token', async () => {
      const userId = 'user-id-1';
      const tokenId = 'token-id-1';
      const oldToken = 'old-refresh-token';
      const tokenRecord = {
        id: tokenId,
        userId,
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 1000000),
        revokedAt: null,
      };

      mockJwtService.verifyAsync.mockResolvedValueOnce({ sub: userId, jti: tokenId });
      mockDb.where.mockResolvedValueOnce([tokenRecord]);

      const result = await service.refresh(oldToken);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(oldToken, {
        secret: 'refresh-secret',
      });
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith({ revokedAt: expect.any(Date) });
      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        accessToken: 'mock-token',
        refreshToken: 'mock-token',
      });
    });
  });

  describe('logout', () => {
    it('should revoke active refresh tokens for the given user id', async () => {
      const userId = 'user-id-1';
      await service.logout(userId);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith({ revokedAt: expect.any(Date) });
      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe('createToken', () => {
    it('should create access and refresh tokens with jti', async () => {
      const userId = 'user-id-1';
      const tokens = await service.createToken(userId);

      expect(mockJwtService.signAsync).toHaveBeenCalledWith({ sub: userId });
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        { sub: userId, jti: expect.any(String) },
        {
          secret: 'refresh-secret',
          expiresIn: '7d',
        },
      );
      expect(tokens).toEqual({
        accessToken: 'mock-token',
        refreshToken: 'mock-token',
        tokenId: expect.any(String),
      });
    });
  });
});

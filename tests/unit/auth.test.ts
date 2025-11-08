import { describe, it, expect, jest } from '@jest/globals';
import { auth, requireAuth, requireRole, requirePermission, setAuthCookie, clearAuthCookie } from '../../src/middleware/auth.js';
import { Context } from '../../src/types.js';
import { createMockContext } from '../utils/test-helpers.js';

describe('Auth Middleware', () => {
  describe('auth()', () => {
    it('should extract token from Authorization header', async () => {
      const userResolver = jest.fn(async (_token: string) => {
        return { id: '1', name: 'Test User' };
      });

      const middleware = auth({ userResolver });
      const ctx = createMockContext({
        req: {
          headers: {
            authorization: 'Bearer test-token-123'
          }
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(userResolver).toHaveBeenCalledWith('test-token-123');
      expect(ctx.state.user).toEqual({ id: '1', name: 'Test User' });
      expect(ctx.state.token).toBe('test-token-123');
      expect(next).toHaveBeenCalled();
    });

    it('should extract token from cookie when Authorization header is missing', async () => {
      const userResolver = jest.fn(async (_token: string) => {
        return { id: '1', name: 'Test User' };
      });

      const middleware = auth({ cookieName: 'auth-token', userResolver });
      const ctx = createMockContext({
        req: {
          headers: {
            cookie: 'auth-token=cookie-token-456'
          }
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(userResolver).toHaveBeenCalledWith('cookie-token-456');
      expect(ctx.state.user).toEqual({ id: '1', name: 'Test User' });
      expect(ctx.state.token).toBe('cookie-token-456');
      expect(next).toHaveBeenCalled();
    });

    it('should use custom cookie name', async () => {
      const userResolver = jest.fn(async (_token: string) => {
        return { id: '1', name: 'Test User' };
      });

      const middleware = auth({ cookieName: 'custom-token', userResolver });
      const ctx = createMockContext({
        req: {
          headers: {
            cookie: 'custom-token=my-custom-token'
          }
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(userResolver).toHaveBeenCalledWith('my-custom-token');
      expect(ctx.state.user).toEqual({ id: '1', name: 'Test User' });
      expect(next).toHaveBeenCalled();
    });

    it('should use custom token extractor', async () => {
      const tokenExtractor = jest.fn((_ctx: Context) => 'custom-extracted-token');
      const userResolver = jest.fn(async (_token: string) => {
        return { id: '1', name: 'Test User' };
      });

      const middleware = auth({ tokenExtractor, userResolver });
      const ctx = createMockContext();

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(tokenExtractor).toHaveBeenCalledWith(ctx);
      expect(userResolver).toHaveBeenCalledWith('custom-extracted-token');
      expect(ctx.state.user).toEqual({ id: '1', name: 'Test User' });
      expect(next).toHaveBeenCalled();
    });

    it('should handle token extractor returning null', async () => {
      const tokenExtractor = jest.fn((_ctx: Context) => null);
      const userResolver = jest.fn<() => Promise<{ id: string; name: string } | null>>();

      const middleware = auth({ tokenExtractor, userResolver });
      const ctx = createMockContext();

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(tokenExtractor).toHaveBeenCalled();
      expect(userResolver).not.toHaveBeenCalled();
      expect(ctx.state.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should handle userResolver returning null', async () => {
      const userResolver = jest.fn(async (_token: string) => null);

      const middleware = auth({ userResolver });
      const ctx = createMockContext({
        req: {
          headers: {
            authorization: 'Bearer invalid-token'
          }
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(userResolver).toHaveBeenCalled();
      expect(ctx.state.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should handle userResolver throwing error', async () => {
      const userResolver = jest.fn(async (_token: string) => {
        throw new Error('Token validation failed');
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const middleware = auth({ userResolver });
      const ctx = createMockContext({
        req: {
          headers: {
            authorization: 'Bearer invalid-token'
          }
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(userResolver).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(ctx.state.user).toBeUndefined();
      expect(next).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should continue without user when no token is provided', async () => {
      const userResolver = jest.fn<(_token: string) => Promise<{ id: string; name: string } | null>>();

      const middleware = auth({ userResolver });
      const ctx = createMockContext();

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(userResolver).not.toHaveBeenCalled();
      expect(ctx.state.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should continue without user when no userResolver is provided', async () => {
      const middleware = auth({});
      const ctx = createMockContext({
        req: {
          headers: {
            authorization: 'Bearer some-token'
          }
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.state.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should parse multiple cookies correctly', async () => {
      const userResolver = jest.fn(async (_token: string) => {
        return { id: '1', name: 'Test User' };
      });

      const middleware = auth({ cookieName: 'auth-token', userResolver });
      const ctx = createMockContext({
        req: {
          headers: {
            cookie: 'session=abc123; auth-token=my-token; other=value'
          }
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(userResolver).toHaveBeenCalledWith('my-token');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireAuth()', () => {
    it('should allow request when user is authenticated', async () => {
      const middleware = requireAuth();
      const ctx = createMockContext({
        state: {
          user: { id: '1', name: 'Test User' }
        }
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(next).toHaveBeenCalled();
      expect(ctx.statusCode).toBe(200);
    });

    it('should reject request when user is not authenticated', async () => {
      const middleware = requireAuth();
      const ctx = createMockContext({
        state: {}
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(next).not.toHaveBeenCalled();
      expect(ctx.statusCode).toBe(401);
      expect(ctx.res.statusCode).toBe(401);
    });

    it('should return 401 error message when user is not authenticated', async () => {
      const middleware = requireAuth();
      const ctx = createMockContext({
        state: {}
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        status: 401
      });
    });
  });

  describe('requireRole()', () => {
    it('should allow request when user has required role', async () => {
      const middleware = requireRole('admin');
      const ctx = createMockContext({
        state: {
          user: { id: '1', name: 'Admin', roles: ['admin', 'user'] }
        }
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(next).toHaveBeenCalled();
      expect(ctx.statusCode).toBe(200);
    });

    it('should allow request when user has one of multiple required roles', async () => {
      const middleware = requireRole(['admin', 'moderator']);
      const ctx = createMockContext({
        state: {
          user: { id: '1', name: 'Moderator', roles: ['moderator'] }
        }
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(next).toHaveBeenCalled();
      expect(ctx.statusCode).toBe(200);
    });

    it('should reject request when user does not have required role', async () => {
      const middleware = requireRole('admin');
      const ctx = createMockContext({
        state: {
          user: { id: '1', name: 'User', roles: ['user'] }
        }
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(next).not.toHaveBeenCalled();
      expect(ctx.statusCode).toBe(403);
      expect(ctx.res.statusCode).toBe(403);
    });

    it('should return 403 error with required and user roles', async () => {
      const middleware = requireRole('admin');
      const ctx = createMockContext({
        state: {
          user: { id: '1', name: 'User', roles: ['user'] }
        }
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        status: 403,
        required: ['admin'],
        userRoles: ['user']
      });
    });

    it('should reject request when user is not authenticated', async () => {
      const middleware = requireRole('admin');
      const ctx = createMockContext({
        state: {}
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(next).not.toHaveBeenCalled();
      expect(ctx.statusCode).toBe(401);
      expect(ctx.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        status: 401
      });
    });

    it('should use custom roleKey', async () => {
      const middleware = requireRole('admin', 'permissions');
      const ctx = createMockContext({
        state: {
          user: { id: '1', name: 'Admin', permissions: ['admin'] }
        }
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(next).toHaveBeenCalled();
      expect(ctx.statusCode).toBe(200);
    });

    it('should handle user with empty roles array', async () => {
      const middleware = requireRole('admin');
      const ctx = createMockContext({
        state: {
          user: { id: '1', name: 'User', roles: [] }
        }
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(next).not.toHaveBeenCalled();
      expect(ctx.statusCode).toBe(403);
    });

    it('should handle user without roles property', async () => {
      const middleware = requireRole('admin');
      const ctx = createMockContext({
        state: {
          user: { id: '1', name: 'User' }
        }
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(next).not.toHaveBeenCalled();
      expect(ctx.statusCode).toBe(403);
    });
  });

  describe('requirePermission()', () => {
    it('should allow request when user has required permission', async () => {
      const middleware = requirePermission('read:all');
      const ctx = createMockContext({
        state: {
          user: { id: '1', name: 'User', permissions: ['read:all', 'write:own'] }
        }
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(next).toHaveBeenCalled();
      expect(ctx.statusCode).toBe(200);
    });

    it('should allow request when user has wildcard permission', async () => {
      const middleware = requirePermission('read:all');
      const ctx = createMockContext({
        state: {
          user: { id: '1', name: 'Super Admin', permissions: ['*'] }
        }
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(next).toHaveBeenCalled();
      expect(ctx.statusCode).toBe(200);
    });

    it('should allow request when user has one of multiple required permissions', async () => {
      const middleware = requirePermission(['read:all', 'write:all']);
      const ctx = createMockContext({
        state: {
          user: { id: '1', name: 'User', permissions: ['read:all'] }
        }
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(next).toHaveBeenCalled();
      expect(ctx.statusCode).toBe(200);
    });

    it('should reject request when user does not have required permission', async () => {
      const middleware = requirePermission('read:all');
      const ctx = createMockContext({
        state: {
          user: { id: '1', name: 'User', permissions: ['read:own'] }
        }
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(next).not.toHaveBeenCalled();
      expect(ctx.statusCode).toBe(403);
      expect(ctx.res.statusCode).toBe(403);
    });

    it('should return 403 error with required permissions', async () => {
      const middleware = requirePermission('read:all');
      const ctx = createMockContext({
        state: {
          user: { id: '1', name: 'User', permissions: ['read:own'] }
        }
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        status: 403,
        required: ['read:all']
      });
    });

    it('should reject request when user is not authenticated', async () => {
      const middleware = requirePermission('read:all');
      const ctx = createMockContext({
        state: {}
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(next).not.toHaveBeenCalled();
      expect(ctx.statusCode).toBe(401);
      expect(ctx.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        status: 401
      });
    });

    it('should use custom permissionKey', async () => {
      const middleware = requirePermission('read:all', 'access');
      const ctx = createMockContext({
        state: {
          user: { id: '1', name: 'User', access: ['read:all'] }
        }
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(next).toHaveBeenCalled();
      expect(ctx.statusCode).toBe(200);
    });

    it('should handle user with empty permissions array', async () => {
      const middleware = requirePermission('read:all');
      const ctx = createMockContext({
        state: {
          user: { id: '1', name: 'User', permissions: [] }
        }
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(next).not.toHaveBeenCalled();
      expect(ctx.statusCode).toBe(403);
    });

    it('should handle user without permissions property', async () => {
      const middleware = requirePermission('read:all');
      const ctx = createMockContext({
        state: {
          user: { id: '1', name: 'User' }
        }
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(next).not.toHaveBeenCalled();
      expect(ctx.statusCode).toBe(403);
    });
  });

  describe('setAuthCookie()', () => {
    it('should set auth cookie with default options', () => {
      const ctx = createMockContext();
      const options = {};

      setAuthCookie(ctx, 'test-token', options);

      expect(ctx.res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        'auth-token=test-token; Max-Age=86400; Path=/; SameSite=lax; HttpOnly'
      );
    });

    it('should set auth cookie with custom cookie name', () => {
      const ctx = createMockContext();
      const options = { cookieName: 'custom-token' };

      setAuthCookie(ctx, 'test-token', options);

      expect(ctx.res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        'custom-token=test-token; Max-Age=86400; Path=/; SameSite=lax; HttpOnly'
      );
    });

    it('should set auth cookie with secure flag', () => {
      const ctx = createMockContext();
      const options = { secure: true };

      setAuthCookie(ctx, 'test-token', options);

      expect(ctx.res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        'auth-token=test-token; Max-Age=86400; Path=/; SameSite=lax; Secure; HttpOnly'
      );
    });

    it('should set auth cookie without httpOnly flag', () => {
      const ctx = createMockContext();
      const options = { httpOnly: false };

      setAuthCookie(ctx, 'test-token', options);

      expect(ctx.res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        'auth-token=test-token; Max-Age=86400; Path=/; SameSite=lax'
      );
    });

    it('should set auth cookie with custom sameSite', () => {
      const ctx = createMockContext();
      const options = { sameSite: 'strict' as const };

      setAuthCookie(ctx, 'test-token', options);

      expect(ctx.res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        'auth-token=test-token; Max-Age=86400; Path=/; SameSite=strict; HttpOnly'
      );
    });

    it('should set auth cookie with custom maxAge', () => {
      const ctx = createMockContext();
      const options = {};

      setAuthCookie(ctx, 'test-token', options, 3600);

      expect(ctx.res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        'auth-token=test-token; Max-Age=3600; Path=/; SameSite=lax; HttpOnly'
      );
    });
  });

  describe('clearAuthCookie()', () => {
    it('should clear auth cookie with default options', () => {
      const ctx = createMockContext();
      const options = {};

      clearAuthCookie(ctx, options);

      expect(ctx.res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        'auth-token=; Max-Age=0; Path=/; SameSite=lax; HttpOnly'
      );
    });

    it('should clear auth cookie with custom cookie name', () => {
      const ctx = createMockContext();
      const options = { cookieName: 'custom-token' };

      clearAuthCookie(ctx, options);

      expect(ctx.res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        'custom-token=; Max-Age=0; Path=/; SameSite=lax; HttpOnly'
      );
    });

    it('should clear auth cookie with secure flag', () => {
      const ctx = createMockContext();
      const options = { secure: true };

      clearAuthCookie(ctx, options);

      expect(ctx.res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        'auth-token=; Max-Age=0; Path=/; SameSite=lax; Secure; HttpOnly'
      );
    });

    it('should clear auth cookie without httpOnly flag', () => {
      const ctx = createMockContext();
      const options = { httpOnly: false };

      clearAuthCookie(ctx, options);

      expect(ctx.res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        'auth-token=; Max-Age=0; Path=/; SameSite=lax'
      );
    });

    it('should clear auth cookie with custom sameSite', () => {
      const ctx = createMockContext();
      const options = { sameSite: 'none' as const };

      clearAuthCookie(ctx, options);

      expect(ctx.res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        'auth-token=; Max-Age=0; Path=/; SameSite=none; HttpOnly'
      );
    });
  });
});


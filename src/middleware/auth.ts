import { Context } from '../types.js';
import { AuthenticationError, AuthorizationError } from '../errors.js';

export interface AuthUser {
  id: string;
  [key: string]: any;
}

export interface AuthOptions {
  cookieName?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  tokenExtractor?: (ctx: Context) => string | null;
  userResolver?: (token: string) => Promise<AuthUser | null>;
}

export function auth(options: AuthOptions) {
  const { cookieName = 'auth-token', tokenExtractor, userResolver } = options;

  return async (ctx: Context, next: () => Promise<void>) => {
    let token: string | null = null;

    if (tokenExtractor) {
      token = tokenExtractor(ctx);
    } else {
      token = ctx.req.headers.authorization?.replace('Bearer ', '') || null;

      if (!token) {
        const cookieHeader = ctx.req.headers.cookie;
        if (cookieHeader) {
          const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=');
            acc[key] = value;
            return acc;
          }, {} as Record<string, string>);
          token = cookies[cookieName] || null;
        }
      }
    }

    if (token && userResolver) {
      try {
        const user = await userResolver(token);
        if (user) {
          ctx.state.user = user;
          ctx.state.token = token;
        }
      } catch (error) {
        console.warn('Auth user resolution failed:', error);
      }
    }

    await next();
  };
}

export function requireAuth() {
  return async (ctx: Context, next: () => Promise<void>) => {
    if (!ctx.state.user) {
      throw new AuthenticationError('Authentication required');
    }
    await next();
  };
}

export function requireRole(roles: string | string[], roleKey: string = 'roles') {
  const requiredRoles = Array.isArray(roles) ? roles : [roles];

  return async (ctx: Context, next: () => Promise<void>) => {
    if (!ctx.state.user) {
      throw new AuthenticationError('Authentication required');
    }

    const userRoles = ctx.state.user[roleKey] || [];
    const hasRequiredRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRequiredRole) {
      const error = AuthorizationError.insufficientPermissions(requiredRoles);
      (error.meta as Record<string, unknown>).userRoles = userRoles;
      throw error;
    }

    await next();
  };
}

export function requirePermission(permissions: string | string[], permissionKey: string = 'permissions') {
  const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];

  return async (ctx: Context, next: () => Promise<void>) => {
    if (!ctx.state.user) {
      throw new AuthenticationError('Authentication required');
    }

    const userPermissions = ctx.state.user[permissionKey] || [];
    const hasPermission = requiredPermissions.some(
      (permission) => userPermissions.includes('*') || userPermissions.includes(permission),
    );

    if (!hasPermission) {
      throw AuthorizationError.insufficientPermissions(requiredPermissions);
    }

    await next();
  };
}

export function setAuthCookie(ctx: Context, token: string, options: AuthOptions, maxAge: number = 86400) {
  const { cookieName = 'auth-token', secure = false, httpOnly = true, sameSite = 'lax' } = options;

  const cookieOptions = [`${cookieName}=${token}`, `Max-Age=${maxAge}`, `Path=/`, `SameSite=${sameSite}`];

  if (secure) cookieOptions.push('Secure');
  if (httpOnly) cookieOptions.push('HttpOnly');

  ctx.res.setHeader('Set-Cookie', cookieOptions.join('; '));
}

export function clearAuthCookie(ctx: Context, options: AuthOptions) {
  const { cookieName = 'auth-token', secure = false, httpOnly = true, sameSite = 'lax' } = options;

  const cookieOptions = [`${cookieName}=`, `Max-Age=0`, `Path=/`, `SameSite=${sameSite}`];

  if (secure) cookieOptions.push('Secure');
  if (httpOnly) cookieOptions.push('HttpOnly');

  ctx.res.setHeader('Set-Cookie', cookieOptions.join('; '));
}

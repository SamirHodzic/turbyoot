import { Context } from '../types.js';

// Generic user interface (let developers define their own)
export interface AuthUser {
  id: string;
  [key: string]: any; // Allow any additional properties
}

// Auth options
export interface AuthOptions {
  cookieName?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  tokenExtractor?: (ctx: Context) => string | null;
  userResolver?: (token: string) => Promise<AuthUser | null>;
}

// Auth middleware - generic token extraction and user resolution
export function auth(options: AuthOptions) {
  const {
    cookieName = 'auth-token',
    tokenExtractor,
    userResolver
  } = options;

  return async (ctx: Context, next: () => Promise<void>) => {
    // Extract token using custom extractor or default methods
    let token: string | null = null;
    
    if (tokenExtractor) {
      token = tokenExtractor(ctx);
    } else {
      // Default token extraction from Authorization header or cookie
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

    // Resolve user from token if userResolver is provided
    if (token && userResolver) {
      try {
        const user = await userResolver(token);
        if (user) {
          ctx.state.user = user;
          ctx.state.token = token;
        }
      } catch (error) {
        // Silently fail - let the application handle auth errors
        console.warn('Auth user resolution failed:', error);
      }
    }

    await next();
  };
}

// Require authentication middleware
export function requireAuth() {
  return async (ctx: Context, next: () => Promise<void>) => {
    if (!ctx.state.user) {
      ctx.statusCode = 401;
      ctx.res.statusCode = 401;
      ctx.json({ error: 'Authentication required', status: 401 });
      return;
    }
    await next();
  };
}

// Require specific role middleware
export function requireRole(roles: string | string[], roleKey: string = 'roles') {
  const requiredRoles = Array.isArray(roles) ? roles : [roles];
  
  return async (ctx: Context, next: () => Promise<void>) => {
    if (!ctx.state.user) {
      ctx.statusCode = 401;
      ctx.res.statusCode = 401;
      ctx.json({ error: 'Authentication required', status: 401 });
      return;
    }

    const userRoles = ctx.state.user[roleKey] || [];
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      ctx.statusCode = 403;
      ctx.res.statusCode = 403;
      ctx.json({ 
        error: 'Insufficient permissions', 
        status: 403,
        required: requiredRoles,
        userRoles: userRoles
      });
      return;
    }

    await next();
  };
}

// Require specific permission middleware
export function requirePermission(permissions: string | string[], permissionKey: string = 'permissions') {
  const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
  
  return async (ctx: Context, next: () => Promise<void>) => {
    if (!ctx.state.user) {
      ctx.statusCode = 401;
      ctx.res.statusCode = 401;
      ctx.json({ error: 'Authentication required', status: 401 });
      return;
    }

    const userPermissions = ctx.state.user[permissionKey] || [];
    const hasPermission = requiredPermissions.some(permission => 
      userPermissions.includes('*') || userPermissions.includes(permission)
    );
    
    if (!hasPermission) {
      ctx.statusCode = 403;
      ctx.res.statusCode = 403;
      ctx.json({ 
        error: 'Insufficient permissions', 
        status: 403,
        required: requiredPermissions
      });
      return;
    }

    await next();
  };
}

// Cookie helper utilities (framework infrastructure only)
export function setAuthCookie(ctx: Context, token: string, options: AuthOptions, maxAge: number = 86400) {
  const { cookieName = 'auth-token', secure = false, httpOnly = true, sameSite = 'lax' } = options;
  
  const cookieOptions = [
    `${cookieName}=${token}`,
    `Max-Age=${maxAge}`,
    `Path=/`,
    `SameSite=${sameSite}`
  ];
  
  if (secure) cookieOptions.push('Secure');
  if (httpOnly) cookieOptions.push('HttpOnly');
  
  ctx.res.setHeader('Set-Cookie', cookieOptions.join('; '));
}

export function clearAuthCookie(ctx: Context, options: AuthOptions) {
  const { cookieName = 'auth-token', secure = false, httpOnly = true, sameSite = 'lax' } = options;
  
  const cookieOptions = [
    `${cookieName}=`,
    `Max-Age=0`,
    `Path=/`,
    `SameSite=${sameSite}`
  ];
  
  if (secure) cookieOptions.push('Secure');
  if (httpOnly) cookieOptions.push('HttpOnly');
  
  ctx.res.setHeader('Set-Cookie', cookieOptions.join('; '));
}

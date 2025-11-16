import { Context } from '../types.js';
import { randomBytes, createHash } from 'crypto';

export interface CsrfOptions {
  cookieName?: string;
  headerName?: string;
  secret?: string;
  cookieOptions?: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    maxAge?: number;
  };
  skipMethods?: string[];
  skipPaths?: string[];
  skip?: (ctx: Context) => boolean;
}

const DEFAULT_COOKIE_NAME = 'csrf-token';
const DEFAULT_HEADER_NAME = 'X-CSRF-Token';
const DEFAULT_SECRET_LENGTH = 32;
const DEFAULT_COOKIE_MAX_AGE = 60 * 60 * 24;

function generateToken(secret: string): string {
  const random = randomBytes(32).toString('hex');
  const hash = createHash('sha256').update(secret + random).digest('hex');
  return `${random}:${hash}`;
}

function verifyToken(token: string, secret: string): boolean {
  const parts = token.split(':');
  if (parts.length !== 2) {
    return false;
  }
  const [random, hash] = parts;
  const expectedHash = createHash('sha256').update(secret + random).digest('hex');
  return hash === expectedHash;
}

function getCookieValue(cookieHeader: string | string[] | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const cookies = Array.isArray(cookieHeader) ? cookieHeader.join('; ') : cookieHeader;
  const match = cookies.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function csrf(options: CsrfOptions = {}) {
  const {
    cookieName = DEFAULT_COOKIE_NAME,
    headerName = DEFAULT_HEADER_NAME,
    secret = randomBytes(DEFAULT_SECRET_LENGTH).toString('hex'),
    cookieOptions = {},
    skipMethods = ['GET', 'HEAD', 'OPTIONS'],
    skipPaths = [],
    skip,
  } = options;

  const {
    httpOnly = true,
    secure = false,
    sameSite = 'lax',
    maxAge = DEFAULT_COOKIE_MAX_AGE,
  } = cookieOptions;

  return async (ctx: Context, next: () => Promise<void>) => {
    const method = ctx.req.method || '';
    const path = ctx.req.url?.split('?')[0] || '';

    if (skip && skip(ctx)) {
      await next();
      return;
    }

    if (skipMethods.includes(method.toUpperCase())) {
      let token = getCookieValue(ctx.req.headers.cookie, cookieName);
      
      if (!token || !verifyToken(token, secret)) {
        token = generateToken(secret);
      }
      
      const cookieParts = [
        `${cookieName}=${encodeURIComponent(token)}`,
        `Max-Age=${maxAge}`,
        ...(httpOnly ? ['HttpOnly'] : []),
        ...(secure ? ['Secure'] : []),
        ...(sameSite ? [`SameSite=${sameSite}`] : [])
      ];
      ctx.res.setHeader('Set-Cookie', cookieParts.join('; '));
      ctx.state.csrfToken = token;
      await next();
      return;
    }

    if (skipPaths.some(skipPath => path.startsWith(skipPath))) {
      await next();
      return;
    }

    const cookieToken = getCookieValue(ctx.req.headers.cookie, cookieName);
    const headerToken = ctx.req.headers[headerName.toLowerCase()] as string | undefined;

    if (!cookieToken) {
      ctx.statusCode = 403;
      ctx.res.statusCode = 403;
      ctx.json({ error: 'CSRF token missing', status: 403 });
      return;
    }

    if (!headerToken) {
      ctx.statusCode = 403;
      ctx.res.statusCode = 403;
      ctx.json({ error: 'CSRF token missing in header', status: 403 });
      return;
    }

    if (cookieToken !== headerToken || !verifyToken(cookieToken, secret)) {
      ctx.statusCode = 403;
      ctx.res.statusCode = 403;
      ctx.json({ error: 'Invalid CSRF token', status: 403 });
      return;
    }

    await next();
  };
}


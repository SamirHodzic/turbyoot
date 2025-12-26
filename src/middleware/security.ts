import { Context, SecurityOptions, RateLimitOptions, CorsOptions } from '../types.js';
import { AuthorizationError, RateLimitError } from '../errors.js';

export function helmet(options: SecurityOptions = {}) {
  return async (ctx: Context, next: () => Promise<void>) => {
    const {
      contentSecurityPolicy = true,
      crossOriginEmbedderPolicy = true,
      crossOriginOpenerPolicy = true,
      crossOriginResourcePolicy = true,
      dnsPrefetchControl = true,
      frameguard = true,
      hidePoweredBy = true,
      hsts = true,
      ieNoOpen = true,
      noSniff = true,
      originAgentCluster = true,
      permittedCrossDomainPolicies = true,
      referrerPolicy = true,
      xssFilter = true,
    } = options;

    if (contentSecurityPolicy) {
      const csp = typeof contentSecurityPolicy === 'string' ? contentSecurityPolicy : "default-src 'self'";
      ctx.res.setHeader('Content-Security-Policy', csp);
    }

    if (crossOriginEmbedderPolicy) {
      const coep = typeof crossOriginEmbedderPolicy === 'string' ? crossOriginEmbedderPolicy : 'require-corp';
      ctx.res.setHeader('Cross-Origin-Embedder-Policy', coep);
    }

    if (crossOriginOpenerPolicy) {
      const coop = typeof crossOriginOpenerPolicy === 'string' ? crossOriginOpenerPolicy : 'same-origin';
      ctx.res.setHeader('Cross-Origin-Opener-Policy', coop);
    }

    if (crossOriginResourcePolicy) {
      const corp = typeof crossOriginResourcePolicy === 'string' ? crossOriginResourcePolicy : 'same-origin';
      ctx.res.setHeader('Cross-Origin-Resource-Policy', corp);
    }

    if (dnsPrefetchControl) {
      ctx.res.setHeader('X-DNS-Prefetch-Control', 'off');
    }

    if (frameguard) {
      const action = typeof frameguard === 'object' ? frameguard.action || 'deny' : 'deny';
      ctx.res.setHeader('X-Frame-Options', action.toUpperCase());
    }

    if (hidePoweredBy) {
      ctx.res.removeHeader('X-Powered-By');
    }

    if (hsts) {
      const hstsOptions = typeof hsts === 'object' ? hsts : { maxAge: 31536000 };
      const hstsValue = `max-age=${hstsOptions.maxAge}${hstsOptions.includeSubDomains ? '; includeSubDomains' : ''}${
        hstsOptions.preload ? '; preload' : ''
      }`;
      ctx.res.setHeader('Strict-Transport-Security', hstsValue);
    }

    if (ieNoOpen) {
      ctx.res.setHeader('X-Download-Options', 'noopen');
    }

    if (noSniff) {
      ctx.res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    if (originAgentCluster) {
      ctx.res.setHeader('Origin-Agent-Cluster', '?1');
    }

    if (permittedCrossDomainPolicies) {
      const policy = typeof permittedCrossDomainPolicies === 'string' ? permittedCrossDomainPolicies : 'none';
      ctx.res.setHeader('X-Permitted-Cross-Domain-Policies', policy);
    }

    if (referrerPolicy) {
      const policy = typeof referrerPolicy === 'string' ? referrerPolicy : 'no-referrer';
      ctx.res.setHeader('Referrer-Policy', policy);
    }

    if (xssFilter) {
      ctx.res.setHeader('X-XSS-Protection', '1; mode=block');
    }

    await next();
  };
}

function matchOrigin(
  reqOrigin: string | undefined,
  origin: string | string[] | RegExp | ((origin: string) => boolean | Promise<boolean>),
): boolean | Promise<boolean> {
  if (!reqOrigin) {
    return false;
  }

  if (origin === '*') {
    return true;
  }

  if (origin instanceof RegExp) {
    return origin.test(reqOrigin);
  }

  if (Array.isArray(origin)) {
    return origin.includes(reqOrigin);
  }

  if (typeof origin === 'function') {
    return origin(reqOrigin);
  }

  return reqOrigin === origin;
}

function matchWildcardSubdomain(pattern: string, origin: string): boolean {
  if (!pattern.includes('*')) {
    return pattern === origin;
  }

  const regexPattern = pattern.replace(/\*/g, '[^.]*').replace(/\./g, '\\.');
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(origin);
}

export function cors(options: CorsOptions = {}) {
  const {
    origin = '*',
    methods = ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    allowedHeaders = ['Content-Type', 'Authorization'],
    exposedHeaders = [],
    credentials = false,
    maxAge = 86400,
    preflightContinue = false,
    optionsSuccessStatus = 204,
    preflightCacheControl = true,
    validateCredentials,
  } = options;

  if (credentials && origin === '*') {
    throw new Error('Cannot use credentials: true with origin: "*". Use a specific origin or origin function instead.');
  }

  return async (ctx: Context, next: () => Promise<void>) => {
    const reqOrigin = ctx.req.headers.origin as string | undefined;
    let allowedOrigin: string | null = null;

    if (origin === '*') {
      allowedOrigin = '*';
    } else if (typeof origin === 'string' && origin.includes('*')) {
      if (reqOrigin && matchWildcardSubdomain(origin, reqOrigin)) {
        allowedOrigin = reqOrigin;
      } else if (!reqOrigin && !origin.includes('*')) {
        allowedOrigin = origin;
      }
    } else if (typeof origin === 'string') {
      if (reqOrigin && reqOrigin === origin) {
        allowedOrigin = reqOrigin;
      } else if (!reqOrigin) {
        allowedOrigin = origin;
      }
    } else if (Array.isArray(origin)) {
      if (reqOrigin && origin.includes(reqOrigin)) {
        allowedOrigin = reqOrigin;
      }
    } else if (origin instanceof RegExp) {
      if (reqOrigin && origin.test(reqOrigin)) {
        allowedOrigin = reqOrigin;
      }
    } else {
      if (reqOrigin) {
        const matchResult = matchOrigin(reqOrigin, origin);
        const isAllowed = matchResult instanceof Promise ? await matchResult : matchResult;
        if (isAllowed) {
          allowedOrigin = reqOrigin;
        }
      }
    }

    if (allowedOrigin) {
      ctx.res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    }

    if (credentials && allowedOrigin) {
      if (validateCredentials) {
        const isValid = await validateCredentials(allowedOrigin);
        if (!isValid) {
          throw new AuthorizationError('Credentials validation failed');
        }
      }
      ctx.res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    const isPreflight = ctx.req.method === 'OPTIONS' && 
      reqOrigin && 
      ctx.req.headers['access-control-request-method'];

    if (isPreflight) {
      ctx.res.setHeader('Access-Control-Allow-Methods', Array.isArray(methods) ? methods.join(', ') : methods);
      ctx.res.setHeader(
        'Access-Control-Allow-Headers',
        Array.isArray(allowedHeaders) ? allowedHeaders.join(', ') : allowedHeaders,
      );
      ctx.res.setHeader('Access-Control-Max-Age', maxAge.toString());

      if (preflightCacheControl) {
        const cacheControlValue = typeof preflightCacheControl === 'string'
          ? preflightCacheControl
          : `public, max-age=${maxAge}`;
        ctx.res.setHeader('Cache-Control', cacheControlValue);
      }

      if (exposedHeaders.length > 0) {
        ctx.res.setHeader(
          'Access-Control-Expose-Headers',
          Array.isArray(exposedHeaders) ? exposedHeaders.join(', ') : exposedHeaders,
        );
      }

      if (!preflightContinue) {
        ctx.res.statusCode = optionsSuccessStatus;
        ctx.res.end();
        return;
      }
    }

    await next();
  };
}

export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max, message = 'Too many requests', skip, keyGenerator } = options;
  const requests = new Map<string, { count: number; resetTime: number }>();

  return async (ctx: Context, next: () => Promise<void>) => {
    if (skip && skip(ctx)) {
      await next();
      return;
    }

    const key = keyGenerator ? keyGenerator(ctx) : ctx.req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    for (const [k, v] of requests.entries()) {
      if (v.resetTime < windowStart) {
        requests.delete(k);
      }
    }

    const current = requests.get(key);

    if (!current) {
      requests.set(key, { count: 1, resetTime: now });
    } else if (current.resetTime < windowStart) {
      requests.set(key, { count: 1, resetTime: now });
    } else if (current.count >= max) {
      ctx.res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
      throw new RateLimitError(message, {
        retryAfter: Math.ceil(windowMs / 1000),
        limit: max,
      });
    } else {
      current.count++;
    }

    await next();
  };
}


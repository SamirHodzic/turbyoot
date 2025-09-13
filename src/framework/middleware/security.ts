import { Context, SecurityOptions, RateLimitOptions } from '../types.js';

// Security headers middleware (Helmet-like)
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
      xssFilter = true
    } = options;

    // Content Security Policy
    if (contentSecurityPolicy) {
      const csp = typeof contentSecurityPolicy === 'string' 
        ? contentSecurityPolicy 
        : "default-src 'self'";
      ctx.res.setHeader('Content-Security-Policy', csp);
    }

    // Cross-Origin Embedder Policy
    if (crossOriginEmbedderPolicy) {
      const coep = typeof crossOriginEmbedderPolicy === 'string'
        ? crossOriginEmbedderPolicy
        : 'require-corp';
      ctx.res.setHeader('Cross-Origin-Embedder-Policy', coep);
    }

    // Cross-Origin Opener Policy
    if (crossOriginOpenerPolicy) {
      const coop = typeof crossOriginOpenerPolicy === 'string'
        ? crossOriginOpenerPolicy
        : 'same-origin';
      ctx.res.setHeader('Cross-Origin-Opener-Policy', coop);
    }

    // Cross-Origin Resource Policy
    if (crossOriginResourcePolicy) {
      const corp = typeof crossOriginResourcePolicy === 'string'
        ? crossOriginResourcePolicy
        : 'same-origin';
      ctx.res.setHeader('Cross-Origin-Resource-Policy', corp);
    }

    // DNS Prefetch Control
    if (dnsPrefetchControl) {
      ctx.res.setHeader('X-DNS-Prefetch-Control', 'off');
    }

    // X-Frame-Options
    if (frameguard) {
      const action = typeof frameguard === 'object' ? frameguard.action : 'deny';
      ctx.res.setHeader('X-Frame-Options', action.toUpperCase());
    }

    // Hide X-Powered-By
    if (hidePoweredBy) {
      ctx.res.removeHeader('X-Powered-By');
    }

    // HTTP Strict Transport Security
    if (hsts) {
      const hstsOptions = typeof hsts === 'object' ? hsts : { maxAge: 31536000 };
      const hstsValue = `max-age=${hstsOptions.maxAge}${hstsOptions.includeSubDomains ? '; includeSubDomains' : ''}${hstsOptions.preload ? '; preload' : ''}`;
      ctx.res.setHeader('Strict-Transport-Security', hstsValue);
    }

    // X-Download-Options
    if (ieNoOpen) {
      ctx.res.setHeader('X-Download-Options', 'noopen');
    }

    // X-Content-Type-Options
    if (noSniff) {
      ctx.res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    // Origin-Agent-Cluster
    if (originAgentCluster) {
      ctx.res.setHeader('Origin-Agent-Cluster', '?1');
    }

    // X-Permitted-Cross-Domain-Policies
    if (permittedCrossDomainPolicies) {
      const policy = typeof permittedCrossDomainPolicies === 'string'
        ? permittedCrossDomainPolicies
        : 'none';
      ctx.res.setHeader('X-Permitted-Cross-Domain-Policies', policy);
    }

    // Referrer Policy
    if (referrerPolicy) {
      const policy = typeof referrerPolicy === 'string'
        ? referrerPolicy
        : 'no-referrer';
      ctx.res.setHeader('Referrer-Policy', policy);
    }

    // X-XSS-Protection
    if (xssFilter) {
      ctx.res.setHeader('X-XSS-Protection', '1; mode=block');
    }

    await next();
  };
}

// CORS middleware
export function cors(options: {
  origin?: string | string[] | ((origin: string) => boolean);
  methods?: string | string[];
  allowedHeaders?: string | string[];
  exposedHeaders?: string | string[];
  credentials?: boolean;
  maxAge?: number;
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
} = {}) {
  const {
    origin = '*',
    methods = ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    allowedHeaders = ['Content-Type', 'Authorization'],
    exposedHeaders = [],
    credentials = false,
    maxAge = 86400,
    preflightContinue = false,
    optionsSuccessStatus = 204
  } = options;

  return async (ctx: Context, next: () => Promise<void>) => {
    const reqOrigin = ctx.req.headers.origin;
    
    // Set origin
    if (origin === '*') {
      ctx.res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (typeof origin === 'function') {
      if (reqOrigin && origin(reqOrigin)) {
        ctx.res.setHeader('Access-Control-Allow-Origin', reqOrigin);
      }
    } else if (Array.isArray(origin)) {
      if (reqOrigin && origin.includes(reqOrigin)) {
        ctx.res.setHeader('Access-Control-Allow-Origin', reqOrigin);
      }
    } else {
      ctx.res.setHeader('Access-Control-Allow-Origin', origin);
    }

    // Set credentials
    if (credentials) {
      ctx.res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // Handle preflight requests
    if (ctx.req.method === 'OPTIONS') {
      ctx.res.setHeader('Access-Control-Allow-Methods', Array.isArray(methods) ? methods.join(', ') : methods);
      ctx.res.setHeader('Access-Control-Allow-Headers', Array.isArray(allowedHeaders) ? allowedHeaders.join(', ') : allowedHeaders);
      ctx.res.setHeader('Access-Control-Max-Age', maxAge.toString());
      
      if (exposedHeaders.length > 0) {
        ctx.res.setHeader('Access-Control-Expose-Headers', Array.isArray(exposedHeaders) ? exposedHeaders.join(', ') : exposedHeaders);
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

// Rate limiting middleware
export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max, message = 'Too many requests', skip, keyGenerator } = options;
  const requests = new Map<string, { count: number; resetTime: number }>();

  return async (ctx: Context, next: () => Promise<void>) => {
    // Skip if skip function returns true
    if (skip && skip(ctx)) {
      await next();
      return;
    }

    const key = keyGenerator ? keyGenerator(ctx) : ctx.req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
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
      ctx.statusCode = 429;
      ctx.res.statusCode = 429;
      ctx.res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
      ctx.json({ error: message, status: 429 });
      return;
    } else {
      current.count++;
    }

    await next();
  };
}

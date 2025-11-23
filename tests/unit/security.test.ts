import { describe, it, expect, jest } from '@jest/globals';
import { helmet, cors, rateLimit } from '../../src/middleware/security.js';
import { Context } from '../../src/types.js';
import { createMockContext } from '../utils/test-helpers.js';

describe('Security Middleware', () => {
  describe('helmet()', () => {
    it('should set default security headers', async () => {
      const middleware = helmet();
      const ctx = createMockContext({
        res: {
          setHeader: jest.fn(),
          removeHeader: jest.fn(),
          statusCode: 200,
          headersSent: false
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Content-Security-Policy', "default-src 'self'");
      expect(ctx.res.setHeader).toHaveBeenCalledWith('Cross-Origin-Embedder-Policy', 'require-corp');
      expect(ctx.res.setHeader).toHaveBeenCalledWith('Cross-Origin-Opener-Policy', 'same-origin');
      expect(ctx.res.setHeader).toHaveBeenCalledWith('Cross-Origin-Resource-Policy', 'same-origin');
      expect(ctx.res.setHeader).toHaveBeenCalledWith('X-DNS-Prefetch-Control', 'off');
      expect(ctx.res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(ctx.res.setHeader).toHaveBeenCalledWith('Strict-Transport-Security', expect.stringContaining('max-age='));
      expect(ctx.res.setHeader).toHaveBeenCalledWith('X-Download-Options', 'noopen');
      expect(ctx.res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(ctx.res.setHeader).toHaveBeenCalledWith('Origin-Agent-Cluster', '?1');
      expect(ctx.res.setHeader).toHaveBeenCalledWith('X-Permitted-Cross-Domain-Policies', 'none');
      expect(ctx.res.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'no-referrer');
      expect(ctx.res.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
      expect(ctx.res.removeHeader).toHaveBeenCalledWith('X-Powered-By');
      expect(next).toHaveBeenCalled();
    });

    it('should set custom Content-Security-Policy', async () => {
      const middleware = helmet({ contentSecurityPolicy: "default-src 'self' 'unsafe-inline'" });
      const ctx = createMockContext({
        res: {
          setHeader: jest.fn(),
          removeHeader: jest.fn(),
          statusCode: 200
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Content-Security-Policy', "default-src 'self' 'unsafe-inline'");
      expect(next).toHaveBeenCalled();
    });

    it('should disable Content-Security-Policy when set to false', async () => {
      const middleware = helmet({ contentSecurityPolicy: false });
      const ctx = createMockContext({
        res: {
          setHeader: jest.fn(),
          removeHeader: jest.fn(),
          statusCode: 200
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      const cspCalls = (ctx.res.setHeader as jest.Mock).mock.calls.filter(
        (call) => call[0] === 'Content-Security-Policy'
      );
      expect(cspCalls.length).toBe(0);
      expect(next).toHaveBeenCalled();
    });

    it('should set custom Cross-Origin-Embedder-Policy', async () => {
      const middleware = helmet({ crossOriginEmbedderPolicy: 'unsafe-none' });
      const ctx = createMockContext({
        res: {
          setHeader: jest.fn(),
          removeHeader: jest.fn(),
          statusCode: 200
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Cross-Origin-Embedder-Policy', 'unsafe-none');
      expect(next).toHaveBeenCalled();
    });

    it('should set custom Cross-Origin-Opener-Policy', async () => {
      const middleware = helmet({ crossOriginOpenerPolicy: 'unsafe-none' });
      const ctx = createMockContext({
        res: {
          setHeader: jest.fn(),
          removeHeader: jest.fn(),
          statusCode: 200
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Cross-Origin-Opener-Policy', 'unsafe-none');
      expect(next).toHaveBeenCalled();
    });

    it('should set custom Cross-Origin-Resource-Policy', async () => {
      const middleware = helmet({ crossOriginResourcePolicy: 'cross-origin' });
      const ctx = createMockContext({
        res: {
          setHeader: jest.fn(),
          removeHeader: jest.fn(),
          statusCode: 200
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Cross-Origin-Resource-Policy', 'cross-origin');
      expect(next).toHaveBeenCalled();
    });

    it('should set X-Frame-Options with custom action', async () => {
      const middleware = helmet({ frameguard: { action: 'SAMEORIGIN' } });
      const ctx = createMockContext({
        res: {
          setHeader: jest.fn(),
          removeHeader: jest.fn(),
          statusCode: 200
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'SAMEORIGIN');
      expect(next).toHaveBeenCalled();
    });

    it('should set HSTS with custom options', async () => {
      const middleware = helmet({
        hsts: {
          maxAge: 63072000,
          includeSubDomains: true,
          preload: true
        }
      });
      const ctx = createMockContext({
        res: {
          setHeader: jest.fn(),
          removeHeader: jest.fn(),
          statusCode: 200
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      const hstsCall = (ctx.res.setHeader as jest.Mock).mock.calls.find(
        (call) => call[0] === 'Strict-Transport-Security'
      );
      expect(hstsCall).toBeTruthy();
      expect(hstsCall![1]).toContain('max-age=63072000');
      expect(hstsCall![1]).toContain('includeSubDomains');
      expect(hstsCall![1]).toContain('preload');
      expect(next).toHaveBeenCalled();
    });

    it('should set HSTS without subdomains and preload', async () => {
      const middleware = helmet({
        hsts: {
          maxAge: 31536000,
          includeSubDomains: false,
          preload: false
        }
      });
      const ctx = createMockContext({
        res: {
          setHeader: jest.fn(),
          removeHeader: jest.fn(),
          statusCode: 200
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      const hstsCall = (ctx.res.setHeader as jest.Mock).mock.calls.find(
        (call) => call[0] === 'Strict-Transport-Security'
      );
      expect(hstsCall).toBeTruthy();
      expect(hstsCall![1]).toBe('max-age=31536000');
      expect(next).toHaveBeenCalled();
    });

    it('should set custom Referrer-Policy', async () => {
      const middleware = helmet({ referrerPolicy: 'strict-origin-when-cross-origin' });
      const ctx = createMockContext({
        res: {
          setHeader: jest.fn(),
          removeHeader: jest.fn(),
          statusCode: 200
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin');
      expect(next).toHaveBeenCalled();
    });

    it('should set custom X-Permitted-Cross-Domain-Policies', async () => {
      const middleware = helmet({ permittedCrossDomainPolicies: 'all' });
      const ctx = createMockContext({
        res: {
          setHeader: jest.fn(),
          removeHeader: jest.fn(),
          statusCode: 200
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.res.setHeader).toHaveBeenCalledWith('X-Permitted-Cross-Domain-Policies', 'all');
      expect(next).toHaveBeenCalled();
    });

    it('should disable individual security headers', async () => {
      const middleware = helmet({
        xssFilter: false,
        noSniff: false,
        dnsPrefetchControl: false
      });
      const ctx = createMockContext({
        res: {
          setHeader: jest.fn(),
          removeHeader: jest.fn(),
          statusCode: 200
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      const xssCalls = (ctx.res.setHeader as jest.Mock).mock.calls.filter(
        (call) => call[0] === 'X-XSS-Protection'
      );
      const noSniffCalls = (ctx.res.setHeader as jest.Mock).mock.calls.filter(
        (call) => call[0] === 'X-Content-Type-Options'
      );
      const dnsCalls = (ctx.res.setHeader as jest.Mock).mock.calls.filter(
        (call) => call[0] === 'X-DNS-Prefetch-Control'
      );

      expect(xssCalls.length).toBe(0);
      expect(noSniffCalls.length).toBe(0);
      expect(dnsCalls.length).toBe(0);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('cors()', () => {
    it('should set Access-Control-Allow-Origin to * by default', async () => {
      const middleware = cors();
      const ctx = createMockContext({
        req: {
          method: 'GET',
          headers: {}
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
      expect(next).toHaveBeenCalled();
    });

    it('should set Access-Control-Allow-Origin from origin header when origin matches', async () => {
      const middleware = cors({ origin: 'https://example.com' });
      const ctx = createMockContext({
        req: {
          method: 'GET',
          headers: {
            origin: 'https://example.com'
          }
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://example.com');
      expect(next).toHaveBeenCalled();
    });

    it('should not set Access-Control-Allow-Origin when origin does not match', async () => {
      const middleware = cors({ origin: 'https://example.com' });
      const ctx = createMockContext({
        req: {
          method: 'GET',
          headers: {
            origin: 'https://other.com'
          }
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      const originCalls = (ctx.res.setHeader as jest.Mock).mock.calls.filter(
        (call) => call[0] === 'Access-Control-Allow-Origin'
      );
      expect(originCalls.length).toBe(0);
      expect(next).toHaveBeenCalled();
    });

    it('should set Access-Control-Allow-Origin from array when origin matches', async () => {
      const middleware = cors({ origin: ['https://example.com', 'https://app.com'] });
      const ctx = createMockContext({
        req: {
          method: 'GET',
          headers: {
            origin: 'https://app.com'
          }
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://app.com');
      expect(next).toHaveBeenCalled();
    });

    it('should set Access-Control-Allow-Origin from function when function returns true', async () => {
      const middleware = cors({
        origin: (origin: string) => origin.includes('example.com')
      });
      const ctx = createMockContext({
        req: {
          method: 'GET',
          headers: {
            origin: 'https://api.example.com'
          }
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://api.example.com');
      expect(next).toHaveBeenCalled();
    });

    it('should not set Access-Control-Allow-Origin when function returns false', async () => {
      const middleware = cors({
        origin: (origin: string) => origin.includes('example.com')
      });
      const ctx = createMockContext({
        req: {
          method: 'GET',
          headers: {
            origin: 'https://other.com'
          }
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      const originCalls = (ctx.res.setHeader as jest.Mock).mock.calls.filter(
        (call) => call[0] === 'Access-Control-Allow-Origin'
      );
      expect(originCalls.length).toBe(0);
      expect(next).toHaveBeenCalled();
    });

    it('should set Access-Control-Allow-Credentials when credentials is true', async () => {
      const middleware = cors({ origin: 'https://example.com', credentials: true });
      const ctx = createMockContext({
        req: {
          method: 'GET',
          headers: {
            origin: 'https://example.com'
          }
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://example.com');
      expect(ctx.res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
      expect(next).toHaveBeenCalled();
    });

    it('should handle OPTIONS preflight request', async () => {
      const middleware = cors();
      const ctx = createMockContext({
        req: {
          method: 'OPTIONS',
          headers: {
            origin: 'https://example.com',
            'access-control-request-method': 'POST'
          }
        } as any,
        res: {
          setHeader: jest.fn(),
          end: jest.fn(),
          statusCode: 200
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', expect.any(String));
      expect(ctx.res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', expect.any(String));
      expect(ctx.res.setHeader).toHaveBeenCalledWith('Access-Control-Max-Age', '86400');
      expect(ctx.res.statusCode).toBe(204);
      expect(ctx.res.end).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow regular OPTIONS request to pass through', async () => {
      const middleware = cors();
      const ctx = createMockContext({
        req: {
          method: 'OPTIONS',
          headers: {}
        } as any,
        res: {
          setHeader: jest.fn(),
          end: jest.fn(),
          statusCode: 200
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(next).toHaveBeenCalled();
      expect(ctx.res.end).not.toHaveBeenCalled();
    });

    it('should continue preflight request when preflightContinue is true', async () => {
      const middleware = cors({ preflightContinue: true });
      const ctx = createMockContext({
        req: {
          method: 'OPTIONS',
          headers: {
            origin: 'https://example.com',
            'access-control-request-method': 'POST'
          }
        } as any,
        res: {
          setHeader: jest.fn(),
          end: jest.fn(),
          statusCode: 200
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', expect.any(String));
      expect(next).toHaveBeenCalled();
    });

    it('should set custom optionsSuccessStatus', async () => {
      const middleware = cors({ optionsSuccessStatus: 200 });
      const ctx = createMockContext({
        req: {
          method: 'OPTIONS',
          headers: {
            origin: 'https://example.com',
            'access-control-request-method': 'POST'
          }
        } as any,
        res: {
          setHeader: jest.fn(),
          end: jest.fn(),
          statusCode: 200
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.res.statusCode).toBe(200);
      expect(next).not.toHaveBeenCalled();
    });

    it('should set custom methods', async () => {
      const middleware = cors({ methods: ['GET', 'POST'] });
      const ctx = createMockContext({
        req: {
          method: 'OPTIONS',
          headers: {
            origin: 'https://example.com',
            'access-control-request-method': 'POST'
          }
        } as any,
        res: {
          setHeader: jest.fn(),
          end: jest.fn(),
          statusCode: 200
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST');
      expect(next).not.toHaveBeenCalled();
    });

    it('should set custom allowedHeaders', async () => {
      const middleware = cors({ allowedHeaders: ['X-Custom-Header', 'Authorization'] });
      const ctx = createMockContext({
        req: {
          method: 'OPTIONS',
          headers: {
            origin: 'https://example.com',
            'access-control-request-method': 'POST'
          }
        } as any,
        res: {
          setHeader: jest.fn(),
          end: jest.fn(),
          statusCode: 200
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'X-Custom-Header, Authorization');
      expect(next).not.toHaveBeenCalled();
    });

    it('should set exposedHeaders', async () => {
      const middleware = cors({ exposedHeaders: ['X-Custom-Header'] });
      const ctx = createMockContext({
        req: {
          method: 'OPTIONS',
          headers: {
            origin: 'https://example.com',
            'access-control-request-method': 'POST'
          }
        } as any,
        res: {
          setHeader: jest.fn(),
          end: jest.fn(),
          statusCode: 200
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Access-Control-Expose-Headers', 'X-Custom-Header');
      expect(next).not.toHaveBeenCalled();
    });

    it('should set custom maxAge', async () => {
      const middleware = cors({ maxAge: 3600 });
      const ctx = createMockContext({
        req: {
          method: 'OPTIONS',
          headers: {
            origin: 'https://example.com',
            'access-control-request-method': 'POST'
          }
        } as any,
        res: {
          setHeader: jest.fn(),
          end: jest.fn(),
          statusCode: 200
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Access-Control-Max-Age', '3600');
      expect(next).not.toHaveBeenCalled();
    });

    it('should set origin when no origin header but origin option is set', async () => {
      const middleware = cors({ origin: 'https://example.com' });
      const ctx = createMockContext({
        req: {
          method: 'GET',
          headers: {}
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://example.com');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('rateLimit()', () => {
    it('should allow requests within limit', async () => {
      const middleware = rateLimit({ windowMs: 1000, max: 5 });
      const ctx = createMockContext({
        req: {
          socket: {
            remoteAddress: '127.0.0.1'
          }
        } as any
      });

      const next = jest.fn(async () => {});

      for (let i = 0; i < 5; i++) {
        await middleware(ctx, next);
      }

      expect(next).toHaveBeenCalledTimes(5);
    });

    it('should reject requests exceeding limit', async () => {
      const middleware = rateLimit({ windowMs: 1000, max: 2 });
      const ctx = createMockContext({
        req: {
          socket: {
            remoteAddress: '127.0.0.1'
          }
        } as any,
        res: {
          setHeader: jest.fn(),
          statusCode: 200
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);
      await middleware(ctx, next);

      const thirdRequest = createMockContext({
        req: {
          socket: {
            remoteAddress: '127.0.0.1'
          }
        } as any,
        res: {
          setHeader: jest.fn(),
          statusCode: 200
        } as any
      });

      await middleware(thirdRequest, next);

      expect(next).toHaveBeenCalledTimes(2);
      expect(thirdRequest.statusCode).toBe(429);
      expect(thirdRequest.res.statusCode).toBe(429);
      expect(thirdRequest.res.setHeader).toHaveBeenCalledWith('Retry-After', 1);
      expect(thirdRequest.json).toHaveBeenCalledWith({
        error: 'Too many requests',
        status: 429
      });
    });

    it('should use custom message', async () => {
      const middleware = rateLimit({
        windowMs: 1000,
        max: 1,
        message: 'Rate limit exceeded'
      });
      const next = jest.fn(async () => {});

      const ctx1 = createMockContext({
        req: {
          socket: {
            remoteAddress: '127.0.0.1'
          }
        } as any,
        res: {
          setHeader: jest.fn(),
          statusCode: 200
        } as any
      });

      const ctx2 = createMockContext({
        req: {
          socket: {
            remoteAddress: '127.0.0.1'
          }
        } as any,
        res: {
          setHeader: jest.fn(),
          statusCode: 200
        } as any
      });

      await middleware(ctx1, next);
      await middleware(ctx2, next);

      expect(ctx2.json).toHaveBeenCalledWith({
        error: 'Rate limit exceeded',
        status: 429
      });
    });

    it('should skip rate limiting when skip returns true', async () => {
      const middleware = rateLimit({
        windowMs: 1000,
        max: 1,
        skip: (ctx: Context) => ctx.req.method === 'OPTIONS'
      });
      const ctx = createMockContext({
        req: {
          method: 'OPTIONS',
          socket: {
            remoteAddress: '127.0.0.1'
          }
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);
      await middleware(ctx, next);

      expect(next).toHaveBeenCalledTimes(2);
    });

    it('should use custom keyGenerator', async () => {
      const middleware = rateLimit({
        windowMs: 1000,
        max: 1,
        keyGenerator: (ctx: Context) => ctx.req.headers['user-id'] as string || 'default'
      });
      const ctx1 = createMockContext({
        req: {
          headers: {
            'user-id': 'user1'
          },
          socket: {
            remoteAddress: '127.0.0.1'
          }
        } as any
      });

      const ctx2 = createMockContext({
        req: {
          headers: {
            'user-id': 'user2'
          },
          socket: {
            remoteAddress: '127.0.0.1'
          }
        } as any
      });

      const next1 = jest.fn(async () => {});
      const next2 = jest.fn(async () => {});

      await middleware(ctx1, next1);
      await middleware(ctx2, next2);

      expect(next1).toHaveBeenCalled();
      expect(next2).toHaveBeenCalled();
    });

    it('should reset count after window expires', async () => {
      const middleware = rateLimit({ windowMs: 100, max: 2 });
      const next = jest.fn(async () => {});

      const ctx1 = createMockContext({
        req: {
          socket: {
            remoteAddress: '127.0.0.1'
          }
        } as any
      });

      const ctx2 = createMockContext({
        req: {
          socket: {
            remoteAddress: '127.0.0.1'
          }
        } as any
      });

      const ctx3 = createMockContext({
        req: {
          socket: {
            remoteAddress: '127.0.0.1'
          }
        } as any
      });

      await middleware(ctx1, next);
      await middleware(ctx2, next);

      await new Promise(resolve => setTimeout(resolve, 150));

      await middleware(ctx3, next);

      expect(next).toHaveBeenCalledTimes(3);
    });

    it('should use unknown when remoteAddress is missing', async () => {
      const middleware = rateLimit({ windowMs: 1000, max: 1 });
      const next = jest.fn(async () => {});

      const ctx1 = createMockContext({
        req: {
          socket: {}
        } as any
      });

      const ctx2 = createMockContext({
        req: {
          socket: {}
        } as any,
        res: {
          setHeader: jest.fn(),
          statusCode: 200
        } as any
      });

      await middleware(ctx1, next);
      await middleware(ctx2, next);

      expect(ctx2.statusCode).toBe(429);
    });

    it('should calculate Retry-After correctly', async () => {
      const middleware = rateLimit({ windowMs: 5000, max: 1 });
      const next = jest.fn(async () => {});

      const ctx1 = createMockContext({
        req: {
          socket: {
            remoteAddress: '127.0.0.1'
          }
        } as any
      });

      const ctx2 = createMockContext({
        req: {
          socket: {
            remoteAddress: '127.0.0.1'
          }
        } as any,
        res: {
          setHeader: jest.fn(),
          statusCode: 200
        } as any
      });

      await middleware(ctx1, next);
      await middleware(ctx2, next);

      expect(ctx2.res.setHeader).toHaveBeenCalledWith('Retry-After', 5);
    });
  });
});


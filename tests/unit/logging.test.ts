import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { requestId, logger } from '../../src/framework/middleware/logging.js';
import { createMockContext } from '../utils/test-helpers.js';

describe('Logging Middleware', () => {
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('requestId()', () => {
    it('should generate a request ID', async () => {
      const middleware = requestId();
      const ctx = createMockContext();

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.state.requestId).toBeDefined();
      expect(typeof ctx.state.requestId).toBe('string');
      expect(ctx.state.requestId.length).toBe(32);
      expect(next).toHaveBeenCalled();
    });

    it('should set X-Request-ID header', async () => {
      const middleware = requestId();
      const ctx = createMockContext();

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.res.setHeader).toHaveBeenCalledWith('X-Request-ID', ctx.state.requestId);
      expect(next).toHaveBeenCalled();
    });

    it('should generate unique request IDs for different requests', async () => {
      const middleware = requestId();
      const ctx1 = createMockContext();
      const ctx2 = createMockContext();

      const next1 = jest.fn(async () => {});
      const next2 = jest.fn(async () => {});

      await middleware(ctx1, next1);
      await middleware(ctx2, next2);

      expect(ctx1.state.requestId).not.toBe(ctx2.state.requestId);
    });

    it('should call next() middleware', async () => {
      const middleware = requestId();
      const ctx = createMockContext();

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should generate hex string request ID', async () => {
      const middleware = requestId();
      const ctx = createMockContext();

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      const generatedRequestId = ctx.state.requestId;
      expect(generatedRequestId).toMatch(/^[0-9a-f]{32}$/);
    });
  });

  describe('logger()', () => {
    it('should log successful request', async () => {
      const middleware = logger();
      const ctx = createMockContext({
        req: {
          method: 'GET',
          url: '/test'
        } as any,
        res: {
          statusCode: 200
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleLogSpy.mock.calls[0][0];
      expect(logCall).toContain('GET');
      expect(logCall).toContain('/test');
      expect(logCall).toContain('200');
      expect(logCall).toContain('ms');
      expect(next).toHaveBeenCalled();
    });

    it('should log request with requestId from state', async () => {
      const middleware = logger();
      const ctx = createMockContext({
        req: {
          method: 'POST',
          url: '/api/users'
        } as any,
        res: {
          statusCode: 201
        } as any,
        state: {
          requestId: 'test-request-id-123'
        }
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleLogSpy.mock.calls[0][0];
      expect(logCall).toContain('[test-request-id-123]');
      expect(logCall).toContain('POST');
      expect(logCall).toContain('/api/users');
      expect(logCall).toContain('201');
    });

    it('should log request with unknown when requestId is missing', async () => {
      const middleware = logger();
      const ctx = createMockContext({
        req: {
          method: 'PUT',
          url: '/api/users/1'
        } as any,
        res: {
          statusCode: 200
        } as any,
        state: {}
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleLogSpy.mock.calls[0][0];
      expect(logCall).toContain('[unknown]');
    });

    it('should measure request duration', async () => {
      const middleware = logger();
      const ctx = createMockContext({
        req: {
          method: 'GET',
          url: '/test'
        } as any,
        res: {
          statusCode: 200
        } as any
      });

      const next = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      const start = Date.now();
      await middleware(ctx, next);
      const end = Date.now();

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleLogSpy.mock.calls[0][0];
      expect(logCall).toContain('ms');
      
      const duration = end - start;
      expect(duration).toBeGreaterThanOrEqual(50);
    });

    it('should log different HTTP methods', async () => {
      const middleware = logger();
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      for (const method of methods) {
        const ctx = createMockContext({
          req: {
            method,
            url: '/test'
          } as any,
          res: {
            statusCode: 200
          } as any
        });

        const next = jest.fn(async () => {});

        await middleware(ctx, next);

        const logCall = consoleLogSpy.mock.calls[consoleLogSpy.mock.calls.length - 1][0];
        expect(logCall).toContain(method);
      }
    });

    it('should log different status codes', async () => {
      const middleware = logger();
      const statusCodes = [200, 201, 400, 404, 500];

      for (const statusCode of statusCodes) {
        const ctx = createMockContext({
          req: {
            method: 'GET',
            url: '/test'
          } as any,
          res: {
            statusCode
          } as any
        });

        const next = jest.fn(async () => {});

        await middleware(ctx, next);

        const logCall = consoleLogSpy.mock.calls[consoleLogSpy.mock.calls.length - 1][0];
        expect(logCall).toContain(statusCode.toString());
      }
    });

    it('should handle errors with status property', async () => {
      const middleware = logger();
      const ctx = createMockContext({
        req: {
          method: 'GET',
          url: '/test'
        } as any,
        res: {
          statusCode: 200
        } as any
      });

      const error = new Error('Test error') as any;
      error.status = 404;

      const next = jest.fn(async () => {
        throw error;
      });

      await expect(middleware(ctx, next)).rejects.toThrow('Test error');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleLogSpy.mock.calls[0][0];
      expect(logCall).toContain('404');
    });

    it('should handle errors without status property', async () => {
      const middleware = logger();
      const ctx = createMockContext({
        req: {
          method: 'GET',
          url: '/test'
        } as any,
        res: {
          statusCode: 200
        } as any
      });

      const error = new Error('Internal server error');

      const next = jest.fn(async () => {
        throw error;
      });

      await expect(middleware(ctx, next)).rejects.toThrow('Internal server error');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleLogSpy.mock.calls[0][0];
      expect(logCall).toContain('500');
    });

    it('should log even when error is thrown', async () => {
      const middleware = logger();
      const ctx = createMockContext({
        req: {
          method: 'POST',
          url: '/api/error'
        } as any,
        res: {
          statusCode: 200
        } as any
      });

      const error = new Error('Something went wrong');

      const next = jest.fn(async () => {
        throw error;
      });

      await expect(middleware(ctx, next)).rejects.toThrow();

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalled();
    });

    it('should use status code from response when available', async () => {
      const middleware = logger();
      const ctx = createMockContext({
        req: {
          method: 'GET',
          url: '/test'
        } as any,
        res: {
          statusCode: 201
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleLogSpy.mock.calls[0][0];
      expect(logCall).toContain('201');
    });

    it('should log request with full URL path', async () => {
      const middleware = logger();
      const urls = ['/api/users', '/api/users/123', '/api/posts?page=1&limit=10'];

      for (const url of urls) {
        const ctx = createMockContext({
          req: {
            method: 'GET',
            url
          } as any,
          res: {
            statusCode: 200
          } as any
        });

        const next = jest.fn(async () => {});

        await middleware(ctx, next);

        const logCall = consoleLogSpy.mock.calls[consoleLogSpy.mock.calls.length - 1][0];
        expect(logCall).toContain(url);
      }
    });

    it('should always log in finally block even on error', async () => {
      const middleware = logger();
      const ctx = createMockContext({
        req: {
          method: 'GET',
          url: '/test'
        } as any,
        res: {
          statusCode: 200
        } as any
      });

      let logCalled = false;
      consoleLogSpy.mockImplementation(() => {
        logCalled = true;
      });

      const error = new Error('Test error');
      const next = jest.fn(async () => {
        throw error;
      });

      await expect(middleware(ctx, next)).rejects.toThrow();

      expect(logCalled).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle non-Error exceptions', async () => {
      const middleware = logger();
      const ctx = createMockContext({
        req: {
          method: 'GET',
          url: '/test'
        } as any,
        res: {
          statusCode: 200
        } as any
      });

      const next = jest.fn(async () => {
        throw 'String error';
      });

      await expect(middleware(ctx, next)).rejects.toBe('String error');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleLogSpy.mock.calls[0][0];
      expect(logCall).toContain('500');
    });
  });

  describe('Integration', () => {
    it('should work together with requestId middleware', async () => {
      const requestIdMiddleware = requestId();
      const loggerMiddleware = logger();
      const ctx = createMockContext({
        req: {
          method: 'GET',
          url: '/test'
        } as any,
        res: {
          setHeader: jest.fn(),
          statusCode: 200
        } as any
      });

      const next = jest.fn(async () => {});

      await requestIdMiddleware(ctx, next);
      await loggerMiddleware(ctx, next);

      expect(ctx.state.requestId).toBeDefined();
      expect(ctx.res.setHeader).toHaveBeenCalledWith('X-Request-ID', ctx.state.requestId);
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleLogSpy.mock.calls[0][0];
      expect(logCall).toContain(`[${ctx.state.requestId}]`);
    });
  });
});


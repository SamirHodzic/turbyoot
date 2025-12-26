import { describe, it, expect, jest } from '@jest/globals';
import { csrf } from '../../src/middleware/csrf.js';
import { createMockContext } from '../utils/test-helpers.js';
import { AuthorizationError } from '../../src/errors.js';

describe('CSRF Middleware', () => {
  describe('csrf()', () => {
    it('should set CSRF token cookie on GET requests', async () => {
      const middleware = csrf();
      const ctx = createMockContext({
        req: {
          method: 'GET',
          headers: {}
        } as any,
        res: {
          setHeader: jest.fn(),
          statusCode: 200
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Set-Cookie', expect.stringContaining('csrf-token='));
      expect(ctx.state.csrfToken).toBeDefined();
      expect(next).toHaveBeenCalled();
    });

    it('should reject POST request without CSRF token', async () => {
      const middleware = csrf();
      const ctx = createMockContext({
        req: {
          method: 'POST',
          headers: {}
        } as any,
        res: {
          setHeader: jest.fn(),
          statusCode: 200
        } as any
      });

      const next = jest.fn(async () => {});

      await expect(middleware(ctx, next)).rejects.toThrow(AuthorizationError);
      await expect(middleware(ctx, next)).rejects.toThrow('CSRF token missing');
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject POST request without CSRF token in header', async () => {
      const middleware = csrf();
      const ctx = createMockContext({
        req: {
          method: 'POST',
          headers: {
            cookie: 'csrf-token=test-token'
          }
        } as any,
        res: {
          setHeader: jest.fn(),
          statusCode: 200
        } as any
      });

      const next = jest.fn(async () => {});

      await expect(middleware(ctx, next)).rejects.toThrow(AuthorizationError);
      await expect(middleware(ctx, next)).rejects.toThrow('CSRF token missing in header');
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept POST request with valid CSRF token', async () => {
      const secret = 'test-secret';
      const middleware = csrf({ secret });
      
      const getCtx = createMockContext({
        req: {
          method: 'GET',
          headers: {}
        } as any,
        res: {
          setHeader: jest.fn(),
          statusCode: 200
        } as any
      });

      const getNext = jest.fn(async () => {});
      await middleware(getCtx, getNext);
      
      const token = getCtx.state.csrfToken;

      const postCtx = createMockContext({
        req: {
          method: 'POST',
          headers: {
            cookie: `csrf-token=${encodeURIComponent(token)}`,
            'x-csrf-token': token
          }
        } as any,
        res: {
          setHeader: jest.fn(),
          statusCode: 200
        } as any
      });

      const postNext = jest.fn(async () => {});

      await middleware(postCtx, postNext);

      expect(postCtx.statusCode).toBe(200);
      expect(postNext).toHaveBeenCalled();
    });

    it('should skip OPTIONS requests', async () => {
      const middleware = csrf();
      const ctx = createMockContext({
        req: {
          method: 'OPTIONS',
          headers: {}
        } as any,
        res: {
          setHeader: jest.fn(),
          statusCode: 200
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(next).toHaveBeenCalled();
    });

    it('should skip paths in skipPaths option', async () => {
      const middleware = csrf({ skipPaths: ['/api/webhook'] });
      const ctx = createMockContext({
        req: {
          method: 'POST',
          url: '/api/webhook',
          headers: {}
        } as any,
        res: {
          setHeader: jest.fn(),
          statusCode: 200
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(next).toHaveBeenCalled();
    });

    it('should use custom cookie and header names', async () => {
      const middleware = csrf({
        cookieName: 'custom-csrf',
        headerName: 'X-Custom-CSRF'
      });
      
      const ctx = createMockContext({
        req: {
          method: 'GET',
          headers: {}
        } as any,
        res: {
          setHeader: jest.fn(),
          statusCode: 200
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      const setCookieCall = (ctx.res.setHeader as jest.Mock).mock.calls.find(
        (call: any[]) => call[0] === 'Set-Cookie'
      );
      expect(setCookieCall).toBeDefined();
      expect(setCookieCall![1]).toContain('custom-csrf=');
      expect(next).toHaveBeenCalled();
    });
  });
});


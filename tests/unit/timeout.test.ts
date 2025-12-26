import { describe, it, expect, jest } from '@jest/globals';
import { timeout, keepAliveTimeout, configureTimeouts } from '../../src/middleware/timeout.js';
import { createMockContext } from '../utils/test-helpers.js';

describe('Timeout Middleware', () => {
  describe('timeout()', () => {
    it('should not timeout when request completes quickly', async () => {
      const middleware = timeout({ timeout: 1000 });
      const ctx = createMockContext();
      const next = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      await middleware(ctx, next);

      expect(next).toHaveBeenCalled();
      expect(ctx.statusCode).toBe(200);
      expect(ctx.res.statusCode).toBe(200);
      expect(ctx.res.setHeader).not.toHaveBeenCalledWith('Connection', 'close');
    });

    it('should timeout when request takes too long', async () => {
      const middleware = timeout({ timeout: 50 });
      const ctx = createMockContext();
      const next = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      await middleware(ctx, next);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(ctx.statusCode).toBe(408);
      expect(ctx.res.statusCode).toBe(408);
      expect(ctx.res.setHeader).toHaveBeenCalledWith('Connection', 'close');
      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Request timeout', status: 408 })
      );
    });

    it('should call onTimeout callback when timeout occurs', async () => {
      const onTimeout = jest.fn();
      const middleware = timeout({ timeout: 50, onTimeout });
      const ctx = createMockContext();
      const next = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      await middleware(ctx, next);
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(onTimeout).toHaveBeenCalledWith(ctx);
    });

    it('should not call onTimeout when request completes before timeout', async () => {
      const onTimeout = jest.fn();
      const middleware = timeout({ timeout: 1000, onTimeout });
      const ctx = createMockContext();
      const next = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      await middleware(ctx, next);
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(onTimeout).not.toHaveBeenCalled();
    });

    it('should not timeout if headers are already sent', async () => {
      const middleware = timeout({ timeout: 50 });
      const ctx = createMockContext({
        res: {
          headersSent: true,
          setHeader: jest.fn(),
          statusCode: 200
        } as any
      });
      const next = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      await middleware(ctx, next);
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(ctx.res.setHeader).not.toHaveBeenCalledWith('Connection', 'close');
      expect(ctx.json).not.toHaveBeenCalled();
    });

    it('should clear timeout when request completes', async () => {
      const middleware = timeout({ timeout: 200 });
      const ctx = createMockContext();
      const next = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      await middleware(ctx, next);
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(ctx.statusCode).toBe(200);
      expect(ctx.res.statusCode).toBe(200);
    });

    it('should handle errors in next() and still clear timeout', async () => {
      const middleware = timeout({ timeout: 200 });
      const ctx = createMockContext();
      const next = jest.fn(async () => {
        throw new Error('Test error');
      });

      await expect(middleware(ctx, next)).rejects.toThrow('Test error');

      await new Promise(resolve => setTimeout(resolve, 300));

      expect(ctx.statusCode).toBe(200);
    });

    it('should not timeout multiple times', async () => {
      const middleware = timeout({ timeout: 50 });
      const ctx = createMockContext();
      const next = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      await middleware(ctx, next);
      await new Promise(resolve => setTimeout(resolve, 100));

      const jsonCallCount = (ctx.json as jest.Mock).mock.calls.length;
      await new Promise(resolve => setTimeout(resolve, 100));

      expect((ctx.json as jest.Mock).mock.calls.length).toBe(jsonCallCount);
    });
  });

  describe('keepAliveTimeout()', () => {
    it('should set socket timeout when socket exists', async () => {
      const mockSocket = {
        destroyed: false,
        setTimeout: jest.fn(),
        destroy: jest.fn()
      };

      const middleware = keepAliveTimeout(5000);
      const ctx = createMockContext({
        req: {
          socket: mockSocket
        } as any
      });
      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(mockSocket.setTimeout).toHaveBeenCalledWith(5000, expect.any(Function));
      expect(next).toHaveBeenCalled();
    });

    it('should not set timeout if socket is destroyed', async () => {
      const mockSocket = {
        destroyed: true,
        setTimeout: jest.fn(),
        destroy: jest.fn()
      };

      const middleware = keepAliveTimeout(5000);
      const ctx = createMockContext({
        req: {
          socket: mockSocket
        } as any
      });
      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(mockSocket.setTimeout).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should not set timeout if socket does not exist', async () => {
      const middleware = keepAliveTimeout(5000);
      const ctx = createMockContext({
        req: {
          socket: null
        } as any
      });
      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(next).toHaveBeenCalled();
    });

    it('should only set timeout once per socket', async () => {
      const mockSocket = {
        destroyed: false,
        setTimeout: jest.fn(),
        destroy: jest.fn()
      };

      const middleware = keepAliveTimeout(5000);
      const ctx1 = createMockContext({
        req: {
          socket: mockSocket
        } as any
      });
      const ctx2 = createMockContext({
        req: {
          socket: mockSocket
        } as any
      });
      const next = jest.fn(async () => {});

      await middleware(ctx1, next);
      await middleware(ctx2, next);

      expect(mockSocket.setTimeout).toHaveBeenCalledTimes(1);
    });

    it('should destroy socket when timeout fires', async () => {
      const mockSocket = {
        destroyed: false,
        setTimeout: jest.fn(),
        destroy: jest.fn()
      };

      const middleware = keepAliveTimeout(100);
      const ctx = createMockContext({
        req: {
          socket: mockSocket
        } as any
      });
      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      const timeoutCallback = mockSocket.setTimeout.mock.calls[0]?.[1] as (() => void) | undefined;
      if (timeoutCallback) {
        timeoutCallback();
      }

      expect(mockSocket.destroy).toHaveBeenCalled();
    });

    it('should not destroy socket if already destroyed', async () => {
      const mockSocket = {
        destroyed: false,
        setTimeout: jest.fn(),
        destroy: jest.fn(() => {
          mockSocket.destroyed = true;
        })
      };

      const middleware = keepAliveTimeout(100);
      const ctx = createMockContext({
        req: {
          socket: mockSocket
        } as any
      });
      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      const timeoutCallback = mockSocket.setTimeout.mock.calls[0]?.[1] as (() => void) | undefined;
      if (timeoutCallback) {
        mockSocket.destroyed = true;
        timeoutCallback();
      }

      expect(mockSocket.destroy).toHaveBeenCalledTimes(0);
    });
  });

  describe('configureTimeouts()', () => {
    it('should configure all timeout options with defaults', () => {
      const server: any = {};
      configureTimeouts(server, {});

      expect(server.keepAliveTimeout).toBe(5000);
      expect(server.headersTimeout).toBe(40000);
      expect(server.requestTimeout).toBe(30000);
    });

    it('should configure all timeout options with custom values', () => {
      const server: any = {};
      configureTimeouts(server, {
        keepAliveTimeout: 10000,
        headersTimeout: 50000,
        requestTimeout: 60000
      });

      expect(server.keepAliveTimeout).toBe(10000);
      expect(server.headersTimeout).toBe(50000);
      expect(server.requestTimeout).toBe(60000);
    });

    it('should configure partial timeout options', () => {
      const server: any = {};
      configureTimeouts(server, {
        keepAliveTimeout: 15000
      });

      expect(server.keepAliveTimeout).toBe(15000);
      expect(server.headersTimeout).toBe(40000);
      expect(server.requestTimeout).toBe(30000);
    });

    it('should override existing timeout values', () => {
      const server: any = {
        keepAliveTimeout: 1000,
        headersTimeout: 2000,
        requestTimeout: 3000
      };
      configureTimeouts(server, {
        keepAliveTimeout: 20000,
        headersTimeout: 30000,
        requestTimeout: 40000
      });

      expect(server.keepAliveTimeout).toBe(20000);
      expect(server.headersTimeout).toBe(30000);
      expect(server.requestTimeout).toBe(40000);
    });
  });
});


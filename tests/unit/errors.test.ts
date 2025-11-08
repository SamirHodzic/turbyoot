import { describe, it, expect, jest } from '@jest/globals';
import { errorHandler, HttpError } from '../../src/errors.js';
import { createMockContext } from '../utils/test-helpers.js';

describe('Error Handler', () => {
  describe('errorHandler()', () => {
    it('should pass through when no error occurs', async () => {
      const middleware = errorHandler();
      const ctx = createMockContext();
      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(next).toHaveBeenCalled();
      expect(ctx.statusCode).toBe(200);
    });

    it('should handle HttpError with expose flag', async () => {
      const middleware = errorHandler();
      const ctx = createMockContext();
      const error = new HttpError(404, 'Not Found', true);
      const next = jest.fn(async () => {
        throw error;
      });

      await middleware(ctx, next);

      expect(ctx.statusCode).toBe(404);
      expect(ctx.res.statusCode).toBe(404);
      expect(ctx.json).toHaveBeenCalledWith({ error: 'Not Found', status: 404 });
    });

    it('should handle HttpError without expose flag', async () => {
      const middleware = errorHandler();
      const ctx = createMockContext();
      const error = new HttpError(500, 'Internal Error', false);
      const next = jest.fn(async () => {
        throw error;
      });

      await middleware(ctx, next);

      expect(ctx.statusCode).toBe(500);
      expect(ctx.res.statusCode).toBe(500);
      expect(ctx.json).toHaveBeenCalledWith({ error: 'Internal Server Error', status: 500 });
    });

    it('should handle non-HttpError exceptions', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const middleware = errorHandler();
      const ctx = createMockContext();
      const error = new Error('Generic error');
      const next = jest.fn(async () => {
        throw error;
      });

      await middleware(ctx, next);

      expect(ctx.statusCode).toBe(500);
      expect(ctx.res.statusCode).toBe(500);
      expect(ctx.json).toHaveBeenCalledWith({ error: 'Internal Server Error', status: 500 });
      expect(consoleErrorSpy).toHaveBeenCalledWith('Unhandled error:', error);

      consoleErrorSpy.mockRestore();
    });

    it('should not send response if headers already sent', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const middleware = errorHandler();
      const ctx = createMockContext({
        res: {
          headersSent: true,
          statusCode: 200,
          setHeader: jest.fn(),
          end: jest.fn()
        } as any
      });
      const error = new Error('Error after headers sent');
      const next = jest.fn(async () => {
        throw error;
      });

      await middleware(ctx, next);

      expect(ctx.json).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error after response sent:', error);

      consoleErrorSpy.mockRestore();
    });

    it('should handle HttpError when headers already sent', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const middleware = errorHandler();
      const ctx = createMockContext({
        res: {
          headersSent: true,
          statusCode: 200,
          setHeader: jest.fn(),
          end: jest.fn()
        } as any
      });
      const error = new HttpError(404, 'Not Found', true);
      const next = jest.fn(async () => {
        throw error;
      });

      await middleware(ctx, next);

      expect(ctx.json).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error after response sent:', error);

      consoleErrorSpy.mockRestore();
    });
  });
});


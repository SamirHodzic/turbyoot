import { describe, it, expect, beforeEach } from '@jest/globals';
import { compression } from '../../src/framework/middleware/compression.js';
import { createMockContext } from '../utils/test-helpers.js';
import { createGunzip } from 'zlib';

describe('Compression Middleware', () => {
  let ctx: ReturnType<typeof createMockContext>;
  let next: jest.Mock;

  beforeEach(() => {
    next = jest.fn().mockResolvedValue(undefined);
    ctx = createMockContext();
    (ctx.res as any).headersSent = false;
    ctx.res.getHeader = jest.fn().mockReturnValue(undefined);
  });

  describe('Basic Compression', () => {
    it('should compress response with gzip when accept-encoding includes gzip', async () => {
      ctx.req.headers['accept-encoding'] = 'gzip, deflate';
      const largeData = { data: 'x'.repeat(2000) };
      
      next.mockImplementation(async () => {
        ctx.json(largeData);
      });

      const middleware = compression();
      await middleware(ctx, next);
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Content-Encoding', 'gzip');
      expect(ctx.res.setHeader).toHaveBeenCalledWith('Vary', 'Accept-Encoding');
      expect(ctx.res.end).toHaveBeenCalled();
    });

    it('should compress response with deflate when accept-encoding includes deflate', async () => {
      ctx.req.headers['accept-encoding'] = 'deflate';
      const largeData = { data: 'x'.repeat(2000) };
      
      next.mockImplementation(async () => {
        ctx.json(largeData);
      });

      const middleware = compression();
      await middleware(ctx, next);
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Content-Encoding', 'deflate');
      expect(ctx.res.setHeader).toHaveBeenCalledWith('Vary', 'Accept-Encoding');
    });

    it('should compress response with brotli when accept-encoding includes br', async () => {
      ctx.req.headers['accept-encoding'] = 'br, gzip';
      const largeData = { data: 'x'.repeat(2000) };
      
      next.mockImplementation(async () => {
        ctx.json(largeData);
      });

      const middleware = compression();
      await middleware(ctx, next);
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Content-Encoding', 'br');
      expect(ctx.res.setHeader).toHaveBeenCalledWith('Vary', 'Accept-Encoding');
    });

    it('should prefer brotli over gzip when both are available', async () => {
      ctx.req.headers['accept-encoding'] = 'gzip, br, deflate';
      const largeData = { data: 'x'.repeat(2000) };
      
      next.mockImplementation(async () => {
        ctx.json(largeData);
      });

      const middleware = compression();
      await middleware(ctx, next);
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Content-Encoding', 'br');
    });
  });

  describe('Threshold Behavior', () => {
    it('should not compress response below threshold', async () => {
      ctx.req.headers['accept-encoding'] = 'gzip';
      const smallData = { data: 'small' };
      
      next.mockImplementation(async () => {
        ctx.json(smallData);
      });

      const middleware = compression({ threshold: 1024 });
      await middleware(ctx, next);
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(ctx.res.setHeader).not.toHaveBeenCalledWith('Content-Encoding', expect.any(String));
      expect(ctx.res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(ctx.res.end).toHaveBeenCalled();
    });

    it('should compress response at or above threshold', async () => {
      ctx.req.headers['accept-encoding'] = 'gzip';
      const largeData = { data: 'x'.repeat(2000) };
      
      next.mockImplementation(async () => {
        ctx.json(largeData);
      });

      const middleware = compression({ threshold: 1024 });
      await middleware(ctx, next);
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Content-Encoding', 'gzip');
    });

    it('should respect custom threshold', async () => {
      ctx.req.headers['accept-encoding'] = 'gzip';
      const mediumData = { data: 'x'.repeat(500) };
      
      next.mockImplementation(async () => {
        ctx.json(mediumData);
      });

      const middleware = compression({ threshold: 200 });
      await middleware(ctx, next);
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Content-Encoding', 'gzip');
    });
  });

  describe('Content-Type Handling', () => {
    it('should preserve Content-Type for JSON responses', async () => {
      ctx.req.headers['accept-encoding'] = 'gzip';
      const largeData = { data: 'x'.repeat(2000) };
      
      next.mockImplementation(async () => {
        ctx.json(largeData);
      });

      const middleware = compression();
      await middleware(ctx, next);
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
    });

    it('should preserve Content-Type for text responses', async () => {
      ctx.req.headers['accept-encoding'] = 'gzip';
      const largeText = 'x'.repeat(2000);
      
      next.mockImplementation(async () => {
        ctx.send(largeText);
      });

      const middleware = compression();
      await middleware(ctx, next);
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
    });
  });

  describe('Vary Header', () => {
    it('should set Vary header to Accept-Encoding', async () => {
      ctx.req.headers['accept-encoding'] = 'gzip';
      const largeData = { data: 'x'.repeat(2000) };
      
      next.mockImplementation(async () => {
        ctx.json(largeData);
      });

      const middleware = compression();
      await middleware(ctx, next);
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Vary', 'Accept-Encoding');
    });

    it('should append Accept-Encoding to existing Vary header', async () => {
      ctx.req.headers['accept-encoding'] = 'gzip';
      ctx.res.getHeader = jest.fn((name: string) => {
        if (name === 'Vary') return 'Accept-Language';
        return undefined;
      });
      const largeData = { data: 'x'.repeat(2000) };
      
      next.mockImplementation(async () => {
        ctx.json(largeData);
      });

      const middleware = compression();
      await middleware(ctx, next);
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Vary', 'Accept-Language, Accept-Encoding');
    });
  });

  describe('Filter Function', () => {
    it('should skip compression when filter returns false', async () => {
      ctx.req.headers['accept-encoding'] = 'gzip';
      ctx.req.headers['content-type'] = 'image/png';
      const largeData = { data: 'x'.repeat(2000) };
      
      next.mockImplementation(async () => {
        ctx.json(largeData);
      });

      const middleware = compression();
      await middleware(ctx, next);
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(ctx.res.setHeader).not.toHaveBeenCalledWith('Content-Encoding', expect.any(String));
    });

    it('should use custom filter function', async () => {
      ctx.req.headers['accept-encoding'] = 'gzip';
      const customFilter = jest.fn().mockReturnValue(false);
      const largeData = { data: 'x'.repeat(2000) };
      
      next.mockImplementation(async () => {
        ctx.json(largeData);
      });

      const middleware = compression({ filter: customFilter });
      await middleware(ctx, next);
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(customFilter).toHaveBeenCalledWith(ctx.req, ctx.res);
      expect(ctx.res.setHeader).not.toHaveBeenCalledWith('Content-Encoding', expect.any(String));
    });

    it('should skip compression for already compressed content types', async () => {
      ctx.req.headers['accept-encoding'] = 'gzip';
      ctx.req.headers['content-type'] = 'application/gzip';
      
      const middleware = compression();
      await middleware(ctx, next);

      expect(ctx.res.setHeader).not.toHaveBeenCalledWith('Content-Encoding', expect.any(String));
    });
  });

  describe('No Compression Support', () => {
    it('should pass through when accept-encoding is not provided', async () => {
      delete ctx.req.headers['accept-encoding'];
      const largeData = { data: 'x'.repeat(2000) };
      
      next.mockImplementation(async () => {
        ctx.json(largeData);
      });

      const middleware = compression();
      await middleware(ctx, next);
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(ctx.res.setHeader).not.toHaveBeenCalledWith('Content-Encoding', expect.any(String));
    });

    it('should pass through when accept-encoding does not include supported encodings', async () => {
      ctx.req.headers['accept-encoding'] = 'identity';
      const largeData = { data: 'x'.repeat(2000) };
      
      next.mockImplementation(async () => {
        ctx.json(largeData);
      });

      const middleware = compression();
      await middleware(ctx, next);
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(ctx.res.setHeader).not.toHaveBeenCalledWith('Content-Encoding', expect.any(String));
    });
  });

  describe('Edge Cases', () => {
    it('should handle response when headers are already sent', async () => {
      ctx.req.headers['accept-encoding'] = 'gzip';
      Object.defineProperty(ctx.res, 'headersSent', { value: true, writable: true });
      const largeData = { data: 'x'.repeat(2000) };
      
      next.mockImplementation(async () => {
        ctx.json(largeData);
      });

      const middleware = compression();
      await middleware(ctx, next);
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(ctx.res.setHeader).not.toHaveBeenCalledWith('Content-Encoding', expect.any(String));
    });

    it('should handle when no response is sent', async () => {
      ctx.req.headers['accept-encoding'] = 'gzip';
      
      const middleware = compression();
      await middleware(ctx, next);

      expect(ctx.res.setHeader).not.toHaveBeenCalledWith('Content-Encoding', expect.any(String));
      expect(ctx.res.end).not.toHaveBeenCalled();
    });

    it('should handle Buffer responses', async () => {
      ctx.req.headers['accept-encoding'] = 'gzip';
      const buffer = Buffer.from('x'.repeat(2000));
      
      next.mockImplementation(async () => {
        ctx.send(buffer);
      });

      const middleware = compression();
      await middleware(ctx, next);
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(ctx.res.end).toHaveBeenCalled();
    });
  });

  describe('Compression Options', () => {
    it('should accept custom compression level', async () => {
      ctx.req.headers['accept-encoding'] = 'gzip';
      const largeData = { data: 'x'.repeat(2000) };
      
      next.mockImplementation(async () => {
        ctx.json(largeData);
      });

      const middleware = compression({ level: 9 });
      await middleware(ctx, next);
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Content-Encoding', 'gzip');
    });

    it('should accept custom compression options', async () => {
      ctx.req.headers['accept-encoding'] = 'gzip';
      const largeData = { data: 'x'.repeat(2000) };
      
      next.mockImplementation(async () => {
        ctx.json(largeData);
      });

      const middleware = compression({
        level: 6,
        memLevel: 8,
        chunkSize: 16 * 1024,
        windowBits: 15,
        strategy: 0
      });
      await middleware(ctx, next);
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Content-Encoding', 'gzip');
    });
  });

  describe('Decompression Verification', () => {
    it('should produce valid gzip compressed data', async () => {
      ctx.req.headers['accept-encoding'] = 'gzip';
      const originalData = { message: 'test data', value: 123 };
      
      let capturedBody: Buffer | null = null;
      ctx.res.end = jest.fn((data?: any) => {
        if (Buffer.isBuffer(data)) {
          capturedBody = data;
        }
        return ctx.res;
      });

      next.mockImplementation(async () => {
        ctx.json(originalData);
      });

      const middleware = compression({ threshold: 0 });
      await middleware(ctx, next);
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(capturedBody).toBeTruthy();
      if (capturedBody) {
        const decompressed = await new Promise<Buffer>((resolve, reject) => {
          const gunzip = createGunzip();
          const chunks: Buffer[] = [];
          
          gunzip.on('data', (chunk: Buffer) => chunks.push(chunk));
          gunzip.on('end', () => resolve(Buffer.concat(chunks)));
          gunzip.on('error', reject);
          
          gunzip.write(capturedBody!);
          gunzip.end();
        });

        const decompressedData = JSON.parse(decompressed.toString());
        expect(decompressedData).toEqual(originalData);
      }
    });
  });
});

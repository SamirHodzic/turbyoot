import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { serveStatic } from '../../src/middleware/static.js';
import { createMockContext } from '../utils/test-helpers.js';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { IncomingMessage, ServerResponse } from 'http';

describe('Static File Serving', () => {
  const testDir = join(process.cwd(), 'test-static');
  let next: jest.Mock;

  beforeEach(async () => {
    if (!existsSync(testDir)) {
      await mkdir(testDir, { recursive: true });
    }
    next = jest.fn().mockResolvedValue(undefined);
  });

  afterEach(async () => {
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  describe('Basic File Serving', () => {
    it('should serve static files from directory', async () => {
      await writeFile(join(testDir, 'test.txt'), 'Hello World');
      const middleware = serveStatic(testDir, { prefix: '/static' });

      const mockReq = {
        method: 'GET',
        url: '/static/test.txt',
        headers: {},
      } as IncomingMessage;

      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
        statusCode: 200,
      } as any as ServerResponse;

      const ctx = createMockContext({ req: mockReq, res: mockRes });

      await middleware(ctx, next);

      expect(next).not.toHaveBeenCalled();
      expect(ctx.statusCode).toBe(200);
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Length', '11');
      expect(mockRes.end).toHaveBeenCalledWith(Buffer.from('Hello World'));
    });

    it('should serve files with correct MIME types', async () => {
      await writeFile(join(testDir, 'style.css'), 'body { color: red; }');
      await writeFile(join(testDir, 'script.js'), 'console.log("test");');
      await writeFile(join(testDir, 'data.json'), '{"key":"value"}');

      const middleware = serveStatic(testDir, { prefix: '/static' });

      const testCases = [
        { file: 'style.css', expectedType: 'text/css' },
        { file: 'script.js', expectedType: 'application/javascript' },
        { file: 'data.json', expectedType: 'application/json' },
      ];

      for (const testCase of testCases) {
        const mockReq = {
          method: 'GET',
          url: `/static/${testCase.file}`,
          headers: {},
        } as IncomingMessage;

        const mockRes = {
          setHeader: jest.fn(),
          end: jest.fn(),
          statusCode: 200,
        } as any as ServerResponse;

        const ctx = createMockContext({ req: mockReq, res: mockRes });
        await middleware(ctx, next);

        expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', testCase.expectedType);
      }
    });

    it('should return 404 for non-existent files', async () => {
      const middleware = serveStatic(testDir, { prefix: '/static' });

      const mockReq = {
        method: 'GET',
        url: '/static/nonexistent.txt',
        headers: {},
      } as IncomingMessage;

      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
        statusCode: 200,
      } as any as ServerResponse;

      const ctx = createMockContext({ req: mockReq, res: mockRes });

      await middleware(ctx, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle HEAD requests', async () => {
      await writeFile(join(testDir, 'test.txt'), 'Hello World');
      const middleware = serveStatic(testDir, { prefix: '/static' });

      const mockReq = {
        method: 'HEAD',
        url: '/static/test.txt',
        headers: {},
      } as IncomingMessage;

      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
        statusCode: 200,
      } as any as ServerResponse;

      const ctx = createMockContext({ req: mockReq, res: mockRes });

      await middleware(ctx, next);

      expect(next).not.toHaveBeenCalled();
      expect(ctx.statusCode).toBe(200);
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Length', '11');
      expect(mockRes.end).toHaveBeenCalled();
    });
  });

  describe('Custom Prefix', () => {
    it('should use custom prefix', async () => {
      await writeFile(join(testDir, 'file.txt'), 'content');
      const middleware = serveStatic(testDir, { prefix: '/assets' });

      const mockReq = {
        method: 'GET',
        url: '/assets/file.txt',
        headers: {},
      } as IncomingMessage;

      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
        statusCode: 200,
      } as any as ServerResponse;

      const ctx = createMockContext({ req: mockReq, res: mockRes });

      await middleware(ctx, next);

      expect(next).not.toHaveBeenCalled();
      expect(ctx.statusCode).toBe(200);
    });

    it('should not serve files without matching prefix', async () => {
      await writeFile(join(testDir, 'file.txt'), 'content');
      const middleware = serveStatic(testDir, { prefix: '/assets' });

      const mockReq = {
        method: 'GET',
        url: '/static/file.txt',
        headers: {},
      } as IncomingMessage;

      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
        statusCode: 200,
      } as any as ServerResponse;

      const ctx = createMockContext({ req: mockReq, res: mockRes });

      await middleware(ctx, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Caching Options', () => {
    it('should set Cache-Control header when maxAge is provided', async () => {
      await writeFile(join(testDir, 'cached.txt'), 'cached content');
      const middleware = serveStatic(testDir, { prefix: '/static', maxAge: 3600 });

      const mockReq = {
        method: 'GET',
        url: '/static/cached.txt',
        headers: {},
      } as IncomingMessage;

      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
        statusCode: 200,
      } as any as ServerResponse;

      const ctx = createMockContext({ req: mockReq, res: mockRes });

      await middleware(ctx, next);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=3600');
    });

    it('should not set Cache-Control when maxAge is 0', async () => {
      await writeFile(join(testDir, 'nocache.txt'), 'no cache');
      const middleware = serveStatic(testDir, { prefix: '/static', maxAge: 0 });

      const mockReq = {
        method: 'GET',
        url: '/static/nocache.txt',
        headers: {},
      } as IncomingMessage;

      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
        statusCode: 200,
      } as any as ServerResponse;

      const ctx = createMockContext({ req: mockReq, res: mockRes });

      await middleware(ctx, next);

      const cacheControlCalls = (mockRes.setHeader as jest.Mock).mock.calls.filter(
        (call) => call[0] === 'Cache-Control',
      );
      expect(cacheControlCalls.length).toBe(0);
    });

    it('should set ETag header when etag is true', async () => {
      await writeFile(join(testDir, 'etag.txt'), 'etag content');
      const middleware = serveStatic(testDir, { prefix: '/static', etag: true });

      const mockReq = {
        method: 'GET',
        url: '/static/etag.txt',
        headers: {},
      } as IncomingMessage;

      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
        statusCode: 200,
      } as any as ServerResponse;

      const ctx = createMockContext({ req: mockReq, res: mockRes });

      await middleware(ctx, next);

      const etagCalls = (mockRes.setHeader as jest.Mock).mock.calls.filter((call) => call[0] === 'ETag');
      expect(etagCalls.length).toBe(1);
      expect(etagCalls[0][1]).toMatch(/^".+"$/);
    });

    it('should not set ETag header when etag is false', async () => {
      await writeFile(join(testDir, 'noetag.txt'), 'no etag');
      const middleware = serveStatic(testDir, { prefix: '/static', etag: false });

      const mockReq = {
        method: 'GET',
        url: '/static/noetag.txt',
        headers: {},
      } as IncomingMessage;

      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
        statusCode: 200,
      } as any as ServerResponse;

      const ctx = createMockContext({ req: mockReq, res: mockRes });

      await middleware(ctx, next);

      const etagCalls = (mockRes.setHeader as jest.Mock).mock.calls.filter((call) => call[0] === 'ETag');
      expect(etagCalls.length).toBe(0);
    });

    it('should return 304 Not Modified when ETag matches', async () => {
      await writeFile(join(testDir, 'conditional.txt'), 'conditional content');
      const middleware = serveStatic(testDir, { prefix: '/static', etag: true });

      const mockReq1 = {
        method: 'GET',
        url: '/static/conditional.txt',
        headers: {},
      } as IncomingMessage;

      const mockRes1 = {
        setHeader: jest.fn(),
        end: jest.fn(),
        statusCode: 200,
      } as any as ServerResponse;

      const ctx1 = createMockContext({ req: mockReq1, res: mockRes1 });
      await middleware(ctx1, next);

      const etagCalls = (mockRes1.setHeader as jest.Mock).mock.calls.filter((call) => call[0] === 'ETag');
      const etag = etagCalls[0][1];

      const mockReq2 = {
        method: 'GET',
        url: '/static/conditional.txt',
        headers: { 'if-none-match': etag },
      } as IncomingMessage;

      const mockRes2 = {
        setHeader: jest.fn(),
        end: jest.fn(),
        statusCode: 200,
      } as any as ServerResponse;

      const ctx2 = createMockContext({ req: mockReq2, res: mockRes2 });
      await middleware(ctx2, next);

      expect(ctx2.statusCode).toBe(304);
      expect(mockRes2.end).toHaveBeenCalled();
    });

    it('should set Last-Modified header when lastModified is true', async () => {
      await writeFile(join(testDir, 'modified.txt'), 'modified content');
      const middleware = serveStatic(testDir, { prefix: '/static', lastModified: true });

      const mockReq = {
        method: 'GET',
        url: '/static/modified.txt',
        headers: {},
      } as IncomingMessage;

      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
        statusCode: 200,
      } as any as ServerResponse;

      const ctx = createMockContext({ req: mockReq, res: mockRes });

      await middleware(ctx, next);

      const lastModifiedCalls = (mockRes.setHeader as jest.Mock).mock.calls.filter(
        (call) => call[0] === 'Last-Modified',
      );
      expect(lastModifiedCalls.length).toBe(1);
      expect(lastModifiedCalls[0][1]).toBeTruthy();
    });

    it('should return 304 Not Modified when file not modified', async () => {
      await writeFile(join(testDir, 'notmodified.txt'), 'content');
      const middleware = serveStatic(testDir, { prefix: '/static', lastModified: true });

      const mockReq1 = {
        method: 'GET',
        url: '/static/notmodified.txt',
        headers: {},
      } as IncomingMessage;

      const mockRes1 = {
        setHeader: jest.fn(),
        end: jest.fn(),
        statusCode: 200,
      } as any as ServerResponse;

      const ctx1 = createMockContext({ req: mockReq1, res: mockRes1 });
      await middleware(ctx1, next);

      const lastModifiedCalls = (mockRes1.setHeader as jest.Mock).mock.calls.filter(
        (call) => call[0] === 'Last-Modified',
      );
      const _lastModified = lastModifiedCalls[0][1];

      const futureDate = new Date(Date.now() + 10000).toUTCString();
      const mockReq2 = {
        method: 'GET',
        url: '/static/notmodified.txt',
        headers: { 'if-modified-since': futureDate },
      } as IncomingMessage;

      const mockRes2 = {
        setHeader: jest.fn(),
        end: jest.fn(),
        statusCode: 200,
      } as any as ServerResponse;

      const ctx2 = createMockContext({ req: mockReq2, res: mockRes2 });
      await middleware(ctx2, next);

      expect(ctx2.statusCode).toBe(304);
      expect(mockRes2.end).toHaveBeenCalled();
    });
  });

  describe('Directory Index', () => {
    it('should serve index.html from directory', async () => {
      await mkdir(join(testDir, 'subdir'), { recursive: true });
      await writeFile(join(testDir, 'subdir', 'index.html'), '<html>Index</html>');
      const middleware = serveStatic(testDir, { prefix: '/static', index: 'index.html' });

      const mockReq = {
        method: 'GET',
        url: '/static/subdir/',
        headers: {},
      } as IncomingMessage;

      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
        statusCode: 200,
      } as any as ServerResponse;

      const ctx = createMockContext({ req: mockReq, res: mockRes });

      await middleware(ctx, next);

      expect(next).not.toHaveBeenCalled();
      expect(ctx.statusCode).toBe(200);
      expect(mockRes.end).toHaveBeenCalledWith(Buffer.from('<html>Index</html>'));
    });

    it('should support multiple index files', async () => {
      await mkdir(join(testDir, 'multi'), { recursive: true });
      await writeFile(join(testDir, 'multi', 'index.htm'), '<html>HTM</html>');
      const middleware = serveStatic(testDir, { prefix: '/static', index: ['index.html', 'index.htm'] });

      const mockReq = {
        method: 'GET',
        url: '/static/multi/',
        headers: {},
      } as IncomingMessage;

      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
        statusCode: 200,
      } as any as ServerResponse;

      const ctx = createMockContext({ req: mockReq, res: mockRes });

      await middleware(ctx, next);

      expect(next).not.toHaveBeenCalled();
      expect(ctx.statusCode).toBe(200);
      expect(mockRes.end).toHaveBeenCalledWith(Buffer.from('<html>HTM</html>'));
    });
  });

  describe('Security', () => {
    it('should prevent path traversal with ..', async () => {
      await writeFile(join(testDir, 'safe.txt'), 'safe');
      const middleware = serveStatic(testDir, { prefix: '/static' });

      const mockReq = {
        method: 'GET',
        url: '/static/../package.json',
        headers: {},
      } as IncomingMessage;

      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
        statusCode: 200,
      } as any as ServerResponse;

      const ctx = createMockContext({ req: mockReq, res: mockRes });

      await middleware(ctx, next);

      expect(next).not.toHaveBeenCalled();
      expect(ctx.statusCode).toBe(403);
    });

    it('should prevent path traversal with ~', async () => {
      await writeFile(join(testDir, 'safe.txt'), 'safe');
      const middleware = serveStatic(testDir, { prefix: '/static' });

      const mockReq = {
        method: 'GET',
        url: '/static/~/file',
        headers: {},
      } as IncomingMessage;

      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
        statusCode: 200,
      } as any as ServerResponse;

      const ctx = createMockContext({ req: mockReq, res: mockRes });

      await middleware(ctx, next);

      expect(next).not.toHaveBeenCalled();
      expect(ctx.statusCode).toBe(403);
    });

    it('should ignore dotfiles when dotfiles is "ignore"', async () => {
      await writeFile(join(testDir, '.hidden'), 'hidden');
      const middleware = serveStatic(testDir, { prefix: '/static', dotfiles: 'ignore' });

      const mockReq = {
        method: 'GET',
        url: '/static/.hidden',
        headers: {},
      } as IncomingMessage;

      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
        statusCode: 200,
      } as any as ServerResponse;

      const ctx = createMockContext({ req: mockReq, res: mockRes });

      await middleware(ctx, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny dotfiles when dotfiles is "deny"', async () => {
      await writeFile(join(testDir, '.hidden'), 'hidden');
      const middleware = serveStatic(testDir, { prefix: '/static', dotfiles: 'deny' });

      const mockReq = {
        method: 'GET',
        url: '/static/.hidden',
        headers: {},
      } as IncomingMessage;

      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
        statusCode: 200,
      } as any as ServerResponse;

      const ctx = createMockContext({ req: mockReq, res: mockRes });

      await middleware(ctx, next);

      expect(next).not.toHaveBeenCalled();
      expect(ctx.statusCode).toBe(403);
    });

    it('should allow dotfiles when dotfiles is "allow"', async () => {
      await writeFile(join(testDir, '.hidden'), 'hidden');
      const middleware = serveStatic(testDir, { prefix: '/static', dotfiles: 'allow' });

      const mockReq = {
        method: 'GET',
        url: '/static/.hidden',
        headers: {},
      } as IncomingMessage;

      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
        statusCode: 200,
      } as any as ServerResponse;

      const ctx = createMockContext({ req: mockReq, res: mockRes });

      await middleware(ctx, next);

      expect(next).not.toHaveBeenCalled();
      expect(ctx.statusCode).toBe(200);
    });
  });

  describe('HTTP Methods', () => {
    it('should only handle GET and HEAD requests', async () => {
      await writeFile(join(testDir, 'file.txt'), 'content');
      const middleware = serveStatic(testDir, { prefix: '/static' });

      const mockReq = {
        method: 'POST',
        url: '/static/file.txt',
        headers: {},
      } as IncomingMessage;

      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
        statusCode: 200,
      } as any as ServerResponse;

      const ctx = createMockContext({ req: mockReq, res: mockRes });

      await middleware(ctx, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Nested Directories', () => {
    it('should serve files from nested directories', async () => {
      await mkdir(join(testDir, 'nested', 'deep'), { recursive: true });
      await writeFile(join(testDir, 'nested', 'deep', 'file.txt'), 'nested content');
      const middleware = serveStatic(testDir, { prefix: '/static' });

      const mockReq = {
        method: 'GET',
        url: '/static/nested/deep/file.txt',
        headers: {},
      } as IncomingMessage;

      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
        statusCode: 200,
      } as any as ServerResponse;

      const ctx = createMockContext({ req: mockReq, res: mockRes });

      await middleware(ctx, next);

      expect(next).not.toHaveBeenCalled();
      expect(ctx.statusCode).toBe(200);
      expect(mockRes.end).toHaveBeenCalledWith(Buffer.from('nested content'));
    });
  });

  describe('Content-Length Header', () => {
    it('should set Content-Length header', async () => {
      const content = 'Hello World';
      await writeFile(join(testDir, 'sized.txt'), content);
      const middleware = serveStatic(testDir, { prefix: '/static' });

      const mockReq = {
        method: 'GET',
        url: '/static/sized.txt',
        headers: {},
      } as IncomingMessage;

      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
        statusCode: 200,
      } as any as ServerResponse;

      const ctx = createMockContext({ req: mockReq, res: mockRes });

      await middleware(ctx, next);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Length', content.length.toString());
    });
  });

  describe('Edge Cases', () => {
    it('should handle root directory request', async () => {
      await writeFile(join(testDir, 'index.html'), '<html>Root</html>');
      const middleware = serveStatic(testDir, { prefix: '/static' });

      const mockReq = {
        method: 'GET',
        url: '/static/',
        headers: {},
      } as IncomingMessage;

      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
        statusCode: 200,
      } as any as ServerResponse;

      const ctx = createMockContext({ req: mockReq, res: mockRes });

      await middleware(ctx, next);

      expect(next).not.toHaveBeenCalled();
      expect(ctx.statusCode).toBe(200);
    });

    it('should handle empty directory request without index', async () => {
      await mkdir(join(testDir, 'empty'), { recursive: true });
      const middleware = serveStatic(testDir, { prefix: '/static' });

      const mockReq = {
        method: 'GET',
        url: '/static/empty/',
        headers: {},
      } as IncomingMessage;

      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
        statusCode: 200,
      } as any as ServerResponse;

      const ctx = createMockContext({ req: mockReq, res: mockRes });

      await middleware(ctx, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle files with special characters in names', async () => {
      await writeFile(join(testDir, 'file with spaces.txt'), 'content');
      const middleware = serveStatic(testDir, { prefix: '/static' });

      const mockReq = {
        method: 'GET',
        url: '/static/file%20with%20spaces.txt',
        headers: {},
      } as IncomingMessage;

      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
        statusCode: 200,
      } as any as ServerResponse;

      const ctx = createMockContext({ req: mockReq, res: mockRes });

      await middleware(ctx, next);

      expect(ctx.statusCode).toBe(200);
    });

    it('should not serve files outside root directory', async () => {
      const outsideDir = join(process.cwd(), 'outside-test');
      await mkdir(outsideDir, { recursive: true });
      await writeFile(join(outsideDir, 'outside.txt'), 'outside');
      
      const middleware = serveStatic(testDir, { prefix: '/static' });

      const mockReq = {
        method: 'GET',
        url: '/static/../../outside-test/outside.txt',
        headers: {},
      } as IncomingMessage;

      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
        statusCode: 200,
      } as any as ServerResponse;

      const ctx = createMockContext({ req: mockReq, res: mockRes });

      await middleware(ctx, next);

      expect(ctx.statusCode).toBe(403);
      
      await rm(outsideDir, { recursive: true, force: true });
    });

    it('should handle multiple index files in priority order', async () => {
      await mkdir(join(testDir, 'priority'), { recursive: true });
      await writeFile(join(testDir, 'priority', 'index.html'), '<html>HTML</html>');
      await writeFile(join(testDir, 'priority', 'index.htm'), '<html>HTM</html>');
      
      const middleware = serveStatic(testDir, {
        prefix: '/static',
        index: ['index.html', 'index.htm']
      });

      const mockReq = {
        method: 'GET',
        url: '/static/priority/',
        headers: {},
      } as IncomingMessage;

      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
        statusCode: 200,
      } as any as ServerResponse;

      const ctx = createMockContext({ req: mockReq, res: mockRes });

      await middleware(ctx, next);

      expect(ctx.statusCode).toBe(200);
      expect(mockRes.end).toHaveBeenCalledWith(Buffer.from('<html>HTML</html>'));
    });

    it('should handle dotfiles in nested paths', async () => {
      await mkdir(join(testDir, 'nested'), { recursive: true });
      await writeFile(join(testDir, 'nested', '.hidden'), 'hidden');
      
      const middleware = serveStatic(testDir, {
        prefix: '/static',
        dotfiles: 'ignore'
      });

      const mockReq = {
        method: 'GET',
        url: '/static/nested/.hidden',
        headers: {},
      } as IncomingMessage;

      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
        statusCode: 200,
      } as any as ServerResponse;

      const ctx = createMockContext({ req: mockReq, res: mockRes });

      await middleware(ctx, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle HEAD requests without reading file for ETag', async () => {
      await writeFile(join(testDir, 'head.txt'), 'content');
      const middleware = serveStatic(testDir, {
        prefix: '/static',
        etag: true
      });

      const mockReq = {
        method: 'HEAD',
        url: '/static/head.txt',
        headers: {},
      } as IncomingMessage;

      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
        statusCode: 200,
      } as any as ServerResponse;

      const ctx = createMockContext({ req: mockReq, res: mockRes });

      await middleware(ctx, next);

      expect(ctx.statusCode).toBe(200);
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Length', expect.any(String));
      expect(mockRes.end).toHaveBeenCalled();
      expect(mockRes.end).toHaveBeenCalledWith();
    });

    it('should handle all caching options together', async () => {
      await writeFile(join(testDir, 'cached.txt'), 'cached');
      const middleware = serveStatic(testDir, {
        prefix: '/static',
        maxAge: 3600,
        etag: true,
        lastModified: true
      });

      const mockReq = {
        method: 'GET',
        url: '/static/cached.txt',
        headers: {},
      } as IncomingMessage;

      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
        statusCode: 200,
      } as any as ServerResponse;

      const ctx = createMockContext({ req: mockReq, res: mockRes });

      await middleware(ctx, next);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=3600');
      const etagCalls = (mockRes.setHeader as jest.Mock).mock.calls.filter((call) => call[0] === 'ETag');
      expect(etagCalls.length).toBe(1);
      const lastModifiedCalls = (mockRes.setHeader as jest.Mock).mock.calls.filter((call) => call[0] === 'Last-Modified');
      expect(lastModifiedCalls.length).toBe(1);
    });
  });
});

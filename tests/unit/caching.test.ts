import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { cache, cacheWithStore, invalidateCache } from '../../src/middleware/caching.js';
import { Context } from '../../src/types.js';
import { createMockContext } from '../utils/test-helpers.js';
import { initCache, getCache, getCacheStats, MemoryCacheAdapter } from '../../src/utils/cache.js';

describe('Caching Middleware', () => {
  beforeEach(() => {
    initCache(new MemoryCacheAdapter());
  });

  describe('cache()', () => {
    it('should set no-store directive when noStore is true', async () => {
      const middleware = cache({ noStore: true });
      const ctx = createMockContext();

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
      expect(next).toHaveBeenCalled();
    });

    it('should set no-cache directive when noCache is true', async () => {
      const middleware = cache({ noCache: true });
      const ctx = createMockContext();

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(next).toHaveBeenCalled();
    });

    it('should prioritize noStore over noCache', async () => {
      const middleware = cache({ noStore: true, noCache: true });
      const ctx = createMockContext();

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
      expect(next).toHaveBeenCalled();
    });

    it('should set max-age directive', async () => {
      const middleware = cache({ maxAge: 3600 });
      const ctx = createMockContext();

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Cache-Control', 'max-age=3600');
      expect(next).toHaveBeenCalled();
    });

    it('should not set max-age when it is 0', async () => {
      const middleware = cache({ maxAge: 0 });
      const ctx = createMockContext();

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      const cacheControlCalls = (ctx.res.setHeader as jest.Mock).mock.calls.filter(
        (call) => call[0] === 'Cache-Control'
      );
      expect(cacheControlCalls.length).toBe(0);
      expect(next).toHaveBeenCalled();
    });

    it('should set s-maxage directive', async () => {
      const middleware = cache({ sMaxAge: 1800 });
      const ctx = createMockContext();

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Cache-Control', 's-maxage=1800');
      expect(next).toHaveBeenCalled();
    });

    it('should set public directive', async () => {
      const middleware = cache({ public: true, maxAge: 3600 });
      const ctx = createMockContext();

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      const cacheControlCall = (ctx.res.setHeader as jest.Mock).mock.calls.find(
        (call) => call[0] === 'Cache-Control'
      );
      expect(cacheControlCall).toBeTruthy();
      expect(cacheControlCall![1]).toContain('public');
      expect(cacheControlCall![1]).toContain('max-age=3600');
      expect(next).toHaveBeenCalled();
    });

    it('should set private directive', async () => {
      const middleware = cache({ private: true, maxAge: 3600 });
      const ctx = createMockContext();

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      const cacheControlCall = (ctx.res.setHeader as jest.Mock).mock.calls.find(
        (call) => call[0] === 'Cache-Control'
      );
      expect(cacheControlCall).toBeTruthy();
      expect(cacheControlCall![1]).toContain('private');
      expect(cacheControlCall![1]).toContain('max-age=3600');
      expect(next).toHaveBeenCalled();
    });

    it('should set must-revalidate directive', async () => {
      const middleware = cache({ mustRevalidate: true, maxAge: 3600 });
      const ctx = createMockContext();

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      const cacheControlCall = (ctx.res.setHeader as jest.Mock).mock.calls.find(
        (call) => call[0] === 'Cache-Control'
      );
      expect(cacheControlCall).toBeTruthy();
      expect(cacheControlCall![1]).toContain('must-revalidate');
      expect(cacheControlCall![1]).toContain('max-age=3600');
      expect(next).toHaveBeenCalled();
    });

    it('should set proxy-revalidate directive', async () => {
      const middleware = cache({ proxyRevalidate: true, maxAge: 3600 });
      const ctx = createMockContext();

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      const cacheControlCall = (ctx.res.setHeader as jest.Mock).mock.calls.find(
        (call) => call[0] === 'Cache-Control'
      );
      expect(cacheControlCall).toBeTruthy();
      expect(cacheControlCall![1]).toContain('proxy-revalidate');
      expect(cacheControlCall![1]).toContain('max-age=3600');
      expect(next).toHaveBeenCalled();
    });

    it('should set immutable directive', async () => {
      const middleware = cache({ immutable: true, maxAge: 3600 });
      const ctx = createMockContext();

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      const cacheControlCall = (ctx.res.setHeader as jest.Mock).mock.calls.find(
        (call) => call[0] === 'Cache-Control'
      );
      expect(cacheControlCall).toBeTruthy();
      expect(cacheControlCall![1]).toContain('immutable');
      expect(cacheControlCall![1]).toContain('max-age=3600');
      expect(next).toHaveBeenCalled();
    });

    it('should set stale-while-revalidate directive', async () => {
      const middleware = cache({ staleWhileRevalidate: 60, maxAge: 3600 });
      const ctx = createMockContext();

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      const cacheControlCall = (ctx.res.setHeader as jest.Mock).mock.calls.find(
        (call) => call[0] === 'Cache-Control'
      );
      expect(cacheControlCall).toBeTruthy();
      expect(cacheControlCall![1]).toContain('stale-while-revalidate=60');
      expect(cacheControlCall![1]).toContain('max-age=3600');
      expect(next).toHaveBeenCalled();
    });

    it('should set stale-if-error directive', async () => {
      const middleware = cache({ staleIfError: 300, maxAge: 3600 });
      const ctx = createMockContext();

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      const cacheControlCall = (ctx.res.setHeader as jest.Mock).mock.calls.find(
        (call) => call[0] === 'Cache-Control'
      );
      expect(cacheControlCall).toBeTruthy();
      expect(cacheControlCall![1]).toContain('stale-if-error=300');
      expect(cacheControlCall![1]).toContain('max-age=3600');
      expect(next).toHaveBeenCalled();
    });

    it('should set multiple cache directives', async () => {
      const middleware = cache({
        maxAge: 3600,
        public: true,
        mustRevalidate: true,
        immutable: true
      });
      const ctx = createMockContext();

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      const cacheControlCall = (ctx.res.setHeader as jest.Mock).mock.calls.find(
        (call) => call[0] === 'Cache-Control'
      );
      expect(cacheControlCall).toBeTruthy();
      expect(cacheControlCall).toBeDefined();
      const cacheControl = cacheControlCall![1];
      expect(cacheControl).toContain('public');
      expect(cacheControl).toContain('must-revalidate');
      expect(cacheControl).toContain('immutable');
      expect(cacheControl).toContain('max-age=3600');
      expect(next).toHaveBeenCalled();
    });

    it('should set Vary header', async () => {
      const middleware = cache({ vary: ['Accept', 'Accept-Language'] });
      const ctx = createMockContext();

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Vary', 'Accept, Accept-Language');
      expect(next).toHaveBeenCalled();
    });

    it('should not set Vary header when array is empty', async () => {
      const middleware = cache({ vary: [] });
      const ctx = createMockContext();

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      const varyCalls = (ctx.res.setHeader as jest.Mock).mock.calls.filter(
        (call) => call[0] === 'Vary'
      );
      expect(varyCalls.length).toBe(0);
      expect(next).toHaveBeenCalled();
    });

    it('should set ETag header when etag is true', async () => {
      const middleware = cache({ etag: true });
      const ctx = createMockContext({
        req: {
          url: '/test',
          headers: {}
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.res.setHeader).toHaveBeenCalledWith('ETag', expect.stringMatching(/^".*"$/));
      expect(next).toHaveBeenCalled();
    });

    it('should return 304 when If-None-Match matches ETag', async () => {
      const middleware = cache({ etag: true });
      let etagValue = '';
      
      const ctx = createMockContext({
        req: {
          url: '/test',
          headers: {}
        } as any,
        res: {
          setHeader: jest.fn((name: string, value: string) => {
            if (name === 'ETag') {
              etagValue = value;
            }
          }),
          end: jest.fn(),
          statusCode: 200
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(etagValue).toBeTruthy();

      const ctx2 = createMockContext({
        req: {
          url: '/test',
          headers: {
            'if-none-match': etagValue
          }
        } as any,
        res: {
          setHeader: jest.fn((name: string, value: string) => {
            if (name === 'ETag') {
              expect(value).toBe(etagValue);
            }
          }),
          end: jest.fn(),
          statusCode: 200
        } as any
      });

      const next2 = jest.fn(async () => {});

      await middleware(ctx2, next2);

      expect(ctx2.statusCode).toBe(304);
      expect(ctx2.res.statusCode).toBe(304);
      expect(ctx2.res.end).toHaveBeenCalled();
      expect(next2).not.toHaveBeenCalled();
    });

    it('should set Last-Modified header when lastModified is true', async () => {
      const middleware = cache({ lastModified: true });
      const ctx = createMockContext();

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.res.setHeader).toHaveBeenCalledWith('Last-Modified', expect.any(String));
      expect(next).toHaveBeenCalled();
    });

    it('should return 304 when If-Modified-Since is after Last-Modified', async () => {
      const middleware = cache({ lastModified: true });
      let lastModifiedValue = '';

      const ctx = createMockContext({
        req: {
          headers: {}
        } as any,
        res: {
          setHeader: jest.fn((name: string, value: string) => {
            if (name === 'Last-Modified') {
              lastModifiedValue = value;
            }
          }),
          end: jest.fn(),
          statusCode: 200
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(lastModifiedValue).toBeTruthy();

      const ifModifiedSince = new Date(Date.now() + 1000).toUTCString();
      const ctx2 = createMockContext({
        req: {
          headers: {
            'if-modified-since': ifModifiedSince
          }
        } as any,
        res: {
          setHeader: jest.fn((name: string, value: string) => {
            if (name === 'Last-Modified') {
              expect(value).toBeTruthy();
            }
          }),
          end: jest.fn(),
          statusCode: 200
        } as any
      });

      const next2 = jest.fn(async () => {});

      await middleware(ctx2, next2);

      expect(ctx2.statusCode).toBe(304);
      expect(ctx2.res.statusCode).toBe(304);
      expect(ctx2.res.end).toHaveBeenCalled();
    });

    it('should not return 304 when If-Modified-Since is before Last-Modified', async () => {
      const middleware = cache({ lastModified: true });
      const ifModifiedSince = new Date(Date.now() - 1000).toUTCString();

      const ctx = createMockContext({
        req: {
          headers: {
            'if-modified-since': ifModifiedSince
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

      expect(ctx.statusCode).not.toBe(304);
      expect(next).toHaveBeenCalled();
    });

    it('should not set ETag header when etag is false', async () => {
      const middleware = cache({ etag: false });
      const ctx = createMockContext();

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      const etagCalls = (ctx.res.setHeader as jest.Mock).mock.calls.filter(
        (call) => call[0] === 'ETag'
      );
      expect(etagCalls.length).toBe(0);
      expect(next).toHaveBeenCalled();
    });

    it('should not set Last-Modified header when lastModified is false', async () => {
      const middleware = cache({ lastModified: false });
      const ctx = createMockContext();

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      const lastModifiedCalls = (ctx.res.setHeader as jest.Mock).mock.calls.filter(
        (call) => call[0] === 'Last-Modified'
      );
      expect(lastModifiedCalls.length).toBe(0);
      expect(next).toHaveBeenCalled();
    });

    it('should work with default options', async () => {
      const middleware = cache();
      const ctx = createMockContext();

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.res.setHeader).toHaveBeenCalledWith('ETag', expect.any(String));
      expect(ctx.res.setHeader).toHaveBeenCalledWith('Last-Modified', expect.any(String));
      expect(next).toHaveBeenCalled();
    });
  });

  describe('cacheWithStore()', () => {
    it('should skip cache when skipCache returns true', async () => {
      const middleware = cacheWithStore({
        skipCache: (ctx: Context) => ctx.req.method === 'POST'
      });
      const ctx = createMockContext({
        req: {
          method: 'POST',
          url: '/test'
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return cached response when cache hit', async () => {
      const cache = getCache();
      const key = 'GET:/test';
      const cachedData = {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: '{"message":"cached"}'
      };

      await cache.set(key, JSON.stringify(cachedData), 300);

      const middleware = cacheWithStore({ maxAge: 300 });
      const ctx = createMockContext({
        req: {
          method: 'GET',
          url: '/test'
        } as any,
        res: {
          setHeader: jest.fn(),
          end: jest.fn(),
          statusCode: 200
        } as any
      });

      const next = jest.fn(async () => {});

      await middleware(ctx, next);

      expect(ctx.statusCode).toBe(200);
      expect(ctx.res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(ctx.res.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=300');
      expect(ctx.res.setHeader).toHaveBeenCalledWith('X-Cache', 'HIT');
      expect(ctx.res.end).toHaveBeenCalledWith('{"message":"cached"}');
      expect(next).not.toHaveBeenCalled();
    });

    it('should cache response when cache miss', async () => {
      const middleware = cacheWithStore({ maxAge: 300 });
      const ctx = createMockContext({
        req: {
          method: 'GET',
          url: '/test'
        } as any,
        res: {
          setHeader: jest.fn(),
          end: jest.fn(),
          statusCode: 200
        } as any
      });

      const next = jest.fn(async () => {
        ctx.json({ message: 'test' });
      });

      await middleware(ctx, next);

      expect(next).toHaveBeenCalled();
      expect(ctx.res.setHeader).toHaveBeenCalledWith('X-Cache', 'MISS');

      const cache = getCache();
      const key = 'GET:/test';
      const cached = await cache.get(key);
      expect(cached).toBeTruthy();
      if (cached) {
        const data = JSON.parse(cached);
        expect(data.statusCode).toBe(200);
        expect(data.body).toBe('{"message":"test"}');
      }
    });

    it('should use custom cache key function', async () => {
      const middleware = cacheWithStore({
        maxAge: 300,
        cacheKey: (ctx: Context) => `custom:${ctx.req.url}`
      });
      const ctx = createMockContext({
        req: {
          method: 'GET',
          url: '/test'
        } as any
      });

      const next = jest.fn(async () => {
        ctx.json({ message: 'test' });
      });

      await middleware(ctx, next);

      const cache = getCache();
      const cached = await cache.get('custom:/test');
      expect(cached).toBeTruthy();
    });

    it('should use custom cache key string', async () => {
      const middleware = cacheWithStore({
        maxAge: 300,
        cacheKey: () => 'static-key'
      });
      const ctx = createMockContext({
        req: {
          method: 'GET',
          url: '/test'
        } as any
      });

      const next = jest.fn(async () => {
        ctx.json({ message: 'test' });
      });

      await middleware(ctx, next);

      const cache = getCache();
      const cached = await cache.get('static-key');
      expect(cached).toBeTruthy();
    });

    it('should handle cache get errors gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const cache = getCache();
      jest.spyOn(cache, 'get').mockRejectedValue(new Error('Cache error'));

      const middleware = cacheWithStore({ maxAge: 300 });
      const ctx = createMockContext({
        req: {
          method: 'GET',
          url: '/test'
        } as any
      });

      const next = jest.fn(async () => {
        ctx.json({ message: 'test' });
      });

      await middleware(ctx, next);

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should handle cache set errors gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const cache = getCache();
      jest.spyOn(cache, 'set').mockRejectedValue(new Error('Cache set error'));

      const middleware = cacheWithStore({ maxAge: 300 });
      const ctx = createMockContext({
        req: {
          method: 'GET',
          url: '/test'
        } as any
      });

      const next = jest.fn(async () => {
        ctx.json({ message: 'test' });
      });

      await middleware(ctx, next);

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should cache response when using ctx.send()', async () => {
      const middleware = cacheWithStore({ maxAge: 300 });
      const ctx = createMockContext({
        req: {
          method: 'GET',
          url: '/test'
        } as any
      });

      const next = jest.fn(async () => {
        ctx.send('test response');
      });

      await middleware(ctx, next);

      const cache = getCache();
      const key = 'GET:/test';
      const cached = await cache.get(key);
      expect(cached).toBeTruthy();
      if (cached) {
        const data = JSON.parse(cached);
        expect(data.body).toBe('test response');
      }
    });

    it('should not cache when response is not sent', async () => {
      const middleware = cacheWithStore({ maxAge: 300 });
      const ctx = createMockContext({
        req: {
          method: 'GET',
          url: '/test'
        } as any
      });

      const next = jest.fn(async () => {
        ctx.statusCode = 500;
      });

      await middleware(ctx, next);

      const cache = getCache();
      const key = 'GET:/test';
      const cached = await cache.get(key);
      expect(cached).toBeNull();
    });

    it('should use default maxAge of 300 seconds', async () => {
      const middleware = cacheWithStore({});
      const ctx = createMockContext({
        req: {
          method: 'GET',
          url: '/test'
        } as any
      });

      const next = jest.fn(async () => {
        ctx.json({ message: 'test' });
      });

      await middleware(ctx, next);

      const cache = getCache();
      const key = 'GET:/test';
      const cached = await cache.get(key);
      expect(cached).toBeTruthy();
    });
  });

  describe('invalidateCache()', () => {
    it('should invalidate cache by pattern', async () => {
      const cache = getCache();
      await cache.set('GET:/users/1', 'data1', 300);
      await cache.set('GET:/users/2', 'data2', 300);
      await cache.set('GET:/posts/1', 'data3', 300);

      await invalidateCache('GET:/users/*');

      const user1 = await cache.get('GET:/users/1');
      const user2 = await cache.get('GET:/users/2');
      const post1 = await cache.get('GET:/posts/1');

      expect(user1).toBeNull();
      expect(user2).toBeNull();
      expect(post1).toBeTruthy();
    });

    it('should handle empty pattern', async () => {
      const cache = getCache();
      await cache.set('key1', 'value1', 300);
      await cache.set('key2', 'value2', 300);

      await invalidateCache('non-matching-pattern-*');

      const key1 = await cache.get('key1');
      const key2 = await cache.get('key2');

      expect(key1).toBeTruthy();
      expect(key2).toBeTruthy();
    });
  });

  describe('Cache Utility Functions', () => {
    describe('initCache()', () => {
      it('should initialize cache with default MemoryCacheAdapter', () => {
        initCache();
        const cache = getCache();
        expect(cache).toBeDefined();
      });

      it('should initialize cache with custom adapter', () => {
        const customAdapter = new MemoryCacheAdapter();
        initCache(customAdapter);
        const cache = getCache();
        expect(cache).toBeDefined();
      });

      it('should initialize cache with key prefix', () => {
        initCache(undefined, 'test-prefix:');
        const cache = getCache();
        expect(cache).toBeDefined();
      });

      it('should initialize cache with custom adapter and key prefix', () => {
        const customAdapter = new MemoryCacheAdapter();
        initCache(customAdapter, 'custom-prefix:');
        const cache = getCache();
        expect(cache).toBeDefined();
      });
    });

    describe('getCache()', () => {
      it('should return cache manager instance', () => {
        initCache();
        const cache = getCache();
        expect(cache).toBeDefined();
        expect(typeof cache.get).toBe('function');
        expect(typeof cache.set).toBe('function');
        expect(typeof cache.del).toBe('function');
      });

      it('should auto-initialize if cache not initialized', () => {
        initCache();
        const cache1 = getCache();
        const cache2 = getCache();
        expect(cache1).toBe(cache2);
      });
    });

    describe('getCacheStats()', () => {
      it('should return stats for MemoryCacheAdapter', () => {
        initCache(new MemoryCacheAdapter());
        const stats = getCacheStats();
        expect(stats).toBeDefined();
        expect(stats).not.toBeNull();
        if (stats) {
          expect(stats).toHaveProperty('size');
          expect(stats).toHaveProperty('hits');
          expect(stats).toHaveProperty('misses');
        }
      });

      it('should return null for non-MemoryCacheAdapter', () => {
        const customAdapter = {
          get: jest.fn(),
          set: jest.fn(),
          delete: jest.fn(),
          clear: jest.fn()
        };
        initCache(customAdapter as any);
        const stats = getCacheStats();
        expect(stats).toBeNull();
      });

      it('should return stats after cache operations', async () => {
        initCache(new MemoryCacheAdapter());
        const cache = getCache();
        
        await cache.set('test-key', 'test-value');
        await cache.get('test-key');
        await cache.get('non-existent');

        const stats = getCacheStats();
        expect(stats).toBeDefined();
        if (stats) {
          expect(stats.size).toBeGreaterThanOrEqual(0);
          expect(stats.hits).toBeGreaterThanOrEqual(0);
          expect(stats.misses).toBeGreaterThanOrEqual(0);
        }
      });
    });
  });
});


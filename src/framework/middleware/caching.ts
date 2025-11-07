import { Context, CacheOptions } from '../types.js';
import { getCache } from '../utils/cache.js';
import { createHash } from 'crypto';

export function cache(options: CacheOptions = {}) {
  const {
    maxAge = 0,
    sMaxAge,
    public: isPublic = false,
    private: isPrivate = false,
    noCache = false,
    noStore = false,
    mustRevalidate = false,
    proxyRevalidate = false,
    immutable = false,
    staleWhileRevalidate,
    staleIfError,
    vary = [],
    etag = true,
    lastModified = true,
  } = options;

  return async (ctx: Context, next: () => Promise<void>) => {
    const directives: string[] = [];

    if (noStore) {
      directives.push('no-store');
    } else if (noCache) {
      directives.push('no-cache');
    } else {
      if (maxAge > 0) {
        directives.push(`max-age=${maxAge}`);
      }

      if (sMaxAge !== undefined) {
        directives.push(`s-maxage=${sMaxAge}`);
      }

      if (isPublic) {
        directives.push('public');
      }

      if (isPrivate) {
        directives.push('private');
      }

      if (mustRevalidate) {
        directives.push('must-revalidate');
      }

      if (proxyRevalidate) {
        directives.push('proxy-revalidate');
      }

      if (immutable) {
        directives.push('immutable');
      }

      if (staleWhileRevalidate !== undefined) {
        directives.push(`stale-while-revalidate=${staleWhileRevalidate}`);
      }

      if (staleIfError !== undefined) {
        directives.push(`stale-if-error=${staleIfError}`);
      }
    }

    if (directives.length > 0) {
      ctx.res.setHeader('Cache-Control', directives.join(', '));
    }

    if (vary.length > 0) {
      ctx.res.setHeader('Vary', vary.join(', '));
    }

    if (etag) {
      const etagValue = generateETag(ctx);
      ctx.res.setHeader('ETag', etagValue);

      const ifNoneMatch = ctx.req.headers['if-none-match'];
      if (ifNoneMatch === etagValue) {
        ctx.statusCode = 304;
        ctx.res.statusCode = 304;
        ctx.res.end();
        return;
      }
    }

    if (lastModified) {
      const lastModifiedValue = new Date().toUTCString();
      ctx.res.setHeader('Last-Modified', lastModifiedValue);

      const ifModifiedSince = ctx.req.headers['if-modified-since'];
      if (ifModifiedSince && new Date(ifModifiedSince) >= new Date(lastModifiedValue)) {
        ctx.statusCode = 304;
        ctx.res.statusCode = 304;
        ctx.res.end();
        return;
      }
    }

    await next();
  };
}

export function cacheWithStore(options: CacheOptions = {}) {
  const { maxAge = 300, cacheKey, skipCache } = options;

  return async (ctx: Context, next: () => Promise<void>) => {
    if (skipCache && skipCache(ctx)) {
      await next();
      return;
    }

    const cache = getCache();
    const key = cache.generateCacheKey(ctx, cacheKey);

    try {
      const cached = await cache.get(key);

      if (cached) {
        const { statusCode, headers, body } = JSON.parse(cached);

        ctx.statusCode = statusCode;
        ctx.res.statusCode = statusCode;

        Object.entries(headers).forEach(([name, value]) => {
          ctx.res.setHeader(name, value as string);
        });

        ctx.res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
        ctx.res.setHeader('X-Cache', 'HIT');

        ctx.res.end(body);
        return;
      }
    } catch (error) {
      console.warn('Cache get error:', error);
    }

    let responseBody = '';
    const responseHeaders: Record<string, string> = {};
    let responseSent = false;

    const originalSend = ctx.send;
    const originalJson = ctx.json;

    ctx.send = function (data: any) {
      if (!responseSent) {
        responseBody = typeof data === 'string' ? data : JSON.stringify(data);
        responseSent = true;
        originalSend.call(this, data);
      }
      return this;
    };

    ctx.json = function (data: any) {
      if (!responseSent) {
        responseBody = JSON.stringify(data);
        responseHeaders['Content-Type'] = 'application/json';
        responseSent = true;
        originalJson.call(this, data);
      }
      return this;
    };

    await next();

    if (responseSent) {
      try {
        const responseData = {
          statusCode: ctx.statusCode,
          headers: responseHeaders,
          body: responseBody,
        };

        await cache.set(key, JSON.stringify(responseData), maxAge);

        if (!ctx.res.headersSent) {
          ctx.res.setHeader('X-Cache', 'MISS');
        }
      } catch (error) {
        console.warn('Cache set error:', error);
      }
    }
  };
}

export async function invalidateCache(pattern: string): Promise<void> {
  const cache = getCache();
  await cache.delPattern(pattern);
}

function generateETag(ctx: Context): string {
  const content = `${ctx.req.url}:${ctx.req.headers['accept'] || ''}`;
  return `"${createHash('md5').update(content).digest('hex')}"`;
}

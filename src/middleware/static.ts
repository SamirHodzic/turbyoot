import { Context, StaticOptions } from '../types.js';
import { readFile, stat } from 'fs/promises';
import { Stats } from 'fs';
import { join, resolve, normalize, extname } from 'path';
import { createHash } from 'crypto';

export function serveStatic(
  directory: string,
  options: StaticOptions = {},
): (ctx: Context, next: () => Promise<void>) => Promise<void> {
  const {
    prefix = '/static',
    maxAge = 0,
    etag = true,
    lastModified = true,
    index = ['index.html'],
    dotfiles = 'ignore',
  } = options;

  const root = resolve(directory);

  return async (ctx: Context, next: () => Promise<void>) => {
    if (ctx.req.method !== 'GET' && ctx.req.method !== 'HEAD') {
      await next();
      return;
    }

    const url = ctx.req.url || '';
    if (!url.startsWith(prefix)) {
      await next();
      return;
    }

    let filePath = url.slice(prefix.length);
    if (!filePath || filePath === '/') {
      filePath = '/';
    }

    if (filePath.includes('..') || filePath.includes('~')) {
      ctx.statusCode = 403;
      ctx.res.statusCode = 403;
      ctx.json({ error: 'Forbidden', status: 403 });
      return;
    }

    const normalizedPath = normalize(filePath).replace(/^\/+/, '');
    const isDotfile = normalizedPath.split('/').some((part) => part.startsWith('.') && part !== '.' && part !== '..');

    if (isDotfile) {
      if (dotfiles === 'deny') {
        ctx.statusCode = 403;
        ctx.res.statusCode = 403;
        ctx.json({ error: 'Forbidden', status: 403 });
        return;
      } else if (dotfiles === 'ignore') {
        await next();
        return;
      }
    }

    let fullPath = join(root, normalizedPath);

    try {
      let stats: Stats;
      try {
        stats = await stat(fullPath);
      } catch (error: any) {
        if (error.code === 'ENOENT' && normalizedPath.endsWith('/')) {
          const indexFiles = Array.isArray(index) ? index : [index];
          for (const indexFile of indexFiles) {
            const indexPath = join(fullPath, indexFile);
            try {
              stats = await stat(indexPath);
              fullPath = indexPath;
              break;
            } catch {
              continue;
            }
          }
        }
        if (!stats!) {
          await next();
          return;
        }
      }

      if (stats.isDirectory()) {
        const indexFiles = Array.isArray(index) ? index : [index];
        for (const indexFile of indexFiles) {
          const indexPath = join(fullPath, indexFile);
          try {
            const indexStats = await stat(indexPath);
            if (indexStats.isFile()) {
              fullPath = indexPath;
              stats = indexStats;
              break;
            }
          } catch {
            continue;
          }
        }
        if (stats.isDirectory()) {
          await next();
          return;
        }
      }

      if (!stats.isFile()) {
        await next();
        return;
      }

      const resolvedPath = resolve(fullPath);
      if (!resolvedPath.startsWith(root)) {
        ctx.statusCode = 403;
        ctx.res.statusCode = 403;
        ctx.json({ error: 'Forbidden', status: 403 });
        return;
      }

      if (maxAge > 0) {
        ctx.res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
      }

      if (lastModified) {
        const lastModifiedValue = stats.mtime.toUTCString();
        ctx.res.setHeader('Last-Modified', lastModifiedValue);

        const ifModifiedSince = ctx.req.headers['if-modified-since'];
        if (ifModifiedSince) {
          const ifModifiedSinceDate = new Date(ifModifiedSince);
          if (ifModifiedSinceDate >= stats.mtime) {
            ctx.statusCode = 304;
            ctx.res.statusCode = 304;
            ctx.res.end();
            return;
          }
        }
      }

      let fileContent: Buffer | null = null;
      if (etag || ctx.req.method !== 'HEAD') {
        fileContent = await readFile(fullPath);
      }

      if (etag && fileContent) {
        const etagValue = `"${createHash('md5').update(fileContent).digest('hex')}"`;
        ctx.res.setHeader('ETag', etagValue);

        const ifNoneMatch = ctx.req.headers['if-none-match'];
        if (ifNoneMatch === etagValue) {
          ctx.statusCode = 304;
          ctx.res.statusCode = 304;
          ctx.res.end();
          return;
        }
      }

      const contentType = getContentType(fullPath);
      ctx.res.setHeader('Content-Type', contentType);
      ctx.res.setHeader('Content-Length', stats.size.toString());

      if (ctx.req.method === 'HEAD') {
        ctx.statusCode = 200;
        ctx.res.statusCode = 200;
        ctx.res.end();
        return;
      }

      if (fileContent) {
        ctx.statusCode = 200;
        ctx.res.statusCode = 200;
        ctx.res.end(fileContent);
      }
    } catch (error: any) {
      if (error.code === 'ENOENT' || error.code === 'EISDIR') {
        await next();
        return;
      }
      console.error('Static file serving error:', error);
      ctx.statusCode = 500;
      ctx.res.statusCode = 500;
      ctx.json({ error: 'Internal Server Error', status: 500 });
    }
  };
}

function getContentType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.html': 'text/html',
    '.htm': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.txt': 'text/plain',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'font/otf',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.csv': 'text/csv',
    '.md': 'text/markdown',
    '.yaml': 'text/yaml',
    '.yml': 'text/yaml',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

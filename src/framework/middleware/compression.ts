import { Context, CompressionOptions } from '../types.js';
import { createGzip, createDeflate, createBrotliCompress } from 'zlib';
import { IncomingMessage } from 'http';

export function compression(options: CompressionOptions = {}) {
  const {
    threshold = 1024,
    level = 6,
    memLevel = 8,
    chunkSize = 16 * 1024,
    windowBits = 15,
    strategy = 0,
    filter = defaultFilter
  } = options;

  return async (ctx: Context, next: () => Promise<void>) => {
    if (!filter(ctx.req, ctx.res)) {
      await next();
      return;
    }

    const acceptEncoding = ctx.req.headers['accept-encoding'] || '';
    let compressor: any = null;
    let encoding = '';

    if (acceptEncoding.includes('br')) {
      compressor = createBrotliCompress();
      encoding = 'br';
    } else if (acceptEncoding.includes('gzip')) {
      compressor = createGzip({ level, memLevel, chunkSize, windowBits, strategy });
      encoding = 'gzip';
    } else if (acceptEncoding.includes('deflate')) {
      compressor = createDeflate({ level, memLevel, chunkSize, windowBits, strategy });
      encoding = 'deflate';
    }

    if (!compressor) {
      await next();
      return;
    }

    await next();
  };
}

function defaultFilter(req: IncomingMessage): boolean {
  const contentType = req.headers['content-type'] || '';
  
  if (contentType.includes('gzip') || contentType.includes('deflate') || contentType.includes('br')) {
    return false;
  }
  
  if (contentType.includes('image/') || contentType.includes('video/') || contentType.includes('audio/')) {
    return false;
  }
  
  return true;
}

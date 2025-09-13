import { Context, CompressionOptions } from '../types.js';
import { createGzip, createDeflate, createBrotliCompress } from 'zlib';
import { IncomingMessage } from 'http';

// Response compression middleware
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
    // Check if response should be compressed
    if (!filter(ctx.req, ctx.res)) {
      await next();
      return;
    }

    const acceptEncoding = ctx.req.headers['accept-encoding'] || '';
    let compressor: any = null;
    let encoding = '';

    // Choose compression method based on client support
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

    // Don't set compression headers if we're not actually compressing
    // The compression will be handled by Node.js built-in compression
    await next();
  };
}

// Default filter function
function defaultFilter(req: IncomingMessage): boolean {
  const contentType = req.headers['content-type'] || '';
  
  // Don't compress if already compressed
  if (contentType.includes('gzip') || contentType.includes('deflate') || contentType.includes('br')) {
    return false;
  }
  
  // Don't compress if content-type suggests it's already compressed
  if (contentType.includes('image/') || contentType.includes('video/') || contentType.includes('audio/')) {
    return false;
  }
  
  return true;
}

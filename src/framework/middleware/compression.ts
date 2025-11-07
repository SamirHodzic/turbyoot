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

    let responseBody: Buffer | null = null;
    let responseSent = false;
    let contentType: string | null = null;

    ctx.send = function(data: any) {
      if (responseSent || this.res.headersSent) return this;
      
      if (typeof data === 'string') {
        responseBody = Buffer.from(data, 'utf8');
        contentType = 'text/plain';
      } else if (Buffer.isBuffer(data)) {
        responseBody = data;
      } else {
        return this.json(data);
      }
      
      responseSent = true;
      return this;
    };

    ctx.json = function(data: any) {
      if (responseSent || this.res.headersSent) return this;
      
      const jsonString = JSON.stringify(data);
      responseBody = Buffer.from(jsonString, 'utf8');
      contentType = 'application/json';
      responseSent = true;
      return this;
    };

    await next();

    if (responseSent && responseBody) {
      const body: Buffer = responseBody;
      const bodyLength = body.length;
      
      if (bodyLength < threshold) {
        if (!ctx.res.headersSent) {
          if (contentType) {
            ctx.res.setHeader('Content-Type', contentType);
          }
          ctx.res.end(body);
        }
        return;
      }

      if (!ctx.res.headersSent) {
        if (contentType) {
          ctx.res.setHeader('Content-Type', contentType);
        }
        
        const existingVary = ctx.res.getHeader('Vary');
        const varyHeader = existingVary 
          ? `${existingVary}, Accept-Encoding`
          : 'Accept-Encoding';
        ctx.res.setHeader('Vary', varyHeader);
        ctx.res.setHeader('Content-Encoding', encoding);

        try {
          const compressed = await new Promise<Buffer>((resolve, reject) => {
            const compressedChunks: Buffer[] = [];
            
            compressor.on('data', (chunk: Buffer) => {
              compressedChunks.push(chunk);
            });
            
            compressor.on('end', () => {
              resolve(Buffer.concat(compressedChunks));
            });
            
            compressor.on('error', reject);
            
            compressor.write(body);
            compressor.end();
          });

          ctx.res.setHeader('Content-Length', compressed.length.toString());
          ctx.res.end(compressed);
        } catch {
          ctx.res.removeHeader('Content-Encoding');
          ctx.res.removeHeader('Vary');
          ctx.res.end(body);
        }
      }
    }
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

import { Context } from '../types.js';
import { randomBytes } from 'crypto';

export function requestId() {
  return async (ctx: Context, next: () => Promise<void>) => {
    const requestId = randomBytes(16).toString('hex');
    ctx.state.requestId = requestId;
    ctx.res.setHeader('X-Request-ID', requestId);
    await next();
  };
}

export function logger() {
  return async (ctx: Context, next: () => Promise<void>) => {
    const start = Date.now();
    let status = 200;

    try {
      await next();
      status = ctx.res.statusCode;
    } catch (err) {
      if (err instanceof Error && 'status' in err) {
        status = (err as any).status;
      } else {
        status = 500;
      }
      throw err;
    } finally {
      const ms = Date.now() - start;
      const requestId = ctx.state.requestId || 'unknown';
      console.log(`[${requestId}] ${ctx.req.method} ${ctx.req.url} -> ${status} ${ms}ms`);
    }
  };
}

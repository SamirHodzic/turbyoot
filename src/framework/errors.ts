import { Context, HttpError } from './types.js';

export function errorHandler() {
  return async (ctx: Context, next: () => Promise<void>) => {
    try {
      await next();
    } catch (err) {
      if (!ctx.res.headersSent) {
        if (err instanceof HttpError) {
          ctx.statusCode = err.status;
          ctx.res.statusCode = err.status;
          
          if (err.expose) {
            ctx.json({ error: err.message, status: err.status });
          } else {
            ctx.json({ error: 'Internal Server Error', status: 500 });
          }
        } else {
          console.error('Unhandled error:', err);
          ctx.statusCode = 500;
          ctx.res.statusCode = 500;
          ctx.json({ error: 'Internal Server Error', status: 500 });
        }
      } else {
        console.error('Error after response sent:', err);
      }
    }
  };
}

export { HttpError } from './types.js';

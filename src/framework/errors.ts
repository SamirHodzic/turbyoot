import { Context, HttpError } from './types.js';

// Error handling utilities
export function errorHandler() {
  return async (ctx: Context, next: () => Promise<void>) => {
    try {
      await next();
    } catch (err) {
      // Only send response if headers haven't been sent yet
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
        // If headers already sent, just log the error
        console.error('Error after response sent:', err);
      }
    }
  };
}

// Re-export HttpError from types for convenience
export { HttpError } from './types.js';

import { Context } from './types.js';

export class HttpError extends Error {
  status: number;
  expose: boolean;

  constructor(status: number, message: string, expose: boolean = true) {
    super(message);
    this.status = status;
    this.expose = expose;
    this.name = 'HttpError';
  }
}

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


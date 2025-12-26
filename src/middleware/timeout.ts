import { Context, TimeoutOptions } from '../types.js';
import { TimeoutError } from '../errors.js';

export function timeout(options: TimeoutOptions) {
  const { timeout: timeoutMs, onTimeout } = options;

  return async (ctx: Context, next: () => Promise<void>) => {
    let timeoutId: NodeJS.Timeout | null = null;
    let isTimedOut = false;

    timeoutId = setTimeout(() => {
      if (!isTimedOut && !ctx.res.headersSent) {
        isTimedOut = true;

        if (onTimeout) {
          onTimeout(ctx);
        }

        const error = new TimeoutError('Request timeout', timeoutMs);
        ctx.statusCode = error.status;
        ctx.res.statusCode = error.status;
        ctx.res.setHeader('Connection', 'close');
        ctx.json(error.toJSON());
      }
    }, timeoutMs);

    try {
      await next();
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  };
}

const socketTimeouts = new WeakMap();

export function keepAliveTimeout(timeout: number) {
  return async (ctx: Context, next: () => Promise<void>) => {
    const socket = ctx.req.socket;

    if (socket && !socket.destroyed) {
      if (!socketTimeouts.has(socket)) {
        socketTimeouts.set(socket, true);
        socket.setTimeout(timeout, () => {
          if (!socket.destroyed) {
            socket.destroy();
          }
        });
      }
    }

    await next();
  };
}

export function configureTimeouts(
  server: any,
  options: {
    keepAliveTimeout?: number;
    headersTimeout?: number;
    requestTimeout?: number;
  },
) {
  const { keepAliveTimeout = 5000, headersTimeout = 40000, requestTimeout = 30000 } = options;

  server.keepAliveTimeout = keepAliveTimeout;
  server.headersTimeout = headersTimeout;
  server.requestTimeout = requestTimeout;
}

import { Context, TimeoutOptions } from '../types.js';

// Request timeout middleware
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
        
        ctx.statusCode = 408;
        ctx.res.statusCode = 408;
        ctx.res.setHeader('Connection', 'close');
        ctx.json({ error: 'Request timeout', status: 408 });
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

// Keep-alive timeout middleware
const socketTimeouts = new WeakMap();

export function keepAliveTimeout(timeout: number) {
  return async (ctx: Context, next: () => Promise<void>) => {
    const socket = ctx.req.socket;
    
    if (socket && !socket.destroyed) {
      // Only set timeout if not already set for this socket
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

// Configure server timeouts
export function configureTimeouts(server: any, options: {
  keepAliveTimeout?: number;
  headersTimeout?: number;
  requestTimeout?: number;
}) {
  const {
    keepAliveTimeout = 5000,
    headersTimeout = 40000,
    requestTimeout = 30000
  } = options;

  server.keepAliveTimeout = keepAliveTimeout;
  server.headersTimeout = headersTimeout;
  server.requestTimeout = requestTimeout;
}

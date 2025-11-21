import { Context, Middleware, RouteHandler } from '../types.js';

export async function executeMiddlewareChain(
  ctx: Context,
  middleware: Middleware[],
  handler: RouteHandler,
): Promise<void> {
  if (middleware.length === 0) {
    await handler(ctx);
    return;
  }

  let index = 0;
  const chainLength = middleware.length;

  const next = async (): Promise<void> => {
    if (ctx.res.headersSent) {
      return;
    }

    if (index < chainLength) {
      const currentMiddleware = middleware[index++];
      await currentMiddleware(ctx, next);
    } else {
      await handler(ctx);
    }
  };

  await next();
}


import { Context, Middleware, RouteHandler, RouterOptions } from './types.js';

export class Router {
  private routes: Array<{ method: string; path: string; handler: RouteHandler; middleware?: Middleware[] }> = [];
  private prefix: string;
  private middleware: Middleware[];

  constructor(options: RouterOptions = {}) {
    this.prefix = options.prefix || '';
    this.middleware = options.middleware || [];
  }

  add(method: string, path: string, handler: RouteHandler, middleware?: Middleware[]): void {
    const fullPath = this.prefix + path;
    this.routes.push({ method, path: fullPath, handler, middleware });
  }

  get(path: string, handler: RouteHandler, middleware?: Middleware[]): void {
    this.add('GET', path, handler, middleware);
  }

  post(path: string, handler: RouteHandler, middleware?: Middleware[]): void {
    this.add('POST', path, handler, middleware);
  }

  put(path: string, handler: RouteHandler, middleware?: Middleware[]): void {
    this.add('PUT', path, handler, middleware);
  }

  del(path: string, handler: RouteHandler, middleware?: Middleware[]): void {
    this.add('DELETE', path, handler, middleware);
  }

  patch(path: string, handler: RouteHandler, middleware?: Middleware[]): void {
    this.add('PATCH', path, handler, middleware);
  }

  options(path: string, handler: RouteHandler, middleware?: Middleware[]): void {
    this.add('OPTIONS', path, handler, middleware);
  }

  head(path: string, handler: RouteHandler, middleware?: Middleware[]): void {
    this.add('HEAD', path, handler, middleware);
  }

  mount(app: any): void {
    for (const route of this.routes) {
      const allMiddleware = [
        ...this.middleware,
        ...(route.middleware || []),
      ];

      const createHandler = (): RouteHandler => {
        if (allMiddleware.length === 0) {
          return route.handler;
        }

        return async (ctx: Context) => {
          let middlewareIndex = 0;
          const executeMiddleware = async (): Promise<void> => {
            if (middlewareIndex < allMiddleware.length) {
              const middleware = allMiddleware[middlewareIndex++];
              await middleware(ctx, executeMiddleware);
            } else {
              await route.handler(ctx);
            }
          };
          await executeMiddleware();
        };
      };

      app.add(route.method, route.path, createHandler());
    }
  }
}

import { Context, Middleware, RouteHandler, RouterOptions } from './types.js';
import { compilePath, matchPath } from './utils/path.js';

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
      const compiledPath = compilePath(route.path);
      
      app.add(route.method, route.path, async (ctx: Context) => {
        for (const middleware of this.middleware) {
          await middleware(ctx, async () => {});
        }
        
        if (route.middleware) {
          for (const middleware of route.middleware) {
            await middleware(ctx, async () => {});
          }
        }
        
        await route.handler(ctx);
      });
    }
  }
}

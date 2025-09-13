import { Context, Middleware, RouteHandler, RouterOptions } from './types.js';
import { compilePath, matchPath } from './utils/path.js';

// Router class for route grouping
export class Router {
  private routes: Array<{ method: string; path: string; handler: RouteHandler; middleware?: Middleware[] }> = [];
  private prefix: string;
  private middleware: Middleware[];

  constructor(options: RouterOptions = {}) {
    this.prefix = options.prefix || '';
    this.middleware = options.middleware || [];
  }

  // Add route to router
  add(method: string, path: string, handler: RouteHandler, middleware?: Middleware[]): void {
    const fullPath = this.prefix + path;
    this.routes.push({ method, path: fullPath, handler, middleware });
  }

  // HTTP method shortcuts
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

  // Mount router on main app
  mount(app: any): void {
    for (const route of this.routes) {
      const compiledPath = compilePath(route.path);
      
      app.add(route.method, route.path, async (ctx: Context) => {
        // Apply router middleware
        for (const middleware of this.middleware) {
          await middleware(ctx, async () => {});
        }
        
        // Apply route-specific middleware
        if (route.middleware) {
          for (const middleware of route.middleware) {
            await middleware(ctx, async () => {});
          }
        }
        
        // Execute route handler
        await route.handler(ctx);
      });
    }
  }
}

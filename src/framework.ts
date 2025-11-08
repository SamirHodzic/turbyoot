import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Context, Middleware, RouteHandler, CompiledRoute, FluentRoute, ResourceOptions, Plugin } from './types.js';
import { createContext } from './context.js';
import { compilePath, matchPath } from './utils/path.js';
import { parseBody } from './utils/body.js';
import { parseQueryParams } from './utils/query.js';
import { errorHandler } from './errors.js';
import { FluentRouter, PluginManager } from './fluent.js';
import { serveStatic } from './middleware/static.js';
import { StaticOptions } from './types.js';

export class Turbyoot {
  private routes: CompiledRoute[] = [];
  private middleware: Middleware[] = [];
  private server: any = null;
  private pluginManager: PluginManager = new PluginManager();

  constructor() {
    this.use(errorHandler());
  }

  use(middleware: Middleware): void {
    this.middleware.push(middleware);
  }

  add(method: string, path: string, handlerOrMiddleware: RouteHandler | Middleware, finalHandler?: RouteHandler): void {
    const compiledPath = compilePath(path);
    const route: CompiledRoute = {
      method,
      path,
      regex: compiledPath.regex,
      paramNames: compiledPath.paramNames,
      handler: finalHandler || (handlerOrMiddleware as RouteHandler),
      middleware: finalHandler ? [handlerOrMiddleware as Middleware] : [],
    };

    this.routes.push(route);
  }

  get(path: string, handler: RouteHandler): void;
  get(path: string, middleware: Middleware, handler: RouteHandler): void;
  get(path: string, handlerOrMiddleware: RouteHandler | Middleware, finalHandler?: RouteHandler): void {
    this.add('GET', path, handlerOrMiddleware, finalHandler);
  }

  post(path: string, handler: RouteHandler): void;
  post(path: string, middleware: Middleware, handler: RouteHandler): void;
  post(path: string, handlerOrMiddleware: RouteHandler | Middleware, finalHandler?: RouteHandler): void {
    this.add('POST', path, handlerOrMiddleware, finalHandler);
  }

  put(path: string, handler: RouteHandler): void;
  put(path: string, middleware: Middleware, handler: RouteHandler): void;
  put(path: string, handlerOrMiddleware: RouteHandler | Middleware, finalHandler?: RouteHandler): void {
    this.add('PUT', path, handlerOrMiddleware, finalHandler);
  }

  del(path: string, handler: RouteHandler): void;
  del(path: string, middleware: Middleware, handler: RouteHandler): void;
  del(path: string, handlerOrMiddleware: RouteHandler | Middleware, finalHandler?: RouteHandler): void {
    this.add('DELETE', path, handlerOrMiddleware, finalHandler);
  }

  patch(path: string, handler: RouteHandler): void;
  patch(path: string, middleware: Middleware, handler: RouteHandler): void;
  patch(path: string, handlerOrMiddleware: RouteHandler | Middleware, finalHandler?: RouteHandler): void {
    this.add('PATCH', path, handlerOrMiddleware, finalHandler);
  }

  options(path: string, handler: RouteHandler): void;
  options(path: string, middleware: Middleware, handler: RouteHandler): void;
  options(path: string, handlerOrMiddleware: RouteHandler | Middleware, finalHandler?: RouteHandler): void {
    this.add('OPTIONS', path, handlerOrMiddleware, finalHandler);
  }

  head(path: string, handler: RouteHandler): void;
  head(path: string, middleware: Middleware, handler: RouteHandler): void;
  head(path: string, handlerOrMiddleware: RouteHandler | Middleware, finalHandler?: RouteHandler): void {
    this.add('HEAD', path, handlerOrMiddleware, finalHandler);
  }

  static(directory: string, options: StaticOptions = {}): Middleware {
    return serveStatic(directory, options);
  }

  healthCheck(
    checks: Array<{
      name: string;
      check: () => Promise<boolean> | boolean;
      timeout?: number;
    }> = [],
  ): RouteHandler {
    return async (ctx: Context) => {
      const startTime = Date.now();
      const results: Record<string, { status: 'pass' | 'fail'; responseTime?: number; error?: string }> = {};

      for (const check of checks) {
        const checkStart = Date.now();
        try {
          const timeout = check.timeout || 5000;
          const timeoutPromise = new Promise<boolean>((_, reject) => {
            setTimeout(() => reject(new Error('Check timeout')), timeout);
          });

          const result = await Promise.race([Promise.resolve(check.check()), timeoutPromise]);

          results[check.name] = {
            status: result ? 'pass' : 'fail',
            responseTime: Date.now() - checkStart,
          };
        } catch (error) {
          results[check.name] = {
            status: 'fail',
            responseTime: Date.now() - checkStart,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      }

      const allPassed = Object.values(results).every((result) => result.status === 'pass');
      const status = allPassed ? 'healthy' : 'unhealthy';

      ctx.statusCode = allPassed ? 200 : 503;
      ctx.res.statusCode = allPassed ? 200 : 503;
      ctx.json({
        status,
        timestamp: new Date().toISOString(),
        uptime: Date.now() - startTime,
        checks: results,
      });
    };
  }

  listen(port: number, callback?: () => void): void {
    this.server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const urlString = req.url || '/';
        const queryIndex = urlString.indexOf('?');
        const pathname = queryIndex === -1 ? urlString : urlString.slice(0, queryIndex);
        const queryString = queryIndex === -1 ? '' : urlString.slice(queryIndex + 1);
        const query = queryString ? parseQueryParams(queryString) : {};

        let body: any = null;
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
          const contentType = req.headers['content-type'] || '';
          // skip body parsing for multipart/form-data to allow streaming file uploads
          if (!contentType.includes('multipart/form-data')) {
            try {
              body = await parseBody(req);
            } catch (error) {
              console.error('Body parsing error:', error);
              body = null;
            }
          }
        }

        let matchedRoute: CompiledRoute | null = null;
        let params: Record<string, string> = {};
        const routesOnPath: CompiledRoute[] = [];

        for (const route of this.routes) {
          const match = matchPath(route, pathname);
          if (match.match) {
            routesOnPath.push(route);
            if (route.method === req.method) {
              matchedRoute = route;
              params = match.params;
              break;
            }
          }
        }

        if (req.method === 'OPTIONS' && !matchedRoute && routesOnPath.length > 0) {
          const routeMiddleware: Middleware[] = [];
          for (const route of routesOnPath) {
            if (route.middleware) {
              routeMiddleware.push(...route.middleware);
            }
          }

          matchedRoute = {
            method: 'OPTIONS',
            path: pathname,
            regex: new RegExp('^' + pathname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'),
            paramNames: [],
            handler: async () => {},
            middleware: routeMiddleware,
          };
        }

        const ctx = createContext(req, res, params, query, body);

        let middlewareIndex = 0;
        const executeMiddleware = async (): Promise<void> => {
          if (middlewareIndex < this.middleware.length) {
            const middleware = this.middleware[middlewareIndex++];
            await middleware(ctx, executeMiddleware);
          } else if (matchedRoute) {
            let routeMiddlewareIndex = 0;
            const executeRouteMiddleware = async (): Promise<void> => {
              if (routeMiddlewareIndex < (matchedRoute.middleware || []).length) {
                const middleware = matchedRoute.middleware![routeMiddlewareIndex++];
                await middleware(ctx, executeRouteMiddleware);
              } else {
                await matchedRoute.handler(ctx);
              }
            };
            await executeRouteMiddleware();
          } else {
            ctx.statusCode = 404;
            ctx.res.statusCode = 404;
            ctx.json({ error: 'Not Found', status: 404 });
          }
        };

        await executeMiddleware();
      } catch (error) {
        console.error('Server error:', error);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Internal Server Error', status: 500 }));
        }
      }
    });

    this.server.listen(port, callback);
  }

  close(): void {
    if (this.server) {
      this.server.close();
    }
  }

  route(): FluentRoute {
    const router = new FluentRouter(this);
    return router;
  }

  group(prefix: string, callback: (router: FluentRouter) => void): void {
    const router = new FluentRouter(this);

    const groupRouter = new FluentRouter(this);
    groupRouter.middleware = [...router.middleware];

    const originalMethods = ['get', 'post', 'put', 'del', 'patch', 'options', 'head'];
    for (const method of originalMethods) {
      const originalMethod = (groupRouter as any)[method];
      (groupRouter as any)[method] = (path: string, handler: RouteHandler) => {
        // const prefixedPath = path.startsWith('/') ? `${prefix}${path}` : `${prefix}/${path}`;
        const fPrefix = String(prefix).replace(/\/+$/, '');
        const fPath = String(path).replace(/^\/+/, '');
        const prefixedPath = fPath ? `${fPrefix}/${fPath}` : fPrefix || '/';
        return originalMethod.call(groupRouter, prefixedPath, handler);
      };
    }

    const originalResource = groupRouter.resource.bind(groupRouter);
    groupRouter.resource = (name: string, options: ResourceOptions = {}) => {
      const prefixedOptions = {
        ...options,
        prefix: options.prefix ? `${prefix}${options.prefix}` : prefix,
      };
      return originalResource(name, prefixedOptions);
    };

    const originalGroup = groupRouter.group.bind(groupRouter);
    groupRouter.group = (subPrefix: string, subCallback: (router: FluentRoute) => void) => {
      const fullPrefix = subPrefix.startsWith('/') ? `${prefix}${subPrefix}` : `${prefix}/${subPrefix}`;
      return originalGroup(fullPrefix, subCallback);
    };

    callback(groupRouter);

    const routes = groupRouter.getRoutes();

    for (const route of routes) {
      if (route.middleware.length > 0) {
        this.add(route.method, route.path, route.middleware[0], route.handler);
      } else {
        this.add(route.method, route.path, route.handler);
      }
    }
  }

  resource(name: string, options: ResourceOptions = {}): void {
    const router = new FluentRouter(this);
    router.resource(name, options);

    const routes = router.getRoutes();

    for (const route of routes) {
      if (route.middleware.length > 0) {
        this.add(route.method, route.path, route.middleware[0], route.handler);
      } else {
        this.add(route.method, route.path, route.handler);
      }
    }
  }

  plugin(plugin: Plugin): Turbyoot {
    this.pluginManager.register(plugin);
    this.pluginManager.install(this);
    return this;
  }
}

export * from './types.js';
export * from './context.js';
export * from './router.js';
export * from './errors.js';
export * from './utils/index.js';
export * from './middleware/index.js';

export * from './fluent.js';
export { EnhancedTurbyoot } from './fluent.js';

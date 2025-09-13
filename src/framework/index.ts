import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Context, Middleware, RouteHandler, CompiledRoute } from './types.js';
import { createContext } from './context.js';
import { compilePath, matchPath } from './utils/path.js';
import { parseBody } from './utils/body.js';
import { parseQueryParams } from './utils/query.js';
import { Router } from './router.js';
import { errorHandler, HttpError } from './errors.js';

// Main Turbyoot framework class
export class Turbyoot {
  private routes: CompiledRoute[] = [];
  private middleware: Middleware[] = [];
  private server: any = null;

  constructor() {
    // Add default error handler
    this.use(errorHandler());
  }

  // Add middleware
  use(middleware: Middleware): void {
    this.middleware.push(middleware);
  }

  // Add route
  add(method: string, path: string, handlerOrMiddleware: RouteHandler | Middleware, finalHandler?: RouteHandler): void {
    const compiledPath = compilePath(path);
    const route: CompiledRoute = {
      method,
      path,
      regex: compiledPath.regex,
      paramNames: compiledPath.paramNames,
      handler: finalHandler || (handlerOrMiddleware as RouteHandler),
      middleware: finalHandler ? [handlerOrMiddleware as Middleware] : []
    };
    
    this.routes.push(route);
  }

  // HTTP method shortcuts
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

  // Static file serving
  static(directory: string, options: { prefix?: string; maxAge?: number; etag?: boolean; lastModified?: boolean } = {}): Middleware {
    const { prefix = '/static', maxAge = 0, etag = true, lastModified = true } = options;
    
    return async (ctx: Context, next: () => Promise<void>) => {
      if (ctx.req.method !== 'GET' && ctx.req.method !== 'HEAD') {
        await next();
        return;
      }

      const url = ctx.req.url || '';
      if (!url.startsWith(prefix)) {
        await next();
        return;
      }

      const filePath = url.slice(prefix.length);
      if (filePath.includes('..') || filePath.includes('~')) {
        ctx.statusCode = 403;
        ctx.res.statusCode = 403;
        ctx.json({ error: 'Forbidden', status: 403 });
        return;
      }

      // This is a simplified static file serving
      // In a real implementation, you'd use fs and path modules
      ctx.statusCode = 404;
      ctx.res.statusCode = 404;
      ctx.json({ error: 'File not found', status: 404 });
    };
  }

  // Health check utility
  healthCheck(checks: Array<{ name: string; check: () => Promise<boolean> | boolean; timeout?: number }> = []): RouteHandler {
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

          const result = await Promise.race([
            Promise.resolve(check.check()),
            timeoutPromise
          ]);

          results[check.name] = {
            status: result ? 'pass' : 'fail',
            responseTime: Date.now() - checkStart
          };
        } catch (error) {
          results[check.name] = {
            status: 'fail',
            responseTime: Date.now() - checkStart,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }

      const allPassed = Object.values(results).every(result => result.status === 'pass');
      const status = allPassed ? 'healthy' : 'unhealthy';

      ctx.statusCode = allPassed ? 200 : 503;
      ctx.res.statusCode = allPassed ? 200 : 503;
      ctx.json({
        status,
        timestamp: new Date().toISOString(),
        uptime: Date.now() - startTime,
        checks: results
      });
    };
  }

  // Start server
  listen(port: number, callback?: () => void): void {
    this.server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      try {
        // Parse URL
        const url = new URL(req.url || '/', `http://${req.headers.host}`);
        const pathname = url.pathname;
        const query = parseQueryParams(url.search);

        // Parse body
        let body: any = null;
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
          try {
            body = await parseBody(req);
          } catch (error) {
            console.error('Body parsing error:', error);
            body = null;
          }
        }

        // Find matching route
        let matchedRoute: CompiledRoute | null = null;
        let params: Record<string, string> = {};

        for (const route of this.routes) {
          if (route.method === req.method) {
            const match = matchPath(route, pathname);
            if (match.match) {
              matchedRoute = route;
              params = match.params;
              break;
            }
          }
        }

        // Create context
        const ctx = createContext(req, res, params, query, body);

        // Execute middleware chain
        let middlewareIndex = 0;
        const executeMiddleware = async (): Promise<void> => {
          if (middlewareIndex < this.middleware.length) {
            const middleware = this.middleware[middlewareIndex++];
            await middleware(ctx, executeMiddleware);
          } else if (matchedRoute) {
            // Execute route-specific middleware
            let routeMiddlewareIndex = 0;
            const executeRouteMiddleware = async (): Promise<void> => {
              if (routeMiddlewareIndex < (matchedRoute.middleware || []).length) {
                const middleware = matchedRoute.middleware![routeMiddlewareIndex++];
                await middleware(ctx, executeRouteMiddleware);
              } else {
                // Execute route handler
                await matchedRoute.handler(ctx);
              }
            };
            await executeRouteMiddleware();
          } else {
            // No route found
            ctx.statusCode = 404;
            ctx.res.statusCode = 404;
            ctx.json({ error: 'Not Found', status: 404 });
          }
        };

        await executeMiddleware();
      } catch (error) {
        console.error('Server error:', error);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Internal Server Error', status: 500 }));
      }
    });

    this.server.listen(port, callback);
  }

  // Close server
  close(): void {
    if (this.server) {
      this.server.close();
    }
  }
}

// Standalone health check function
export function healthCheck(checks: Array<{ name: string; check: () => Promise<boolean> | boolean; timeout?: number }> = []) {
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

        const result = await Promise.race([
          Promise.resolve(check.check()),
          timeoutPromise
        ]);

        results[check.name] = {
          status: result ? 'pass' : 'fail',
          responseTime: Date.now() - checkStart
        };
      } catch (error) {
        results[check.name] = {
          status: 'fail',
          responseTime: Date.now() - checkStart,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    const allPassed = Object.values(results).every(result => result.status === 'pass');
    const status = allPassed ? 'healthy' : 'unhealthy';

    ctx.statusCode = allPassed ? 200 : 503;
    ctx.res.statusCode = allPassed ? 200 : 503;
    ctx.json({
      status,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - startTime,
      checks: results
    });
  };
}

// Export everything for backward compatibility
export * from './types.js';
export * from './context.js';
export * from './router.js';
export * from './errors.js';
export * from './utils/index.js';
export * from './middleware/index.js';

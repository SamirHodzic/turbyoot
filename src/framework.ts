import { createServer, IncomingMessage, ServerResponse, Server as HttpServer } from 'http';
import { createServer as createHttpsServer, ServerOptions as HttpsServerOptions, Server as HttpsServer } from 'https';
import { createServer as createHttp2Server, createSecureServer, Http2ServerRequest, Http2ServerResponse, Http2Server, Http2SecureServer } from 'http2';
import {
  Context,
  Middleware,
  RouteHandler,
  CompiledRoute,
  FluentRoute,
  ResourceOptions,
  Plugin,
  ServerOptions,
  BodyOptions,
  ViewOptions,
  BodyParser,
  GracefulShutdownOptions,
} from './types.js';
import { createContext } from './context.js';
import { compilePath } from './utils/path.js';
import { parseBody } from './utils/body.js';
import { parseQueryParams } from './utils/query.js';
import { sanitize } from './utils/sanitize.js';
import { errorHandler, PayloadTooLargeError, BadRequestError, AppError, ErrorCode, NotFoundError } from './errors.js';
import { FluentRouter, PluginManager } from './fluent.js';
import { serveStatic } from './middleware/static.js';
import { StaticOptions } from './types.js';
import { RouteTrie } from './utils/route-trie.js';
import { executeMiddlewareChain } from './utils/middleware-executor.js';
import { configureViews } from './utils/template.js';

export type ServerInstance = HttpServer | HttpsServer | Http2Server | Http2SecureServer;

export class Turbyoot {
  private routeTrie: RouteTrie = new RouteTrie();
  private middleware: Middleware[] = [];
  private server: ServerInstance | null = null;
  private pluginManager: PluginManager = new PluginManager();
  private bodyLimit: number = 1024 * 1024;
  private bodyParsers: Record<string, BodyParser> = {};

  constructor() {
    this.use(errorHandler());
  }

  configure(options: { body?: BodyOptions; views?: ViewOptions }): this {
    if (options.body?.limit !== undefined) {
      this.bodyLimit = options.body.limit;
    }
    if (options.body?.parsers) {
      this.bodyParsers = { ...this.bodyParsers, ...options.body.parsers };
    }
    if (options.views) {
      configureViews(options.views);
    }
    return this;
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

    this.routeTrie.add(route);
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

  private async handleRequest(
    req: IncomingMessage | Http2ServerRequest,
    res: ServerResponse | Http2ServerResponse,
  ): Promise<void> {
    try {
      const urlString = req.url || '/';
      const queryIndex = urlString.indexOf('?');
      const pathname = queryIndex === -1 ? urlString : urlString.slice(0, queryIndex);
      const queryString = queryIndex === -1 ? '' : urlString.slice(queryIndex + 1);
      const rawQuery = queryString ? parseQueryParams(queryString) : {};
      const query = sanitize(rawQuery);

      let body: any = null;
      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        const contentType = req.headers['content-type'] || '';
        if (!contentType.includes('multipart/form-data')) {
          try {
            const rawBody = await parseBody(req, { limit: this.bodyLimit, parsers: this.bodyParsers });
            body = sanitize(rawBody);
          } catch (error: any) {
            if (error?.message?.includes('exceeds limit')) {
              const payloadError = new PayloadTooLargeError('Request body exceeds size limit', {
                limit: this.bodyLimit,
              });
              res.statusCode = payloadError.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(payloadError.toJSON()));
              return;
            }
            if (error?.message?.includes('JSON') || error instanceof SyntaxError) {
              const jsonError = BadRequestError.invalidJson(error?.message);
              res.statusCode = jsonError.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(jsonError.toJSON()));
              return;
            }
            console.error('Body parsing error:', error);
            body = null;
          }
        }
      }

      const method = req.method || 'GET';
      const trieResult = this.routeTrie.find(method, pathname);
      let matchedRoute = trieResult.route;
      const params = trieResult.params;
      const routesOnPath = trieResult.routesOnPath;

      if (method === 'OPTIONS' && !matchedRoute && routesOnPath.length > 0) {
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

      const ctx = createContext(req as IncomingMessage, res as ServerResponse, params, query, body);

      if (matchedRoute) {
        const routeMiddleware = matchedRoute.middleware || [];
        await executeMiddlewareChain(ctx, [...this.middleware, ...routeMiddleware], matchedRoute.handler);
      } else {
        const notFoundHandler: RouteHandler = async () => {
          throw NotFoundError.route(pathname, method);
        };
        await executeMiddlewareChain(ctx, this.middleware, notFoundHandler);
      }
    } catch (error) {
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json');
        
        if (error instanceof AppError) {
          res.statusCode = error.status;
          if (error.expose) {
            res.end(JSON.stringify(error.toJSON()));
          } else {
            console.error('Internal error:', error);
            res.end(JSON.stringify({
              error: 'Internal Server Error',
              status: 500,
              code: ErrorCode.INTERNAL,
              timestamp: new Date().toISOString(),
            }));
          }
        } else {
          console.error('Unhandled error:', error);
          res.statusCode = 500;
          res.end(JSON.stringify({
            error: 'Internal Server Error',
            status: 500,
            code: ErrorCode.INTERNAL,
            timestamp: new Date().toISOString(),
          }));
        }
      } else {
        console.error('Error after headers sent:', error);
      }
    }
  }

  listen(port: number, callback?: () => void): ServerInstance;
  listen(port: number, options?: ServerOptions, callback?: () => void): ServerInstance;
  listen(port: number, optionsOrCallback?: ServerOptions | (() => void), callback?: () => void): ServerInstance {
    let options: ServerOptions | undefined;
    let cb: (() => void) | undefined;

    if (typeof optionsOrCallback === 'function') {
      cb = optionsOrCallback;
      options = undefined;
    } else {
      options = optionsOrCallback;
      cb = callback;
    }

    const protocol = options?.protocol || 'http';
    const host = options?.host;
    const listenOptions = {
      port,
      host,
      backlog: options?.backlog,
      exclusive: options?.exclusive,
      ipv6Only: options?.ipv6Only,
    };

    if (protocol === 'https') {
      if (!options?.https) {
        throw new Error('HTTPS options (key and cert) are required when using HTTPS protocol');
      }
      this.server = createHttpsServer(options.https as HttpsServerOptions, async (req, res) => {
        await this.handleRequest(req, res);
      });
    } else if (protocol === 'http2') {
      const http2Options: any = { ...options?.http2 };
      if (options?.https) {
        http2Options.key = options.https.key;
        http2Options.cert = options.https.cert;
        if (options.https.ca) http2Options.ca = options.https.ca;
        if (options.https.pfx) http2Options.pfx = options.https.pfx;
        if (options.https.passphrase) http2Options.passphrase = options.https.passphrase;
        this.server = createSecureServer(http2Options, async (req: Http2ServerRequest, res: Http2ServerResponse) => {
          await this.handleRequest(req, res);
        });
      } else {
        this.server = createHttp2Server(http2Options, async (req: Http2ServerRequest, res: Http2ServerResponse) => {
          await this.handleRequest(req, res);
        });
      }
    } else {
      this.server = createServer(async (req, res) => {
        await this.handleRequest(req, res);
      });
    }

    this.server.listen(listenOptions, cb);
    return this.server;
  }

  getServer(): ServerInstance | null {
    return this.server;
  }

  close(): void {
    if (this.server) {
      this.server.close();
    }
  }

  enableGracefulShutdown(options: GracefulShutdownOptions = {}): this {
    const { timeout = 30000, signals = ['SIGTERM', 'SIGINT'], onShutdown } = options;

    let isShuttingDown = false;

    const shutdown = async (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      console.log(`\nReceived ${signal}, starting graceful shutdown...`);

      const forceExitTimeout = setTimeout(() => {
        console.error('Graceful shutdown timed out, forcing exit');
        process.exit(1);
      }, timeout);

      try {
        if (this.server) {
          await new Promise<void>((resolve, reject) => {
            this.server!.close((err) => {
              if (err) reject(err);
              else resolve();
            });
          });
          console.log('Server closed, no longer accepting connections');
        }

        if (onShutdown) {
          await onShutdown();
          console.log('Cleanup completed');
        }

        clearTimeout(forceExitTimeout);
        console.log('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error);
        clearTimeout(forceExitTimeout);
        process.exit(1);
      }
    };

    for (const signal of signals) {
      process.on(signal, () => shutdown(signal));
    }

    return this;
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

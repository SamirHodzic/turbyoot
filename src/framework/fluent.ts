import { Context, Middleware, RouteHandler, FluentRoute, ResourceOptions } from './types.js';

// Fluent API implementation
export class FluentRouter implements FluentRoute {
  private app: any;
  public middleware: Middleware[] = [];
  private routes: Array<{
    method: string;
    path: string;
    handler: RouteHandler;
    middleware: Middleware[];
  }> = [];

  constructor(app: any) {
    this.app = app;
  }

  get(path: string, handler: RouteHandler): FluentRoute {
    const route = {
      method: 'GET',
      path,
      handler,
      middleware: [...this.middleware],
    };
    this.routes.push(route);

    // Automatically register with the app
    if (this.middleware.length > 0) {
      this.app.get(path, this.middleware[0], handler);
    } else {
      this.app.get(path, handler);
    }

    return this;
  }

  post(path: string, handler: RouteHandler): FluentRoute {
    const route = {
      method: 'POST',
      path,
      handler,
      middleware: [...this.middleware],
    };
    this.routes.push(route);

    if (this.middleware.length > 0) {
      this.app.post(path, this.middleware[0], handler);
    } else {
      this.app.post(path, handler);
    }

    return this;
  }

  put(path: string, handler: RouteHandler): FluentRoute {
    const route = {
      method: 'PUT',
      path,
      handler,
      middleware: [...this.middleware],
    };
    this.routes.push(route);

    if (this.middleware.length > 0) {
      this.app.put(path, this.middleware[0], handler);
    } else {
      this.app.put(path, handler);
    }

    return this;
  }

  del(path: string, handler: RouteHandler): FluentRoute {
    const route = {
      method: 'DELETE',
      path,
      handler,
      middleware: [...this.middleware],
    };
    this.routes.push(route);

    if (this.middleware.length > 0) {
      this.app.del(path, this.middleware[0], handler);
    } else {
      this.app.del(path, handler);
    }

    return this;
  }

  patch(path: string, handler: RouteHandler): FluentRoute {
    const route = {
      method: 'PATCH',
      path,
      handler,
      middleware: [...this.middleware],
    };
    this.routes.push(route);

    if (this.middleware.length > 0) {
      this.app.patch(path, this.middleware[0], handler);
    } else {
      this.app.patch(path, handler);
    }

    return this;
  }

  options(path: string, handler: RouteHandler): FluentRoute {
    const route = {
      method: 'OPTIONS',
      path,
      handler,
      middleware: [...this.middleware],
    };
    this.routes.push(route);

    if (this.middleware.length > 0) {
      this.app.options(path, this.middleware[0], handler);
    } else {
      this.app.options(path, handler);
    }

    return this;
  }

  head(path: string, handler: RouteHandler): FluentRoute {
    const route = {
      method: 'HEAD',
      path,
      handler,
      middleware: [...this.middleware],
    };
    this.routes.push(route);

    if (this.middleware.length > 0) {
      this.app.head(path, this.middleware[0], handler);
    } else {
      this.app.head(path, handler);
    }

    return this;
  }

  use(middleware: Middleware): FluentRoute {
    this.middleware.push(middleware);
    return this;
  }

  resource(name: string, options: ResourceOptions = {}): FluentRoute {
    const { only = [], except = [], middleware: resourceMiddleware = [], prefix = '', handlers = {} } = options;
    const basePath = prefix ? `${prefix}/${name}` : name;

    // Define standard REST routes
    const routes = [
      {
        method: 'GET',
        path: basePath.startsWith('/') ? basePath : `/${basePath}`,
        handler: 'index',
        name: 'index',
      },
      {
        method: 'GET',
        path: basePath.startsWith('/') ? `${basePath}/:id` : `/${basePath}/:id`,
        handler: 'show',
        name: 'show',
      },
      {
        method: 'POST',
        path: basePath.startsWith('/') ? basePath : `/${basePath}`,
        handler: 'create',
        name: 'create',
      },
      {
        method: 'PUT',
        path: basePath.startsWith('/') ? `${basePath}/:id` : `/${basePath}/:id`,
        handler: 'update',
        name: 'update',
      },
      {
        method: 'PATCH',
        path: basePath.startsWith('/') ? `${basePath}/:id` : `/${basePath}/:id`,
        handler: 'patch',
        name: 'patch',
      },
      {
        method: 'DELETE',
        path: basePath.startsWith('/') ? `${basePath}/:id` : `/${basePath}/:id`,
        handler: 'destroy',
        name: 'destroy',
      },
    ];

    // Filter routes based on only/except options
    const filteredRoutes = routes.filter((route) => {
      if (only.length > 0) return only.includes(route.name);
      if (except.length > 0) return !except.includes(route.name);
      return true;
    });

    // Store routes instead of immediately adding them
    for (const route of filteredRoutes) {
      const allMiddleware = [...this.middleware, ...resourceMiddleware];

      // Use custom handler if provided, otherwise use default REST handlers
      const customHandler = handlers[route.handler as keyof typeof handlers];
      const handler =
        customHandler ||
        ((ctx: Context) => {
          switch (route.handler) {
            case 'index':
              ctx.ok({ [name]: [] });
              break;
            case 'show':
              ctx.ok({ [name.slice(0, -1)]: { id: ctx.params.id } });
              break;
            case 'create':
              ctx.created({ [name.slice(0, -1)]: { id: 1, ...ctx.body } });
              break;
            case 'update':
              ctx.ok({
                [name.slice(0, -1)]: { id: ctx.params.id, ...ctx.body },
              });
              break;
            case 'patch':
              ctx.ok({
                [name.slice(0, -1)]: { id: ctx.params.id, ...ctx.body },
              });
              break;
            case 'destroy':
              ctx.noContent();
              break;
            default:
              ctx.ok({ message: 'Resource handler not implemented' });
          }
        });

      this.routes.push({
        method: route.method,
        path: route.path,
        handler,
        middleware: allMiddleware,
      });
    }

    return this;
  }

  group(prefix: string, callback: (router: FluentRoute) => void): FluentRoute {
    const groupRouter = new FluentRouter(this.app);
    groupRouter.middleware = [...this.middleware];

    // Apply prefix to all routes in the group
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

    // Also handle resource method
    const originalResource = groupRouter.resource.bind(groupRouter);
    groupRouter.resource = (name: string, options: ResourceOptions = {}) => {
      const prefixedOptions = {
        ...options,
        prefix: options.prefix ? `${prefix}${options.prefix}` : prefix,
      };
      return originalResource(name, prefixedOptions);
    };

    callback(groupRouter);

    // Add all routes from the group router to this router
    this.routes.push(...groupRouter.getRoutes());

    return this;
  }

  // Get all routes for external processing
  getRoutes() {
    return this.routes;
  }
}

// Resource-based routing helper
export function createResource(name: string, options: ResourceOptions = {}) {
  return (app: any) => {
    const router = new FluentRouter(app);
    return router.resource(name, options);
  };
}

// Plugin system
export class PluginManager {
  private plugins: Map<string, any> = new Map();

  register(plugin: any) {
    this.plugins.set(plugin.name, plugin);
  }

  install(app: any) {
    for (const plugin of this.plugins.values()) {
      if (typeof plugin.install === 'function') {
        plugin.install(app);
      }
    }
  }
}

// Enhanced Turbyoot with fluent API
export class EnhancedTurbyoot {
  private app: any;
  private pluginManager = new PluginManager();

  constructor(app?: any) {
    // Accept an existing app instance or create a new one
    if (app) {
      this.app = app;
    } else {
      // We'll need to initialize this in the enhanced-server
      this.app = null;
    }
  }

  // Method to set the app instance (used by enhanced-server)
  setApp(app: any) {
    this.app = app;
  }

  // Delegate all Turbyoot methods to the internal app
  use(middleware: Middleware): EnhancedTurbyoot {
    this.app.use(middleware);
    return this;
  }

  get(path: string, handler: RouteHandler): EnhancedTurbyoot;
  get(path: string, middleware: Middleware, handler: RouteHandler): EnhancedTurbyoot;
  get(path: string, handlerOrMiddleware: RouteHandler | Middleware, finalHandler?: RouteHandler): EnhancedTurbyoot {
    this.app.get(path, handlerOrMiddleware as any, finalHandler);
    return this;
  }

  post(path: string, handler: RouteHandler): EnhancedTurbyoot;
  post(path: string, middleware: Middleware, handler: RouteHandler): EnhancedTurbyoot;
  post(path: string, handlerOrMiddleware: RouteHandler | Middleware, finalHandler?: RouteHandler): EnhancedTurbyoot {
    this.app.post(path, handlerOrMiddleware as any, finalHandler);
    return this;
  }

  put(path: string, handler: RouteHandler): EnhancedTurbyoot;
  put(path: string, middleware: Middleware, handler: RouteHandler): EnhancedTurbyoot;
  put(path: string, handlerOrMiddleware: RouteHandler | Middleware, finalHandler?: RouteHandler): EnhancedTurbyoot {
    this.app.put(path, handlerOrMiddleware as any, finalHandler);
    return this;
  }

  del(path: string, handler: RouteHandler): EnhancedTurbyoot;
  del(path: string, middleware: Middleware, handler: RouteHandler): EnhancedTurbyoot;
  del(path: string, handlerOrMiddleware: RouteHandler | Middleware, finalHandler?: RouteHandler): EnhancedTurbyoot {
    this.app.del(path, handlerOrMiddleware as any, finalHandler);
    return this;
  }

  patch(path: string, handler: RouteHandler): EnhancedTurbyoot;
  patch(path: string, middleware: Middleware, handler: RouteHandler): EnhancedTurbyoot;
  patch(path: string, handlerOrMiddleware: RouteHandler | Middleware, finalHandler?: RouteHandler): EnhancedTurbyoot {
    this.app.patch(path, handlerOrMiddleware as any, finalHandler);
    return this;
  }

  options(path: string, handler: RouteHandler): EnhancedTurbyoot;
  options(path: string, middleware: Middleware, handler: RouteHandler): EnhancedTurbyoot;
  options(path: string, handlerOrMiddleware: RouteHandler | Middleware, finalHandler?: RouteHandler): EnhancedTurbyoot {
    this.app.options(path, handlerOrMiddleware as any, finalHandler);
    return this;
  }

  head(path: string, handler: RouteHandler): EnhancedTurbyoot;
  head(path: string, middleware: Middleware, handler: RouteHandler): EnhancedTurbyoot;
  head(path: string, handlerOrMiddleware: RouteHandler | Middleware, finalHandler?: RouteHandler): EnhancedTurbyoot {
    this.app.head(path, handlerOrMiddleware as any, finalHandler);
    return this;
  }

  healthCheck(
    checks: Array<{
      name: string;
      check: () => Promise<boolean> | boolean;
      timeout?: number;
    }> = [],
  ) {
    return this.app.healthCheck(checks);
  }

  listen(port: number, callback?: () => void): void {
    this.pluginManager.install(this);
    this.app.listen(port, callback);
  }

  close(): void {
    this.app.close();
  }

  // Fluent API entry point
  route(): FluentRoute {
    return new FluentRouter(this.app);
  }

  // Resource-based routing
  resource(name: string, options: ResourceOptions = {}): FluentRoute {
    const router = new FluentRouter(this.app);
    router.resource(name, options);
    return router;
  }

  // Group routing
  group(prefix: string, callback: (router: FluentRoute) => void): void {
    const router = new FluentRouter(this.app);
    callback(router.group(prefix, callback));
  }

  // Plugin system
  plugin(plugin: any): EnhancedTurbyoot {
    this.pluginManager.register(plugin);
    return this;
  }
}

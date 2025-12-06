import { Context, Middleware, RouteHandler, FluentRoute, ResourceOptions } from './types.js';
import type { ServerInstance } from './framework.js';

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
    const normalizedPrefix = prefix.replace(/\/+$/, '');
    const normalizedName = name.replace(/^\/+/, '');
    const basePath = normalizedPrefix ? `${normalizedPrefix}/${normalizedName}` : normalizedName;
    const normalizedBasePath = basePath.replace(/\/+/g, '/');

    const routes = [
      {
        method: 'GET',
        path: normalizedBasePath.startsWith('/') ? normalizedBasePath : `/${normalizedBasePath}`,
        handler: 'index',
        name: 'index',
      },
      {
        method: 'GET',
        path: normalizedBasePath.startsWith('/') ? `${normalizedBasePath}/:id` : `/${normalizedBasePath}/:id`,
        handler: 'show',
        name: 'show',
      },
      {
        method: 'POST',
        path: normalizedBasePath.startsWith('/') ? normalizedBasePath : `/${normalizedBasePath}`,
        handler: 'create',
        name: 'create',
      },
      {
        method: 'PUT',
        path: normalizedBasePath.startsWith('/') ? `${normalizedBasePath}/:id` : `/${normalizedBasePath}/:id`,
        handler: 'update',
        name: 'update',
      },
      {
        method: 'PATCH',
        path: normalizedBasePath.startsWith('/') ? `${normalizedBasePath}/:id` : `/${normalizedBasePath}/:id`,
        handler: 'patch',
        name: 'patch',
      },
      {
        method: 'DELETE',
        path: normalizedBasePath.startsWith('/') ? `${normalizedBasePath}/:id` : `/${normalizedBasePath}/:id`,
        handler: 'destroy',
        name: 'destroy',
      },
    ];

    const filteredRoutes = routes.filter((route) => {
      if (only.length > 0) return only.includes(route.name);
      if (except.length > 0) return !except.includes(route.name);
      
      const hasHandlers = Object.keys(handlers).length > 0;
      if (hasHandlers) {
        return route.handler in handlers;
      }
      
      return true;
    });

    for (const route of filteredRoutes) {
      const allMiddleware = [...this.middleware, ...resourceMiddleware];

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
              ctx.notImplemented('Resource handler not implemented');
          }
        });

      this.routes.push({
        method: route.method,
        path: route.path,
        handler,
        middleware: allMiddleware,
      });

      const methodMap: Record<string, string> = {
        'GET': 'get',
        'POST': 'post',
        'PUT': 'put',
        'PATCH': 'patch',
        'DELETE': 'del',
      };
      const methodName = methodMap[route.method] || route.method.toLowerCase();
      
      if (allMiddleware.length > 0) {
        (this.app as any)[methodName](route.path, allMiddleware[0], handler);
      } else {
        (this.app as any)[methodName](route.path, handler);
      }
    }

    return this;
  }

  group(prefix: string, callback: (router: FluentRoute) => void): FluentRoute {
    const groupRouter = new FluentRouter(this.app);
    groupRouter.middleware = [...this.middleware];

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
      const normalizedPrefix = prefix.replace(/\/+$/, '');
      const existingPrefix = options.prefix ? options.prefix.replace(/^\/+/, '') : '';
      const combinedPrefix = existingPrefix ? `${normalizedPrefix}/${existingPrefix}` : normalizedPrefix;
      const prefixedOptions = {
        ...options,
        prefix: combinedPrefix,
      };
      return originalResource(name, prefixedOptions);
    };

    const originalGroup = groupRouter.group.bind(groupRouter);
    groupRouter.group = (subPrefix: string, subCallback: (router: FluentRoute) => void) => {
      const fullPrefix = subPrefix.startsWith('/') ? `${prefix}${subPrefix}` : `${prefix}/${subPrefix}`;
      return originalGroup(fullPrefix, subCallback);
    };

    callback(groupRouter);

    return this;
  }

  getRoutes() {
    return this.routes;
  }
}

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

export class EnhancedTurbyoot {
  private app: any;
  private pluginManager = new PluginManager();

  constructor(app?: any) {
    if (app) {
      this.app = app;
    } else {
      this.app = null;
    }
  }

  setApp(app: any) {
    this.app = app;
  }

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

  listen(port: number, callback?: () => void): ServerInstance;
  listen(port: number, options?: any, callback?: () => void): ServerInstance;
  listen(port: number, optionsOrCallback?: any, callback?: () => void): ServerInstance {
    this.pluginManager.install(this);
    if (typeof optionsOrCallback === 'function') {
      return this.app.listen(port, optionsOrCallback);
    } else {
      return this.app.listen(port, optionsOrCallback, callback);
    }
  }

  getServer(): ServerInstance | null {
    return this.app.getServer();
  }

  close(): void {
    this.app.close();
  }

  route(): FluentRoute {
    return new FluentRouter(this.app);
  }

  resource(name: string, options: ResourceOptions = {}): FluentRoute {
    const router = new FluentRouter(this.app);
    router.resource(name, options);
    return router;
  }

  group(prefix: string, callback: (router: FluentRoute) => void): void {
    const router = new FluentRouter(this.app);
    router.group(prefix, callback);
  }

  plugin(plugin: any): EnhancedTurbyoot {
    this.pluginManager.register(plugin);
    return this;
  }
}

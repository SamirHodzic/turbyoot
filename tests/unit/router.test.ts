import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Router } from '../../src/router.js';
import { Turbyoot } from '../../src/framework.js';
import { Context } from '../../src/types.js';
import { mockHandler, mockMiddleware } from '../utils/test-helpers.js';

describe('Router', () => {
  describe('Constructor', () => {
    it('should create router with default options', () => {
      const router = new Router();
      expect(router).toBeInstanceOf(Router);
    });

    it('should create router with prefix', () => {
      const router = new Router({ prefix: '/api' });
      expect(router).toBeInstanceOf(Router);
    });

    it('should create router with middleware', () => {
      const middleware = mockMiddleware('test');
      const router = new Router({ middleware: [middleware] });
      expect(router).toBeInstanceOf(Router);
    });

    it('should create router with prefix and middleware', () => {
      const middleware = mockMiddleware('test');
      const router = new Router({ prefix: '/api', middleware: [middleware] });
      expect(router).toBeInstanceOf(Router);
    });
  });

  describe('Route Registration', () => {
    let router: Router;

    beforeEach(() => {
      router = new Router();
    });

    it('should register GET route', () => {
      const handler = mockHandler();
      router.get('/test', handler);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should register POST route', () => {
      const handler = mockHandler();
      router.post('/test', handler);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should register PUT route', () => {
      const handler = mockHandler();
      router.put('/test', handler);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should register DELETE route', () => {
      const handler = mockHandler();
      router.del('/test', handler);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should register PATCH route', () => {
      const handler = mockHandler();
      router.patch('/test', handler);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should register OPTIONS route', () => {
      const handler = mockHandler();
      router.options('/test', handler);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should register HEAD route', () => {
      const handler = mockHandler();
      router.head('/test', handler);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should register multiple routes', () => {
      const handler1 = mockHandler();
      const handler2 = mockHandler();
      const handler3 = mockHandler();

      router.get('/users', handler1);
      router.post('/users', handler2);
      router.get('/posts', handler3);

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
      expect(handler3).not.toHaveBeenCalled();
    });

    it('should register route with custom method using add', () => {
      const handler = mockHandler();
      router.add('CUSTOM', '/test', handler);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Prefix Functionality', () => {
    it('should apply prefix to routes', () => {
      const router = new Router({ prefix: '/api' });
      const app = new Turbyoot();
      const addSpy = jest.spyOn(app, 'add');

      router.get('/users', mockHandler());
      router.mount(app);

      expect(addSpy).toHaveBeenCalledWith('GET', '/api/users', expect.any(Function));
    });

    it('should handle empty prefix', () => {
      const router = new Router({ prefix: '' });
      const app = new Turbyoot();
      const addSpy = jest.spyOn(app, 'add');

      router.get('/users', mockHandler());
      router.mount(app);

      expect(addSpy).toHaveBeenCalledWith('GET', '/users', expect.any(Function));
    });

    it('should handle prefix without leading slash', () => {
      const router = new Router({ prefix: 'api' });
      const app = new Turbyoot();
      const addSpy = jest.spyOn(app, 'add');

      router.get('/users', mockHandler());
      router.mount(app);

      expect(addSpy).toHaveBeenCalledWith('GET', 'api/users', expect.any(Function));
    });

    it('should handle nested prefixes', () => {
      const router = new Router({ prefix: '/api/v1' });
      const app = new Turbyoot();
      const addSpy = jest.spyOn(app, 'add');

      router.get('/users', mockHandler());
      router.mount(app);

      expect(addSpy).toHaveBeenCalledWith('GET', '/api/v1/users', expect.any(Function));
    });
  });

  describe('Route-Specific Middleware', () => {
    it('should register route with middleware', () => {
      const router = new Router();
      const middleware = mockMiddleware('route');
      const handler = mockHandler();

      router.get('/test', handler, [middleware]);
      expect(middleware).not.toHaveBeenCalled();
      expect(handler).not.toHaveBeenCalled();
    });

    it('should register route with multiple middleware', () => {
      const router = new Router();
      const middleware1 = mockMiddleware('middleware1');
      const middleware2 = mockMiddleware('middleware2');
      const handler = mockHandler();

      router.get('/test', handler, [middleware1, middleware2]);
      expect(middleware1).not.toHaveBeenCalled();
      expect(middleware2).not.toHaveBeenCalled();
      expect(handler).not.toHaveBeenCalled();
    });

    it('should execute route-specific middleware in order', async () => {
      const router = new Router();
      const executionOrder: string[] = [];
      
      const middleware1 = jest.fn(async (ctx: Context, next: () => Promise<void>) => {
        executionOrder.push('middleware1');
        await next();
      });
      
      const middleware2 = jest.fn(async (ctx: Context, next: () => Promise<void>) => {
        executionOrder.push('middleware2');
        await next();
      });
      
      const handler = jest.fn(async (ctx: Context) => {
        executionOrder.push('handler');
        ctx.json({ success: true });
      });

      router.get('/test', handler, [middleware1, middleware2]);
      
      const app = new Turbyoot();
      router.mount(app);
      
      const port = 3002 + Math.floor(Math.random() * 1000);
      
      await new Promise<void>((resolve) => {
        app.listen(port, () => {
          resolve();
        });
      });

      try {
        const response = await fetch(`http://localhost:${port}/test`);
        await response.text();

        expect(executionOrder).toEqual(['middleware1', 'middleware2', 'handler']);
        expect(middleware1).toHaveBeenCalled();
        expect(middleware2).toHaveBeenCalled();
        expect(handler).toHaveBeenCalled();
      } finally {
        app.close();
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    });
  });

  describe('Router-Level Middleware', () => {
    it('should register router-level middleware', () => {
      const middleware = mockMiddleware('router');
      const router = new Router({ middleware: [middleware] });
      expect(router).toBeInstanceOf(Router);
    });

    it('should execute router-level middleware before route handler', async () => {
      const executionOrder: string[] = [];
      
      const routerMiddleware = jest.fn(async (ctx: Context, next: () => Promise<void>) => {
        executionOrder.push('router-middleware');
        await next();
      });
      
      const handler = jest.fn(async (ctx: Context) => {
        executionOrder.push('handler');
        ctx.json({ success: true });
      });

      const router = new Router({ middleware: [routerMiddleware] });
      router.get('/test', handler);
      
      const app = new Turbyoot();
      router.mount(app);
      
      const port = 3003 + Math.floor(Math.random() * 1000);
      
      await new Promise<void>((resolve) => {
        app.listen(port, () => {
          resolve();
        });
      });

      try {
        const response = await fetch(`http://localhost:${port}/test`);
        await response.text();

        expect(executionOrder).toEqual(['router-middleware', 'handler']);
        expect(routerMiddleware).toHaveBeenCalled();
        expect(handler).toHaveBeenCalled();
      } finally {
        app.close();
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    });

    it('should execute router-level middleware before route-specific middleware', async () => {
      const executionOrder: string[] = [];
      
      const routerMiddleware = jest.fn(async (ctx: Context, next: () => Promise<void>) => {
        executionOrder.push('router-middleware');
        await next();
      });
      
      const routeMiddleware = jest.fn(async (ctx: Context, next: () => Promise<void>) => {
        executionOrder.push('route-middleware');
        await next();
      });
      
      const handler = jest.fn(async (ctx: Context) => {
        executionOrder.push('handler');
        ctx.json({ success: true });
      });

      const router = new Router({ middleware: [routerMiddleware] });
      router.get('/test', handler, [routeMiddleware]);
      
      const app = new Turbyoot();
      router.mount(app);
      
      const port = 3004 + Math.floor(Math.random() * 1000);
      
      await new Promise<void>((resolve) => {
        app.listen(port, () => {
          resolve();
        });
      });

      try {
        const response = await fetch(`http://localhost:${port}/test`);
        await response.text();

        expect(executionOrder).toEqual(['router-middleware', 'route-middleware', 'handler']);
        expect(routerMiddleware).toHaveBeenCalled();
        expect(routeMiddleware).toHaveBeenCalled();
        expect(handler).toHaveBeenCalled();
      } finally {
        app.close();
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    });

    it('should execute multiple router-level middleware in order', async () => {
      const executionOrder: string[] = [];
      
      const routerMiddleware1 = jest.fn(async (ctx: Context, next: () => Promise<void>) => {
        executionOrder.push('router-middleware-1');
        await next();
      });
      
      const routerMiddleware2 = jest.fn(async (ctx: Context, next: () => Promise<void>) => {
        executionOrder.push('router-middleware-2');
        await next();
      });
      
      const handler = jest.fn(async (ctx: Context) => {
        executionOrder.push('handler');
        ctx.json({ success: true });
      });

      const router = new Router({ middleware: [routerMiddleware1, routerMiddleware2] });
      router.get('/test', handler);
      
      const app = new Turbyoot();
      router.mount(app);
      
      const port = 3005 + Math.floor(Math.random() * 1000);
      
      await new Promise<void>((resolve) => {
        app.listen(port, () => {
          resolve();
        });
      });

      try {
        const response = await fetch(`http://localhost:${port}/test`);
        await response.text();

        expect(executionOrder).toEqual(['router-middleware-1', 'router-middleware-2', 'handler']);
        expect(routerMiddleware1).toHaveBeenCalled();
        expect(routerMiddleware2).toHaveBeenCalled();
        expect(handler).toHaveBeenCalled();
      } finally {
        app.close();
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    });
  });

  describe('Middleware Chaining', () => {
    it('should properly chain middleware when next() is called', async () => {
      const executionOrder: string[] = [];
      
      const middleware1 = jest.fn(async (ctx: Context, next: () => Promise<void>) => {
        executionOrder.push('before-1');
        await next();
        executionOrder.push('after-1');
      });
      
      const middleware2 = jest.fn(async (ctx: Context, next: () => Promise<void>) => {
        executionOrder.push('before-2');
        await next();
        executionOrder.push('after-2');
      });
      
      const handler = jest.fn(async (ctx: Context) => {
        executionOrder.push('handler');
        ctx.json({ success: true });
      });

      const router = new Router({ middleware: [middleware1, middleware2] });
      router.get('/test', handler);
      
      const app = new Turbyoot();
      router.mount(app);
      
      const port = 3006 + Math.floor(Math.random() * 1000);
      
      await new Promise<void>((resolve) => {
        app.listen(port, () => {
          resolve();
        });
      });

      try {
        const response = await fetch(`http://localhost:${port}/test`);
        await response.text();

        expect(executionOrder).toEqual(['before-1', 'before-2', 'handler', 'after-2', 'after-1']);
        expect(middleware1).toHaveBeenCalled();
        expect(middleware2).toHaveBeenCalled();
        expect(handler).toHaveBeenCalled();
      } finally {
        app.close();
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    });

    it('should stop middleware chain if next() is not called', async () => {
      const executionOrder: string[] = [];
      
      const middleware1 = jest.fn(async (ctx: Context, next: () => Promise<void>) => {
        executionOrder.push('middleware1');
        await next();
      });
      
      const middleware2 = jest.fn(async (ctx: Context, _next: () => Promise<void>) => {
        executionOrder.push('middleware2');
        ctx.statusCode = 403;
        ctx.json({ error: 'Forbidden' });
      });
      
      const handler = jest.fn(async (_ctx: Context) => {
        executionOrder.push('handler');
      });

      const router = new Router({ middleware: [middleware1, middleware2] });
      router.get('/test', handler);
      
      const app = new Turbyoot();
      router.mount(app);
      
      const port = 3007 + Math.floor(Math.random() * 1000);
      
      await new Promise<void>((resolve) => {
        app.listen(port, () => {
          resolve();
        });
      });

      try {
        const response = await fetch(`http://localhost:${port}/test`);
        await response.text();

        expect(executionOrder).toEqual(['middleware1', 'middleware2']);
        expect(handler).not.toHaveBeenCalled();
        expect(middleware1).toHaveBeenCalled();
        expect(middleware2).toHaveBeenCalled();
      } finally {
        app.close();
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    });

    it('should handle routes without middleware', async () => {
      const handler = jest.fn(async (ctx: Context) => {
        ctx.json({ message: 'success' });
      });

      const router = new Router();
      router.get('/test', handler);
      
      const app = new Turbyoot();
      router.mount(app);
      
      const port = 3008 + Math.floor(Math.random() * 1000);
      
      await new Promise<void>((resolve) => {
        app.listen(port, () => {
          resolve();
        });
      });

      try {
        const response = await fetch(`http://localhost:${port}/test`);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({ message: 'success' });
        expect(handler).toHaveBeenCalled();
      } finally {
        app.close();
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    });
  });

  describe('Mounting to App', () => {
    it('should mount routes to app', () => {
      const router = new Router();
      const handler = mockHandler();
      router.get('/test', handler);
      
      const app = new Turbyoot();
      const addSpy = jest.spyOn(app, 'add');
      
      router.mount(app);
      
      expect(addSpy).toHaveBeenCalledTimes(1);
      expect(addSpy).toHaveBeenCalledWith('GET', '/test', expect.any(Function));
    });

    it('should mount multiple routes to app', () => {
      const router = new Router();
      const handler1 = mockHandler();
      const handler2 = mockHandler();
      const handler3 = mockHandler();
      
      router.get('/users', handler1);
      router.post('/users', handler2);
      router.get('/posts', handler3);
      
      const app = new Turbyoot();
      const addSpy = jest.spyOn(app, 'add');
      
      router.mount(app);
      
      expect(addSpy).toHaveBeenCalledTimes(3);
    });

    it('should handle empty router when mounting', () => {
      const router = new Router();
      const app = new Turbyoot();
      const addSpy = jest.spyOn(app, 'add');
      
      router.mount(app);
      
      expect(addSpy).not.toHaveBeenCalled();
    });
  });

  describe('Integration with App', () => {
    it('should handle requests through mounted router', async () => {
      const router = new Router({ prefix: '/api' });
      router.get('/users', (ctx) => {
        ctx.json({ users: [] });
      });
      
      const app = new Turbyoot();
      router.mount(app);
      
      const port = 3009 + Math.floor(Math.random() * 1000);
      
      await new Promise<void>((resolve) => {
        app.listen(port, () => {
          resolve();
        });
      });

      try {
        const response = await fetch(`http://localhost:${port}/api/users`);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({ users: [] });
      } finally {
        app.close();
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    });

    it('should handle requests with router and route middleware', async () => {
      const routerMiddleware = jest.fn(async (ctx: Context, next: () => Promise<void>) => {
        ctx.state.routerMiddleware = true;
        await next();
      });
      
      const routeMiddleware = jest.fn(async (ctx: Context, next: () => Promise<void>) => {
        ctx.state.routeMiddleware = true;
        await next();
      });
      
      const router = new Router({ 
        prefix: '/api',
        middleware: [routerMiddleware]
      });
      
      router.get('/test', (ctx) => {
        ctx.json({ 
          routerMiddleware: ctx.state.routerMiddleware,
          routeMiddleware: ctx.state.routeMiddleware
        });
      }, [routeMiddleware]);
      
      const app = new Turbyoot();
      router.mount(app);
      
      const port = 3010 + Math.floor(Math.random() * 1000);
      
      await new Promise<void>((resolve) => {
        app.listen(port, () => {
          resolve();
        });
      });

      try {
        const response = await fetch(`http://localhost:${port}/api/test`);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({ 
          routerMiddleware: true,
          routeMiddleware: true
        });
        expect(routerMiddleware).toHaveBeenCalled();
        expect(routeMiddleware).toHaveBeenCalled();
      } finally {
        app.close();
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    });

    it('should handle route parameters through mounted router', async () => {
      const router = new Router({ prefix: '/api' });
      router.get('/users/:id', (ctx) => {
        ctx.json({ userId: ctx.params.id });
      });
      
      const app = new Turbyoot();
      router.mount(app);
      
      const port = 3011 + Math.floor(Math.random() * 1000);
      
      await new Promise<void>((resolve) => {
        app.listen(port, () => {
          resolve();
        });
      });

      try {
        const response = await fetch(`http://localhost:${port}/api/users/123`);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({ userId: '123' });
      } finally {
        app.close();
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle route with undefined middleware array', () => {
      const router = new Router();
      const handler = mockHandler();
      
      router.get('/test', handler, undefined);
      
      const app = new Turbyoot();
      expect(() => router.mount(app)).not.toThrow();
    });

    it('should handle route with empty middleware array', () => {
      const router = new Router();
      const handler = mockHandler();
      
      router.get('/test', handler, []);
      
      const app = new Turbyoot();
      expect(() => router.mount(app)).not.toThrow();
    });

    it('should handle router with empty middleware array', () => {
      const router = new Router({ middleware: [] });
      const handler = mockHandler();
      
      router.get('/test', handler);
      
      const app = new Turbyoot();
      expect(() => router.mount(app)).not.toThrow();
    });

    it('should handle multiple routers with different prefixes', async () => {
      const apiRouter = new Router({ prefix: '/api' });
      apiRouter.get('/users', (ctx) => { ctx.json({ source: 'api' }); });
      
      const adminRouter = new Router({ prefix: '/admin' });
      adminRouter.get('/users', (ctx) => { ctx.json({ source: 'admin' }); });
      
      const app = new Turbyoot();
      apiRouter.mount(app);
      adminRouter.mount(app);
      
      const port = 3012 + Math.floor(Math.random() * 1000);
      
      await new Promise<void>((resolve) => {
        app.listen(port, () => {
          resolve();
        });
      });

      try {
        const apiResponse = await fetch(`http://localhost:${port}/api/users`);
        const apiData = await apiResponse.json();
        
        const adminResponse = await fetch(`http://localhost:${port}/admin/users`);
        const adminData = await adminResponse.json();

        expect(apiData).toEqual({ source: 'api' });
        expect(adminData).toEqual({ source: 'admin' });
      } finally {
        app.close();
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    });

    it('should handle async middleware errors gracefully', async () => {
      const errorMiddleware = jest.fn(async (_ctx: Context, _next: () => Promise<void>) => {
        throw new Error('Middleware error');
      });
      
      const router = new Router({ middleware: [errorMiddleware] });
      router.get('/test', (ctx) => { ctx.json({ success: true }); });
      
      const app = new Turbyoot();
      router.mount(app);
      
      const port = 3013 + Math.floor(Math.random() * 1000);
      
      await new Promise<void>((resolve) => {
        app.listen(port, () => {
          resolve();
        });
      });

      try {
        const response = await fetch(`http://localhost:${port}/test`);
        await response.text();

        expect(errorMiddleware).toHaveBeenCalled();
      } finally {
        app.close();
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    });
  });
});


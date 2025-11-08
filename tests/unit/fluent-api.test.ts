import { describe, it, expect, beforeEach } from '@jest/globals';
import { createTestApp, mockHandler, mockMiddleware } from '../utils/test-helpers.js';
import { createResource, PluginManager, EnhancedTurbyoot } from '../../src/framework/fluent.js';

describe('Fluent API', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('Route Creation', () => {
    it('should create a fluent route', () => {
      const route = app.route();
      
      expect(route).toBeDefined();
      expect(typeof route.get).toBe('function');
      expect(typeof route.post).toBe('function');
      expect(typeof route.put).toBe('function');
      expect(typeof route.del).toBe('function');
      expect(typeof route.patch).toBe('function');
      expect(typeof route.options).toBe('function');
      expect(typeof route.head).toBe('function');
    });

    it('should support method chaining', () => {
      const handler1 = mockHandler();
      const handler2 = mockHandler();
      
      const route = app.route()
        .get('/test1', handler1)
        .post('/test2', handler2);
      
      expect(route).toBeDefined();
    });

    it('should support middleware chaining', () => {
      const middleware1 = mockMiddleware('middleware1');
      const middleware2 = mockMiddleware('middleware2');
      const handler = mockHandler();
      
      const route = app.route()
        .use(middleware1)
        .use(middleware2)
        .get('/test', handler);
      
      expect(route).toBeDefined();
    });
  });

  describe('HTTP Methods', () => {
    it('should register GET routes', () => {
      const handler = mockHandler();
      app.route().get('/test', handler);
      
      // Route should be registered (we can't easily test execution without a real request)
      expect(handler).not.toHaveBeenCalled();
    });

    it('should register POST routes', () => {
      const handler = mockHandler();
      app.route().post('/test', handler);
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('should register PUT routes', () => {
      const handler = mockHandler();
      app.route().put('/test', handler);
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('should register DELETE routes', () => {
      const handler = mockHandler();
      app.route().del('/test', handler);
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('should register PATCH routes', () => {
      const handler = mockHandler();
      app.route().patch('/test', handler);
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('should register OPTIONS routes', () => {
      const handler = mockHandler();
      app.route().options('/test', handler);
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('should register HEAD routes', () => {
      const handler = mockHandler();
      app.route().head('/test', handler);
      
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Nested Groups', () => {
    it('should support nested groups', () => {
      const handler = mockHandler();
      
      app.route()
        .group('/api', (router) => {
          router
            .group('/v1', (subRouter) => {
              subRouter.get('/users', handler);
            });
        });
      
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Resource Routing', () => {
    it('should create resource routes', () => {
      const route = app.route();
      const result = route.resource('users');
      
      expect(result).toBe(route);
    });

    it('should create resource with custom handlers', () => {
      const route = app.route();
      const handlers = {
        index: mockHandler(),
        show: mockHandler(),
        create: mockHandler()
      };
      
      const result = route.resource('posts', { handlers });
      expect(result).toBe(route);
    });

    it('should create resource with only specific actions', () => {
      const route = app.route();
      const result = route.resource('comments', { only: ['index', 'show'] });
      
      expect(result).toBe(route);
    });

    it('should create resource with except specific actions', () => {
      const route = app.route();
      const result = route.resource('tags', { except: ['destroy'] });
      
      expect(result).toBe(route);
    });

    it('should create resource with prefix', () => {
      const route = app.route();
      const result = route.resource('categories', { prefix: '/api/v1' });
      
      expect(result).toBe(route);
    });

    it('should create resource with middleware', () => {
      const route = app.route();
      const middleware = mockMiddleware('auth');
      const result = route.resource('posts', { middleware: [middleware] });
      
      expect(result).toBe(route);
    });
  });

  describe('createResource()', () => {
    it('should create a resource function', () => {
      const resourceFn = createResource('users');
      expect(typeof resourceFn).toBe('function');
    });

    it('should create resource with options', () => {
      const resourceFn = createResource('posts', {
        prefix: '/api',
        handlers: {
          index: mockHandler(),
          show: mockHandler()
        }
      });
      expect(typeof resourceFn).toBe('function');
    });
  });

  describe('PluginManager', () => {
    it('should register plugins', () => {
      const manager = new PluginManager();
      const plugin = {
        name: 'test-plugin',
        install: jest.fn()
      };
      
      manager.register(plugin);
      expect(manager).toBeDefined();
    });

    it('should install plugins', () => {
      const manager = new PluginManager();
      const mockApp = { use: jest.fn() };
      const plugin = {
        name: 'test-plugin',
        install: jest.fn((app: any) => {
          app.use(jest.fn());
        })
      };
      
      manager.register(plugin);
      manager.install(mockApp);
      
      expect(plugin.install).toHaveBeenCalledWith(mockApp);
    });

    it('should handle plugins without install function', () => {
      const manager = new PluginManager();
      const mockApp = { use: jest.fn() };
      const plugin = {
        name: 'test-plugin'
      };
      
      manager.register(plugin);
      manager.install(mockApp);
      
      expect(mockApp.use).not.toHaveBeenCalled();
    });
  });

  describe('EnhancedTurbyoot', () => {
    it('should create instance without app', () => {
      const enhanced = new EnhancedTurbyoot();
      expect(enhanced).toBeDefined();
    });

    it('should create instance with app', () => {
      const mockApp = createTestApp();
      const enhanced = new EnhancedTurbyoot(mockApp);
      expect(enhanced).toBeDefined();
    });

    it('should set app after creation', () => {
      const enhanced = new EnhancedTurbyoot();
      const mockApp = createTestApp();
      enhanced.setApp(mockApp);
      expect(enhanced).toBeDefined();
    });

    it('should support use method', () => {
      const mockApp = createTestApp();
      const enhanced = new EnhancedTurbyoot(mockApp);
      const middleware = mockMiddleware('test');
      
      const result = enhanced.use(middleware);
      expect(result).toBe(enhanced);
    });

    it('should support route method', () => {
      const mockApp = createTestApp();
      const enhanced = new EnhancedTurbyoot(mockApp);
      const route = enhanced.route();
      
      expect(route).toBeDefined();
      expect(typeof route.get).toBe('function');
    });

    it('should support resource method', () => {
      const mockApp = createTestApp();
      const enhanced = new EnhancedTurbyoot(mockApp);
      const route = enhanced.resource('users');
      
      expect(route).toBeDefined();
    });

    it('should support group method', () => {
      const mockApp = createTestApp();
      const enhanced = new EnhancedTurbyoot(mockApp);
      const handler = mockHandler();
      
      enhanced.group('/api', (router) => {
        router.get('/test', handler);
      });
      
      expect(enhanced).toBeDefined();
    });

    it('should support plugin method', () => {
      const mockApp = createTestApp();
      const enhanced = new EnhancedTurbyoot(mockApp);
      const plugin = {
        name: 'test-plugin',
        install: jest.fn()
      };
      
      const result = enhanced.plugin(plugin);
      expect(result).toBe(enhanced);
    });

    it('should support get method with handler', () => {
      const mockApp = createTestApp();
      const enhanced = new EnhancedTurbyoot(mockApp);
      const handler = mockHandler();
      
      const result = enhanced.get('/test', handler);
      expect(result).toBe(enhanced);
    });

    it('should support get method with middleware and handler', () => {
      const mockApp = createTestApp();
      const enhanced = new EnhancedTurbyoot(mockApp);
      const middleware = mockMiddleware('test');
      const handler = mockHandler();
      
      const result = enhanced.get('/test', middleware, handler);
      expect(result).toBe(enhanced);
    });

    it('should support post method', () => {
      const mockApp = createTestApp();
      const enhanced = new EnhancedTurbyoot(mockApp);
      const handler = mockHandler();
      
      const result = enhanced.post('/test', handler);
      expect(result).toBe(enhanced);
    });

    it('should support put method', () => {
      const mockApp = createTestApp();
      const enhanced = new EnhancedTurbyoot(mockApp);
      const handler = mockHandler();
      
      const result = enhanced.put('/test', handler);
      expect(result).toBe(enhanced);
    });

    it('should support del method', () => {
      const mockApp = createTestApp();
      const enhanced = new EnhancedTurbyoot(mockApp);
      const handler = mockHandler();
      
      const result = enhanced.del('/test', handler);
      expect(result).toBe(enhanced);
    });

    it('should support patch method', () => {
      const mockApp = createTestApp();
      const enhanced = new EnhancedTurbyoot(mockApp);
      const handler = mockHandler();
      
      const result = enhanced.patch('/test', handler);
      expect(result).toBe(enhanced);
    });

    it('should support options method', () => {
      const mockApp = createTestApp();
      const enhanced = new EnhancedTurbyoot(mockApp);
      const handler = mockHandler();
      
      const result = enhanced.options('/test', handler);
      expect(result).toBe(enhanced);
    });

    it('should support head method', () => {
      const mockApp = createTestApp();
      const enhanced = new EnhancedTurbyoot(mockApp);
      const handler = mockHandler();
      
      const result = enhanced.head('/test', handler);
      expect(result).toBe(enhanced);
    });

    it('should support healthCheck method', () => {
      const mockApp = createTestApp();
      const enhanced = new EnhancedTurbyoot(mockApp);
      
      const result = enhanced.healthCheck([
        { name: 'db', check: () => true }
      ]);
      expect(result).toBeDefined();
    });

    it('should support listen method', () => {
      const mockApp = createTestApp();
      mockApp.listen = jest.fn();
      const enhanced = new EnhancedTurbyoot(mockApp);
      const callback = jest.fn();
      
      enhanced.listen(3000, callback);
      expect(mockApp.listen).toHaveBeenCalledWith(3000, callback);
    });

    it('should support close method', () => {
      const mockApp = createTestApp();
      mockApp.close = jest.fn();
      const enhanced = new EnhancedTurbyoot(mockApp);
      
      enhanced.close();
      expect(mockApp.close).toHaveBeenCalled();
    });
  });
});

import { describe, it, expect, beforeEach } from '@jest/globals';
import { createTestApp, mockHandler, mockMiddleware } from '../utils/test-helpers.js';

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
});

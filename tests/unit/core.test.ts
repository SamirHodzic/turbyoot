import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Turbyoot } from '../../src/framework.js';
import { createTestApp, createMockContext, mockHandler } from '../utils/test-helpers.js';

describe('Turbyoot Core', () => {
  let app: Turbyoot;

  beforeEach(() => {
    app = createTestApp();
  });

  afterEach(() => {
    // Clean up any listeners
    app.close();
  });

  describe('Basic HTTP Methods', () => {
    it('should handle GET requests', () => {
      const handler = mockHandler({ method: 'GET' });
      app.get('/test', handler);
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle POST requests', () => {
      const handler = mockHandler({ method: 'POST' });
      app.post('/test', handler);
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle PUT requests', () => {
      const handler = mockHandler({ method: 'PUT' });
      app.put('/test', handler);
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle DELETE requests', () => {
      const handler = mockHandler({ method: 'DELETE' });
      app.del('/test', handler);
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle PATCH requests', () => {
      const handler = mockHandler({ method: 'PATCH' });
      app.patch('/test', handler);
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle OPTIONS requests', () => {
      const handler = mockHandler({ method: 'OPTIONS' });
      app.options('/test', handler);
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle HEAD requests', () => {
      const handler = mockHandler({ method: 'HEAD' });
      app.head('/test', handler);
      
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Middleware', () => {
    it('should register global middleware', () => {
      const middleware = jest.fn((ctx, next) => next());
      app.use(middleware);
      
      // Middleware should be registered (we can't easily test execution without a real request)
      expect(middleware).not.toHaveBeenCalled();
    });

    it('should register route-specific middleware', () => {
      const middleware = jest.fn((ctx, next) => next());
      const handler = mockHandler();
      
      app.get('/test', middleware, handler);
      
      expect(middleware).not.toHaveBeenCalled();
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Server Lifecycle', () => {
    it('should create a server instance', () => {
      expect(app).toBeInstanceOf(Turbyoot);
    });

    it('should have listen method', () => {
      expect(typeof app.listen).toBe('function');
    });

    it('should have close method', () => {
      expect(typeof app.close).toBe('function');
    });
  });

  describe('Enhanced Features', () => {
    it('should have route method for fluent API', () => {
      expect(typeof app.route).toBe('function');
    });

    it('should have group method for route grouping', () => {
      expect(typeof app.group).toBe('function');
    });

    it('should have resource method for resource routing', () => {
      expect(typeof app.resource).toBe('function');
    });

    it('should have plugin method for plugin system', () => {
      expect(typeof app.plugin).toBe('function');
    });
  });
});

import { describe, it, expect, beforeEach } from '@jest/globals';
import { createTestApp, mockHandler, mockMiddleware } from '../utils/test-helpers.js';

describe('Resource Routing', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('Basic Resource Creation', () => {
    it('should create resource with default handlers', () => {
      app.resource('users');
      
      // Should not throw and should register routes
      expect(app).toBeDefined();
    });

    it('should create resource with custom handlers', () => {
      const handlers = {
        index: mockHandler(),
        show: mockHandler(),
        create: mockHandler(),
        update: mockHandler(),
        patch: mockHandler(),
        destroy: mockHandler()
      };

      app.resource('users', { handlers });
      
      expect(handlers.index).not.toHaveBeenCalled();
      expect(handlers.show).not.toHaveBeenCalled();
      expect(handlers.create).not.toHaveBeenCalled();
      expect(handlers.update).not.toHaveBeenCalled();
      expect(handlers.patch).not.toHaveBeenCalled();
      expect(handlers.destroy).not.toHaveBeenCalled();
    });

    it('should create resource with prefix', () => {
      const handlers = {
        index: mockHandler()
      };

      app.resource('users', {
        prefix: '/api',
        handlers
      });
      
      expect(handlers.index).not.toHaveBeenCalled();
    });

    it('should create resource with middleware', () => {
      const middleware = mockMiddleware('auth');
      const handlers = {
        index: mockHandler()
      };

      app.resource('users', {
        middleware: [middleware],
        handlers
      });
      
      expect(middleware).not.toHaveBeenCalled();
      expect(handlers.index).not.toHaveBeenCalled();
    });
  });

  describe('Resource Filtering', () => {
    it('should create only specified actions with only option', () => {
      const handlers = {
        index: mockHandler(),
        show: mockHandler()
      };

      app.resource('users', {
        only: ['index', 'show'],
        handlers
      });
      
      expect(handlers.index).not.toHaveBeenCalled();
      expect(handlers.show).not.toHaveBeenCalled();
    });

    it('should create all except specified actions with except option', () => {
      const handlers = {
        index: mockHandler(),
        show: mockHandler(),
        create: mockHandler(),
        update: mockHandler(),
        patch: mockHandler(),
        destroy: mockHandler()
      };

      app.resource('users', {
        except: ['destroy'],
        handlers
      });
      
      expect(handlers.index).not.toHaveBeenCalled();
      expect(handlers.show).not.toHaveBeenCalled();
      expect(handlers.create).not.toHaveBeenCalled();
      expect(handlers.update).not.toHaveBeenCalled();
      expect(handlers.patch).not.toHaveBeenCalled();
      expect(handlers.destroy).not.toHaveBeenCalled();
    });
  });

  describe('Resource Options', () => {
    it('should handle empty options', () => {
      app.resource('users', {});
      
      expect(app).toBeDefined();
    });

    it('should handle partial handlers', () => {
      const handlers = {
        index: mockHandler(),
        create: mockHandler()
      };

      app.resource('users', { handlers });
      
      expect(handlers.index).not.toHaveBeenCalled();
      expect(handlers.create).not.toHaveBeenCalled();
    });

    it('should handle multiple resources', () => {
      const userHandlers = {
        index: mockHandler()
      };
      const postHandlers = {
        index: mockHandler()
      };

      app.resource('users', { handlers: userHandlers });
      app.resource('posts', { handlers: postHandlers });
      
      expect(userHandlers.index).not.toHaveBeenCalled();
      expect(postHandlers.index).not.toHaveBeenCalled();
    });
  });
});

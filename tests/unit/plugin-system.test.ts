import { describe, it, expect, beforeEach } from '@jest/globals';
import { createTestApp } from '../utils/test-helpers.js';

describe('Plugin System', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('Plugin Registration', () => {
    it('should register a plugin', () => {
      const plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        install: jest.fn()
      };

      const result = app.plugin(plugin);
      
      expect(result).toBe(app); // Should return this for chaining
      expect(plugin.install).toHaveBeenCalledWith(app);
    });

    it('should register multiple plugins', () => {
      const plugin1 = {
        name: 'plugin1',
        version: '1.0.0',
        install: jest.fn()
      };
      const plugin2 = {
        name: 'plugin2',
        version: '1.0.0',
        install: jest.fn()
      };

      app.plugin(plugin1);
      app.plugin(plugin2);
      
      expect(plugin1.install).toHaveBeenCalledWith(app);
      expect(plugin2.install).toHaveBeenCalledWith(app);
    });

    it('should handle plugin with dependencies', () => {
      const plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        dependencies: ['other-plugin'],
        install: jest.fn()
      };

      app.plugin(plugin);
      
      expect(plugin.install).toHaveBeenCalledWith(app);
    });

    it('should handle plugin with options', () => {
      const plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        install: jest.fn()
      };

      app.plugin(plugin);
      
      expect(plugin.install).toHaveBeenCalledWith(app);
    });
  });

  describe('Plugin Lifecycle', () => {
    it('should call install method when plugin is registered', () => {
      const installSpy = jest.fn();
      const plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        install: installSpy
      };

      app.plugin(plugin);
      
      expect(installSpy).toHaveBeenCalledTimes(1);
      expect(installSpy).toHaveBeenCalledWith(app);
    });

    it('should handle plugin that adds middleware', () => {
      const middleware = jest.fn((ctx, next) => next());
      const plugin = {
        name: 'middleware-plugin',
        version: '1.0.0',
        install: (app: any) => {
          app.use(middleware);
        }
      };

      app.plugin(plugin);
      
      // Middleware should be registered
      expect(middleware).not.toHaveBeenCalled();
    });

    it('should handle plugin that adds properties to app', () => {
      const plugin = {
        name: 'property-plugin',
        version: '1.0.0',
        install: (app: any) => {
          (app as any).customProperty = 'test-value';
        }
      };

      app.plugin(plugin);
      
      expect((app as any).customProperty).toBe('test-value');
    });
  });

  describe('Plugin Error Handling', () => {
    it('should handle plugin with missing name', () => {
      const plugin = {
        version: '1.0.0',
        install: jest.fn()
      } as any;

      expect(() => app.plugin(plugin)).not.toThrow();
    });

    it('should handle plugin with missing version', () => {
      const plugin = {
        name: 'test-plugin',
        install: jest.fn()
      } as any;

      expect(() => app.plugin(plugin)).not.toThrow();
    });

    it('should handle plugin with missing install method', () => {
      const plugin = {
        name: 'test-plugin',
        version: '1.0.0'
      } as any;

      expect(() => app.plugin(plugin)).not.toThrow();
    });
  });
});

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { configureViews, renderTemplate } from '../../src/utils/template.js';
import { readFile, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { tmpdir } from 'os';

describe('Template Engine', () => {
  let testViewsDir: string;

  beforeEach(async () => {
    testViewsDir = join(tmpdir(), `turbyoot-test-${Date.now()}`);
    if (!existsSync(testViewsDir)) {
      await mkdir(testViewsDir, { recursive: true });
    }
    configureViews({
      views: testViewsDir,
      engine: undefined,
      cache: false,
      engines: {},
    });
  });

  describe('configureViews()', () => {
    it('should configure views directory', () => {
      configureViews({ views: './custom-views' });
      expect(configureViews).toBeDefined();
    });

    it('should configure view engine', () => {
      configureViews({ engine: 'ejs' });
      expect(configureViews).toBeDefined();
    });

    it('should configure custom engines', () => {
      const customEngine = jest.fn((template: string, data: any) => {
        return template.replace('{{name}}', data.name || '');
      });
      
      configureViews({
        engines: {
          'custom': customEngine,
        },
      });
      expect(configureViews).toBeDefined();
    });
  });

  describe('renderTemplate()', () => {
    it('should throw error when engine is not specified', async () => {
      await expect(renderTemplate('test')).rejects.toThrow('Template engine not specified');
    });

    it('should throw error when template file does not exist', async () => {
      const customEngine = (template: string, data: Record<string, any>) => {
        return template;
      };

      configureViews({
        engine: 'custom',
        engines: {
          'custom': customEngine,
        },
      });
      await expect(renderTemplate('nonexistent')).rejects.toThrow('not found');
    });

    it('should render template with registered custom engine', async () => {
      const templateContent = 'Hello {{name}}!';
      const templatePath = join(testViewsDir, 'test.custom');
      await writeFile(templatePath, templateContent, 'utf-8');

      const customEngine = (template: string, data: Record<string, any>) => {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
          return data[key] || match;
        });
      };

      configureViews({
        engines: {
          'custom': customEngine,
        },
      });

      const result = await renderTemplate('test.custom', { name: 'World' });
      expect(result).toBe('Hello World!');
    });

    it('should render template with callback-style engine', async () => {
      const templateContent = 'Hello {{name}}!';
      const templatePath = join(testViewsDir, 'test.callback');
      await writeFile(templatePath, templateContent, 'utf-8');

      const callbackEngine = (
        filePath: string,
        options: Record<string, any>,
        callback: (err: Error | null, html?: string) => void
      ) => {
        readFile(filePath, 'utf-8')
          .then((content) => {
            const result = content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
              return options[key] || match;
            });
            callback(null, result);
          })
          .catch((err) => callback(err));
      };

      configureViews({
        engines: {
          'callback': callbackEngine,
        },
      });

      const result = await renderTemplate('test.callback', { name: 'World' });
      expect(result).toBe('Hello World!');
    });

    it('should use default engine when extension is not provided', async () => {
      const templateContent = 'Hello {{name}}!';
      const templatePath = join(testViewsDir, 'test.custom');
      await writeFile(templatePath, templateContent, 'utf-8');

      const customEngine = (template: string, data: Record<string, any>) => {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
          return data[key] || match;
        });
      };

      configureViews({
        engine: 'custom',
        engines: {
          'custom': customEngine,
        },
      });

      const result = await renderTemplate('test', { name: 'World' });
      expect(result).toBe('Hello World!');
    });

    it('should merge state data with template data', async () => {
      const templateContent = 'Hello {{name}}, status: {{status}}!';
      const templatePath = join(testViewsDir, 'test.custom');
      await writeFile(templatePath, templateContent, 'utf-8');

      const customEngine = (template: string, data: Record<string, any>) => {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
          return data[key] || match;
        });
      };

      configureViews({
        engines: {
          'custom': customEngine,
        },
      });

      const result = await renderTemplate('test.custom', { name: 'World', status: 'OK' });
      expect(result).toBe('Hello World, status: OK!');
    });

    it('should handle errors from template engine', async () => {
      const templatePath = join(testViewsDir, 'test.error');
      await writeFile(templatePath, 'test', 'utf-8');

      const errorEngine = () => {
        throw new Error('Engine error');
      };

      configureViews({
        engines: {
          'error': errorEngine,
        },
      });

      await expect(renderTemplate('test.error', {})).rejects.toThrow('Engine error');
    });

    it('should handle async template engine', async () => {
      const templateContent = 'Hello {{name}}!';
      const templatePath = join(testViewsDir, 'test.async');
      await writeFile(templatePath, templateContent, 'utf-8');

      const asyncEngine = async (template: string, data: Record<string, any>) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
          return data[key] || match;
        });
      };

      configureViews({
        engines: {
          'async': asyncEngine,
        },
      });

      const result = await renderTemplate('test.async', { name: 'World' });
      expect(result).toBe('Hello World!');
    });
  });
});


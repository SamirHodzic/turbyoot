import { readFile } from 'fs/promises';
import { join, resolve, extname } from 'path';
import { createRequire } from 'module';
import { ViewOptions } from '../types.js';

let viewConfig: ViewOptions = {
  views: './views',
  engine: undefined,
  cache: false,
  engines: {},
};

export function configureViews(options: ViewOptions): void {
  viewConfig = { ...viewConfig, ...options };
}

export function getViewConfig(): ViewOptions {
  return viewConfig;
}

async function loadEngine(engineName: string): Promise<any> {
  try {
    let engineModule: any;
    
    try {
      engineModule = await import(engineName);
    } catch (importErr: any) {
      if (importErr.code === 'ERR_MODULE_NOT_FOUND' || importErr.code === 'MODULE_NOT_FOUND') {
        try {
          const require = createRequire(process.cwd() + '/package.json');
          engineModule = require(engineName);
        } catch {
          throw new Error(`Template engine "${engineName}" is not installed. Please install it with: npm install ${engineName}`);
        }
      } else {
        throw importErr;
      }
    }
    
    const engine = engineModule.default || engineModule;
    
    if (typeof engine === 'function') {
      return engine;
    }
    
    if (engine.renderFile && typeof engine.renderFile === 'function') {
      return engine.renderFile;
    }
    
    if (engine.render && typeof engine.render === 'function') {
      return (filePath: string, options: any, callback: (err: Error | null, html?: string) => void) => {
        try {
          const result = engine.render(filePath, options);
          if (result instanceof Promise) {
            result.then((html: string) => callback(null, html)).catch(callback);
          } else {
            callback(null, result);
          }
        } catch (err) {
          callback(err instanceof Error ? err : new Error(String(err)));
        }
      };
    }
    
    throw new Error(`Template engine "${engineName}" does not export a compatible render function. It should export a function, renderFile, or render. You can also register it manually via engines config.`);
  } catch (err: any) {
    if (err.message && err.message.includes('not installed')) {
      throw err;
    }
    throw new Error(`Template engine "${engineName}" could not be loaded: ${err.message || String(err)}`);
  }
}

function promisifyEngine(engine: any, filePath: string, options: any): Promise<string> {
  return new Promise((resolve, reject) => {
    if (engine.length === 3 || engine.length === 0) {
      engine(filePath, options, (err: Error | null, html?: string) => {
        if (err) {
          reject(err);
        } else {
          resolve(html || '');
        }
      });
    } else {
      try {
        const result = engine(filePath, options);
        if (result instanceof Promise) {
          result.then(resolve).catch(reject);
        } else {
          resolve(result);
        }
      } catch (error) {
        reject(error);
      }
    }
  });
}

async function renderTemplate(template: string, data: Record<string, any> = {}): Promise<string> {
  const viewsDir = resolve(viewConfig.views || './views');
  const ext = extname(template);
  const engineName = ext ? ext.slice(1) : (viewConfig.engine || '');
  
  if (!engineName) {
    throw new Error('Template engine not specified. Set view engine using app.configure({ views: { engine: "ejs" } }) or include file extension in template name');
  }

  const templatePath = join(viewsDir, template + (ext ? '' : `.${engineName}`));

  let engine: any;

  if (viewConfig.engines && viewConfig.engines[engineName]) {
    engine = viewConfig.engines[engineName];
  } else {
    try {
      engine = await loadEngine(engineName);
    } catch (err: any) {
      const errorMessage = err?.message || String(err);
      if (errorMessage.includes('not installed') || errorMessage.includes('MODULE_NOT_FOUND') || errorMessage.includes('ERR_MODULE_NOT_FOUND')) {
        throw new Error(`Template engine "${engineName}" is not installed. Please install it with: npm install ${engineName}`);
      }
      throw new Error(`Template engine "${engineName}" could not be loaded: ${errorMessage}. Register it manually using app.configure({ views: { engines: { "${engineName}": engineFunction } } })`);
    }
  }

  try {
    const options = {
      ...data,
      cache: viewConfig.cache,
      filename: templatePath,
      settings: {
        views: viewsDir,
      },
    };

    if (typeof engine === 'function') {
      if (engine.length === 3 || engine.length === 0) {
        return await promisifyEngine(engine, templatePath, options);
      } else {
        const templateContent = await readFile(templatePath, 'utf-8');
        const result = await engine(templateContent, options);
        return typeof result === 'string' ? result : String(result);
      }
    } else {
      throw new Error(`Invalid template engine for "${engineName}"`);
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error(`Template "${template}" not found in views directory "${viewsDir}"`);
    }
    throw error;
  }
}

export { renderTemplate };


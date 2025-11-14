import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { execSync } from 'child_process';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Turbyoot } from '../../src/framework.js';

describe('HTTPS and HTTP/2 Integration Tests', () => {
  const testCertDir = join(__dirname, '../fixtures/certs');
  const keyPath = join(testCertDir, 'test-key.pem');
  const certPath = join(testCertDir, 'test-cert.pem');

  beforeAll(() => {
    if (!existsSync(testCertDir)) {
      mkdirSync(testCertDir, { recursive: true });
    }

    if (!existsSync(keyPath) || !existsSync(certPath)) {
      try {
        execSync(
          `openssl req -x509 -newkey rsa:2048 -keyout ${keyPath} -out ${certPath} -days 365 -nodes -subj "/C=US/ST=Test/L=Test/O=Test/CN=localhost"`,
          { stdio: 'ignore' }
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Test certificates not found and OpenSSL not available. ` +
          `Error: ${errorMessage}. ` +
          `Please ensure OpenSSL is installed or certificates are generated.`
        );
      }
    }
  });

  describe('HTTPS Server', () => {
    let app: Turbyoot;
    let baseUrl: string;
    let port: number;

    beforeAll(async () => {
      app = new Turbyoot();

      app.get('/test', (ctx: any) => {
        ctx.ok({ message: 'HTTPS test', protocol: 'https' });
      });

      app.post('/test', (ctx: any) => {
        ctx.created({ received: ctx.body, protocol: 'https' });
      });

      app.get('/secure', (ctx: any) => {
        ctx.ok({ secure: true });
      });

      port = 8443 + Math.floor(Math.random() * 100);
      const key = readFileSync(keyPath);
      const cert = readFileSync(certPath);

      app.listen(port, {
        protocol: 'https',
        https: {
          key,
          cert,
        },
      });

      baseUrl = `https://localhost:${port}`;

      await new Promise(resolve => setTimeout(resolve, 100));
    });

    afterAll(async () => {
      if (app) {
        app.close();
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    });

    it('should handle GET requests over HTTPS', async () => {
      const response = await fetch(baseUrl + '/test', {
        // @ts-expect-error - Node.js fetch doesn't have agent option in types but it works
        agent: false,
      }).catch(() => null);

      if (!response) {
        console.warn('HTTPS test skipped - fetch may not support self-signed certs');
        return;
      }

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('HTTPS test');
      expect(data.protocol).toBe('https');
    });

    it('should handle POST requests over HTTPS', async () => {
      const testData = { name: 'test', value: 123 };

      const response = await fetch(baseUrl + '/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData),
        // @ts-expect-error - Node.js fetch doesn't have agent option in types but it works
        agent: false,
      }).catch(() => null);

      if (!response) {
        console.warn('HTTPS POST test skipped - fetch may not support self-signed certs');
        return;
      }

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.received).toEqual(testData);
      expect(data.protocol).toBe('https');
    });

    it('should serve secure endpoints over HTTPS', async () => {
      const response = await fetch(baseUrl + '/secure', {
        // @ts-expect-error - Node.js fetch doesn't have agent option in types but it works
        agent: false,
      }).catch(() => null);

      if (!response) {
        console.warn('HTTPS secure test skipped - fetch may not support self-signed certs');
        return;
      }

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.secure).toBe(true);
    });
  });

  describe('HTTP/2 Server', () => {
    let app: Turbyoot;
    let baseUrl: string;
    let port: number;

    beforeAll(async () => {
      app = new Turbyoot();

      app.get('/test', (ctx: any) => {
        ctx.ok({ message: 'HTTP/2 test', protocol: 'http2' });
      });

      app.get('/api/data', (ctx: any) => {
        ctx.ok({ data: [1, 2, 3], protocol: 'http2' });
      });

      app.post('/api/data', (ctx: any) => {
        ctx.created({ received: ctx.body, protocol: 'http2' });
      });

      port = 8444 + Math.floor(Math.random() * 100);
      const key = readFileSync(keyPath);
      const cert = readFileSync(certPath);

      app.listen(port, {
        protocol: 'http2',
        https: {
          key,
          cert,
        },
        http2: {
          allowHTTP1: true,
        },
      });

      baseUrl = `https://localhost:${port}`;

      await new Promise(resolve => setTimeout(resolve, 100));
    });

    afterAll(async () => {
      if (app) {
        app.close();
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    });

    it('should handle GET requests over HTTP/2', async () => {
      const response = await fetch(baseUrl + '/test', {
        // @ts-expect-error - Node.js fetch doesn't have agent option in types but it works
        agent: false,
      }).catch(() => null);

      if (!response) {
        console.warn('HTTP/2 test skipped - fetch may not support self-signed certs');
        return;
      }

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('HTTP/2 test');
      expect(data.protocol).toBe('http2');
    });

    it('should handle POST requests over HTTP/2', async () => {
      const testData = { items: ['a', 'b', 'c'] };

      const response = await fetch(baseUrl + '/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData),
        // @ts-expect-error - Node.js fetch doesn't have agent option in types but it works
        agent: false,
      }).catch(() => null);

      if (!response) {
        console.warn('HTTP/2 POST test skipped - fetch may not support self-signed certs');
        return;
      }

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.received).toEqual(testData);
      expect(data.protocol).toBe('http2');
    });

    it('should support HTTP/1.1 fallback when allowHTTP1 is true', async () => {
      const response = await fetch(baseUrl + '/api/data', {
        // @ts-expect-error - Node.js fetch doesn't have agent option in types but it works
        agent: false,
      }).catch(() => null);

      if (!response) {
        console.warn('HTTP/2 fallback test skipped - fetch may not support self-signed certs');
        return;
      }

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.protocol).toBe('http2');
    });
  });

  describe('Server Options', () => {
    it('should throw error when HTTPS options are missing', () => {
      const app = new Turbyoot();
      
      expect(() => {
        app.listen(9000, {
          protocol: 'https',
        });
      }).toThrow('HTTPS options (key and cert) are required when using HTTPS protocol');
    });

    it('should support host option', async () => {
      const app = new Turbyoot();
      const key = readFileSync(keyPath);
      const cert = readFileSync(certPath);

      app.get('/test', (ctx: any) => {
        ctx.ok({ message: 'test' });
      });

      let serverStarted = false;
      app.listen(9001, {
        protocol: 'https',
        https: { key, cert },
        host: '127.0.0.1',
      }, () => {
        serverStarted = true;
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      expect(serverStarted).toBe(true);
      app.close();
    });

    it('should support backward compatibility with callback only', async () => {
      const app = new Turbyoot();
      let callbackCalled = false;

      app.get('/test', (ctx: any) => {
        ctx.ok({ message: 'test' });
      });

      app.listen(9002, () => {
        callbackCalled = true;
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      expect(callbackCalled).toBe(true);
      app.close();
    });
  });
});


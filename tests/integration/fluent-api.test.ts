import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Turbyoot } from '../../src/framework/index.js';

describe('Fluent API Integration Tests', () => {
  let app: Turbyoot;
  let baseUrl: string;

  beforeAll(async () => {
    app = new Turbyoot();
    
    // Test fluent API
    app.route()
      .get('/api/users', (ctx: any) => ctx.ok({ users: [] }))
      .post('/api/users', (ctx: any) => ctx.created({ id: 1, ...ctx.body }))
      .get('/api/users/:id', (ctx: any) => ctx.ok({ user: { id: ctx.params.id } }))
      .put('/api/users/:id', (ctx: any) => ctx.ok({ user: { id: ctx.params.id, ...ctx.body } }))
      .del('/api/users/:id', (ctx: any) => ctx.noContent());

    // Test grouped routes
    app.group('/v1', (router: any) => {
      router.get('/health', (ctx: any) => ctx.ok({ status: 'healthy' }));
      router.get('/version', (ctx: any) => ctx.ok({ version: '1.0.0' }));
    });

    // Test nested groups
    app.group('/admin', (router: any) => {
      router.group('/users', (subRouter: any) => {
        subRouter.get('/', (ctx: any) => ctx.ok({ adminUsers: [] }));
        subRouter.post('/', (ctx: any) => ctx.created({ adminUser: ctx.body }));
      });
    });

    // Start server
    const port = 3002 + Math.floor(Math.random() * 1000);
    app.listen(port);
    baseUrl = `http://localhost:${port}`;
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    if (app) {
      app.close();
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  });

  describe('Fluent Route Creation', () => {
    it('should handle GET /api/users', async () => {
      const response = await fetch(`${baseUrl}/api/users`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ users: [] });
    });

    it('should handle POST /api/users', async () => {
      const response = await fetch(`${baseUrl}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'John Doe' })
      });
      
      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ id: 1, name: 'John Doe' });
    });

    it('should handle GET /api/users/:id', async () => {
      const response = await fetch(`${baseUrl}/api/users/123`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ user: { id: '123' } });
    });

    it('should handle PUT /api/users/:id', async () => {
      const response = await fetch(`${baseUrl}/api/users/456`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Jane Doe' })
      });
      
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ user: { id: '456', name: 'Jane Doe' } });
    });

    it('should handle DELETE /api/users/:id', async () => {
      const response = await fetch(`${baseUrl}/api/users/789`, {
        method: 'DELETE'
      });
      
      expect(response.status).toBe(204);
    });
  });

  describe('Grouped Routes', () => {
    it('should handle /v1/health', async () => {
      const response = await fetch(`${baseUrl}/v1/health`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: 'healthy' });
    });

    it('should handle /v1/version', async () => {
      const response = await fetch(`${baseUrl}/v1/version`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ version: '1.0.0' });
    });
  });


  //// OVO NE RADI
  describe('Nested Groups', () => {
    it('should handle /admin/users', async () => {
      const response = await fetch(`${baseUrl}/admin/users`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ adminUsers: [] });
    });

    it('should handle POST /admin/users', async () => {
      const response = await fetch(`${baseUrl}/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Admin User' })
      });
      
      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ adminUser: { name: 'Admin User' } });
    });
  });
});

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Turbyoot } from '../../src/framework/index.js';

describe('Resource Routing Integration Tests', () => {
  let app: Turbyoot;
  let baseUrl: string;

  beforeAll(async () => {
    app = new Turbyoot();
    
    // Test basic resource routing
    app.resource('users');

    // Test resource with custom handlers
    app.resource('posts', {
      handlers: {
        index: (ctx: any) => ctx.ok({ posts: [] }),
        show: (ctx: any) => ctx.ok({ post: { id: ctx.params.id } }),
        create: (ctx: any) => ctx.created({ post: { id: 1, ...ctx.body } }),
        update: (ctx: any) => ctx.ok({ post: { id: ctx.params.id, ...ctx.body } }),
        destroy: (ctx: any) => ctx.noContent()
      }
    });

    // Test resource with prefix
    app.resource('comments', {
      prefix: '/api/v1',
      handlers: {
        index: (ctx: any) => ctx.ok({ comments: [] }),
        show: (ctx: any) => ctx.ok({ comment: { id: ctx.params.id } }),
        create: (ctx: any) => ctx.created({ comment: { id: 1, ...ctx.body } }),
        update: (ctx: any) => ctx.ok({ comment: { id: ctx.params.id, ...ctx.body } }),
        destroy: (ctx: any) => ctx.noContent()
      }
    });

    // Test resource with filtering
    app.resource('products', {
      only: ['index', 'show', 'create'],
      handlers: {
        index: (ctx: any) => ctx.ok({ products: [] }),
        show: (ctx: any) => ctx.ok({ product: { id: ctx.params.id } }),
        create: (ctx: any) => ctx.created({ product: { id: 1, ...ctx.body } })
      }
    });

    // Start server
    const port = 3003 + Math.floor(Math.random() * 1000);
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

  describe('Basic Resource Routes', () => {
    it('should handle GET /users (index)', async () => {
      const response = await fetch(`${baseUrl}/users`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ users: [] });
    });

    it('should handle POST /users (create)', async () => {
      const response = await fetch(`${baseUrl}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'John Doe' })
      });
      
      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ user: { id: 1, name: 'John Doe' } });
    });

    it('should handle GET /users/:id (show)', async () => {
      const response = await fetch(`${baseUrl}/users/123`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ user: { id: '123' } });
    });

    it('should handle PUT /users/:id (update)', async () => {
      const response = await fetch(`${baseUrl}/users/456`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Jane Doe' })
      });
      
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ user: { id: '456', name: 'Jane Doe' } });
    });

    it('should handle DELETE /users/:id (destroy)', async () => {
      const response = await fetch(`${baseUrl}/users/789`, {
        method: 'DELETE'
      });
      
      expect(response.status).toBe(204);
    });
  });

  describe('Custom Resource Handlers', () => {
    it('should handle GET /posts (custom index)', async () => {
      const response = await fetch(`${baseUrl}/posts`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ posts: [] });
    });

    it('should handle POST /posts (custom create)', async () => {
      const response = await fetch(`${baseUrl}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test Post' })
      });
      
      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ post: { id: 1, title: 'Test Post' } });
    });
  });

  describe('Resource with Prefix', () => {
    it('should handle GET /api/v1/comments', async () => {
      const response = await fetch(`${baseUrl}/api/v1/comments`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ comments: [] });
    });

    it('should handle POST /api/v1/comments', async () => {
      const response = await fetch(`${baseUrl}/api/v1/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Great post!' })
      });
      
      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ comment: { id: 1, text: 'Great post!' } });
    });
  });

  describe('Resource Filtering', () => {
    it('should handle GET /products (only index)', async () => {
      const response = await fetch(`${baseUrl}/products`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ products: [] });
    });

    it('should handle GET /products/:id (only show)', async () => {
      const response = await fetch(`${baseUrl}/products/123`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ product: { id: '123' } });
    });

    it('should handle POST /products (only create)', async () => {
      const response = await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Product' })
      });
      
      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ product: { id: 1, name: 'Test Product' } });
    });

    it('should not handle PUT /products/:id (filtered out)', async () => {
      const response = await fetch(`${baseUrl}/products/456`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Product' })
      });
      
      expect(response.status).toBe(404);
    });

    it('should not handle DELETE /products/:id (filtered out)', async () => {
      const response = await fetch(`${baseUrl}/products/789`, {
        method: 'DELETE'
      });
      
      expect(response.status).toBe(404);
    });
  });
});

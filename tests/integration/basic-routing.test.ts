import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Turbyoot } from '../../src/framework.js';

describe('Basic Routing Integration Tests', () => {
  let app: Turbyoot;
  let baseUrl: string;

  beforeAll(async () => {
    app = new Turbyoot();
    
    // Set up test routes
    app.get('/test', (ctx: any) => {
      ctx.ok({ message: 'Hello World' });
    });

    app.post('/test', (ctx: any) => {
      ctx.created({ id: 1, ...ctx.body });
    });

    app.get('/users/:id', (ctx: any) => {
      ctx.ok({ userId: ctx.params.id });
    });

    app.put('/users/:id', (ctx: any) => {
      ctx.ok({ userId: ctx.params.id, updated: ctx.body });
    });

    app.del('/users/:id', (ctx: any) => {
      ctx.noContent();
    });

    // Start server on a random port
    const port = 3001 + Math.floor(Math.random() * 1000);
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

  describe('GET Requests', () => {
    it('should handle simple GET request', async () => {
      const response = await fetch(`${baseUrl}/test`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ message: 'Hello World' });
    });

    it('should handle GET with route parameters', async () => {
      const response = await fetch(`${baseUrl}/users/123`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ userId: '123' });
    });
  });

  describe('POST Requests', () => {
    it('should handle POST request with body', async () => {
      const response = await fetch(`${baseUrl}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test User' })
      });
      
      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ id: 1, name: 'Test User' });
    });
  });

  describe('PUT Requests', () => {
    it('should handle PUT request with parameters and body', async () => {
      const response = await fetch(`${baseUrl}/users/456`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated User' })
      });
      
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ 
        userId: '456', 
        updated: { name: 'Updated User' } 
      });
    });
  });

  describe('DELETE Requests', () => {
    it('should handle DELETE request', async () => {
      const response = await fetch(`${baseUrl}/users/789`, {
        method: 'DELETE'
      });
      
      expect(response.status).toBe(204);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await fetch(`${baseUrl}/nonexistent`);
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: 'Not Found', status: 404 });
    });
  });
});

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Turbyoot } from '../../src/framework/index.js';

describe('Complete API Integration Tests', () => {
  let app: Turbyoot;
  let baseUrl: string;

  beforeAll(async () => {
    app = new Turbyoot();
    
    // Add global middleware
    app.use((ctx: any, next: any) => {
      ctx.state.requestId = Math.random().toString(36).substr(2, 9);
      return next();
    });

    // Test all HTTP methods
    app.get('/api/status', (ctx: any) => {
      ctx.ok({ 
        status: 'ok', 
        requestId: ctx.state.requestId,
        timestamp: new Date().toISOString()
      });
    });

    app.post('/api/echo', (ctx: any) => {
      ctx.created({ 
        echo: ctx.body,
        requestId: ctx.state.requestId
      });
    });

    app.put('/api/update/:id', (ctx: any) => {
      ctx.ok({ 
        id: ctx.params.id,
        updated: ctx.body,
        requestId: ctx.state.requestId
      });
    });

    app.patch('/api/patch/:id', (ctx: any) => {
      ctx.ok({ 
        id: ctx.params.id,
        patched: ctx.body,
        requestId: ctx.state.requestId
      });
    });

    app.del('/api/delete/:id', (ctx: any) => {
      ctx.noContent();
    });

    app.options('/api/options', (ctx: any) => {
      ctx.ok({ methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] });
    });

    app.head('/api/head', (ctx: any) => {
      ctx.header('X-Custom-Header', 'test-value');
      ctx.noContent();
    });

    // Test fluent API with complex routes
    app.group('/api/v1', (router: any) => {
      router.group('/users', (userRouter: any) => {
        userRouter.get('/', (ctx: any) => ctx.ok({ users: [] }));
        userRouter.post('/', (ctx: any) => ctx.created({ user: { id: 1, ...ctx.body } }));
        userRouter.get('/:id', (ctx: any) => ctx.ok({ user: { id: ctx.params.id } }));
        userRouter.put('/:id', (ctx: any) => ctx.ok({ user: { id: ctx.params.id, ...ctx.body } }));
        userRouter.del('/:id', (ctx: any) => ctx.noContent());
      });

      router.group('/posts', (postRouter: any) => {
        postRouter.get('/', (ctx: any) => ctx.ok({ posts: [] }));
        postRouter.post('/', (ctx: any) => ctx.created({ post: { id: 1, ...ctx.body } }));
        postRouter.get('/:id', (ctx: any) => ctx.ok({ post: { id: ctx.params.id } }));
        postRouter.put('/:id', (ctx: any) => ctx.ok({ post: { id: ctx.params.id, ...ctx.body } }));
        postRouter.del('/:id', (ctx: any) => ctx.noContent());
      });
    });

    // Test resource routing
    app.resource('categories', {
      prefix: '/api/v1',
      handlers: {
        index: (ctx: any) => ctx.ok({ categories: [] }),
        show: (ctx: any) => ctx.ok({ category: { id: ctx.params.id } }),
        create: (ctx: any) => ctx.created({ category: { id: 1, ...ctx.body } }),
        update: (ctx: any) => ctx.ok({ category: { id: ctx.params.id, ...ctx.body } }),
        destroy: (ctx: any) => ctx.noContent()
      }
    });

    // Test error handling
    app.get('/api/error', (ctx: any) => {
      ctx.internalError('Test error');
    });

    app.get('/api/not-found', (ctx: any) => {
      ctx.notFound('Resource not found');
    });

    app.get('/api/unauthorized', (ctx: any) => {
      ctx.unauthorized('Access denied');
    });

    // Start server
    const port = 3004 + Math.floor(Math.random() * 1000);
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

  describe('HTTP Methods', () => {
    it('should handle GET request', async () => {
      const response = await fetch(`${baseUrl}/api/status`);
      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.status).toBe('ok');
      expect(data.requestId).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });

    it('should handle POST request', async () => {
      const response = await fetch(`${baseUrl}/api/echo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Hello World' })
      });
      
      expect(response.status).toBe(201);
      const data = await response.json() as any;
      expect(data.echo).toEqual({ message: 'Hello World' });
      expect(data.requestId).toBeDefined();
    });

    it('should handle PUT request', async () => {
      const response = await fetch(`${baseUrl}/api/update/123`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Name' })
      });
      
      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.id).toBe('123');
      expect(data.updated).toEqual({ name: 'Updated Name' });
      expect(data.requestId).toBeDefined();
    });

    it('should handle PATCH request', async () => {
      const response = await fetch(`${baseUrl}/api/patch/456`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Patched Name' })
      });
      
      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.id).toBe('456');
      expect(data.patched).toEqual({ name: 'Patched Name' });
      expect(data.requestId).toBeDefined();
    });

    it('should handle DELETE request', async () => {
      const response = await fetch(`${baseUrl}/api/delete/789`, {
        method: 'DELETE'
      });
      
      expect(response.status).toBe(204);
    });

    it('should handle OPTIONS request', async () => {
      const response = await fetch(`${baseUrl}/api/options`, {
        method: 'OPTIONS'
      });
      
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ 
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] 
      });
    });

    it('should handle HEAD request', async () => {
      const response = await fetch(`${baseUrl}/api/head`, {
        method: 'HEAD'
      });
      
      expect(response.status).toBe(204);
      expect(response.headers.get('x-custom-header')).toBe('test-value');
    });
  });
  
  //// OVO NE RADI
  describe('Fluent API with Groups', () => {
    it('should handle GET /api/v1/users', async () => {
      const response = await fetch(`${baseUrl}/api/v1/users`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ users: [] });
    });

    it('should handle POST /api/v1/users', async () => {
      const response = await fetch(`${baseUrl}/api/v1/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'John Doe', email: 'john@example.com' })
      });
      
      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ 
        user: { id: 1, name: 'John Doe', email: 'john@example.com' } 
      });
    });

    it('should handle GET /api/v1/posts', async () => {
      const response = await fetch(`${baseUrl}/api/v1/posts`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ posts: [] });
    });
  });

  describe('Resource Routing', () => {
    it('should handle GET /api/v1/categories', async () => {
      const response = await fetch(`${baseUrl}/api/v1/categories`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ categories: [] });
    });

    it('should handle POST /api/v1/categories', async () => {
      const response = await fetch(`${baseUrl}/api/v1/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Technology', description: 'Tech related posts' })
      });
      
      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ 
        category: { id: 1, name: 'Technology', description: 'Tech related posts' } 
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 500 error', async () => {
      const response = await fetch(`${baseUrl}/api/error`);
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'Test error', status: 500 });
    });

    it('should handle 404 error', async () => {
      const response = await fetch(`${baseUrl}/api/not-found`);
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: 'Resource not found', status: 404 });
    });

    it('should handle 401 error', async () => {
      const response = await fetch(`${baseUrl}/api/unauthorized`);
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'Access denied', status: 401 });
    });

    it('should handle 404 for non-existent routes', async () => {
      const response = await fetch(`${baseUrl}/api/nonexistent`);
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: 'Not Found', status: 404 });
    });
  });
});

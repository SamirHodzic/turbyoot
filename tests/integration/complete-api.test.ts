import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Turbyoot } from '../../src/framework.js';
import { validate } from '../../src/middleware/validation.js';
import { cache, cacheWithStore } from '../../src/middleware/caching.js';
import { initCache, MemoryCacheAdapter } from '../../src/utils/cache.js';
import { auth, requireAuth, requireRole, requirePermission } from '../../src/middleware/auth.js';
import { helmet, cors, rateLimit } from '../../src/middleware/security.js';
import { timeout } from '../../src/middleware/timeout.js';

describe('Complete API Integration Tests', () => {
  let app: Turbyoot;
  let baseUrl: string;

  beforeAll(async () => {
    initCache(new MemoryCacheAdapter());
    app = new Turbyoot();
    
    // Add global middleware
    app.use((ctx: any, next: any) => {
      ctx.state.requestId = Math.random().toString(36).substr(2, 9);
      return next();
    });

    // Setup auth middleware
    const mockUserResolver = async (token: string) => {
      if (token === 'valid-token') {
        return { id: '1', name: 'Test User', roles: ['user'], permissions: ['read:own'] };
      }
      if (token === 'admin-token') {
        return { id: '2', name: 'Admin User', roles: ['admin', 'user'], permissions: ['*'] };
      }
      return null;
    };
    app.use(auth({ userResolver: mockUserResolver }));

    // Setup security middleware
    app.use(helmet());
    app.use(cors({ origin: '*' }));
    app.use(rateLimit({ windowMs: 60000, max: 100 }));

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

    // Test validation middleware
    app.post('/api/validate/user', validate({
      schema: {
        body: {
          name: { required: true, type: 'string', minLength: 2 },
          email: { required: true, type: 'string', pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' },
          age: { type: 'number', min: 18, max: 120 }
        }
      }
    }), (ctx: any) => {
      ctx.created({ 
        user: ctx.body,
        requestId: ctx.state.requestId
      });
    });

    app.post('/api/validate/user-strict', validate({
      schema: {
        body: {
          name: { required: true, type: 'string' },
          email: { required: true, type: 'string' }
        }
      },
      allowUnknown: false
    }), (ctx: any) => {
      ctx.created({ user: ctx.body });
    });

    app.post('/api/validate/user-strip', validate({
      schema: {
        body: {
          name: { required: true, type: 'string' },
          email: { required: true, type: 'string' }
        }
      },
      allowUnknown: true,
      stripUnknown: true
    }), (ctx: any) => {
      ctx.created({ user: ctx.body });
    });

    app.get('/api/validate/search', validate({
      schema: {
        query: {
          q: { required: true, type: 'string', minLength: 2 },
          page: { type: 'number', min: 1 },
          limit: { type: 'number', min: 1, max: 100 }
        }
      }
    }), (ctx: any) => {
      ctx.ok({ 
        query: ctx.query,
        requestId: ctx.state.requestId
      });
    });

    app.get('/api/validate/users/:id', validate({
      schema: {
        params: {
          id: { required: true, type: 'number' }
        }
      }
    }), (ctx: any) => {
      ctx.ok({ 
        userId: ctx.params.id,
        requestId: ctx.state.requestId
      });
    });

    // Test caching middleware
    app.get('/api/cached', cache({ maxAge: 3600, public: true }), (ctx: any) => {
      ctx.json({ message: 'Cached response', timestamp: Date.now() });
    });

    app.get('/api/cached-store', cacheWithStore({ maxAge: 300 }), (ctx: any) => {
      ctx.json({ message: 'Store cached', timestamp: Date.now() });
    });

    app.get('/api/etag', cache({ etag: true }), (ctx: any) => {
      ctx.json({ message: 'ETag test' });
    });

    // Test auth middleware
    app.get('/api/protected', requireAuth(), (ctx: any) => {
      ctx.json({ user: ctx.state.user });
    });

    app.get('/api/admin', requireRole('admin'), (ctx: any) => {
      ctx.json({ message: 'Admin only', user: ctx.state.user });
    });

    app.get('/api/read-all', requirePermission('read:all'), (ctx: any) => {
      ctx.json({ message: 'Read all permission', user: ctx.state.user });
    });

    // Test security middleware endpoints
    app.get('/api/security-test', (ctx: any) => {
      ctx.json({ message: 'Security test' });
    });

    // Test timeout middleware endpoints
    app.get('/api/timeout-fast', timeout({ timeout: 5000 }), (ctx: any) => {
      ctx.ok({ message: 'Request completed quickly' });
    });

    app.get('/api/timeout-slow', timeout({ timeout: 100 }), (ctx: any) => {
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          if (!ctx.res.headersSent) {
            ctx.ok({ message: 'This should timeout' });
          }
          resolve(undefined);
        }, 200);
        ctx.req.on('close', () => {
          clearTimeout(timer);
        });
      });
    });

    app.get('/api/timeout-callback', timeout({ 
      timeout: 100,
      onTimeout: (ctx: any) => {
        ctx.state.timeoutCalled = true;
      }
    }), (ctx: any) => {
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          if (!ctx.res.headersSent) {
            ctx.ok({ message: 'This should timeout' });
          }
          resolve(undefined);
        }, 200);
        ctx.req.on('close', () => {
          clearTimeout(timer);
        });
      });
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
      await new Promise(resolve => setTimeout(resolve, 200));
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

  describe('Validation Middleware', () => {
    it('should validate request body and allow valid data', async () => {
      const response = await fetch(`${baseUrl}/api/validate/user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'John Doe',
          email: 'john@example.com',
          age: 30
        })
      });
      
      expect(response.status).toBe(201);
      const data = await response.json() as any;
      expect(data.user.name).toBe('John Doe');
      expect(data.user.email).toBe('john@example.com');
      expect(data.user.age).toBe(30);
      expect(data.requestId).toBeDefined();
    });

    it('should reject request with missing required field', async () => {
      const response = await fetch(`${baseUrl}/api/validate/user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'John Doe'
        })
      });
      
      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.error).toContain('required');
      expect(data.status).toBe(400);
    });

    it('should reject request with invalid email format', async () => {
      const response = await fetch(`${baseUrl}/api/validate/user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'John Doe',
          email: 'invalid-email'
        })
      });
      
      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.error).toContain('format is invalid');
      expect(data.status).toBe(400);
    });

    it('should reject request with invalid age range', async () => {
      const response = await fetch(`${baseUrl}/api/validate/user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'John Doe',
          email: 'john@example.com',
          age: 150
        })
      });
      
      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.error).toContain('at most 120');
      expect(data.status).toBe(400);
    });

    it('should reject unknown fields when allowUnknown is false', async () => {
      const response = await fetch(`${baseUrl}/api/validate/user-strict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'John Doe',
          email: 'john@example.com',
          unknown: 'field'
        })
      });
      
      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.error).toContain('is not allowed');
      expect(data.status).toBe(400);
    });

    it('should strip unknown fields when stripUnknown is true', async () => {
      const response = await fetch(`${baseUrl}/api/validate/user-strip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'John Doe',
          email: 'john@example.com',
          unknown: 'field',
          another: 'unknown'
        })
      });
      
      expect(response.status).toBe(201);
      const data = await response.json() as any;
      expect(data.user.name).toBe('John Doe');
      expect(data.user.email).toBe('john@example.com');
      expect(data.user.unknown).toBeUndefined();
      expect(data.user.another).toBeUndefined();
    });

    it('should validate query parameters', async () => {
      const response = await fetch(`${baseUrl}/api/validate/search?q=test&page=1&limit=10`);
      
      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.query.q).toBe('test');
      expect(data.query.page).toBe(1);
      expect(data.query.limit).toBe(10);
      expect(data.requestId).toBeDefined();
    });

    it('should reject request with missing required query parameter', async () => {
      const response = await fetch(`${baseUrl}/api/validate/search?page=1&limit=10`);
      
      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.error).toContain('required');
      expect(data.status).toBe(400);
    });

    it('should reject request with invalid query parameter value', async () => {
      const response = await fetch(`${baseUrl}/api/validate/search?q=t&page=1&limit=10`);
      
      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.error).toContain('at least 2 characters');
      expect(data.status).toBe(400);
    });

    it('should validate route parameters', async () => {
      const response = await fetch(`${baseUrl}/api/validate/users/123`);
      
      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.userId).toBe('123');
      expect(data.requestId).toBeDefined();
    });

    it('should reject request with invalid route parameter type', async () => {
      const response = await fetch(`${baseUrl}/api/validate/users/abc`);
      
      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.error).toContain('must be a number');
      expect(data.status).toBe(400);
    });
  });

  describe('Caching Middleware', () => {
    it('should set Cache-Control header with maxAge', async () => {
      const response = await fetch(`${baseUrl}/api/cached`);
      expect(response.status).toBe(200);
      const cacheControl = response.headers.get('Cache-Control');
      expect(cacheControl).toContain('max-age=3600');
      expect(cacheControl).toContain('public');
    });

    it('should set ETag header and return 304 on match', async () => {
      const firstResponse = await fetch(`${baseUrl}/api/etag`);
      expect(firstResponse.status).toBe(200);
      const etag = firstResponse.headers.get('ETag');
      expect(etag).toBeTruthy();

      const secondResponse = await fetch(`${baseUrl}/api/etag`, {
        headers: {
          'If-None-Match': etag!
        }
      });

      expect(secondResponse.status).toBe(304);
    });

    it('should cache response in store and return cached version', async () => {
      const firstResponse = await fetch(`${baseUrl}/api/cached-store`);
      expect(firstResponse.status).toBe(200);
      const firstData = await firstResponse.json() as any;
      const firstCache = firstResponse.headers.get('X-Cache');
      expect(firstCache === 'MISS' || firstCache === null).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 100));

      const secondResponse = await fetch(`${baseUrl}/api/cached-store`);
      expect(secondResponse.status).toBe(200);
      const secondData = await secondResponse.json() as any;
      expect(secondResponse.headers.get('X-Cache')).toBe('HIT');
      expect(firstData.timestamp).toBe(secondData.timestamp);
    });
  });

  describe('Auth Middleware', () => {
    it('should allow access with valid token', async () => {
      const response = await fetch(`${baseUrl}/api/protected`, {
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      });
      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.user).toEqual({ id: '1', name: 'Test User', roles: ['user'], permissions: ['read:own'] });
    });

    it('should reject access without token', async () => {
      const response = await fetch(`${baseUrl}/api/protected`);
      expect(response.status).toBe(401);
      const data = await response.json() as any;
      expect(data).toEqual({
        error: 'Authentication required',
        status: 401
      });
    });

    it('should allow access with required role', async () => {
      const response = await fetch(`${baseUrl}/api/admin`, {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });
      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.message).toBe('Admin only');
      expect(data.user.roles).toContain('admin');
    });

    it('should reject access without required role', async () => {
      const response = await fetch(`${baseUrl}/api/admin`, {
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      });
      expect(response.status).toBe(403);
      const data = await response.json() as any;
      expect(data).toEqual({
        error: 'Insufficient permissions',
        status: 403,
        required: ['admin'],
        userRoles: ['user']
      });
    });

    it('should allow access with required permission', async () => {
      const response = await fetch(`${baseUrl}/api/read-all`, {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });
      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.message).toBe('Read all permission');
    });
  });

  describe('Security Middleware', () => {
    it('should set security headers from helmet', async () => {
      const response = await fetch(`${baseUrl}/api/security-test`);
      expect(response.status).toBe(200);
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(response.headers.get('Strict-Transport-Security')).toBeTruthy();
    });

    it('should set CORS headers', async () => {
      const response = await fetch(`${baseUrl}/api/security-test`, {
        headers: {
          'Origin': 'https://example.com'
        }
      });
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('should handle CORS preflight request', async () => {
      const response = await fetch(`${baseUrl}/api/security-test`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://example.com',
          'Access-Control-Request-Method': 'POST'
        }
      });
      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Methods')).toBeTruthy();
      expect(response.headers.get('Access-Control-Allow-Headers')).toBeTruthy();
    });

    it('should allow requests within rate limit', async () => {
      const responses = await Promise.all(
        Array.from({ length: 5 }, () => fetch(`${baseUrl}/api/security-test`))
      );
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Timeout Middleware', () => {
    it('should complete request that finishes before timeout', async () => {
      const response = await fetch(`${baseUrl}/api/timeout-fast`);
      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.message).toBe('Request completed quickly');
    });

    it('should timeout request that takes too long', async () => {
      const response = await fetch(`${baseUrl}/api/timeout-slow`);
      expect(response.status).toBe(408);
      const data = await response.json() as any;
      expect(data.error).toBe('Request timeout');
      expect(data.status).toBe(408);
      expect(response.headers.get('Connection')).toBe('close');
    });

    it('should call onTimeout callback when timeout occurs', async () => {
      const response = await fetch(`${baseUrl}/api/timeout-callback`);
      expect(response.status).toBe(408);
      const data = await response.json() as any;
      expect(data.error).toBe('Request timeout');
      expect(data.status).toBe(408);
    });
  });
});

// src/server.ts
import { Turbyoot, cors, errorHandler, HttpError, helmet, rateLimit, validate, requestId, Router, healthCheck, compression, timeout, keepAliveTimeout, configureTimeouts, validateQuery, cache, conditional, invalidateCache, initCache, getCache, cacheWithStore, getCacheStats, Context, Middleware, auth, requireAuth, requireRole, requirePermission, setAuthCookie, clearAuthCookie, AuthUser } from './framework.js';

const app = new Turbyoot();

// Initialize cache system (using memory adapter by default)
// For production with Redis, you would do:
// import { createClient } from 'redis';
// const redis = createClient({ url: 'redis://localhost:6379' });
// await redis.connect();
// initCache(new RedisCacheAdapter(redis), 'myapp:');
initCache(); // Uses memory adapter by default

// Auth configuration - framework infrastructure only
const authOptions = {
  secret: process.env.JWT_SECRET || 'your-super-secret-key-change-in-production',
  cookieName: 'turbyoot-auth',
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'lax' as const,
  // Custom token extractor (optional)
  tokenExtractor: (ctx: Context) => {
    // You can implement custom token extraction logic here
    return ctx.req.headers.authorization?.replace('Bearer ', '') || null;
  },
  // Custom user resolver (you implement this based on your auth strategy)
  userResolver: async (token: string): Promise<AuthUser | null> => {
    // Example: Parse JWT token and return user
    // In a real app, you'd validate the token and fetch user from your database
    try {
      // This is just an example - implement your own token validation
      const payload = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString());
      return {
        id: payload.userId,
        email: payload.email,
        roles: payload.roles || ['user']
      };
    } catch {
      return null;
    }
  }
};

// Request ID middleware
app.use(requestId());


// Logger middleware
app.use(async (ctx: Context, next: () => Promise<void>) => {
  const start = Date.now();
  let status = 200;
  
  try {
    await next();
    status = ctx.res.statusCode;
  } catch (err) {
    if (err instanceof HttpError) {
      status = err.status;
    } else {
      status = 500;
    }
    throw err;
  } finally {
    const ms = Date.now() - start;
    // const requestId = ctx.state.requestId || 'unknown';
    console.log(`${ctx.req.method} ${ctx.req.url} -> ${status} ${ms}ms`);
  }
});

// Security headers
app.use(helmet({
  contentSecurityPolicy: "default-src 'self'",
  hsts: { maxAge: 31536000, includeSubDomains: true }
}));

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests, please try again later."
}));

// Error handling
app.use(errorHandler());

// CORS
app.use(cors({
  origin: '*',
  credentials: true
}));

// Compression (disabled for now due to content decoding issues)
// app.use(compression({ threshold: 1024 }));

// Request timeout (30 seconds) - only one timeout middleware needed
app.use(timeout({
  timeout: 30000, // 30 seconds
  onTimeout: (ctx) => {
    console.log(`[${ctx.state.requestId}] Request timed out: ${ctx.req.method} ${ctx.req.url}`);
  }
}));

// Authentication middleware
app.use(auth(authOptions));

// API routes
app.get('/hello', (ctx) => {
  ctx.json({ 
    hello: 'world', 
    timestamp: new Date().toISOString(),
    requestId: ctx.state.requestId 
  });
});

// Validation example - using middleware composition
const userValidation = validate({
  schema: {
    body: {
      name: { required: true, type: 'string', minLength: 2, maxLength: 50 },
      email: { required: true, type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      age: { type: 'number', min: 0, max: 120 }
    }
  }
});

const userIdValidation = validate({
  schema: {
    params: {
      id: { required: true, type: 'number' }
    }
  }
});

app.post('/users', userValidation, (ctx) => {
  ctx.status(201).json({ 
    message: 'User created successfully',
    user: ctx.body,
    requestId: ctx.state.requestId
  });
});

app.get('/users/:id', userIdValidation, (ctx) => {
  const { id } = ctx.params;
  ctx.json({ 
    id: Number(id), 
    name: `User ${id}`,
    query: ctx.query,
    requestId: ctx.state.requestId
  });
});

app.post('/echo', (ctx) => {
  ctx.json({
    method: ctx.req.method,
    body: ctx.body,
    headers: ctx.req.headers,
    timestamp: new Date().toISOString(),
    requestId: ctx.state.requestId
  });
});

// New HTTP methods
app.patch('/users/:id', (ctx) => {
  const { id } = ctx.params;
  ctx.json({ 
    message: `Updated user ${id}`,
    data: ctx.body,
    requestId: ctx.state.requestId
  });
});

app.del('/users/:id', (ctx) => {
  const { id } = ctx.params;
  ctx.statusCode = 204;
  ctx.send('');
});

// Redirect example
app.get('/redirect', (ctx) => {
  ctx.redirect('/hello');
});

// Error example
app.get('/error', (ctx) => {
  throw new HttpError(400, 'This is a test error');
});

// Timeout examples
app.get('/slow', async (ctx) => {
  // This will timeout after 30 seconds
  await new Promise(resolve => setTimeout(resolve, 35000));
  ctx.json({ message: 'This should not be reached' });
});

app.get('/slow-custom', async (ctx) => {
  // This will timeout after 30 seconds (global timeout)
  await new Promise(resolve => setTimeout(resolve, 35000));
  ctx.json({ message: 'This should not be reached' });
});

app.get('/fast', (ctx) => {
  ctx.json({ 
    message: 'This responds quickly',
    timestamp: new Date().toISOString()
  });
});

// Enhanced query parameter examples
app.get('/search', validateQuery({
  q: { required: true, type: 'string', minLength: 1 },
  page: { type: 'number', min: 1, default: 1 },
  limit: { type: 'number', min: 1, max: 100, default: 10 },
  sort: { type: 'string', enum: ['name', 'date', 'popularity'] },
  tags: { type: 'array' },
  active: { type: 'boolean' }
}), (ctx) => {
  ctx.json({
    query: ctx.query,
    message: 'Search with enhanced query parsing',
    parsed: {
      searchTerm: ctx.query.q,
      page: ctx.query.page || 1,
      limit: ctx.query.limit || 10,
      sort: ctx.query.sort || 'name',
      tags: Array.isArray(ctx.query.tags) ? ctx.query.tags : [ctx.query.tags].filter(Boolean),
      active: ctx.query.active !== undefined ? ctx.query.active : true
    }
  });
});

// Caching examples
app.get('/cached-data', cache({
  maxAge: 300, // 5 minutes
  public: true,
  etag: true,
  lastModified: true,
  vary: ['Accept-Encoding']
}), (ctx) => {
  ctx.json({
    data: 'This data is cached for 5 minutes',
    timestamp: new Date().toISOString(),
    cacheInfo: 'Check Cache-Control header'
  });
});

app.get('/long-cache', cache({
  maxAge: 3600, // 1 hour
  immutable: true,
  public: true
}), (ctx) => {
  ctx.json({
    data: 'This data is cached for 1 hour and is immutable',
    timestamp: new Date().toISOString()
  });
});

app.get('/private-cache', cache({
  maxAge: 1800, // 30 minutes
  private: true,
  mustRevalidate: true
}), (ctx) => {
  ctx.json({
    data: 'This data is private and must be revalidated',
    timestamp: new Date().toISOString()
  });
});

// Conditional request example
app.get('/conditional', (ctx) => {
  // Apply conditional middleware
  return conditional()(ctx, async () => {
    // Apply cache middleware
    return cache({
      maxAge: 600, // 10 minutes
      etag: true,
      lastModified: true
    })(ctx, async () => {
      ctx.json({
        data: 'This supports conditional requests (304 Not Modified)',
        timestamp: new Date().toISOString(),
        etag: 'Check ETag header for conditional requests'
      });
    });
  });
});

// Cache invalidation example
app.post('/invalidate', async (ctx) => {
  await invalidateCache('cached-data');
  await invalidateCache('long-cache');
  ctx.json({
    message: 'Cache invalidated for specified patterns',
    timestamp: new Date().toISOString()
  });
});

// Cache adapter examples
app.get('/cached-store', cacheWithStore({
  maxAge: 300, // 5 minutes
  public: true,
  cacheKey: (ctx) => `api:${ctx.req.url}:${ctx.req.headers['user-agent']}`,
  skipCache: (ctx) => ctx.req.headers['x-no-cache'] === 'true'
}), (ctx) => {
  ctx.json({
    message: 'This response is cached in the store (memory/Redis)',
    timestamp: new Date().toISOString(),
    cacheKey: `api:${ctx.req.url}:${ctx.req.headers['user-agent']}`,
    note: 'Try the same request again - it should be faster!'
  });
});

app.get('/cache-stats', async (ctx) => {
  const stats = await getCacheStats();
  ctx.json({
    message: 'Cache statistics',
    stats,
    timestamp: new Date().toISOString()
  });
});

// Manual cache operations
app.get('/cache-test', async (ctx) => {
  const cache = getCache();
  const key = 'test-key';
  
  // Set a value in cache
  await cache.set(key, JSON.stringify({ 
    message: 'Hello from cache!', 
    timestamp: new Date().toISOString() 
  }), 60); // 60 seconds TTL
  
  // Get value from cache
  const cached = await cache.get(key);
  const exists = await cache.exists(key);
  
  ctx.json({
    message: 'Manual cache operations test',
    cached: cached ? JSON.parse(cached) : null,
    exists,
    timestamp: new Date().toISOString()
  });
});

// Cache pattern invalidation
app.post('/invalidate-pattern', async (ctx) => {
  const cache = getCache();
  const patterns = ['api:*', 'user:*'];
  
  await cache.invalidatePatterns(patterns);
  
  ctx.json({
    message: 'Cache patterns invalidated',
    patterns,
    timestamp: new Date().toISOString()
  });
});

// Database simulation and caching examples
let dbCallCount = 0;
let userData = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'user' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'user' }
];

// Simulate database call
async function simulateDbCall(operation: string, id?: number) {
  dbCallCount++;
  console.log(`🗄️  Database call #${dbCallCount}: ${operation}${id ? ` for user ${id}` : ''}`);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  if (operation === 'getUser' && id) {
    return userData.find(user => user.id === id);
  } else if (operation === 'getAllUsers') {
    return userData;
  }
  return null;
}

// Cached user endpoint - demonstrates DB call prevention
app.get('/users/:id', cacheWithStore({
  maxAge: 300, // 5 minutes
  public: true,
  cacheKey: (ctx) => `user:${ctx.params.id}`,
  skipCache: (ctx) => ctx.req.headers['x-no-cache'] === 'true'
}), async (ctx) => {
  const userId = parseInt(ctx.params.id);
  
  // This DB call will be skipped if data is cached!
  const user = await simulateDbCall('getUser', userId);
  
  if (!user) {
    ctx.status(404).json({ error: 'User not found' });
    return;
  }
  
  ctx.json({
    message: 'User data retrieved',
    user,
    dbCalls: dbCallCount,
    cached: false, // This will be true on subsequent requests
    timestamp: new Date().toISOString()
  });
});

// Cached users list endpoint
app.get('/users', cacheWithStore({
  maxAge: 180, // 3 minutes
  public: true,
  cacheKey: () => 'users:list'
}), async (ctx) => {
  // This DB call will be skipped if data is cached!
  const users = await simulateDbCall('getAllUsers');
  
  ctx.json({
    message: 'Users list retrieved',
    users,
    count: 1,
    dbCalls: dbCallCount,
    cached: false,
    timestamp: new Date().toISOString()
  });
});

// Endpoint to show DB call statistics
app.get('/db-stats', (ctx) => {
  ctx.json({
    message: 'Database call statistics',
    totalDbCalls: dbCallCount,
    note: 'Try /users/1 multiple times to see caching in action!'
  });
});

// Endpoint to reset DB call counter
app.post('/reset-db-stats', (ctx) => {
  dbCallCount = 0;
  ctx.json({
    message: 'Database call counter reset',
    timestamp: new Date().toISOString()
  });
});

// Endpoint to update user (invalidates cache)
app.put('/users/:id', async (ctx) => {
  const userId = parseInt(ctx.params.id);
  const updateData = ctx.body as any;
  
  // Update user in "database"
  const userIndex = userData.findIndex(user => user.id === userId);
  if (userIndex === -1) {
    ctx.status(404).json({ error: 'User not found' });
    return;
  }
  
  userData[userIndex] = { ...userData[userIndex], ...updateData };
  
  // Invalidate related cache entries
  const cache = getCache();
  await cache.del(`user:${userId}`);
  await cache.del('users:list');
  
  ctx.json({
    message: 'User updated and cache invalidated',
    user: userData[userIndex],
    dbCalls: dbCallCount,
    timestamp: new Date().toISOString()
  });
});

// Complex query parameter examples
app.get('/complex-query', (ctx) => {
  ctx.json({
    message: 'Complex query parameter parsing examples',
    examples: {
      arrays: '?tags=red&tags=blue&tags=green',
      numbers: '?page=1&limit=20&price=99.99',
      booleans: '?active=true&featured=false',
      json: '?filters={"category":"electronics","price":{"min":100,"max":500}}',
      nulls: '?optional=null&required=value'
    },
    yourQuery: ctx.query
  });
});

// Router example
const apiRouter = new Router();

apiRouter.get('/status', (ctx) => {
  ctx.json({ status: 'API is running', timestamp: new Date().toISOString() });
});

apiRouter.get('/version', (ctx) => {
  ctx.json({ version: '1.0.0', framework: 'Turbyoot' });
});

// Mount the router
apiRouter.mount(app);

// Health check
app.get('/health', healthCheck([
  {
    name: 'database',
    check: async () => {
      // Simulate database check
      await new Promise(resolve => setTimeout(resolve, 100));
      return true;
    },
    timeout: 1000
  },
  {
    name: 'redis',
    check: async () => {
      // Simulate Redis check
      await new Promise(resolve => setTimeout(resolve, 50));
      return true;
    },
    timeout: 500
  }
]));

// Example auth routes - implement your own business logic
app.post('/auth/login', (ctx) => {
  // Example login endpoint - implement your own logic
  ctx.json({
    message: 'Implement your own login logic here',
    note: 'Use setAuthCookie() helper to set auth cookies',
    example: 'setAuthCookie(ctx, token, authOptions)'
  });
});

app.post('/auth/logout', (ctx) => {
  // Example logout endpoint - implement your own logic
  clearAuthCookie(ctx, authOptions);
  ctx.json({
    message: 'Logged out successfully',
    note: 'Use clearAuthCookie() helper to clear auth cookies'
  });
});

// Protected API routes examples
app.get('/protected', requireAuth(), (ctx) => {
  ctx.json({
    message: 'This is a protected route',
    user: ctx.state.user,
    timestamp: new Date().toISOString()
  });
});

app.get('/admin-only', requireRole('admin'), (ctx) => {
  ctx.json({
    message: 'This is an admin-only route',
    user: ctx.state.user,
    timestamp: new Date().toISOString()
  });
});

app.get('/moderator-content', requireRole(['admin', 'moderator']), (ctx) => {
  ctx.json({
    message: 'This is a moderator or admin route',
    user: ctx.state.user,
    timestamp: new Date().toISOString()
  });
});

app.get('/read-permission', requirePermission('read:all'), (ctx) => {
  ctx.json({
    message: 'This requires read:all permission',
    user: ctx.state.user,
    timestamp: new Date().toISOString()
  });
});

// Static file serving (uncomment to enable)
// app.static('./public', '/static');

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`🚀 Turbyoot server listening on http://localhost:${port}`);
  console.log('Available endpoints:');
  console.log('  GET  /hello');
  console.log('  POST /users (with validation)');
  console.log('  GET  /users/:id (with validation)');
  console.log('  POST /echo');
  console.log('  PATCH /users/:id');
  console.log('  DELETE /users/:id');
  console.log('  GET  /redirect');
  console.log('  GET  /error');
  console.log('  GET  /slow (timeout test - 30s)');
  console.log('  GET  /slow-custom (timeout test - 5s)');
  console.log('  GET  /fast (quick response)');
  console.log('  GET  /search (enhanced query parsing)');
  console.log('  GET  /complex-query (query examples)');
  console.log('  GET  /cached-data (5min cache)');
  console.log('  GET  /long-cache (1hr immutable cache)');
  console.log('  GET  /private-cache (30min private cache)');
  console.log('  GET  /conditional (304 Not Modified)');
  console.log('  POST /invalidate (cache invalidation)');
  console.log('  GET  /cached-store (store-based cache)');
  console.log('  GET  /cache-stats (cache statistics)');
  console.log('  GET  /cache-test (manual cache ops)');
  console.log('  POST /invalidate-pattern (pattern invalidation)');
  console.log('  GET  /users/:id (cached user - DB call prevention)');
  console.log('  GET  /users (cached users list)');
  console.log('  PUT  /users/:id (update user + cache invalidation)');
  console.log('  GET  /db-stats (database call statistics)');
  console.log('  POST /reset-db-stats (reset DB counter)');
  console.log('  GET  /api/status');
  console.log('  GET  /api/version');
  console.log('  GET  /health');
  console.log('');
  console.log('🔐 Authentication Infrastructure:');
  console.log('  POST /auth/login (example - implement your own)');
  console.log('  POST /auth/logout (example - implement your own)');
  console.log('  GET  /protected (requires authentication)');
  console.log('  GET  /admin-only (requires admin role)');
  console.log('  GET  /moderator-content (requires moderator/admin role)');
  console.log('  GET  /read-permission (requires read:all permission)');
  console.log('');
  console.log('📚 Framework Auth Middleware Available:');
  console.log('  - auth() - Token extraction and user resolution');
  console.log('  - requireAuth() - Require authentication');
  console.log('  - requireRole() - Require specific roles');
  console.log('  - requirePermission() - Require specific permissions');
  console.log('  - setAuthCookie() - Set authentication cookies');
  console.log('  - clearAuthCookie() - Clear authentication cookies');
  console.log('');
  console.log('Features enabled:');
  console.log('  ✅ Security headers (Helmet)');
  console.log('  ✅ Rate limiting (100 req/15min)');
  console.log('  ✅ Request validation');
  console.log('  ✅ Request ID tracking');
  console.log('  ✅ Response compression');
  console.log('  ✅ CORS support');
  console.log('  ✅ Health checks');
  console.log('  ✅ Router groups');
  console.log('  ✅ Request timeout (30s global, 5s keep-alive)');
  console.log('  ✅ Enhanced query parsing (arrays, numbers, booleans, JSON)');
  console.log('  ✅ Response caching (ETag, Last-Modified, Cache-Control)');
  console.log('  ✅ Conditional requests (304 Not Modified)');
  console.log('  ✅ Cache adapter system (Memory/Redis)');
  console.log('  ✅ Store-based caching with TTL');
  console.log('  ✅ Cache pattern invalidation');
  console.log('  ✅ Authentication infrastructure');
  console.log('  ✅ Role-based access control middleware');
  console.log('  ✅ Permission-based access control middleware');
  console.log('  ✅ Cookie management utilities');
});
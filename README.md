# 🚀 Turbyoot

A modern, intuitive Node.js web framework that makes building APIs simple and enjoyable. Turbyoot combines the best of Express.js with enhanced features like fluent APIs, resource routing, and built-in TypeScript support.

## ✨ Features

- **🎯 Fluent API** - Chainable, intuitive syntax that's more readable than Express
- **📦 Resource Routing** - Automatic CRUD routes with custom handlers and filtering
- **🔗 Grouped Routes** - Organize routes with prefixes and shared middleware
- **🔌 Plugin System** - Extend functionality with a clean plugin architecture
- **🔒 Security** - Built-in security headers, CORS, and rate limiting
- **⚡ Performance** - Request caching, compression, and timeout handling
- **🛡️ Validation** - Request validation and sanitization
- **🔐 Auth Infrastructure** - Flexible authentication and authorization middleware
- **📊 Monitoring** - Request logging, health checks, and metrics
- **🎯 Developer Experience** - TypeScript support, enhanced context, and comprehensive error handling

## 📦 Installation

```bash
npm install turbyoot
# or
yarn add turbyoot
```

## 🚀 Quick Start

```typescript
import { Turbyoot } from 'turbyoot';

const app = new Turbyoot();

// Traditional Express-like syntax (still works!)
app.get('/hello', (ctx) => {
  ctx.json({ message: 'Hello from Turbyoot!' });
});

// Enhanced fluent API
app.route()
  .get('/api/users', (ctx) => {
    ctx.ok({ users: [] });
  })
  .post('/api/users', (ctx) => {
    ctx.created({ user: ctx.body });
  });

// Resource-based routing
app.resource('posts', {
  prefix: '/api',
  handlers: {
    index: (ctx) => ctx.ok({ posts: [] }),
    show: (ctx) => ctx.ok({ post: { id: ctx.params.id } }),
    create: (ctx) => ctx.created({ post: ctx.body }),
    update: (ctx) => ctx.ok({ post: { id: ctx.params.id, ...ctx.body } }),
    destroy: (ctx) => ctx.noContent()
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

## 🎯 Enhanced Features

### 1. Fluent API - More Intuitive Than Express

The fluent API provides a chainable, readable syntax that makes your code more expressive:

```typescript
// Instead of this Express-style code:
app.get('/api/users', authMiddleware, (req, res) => {
  res.json({ users: [] });
});
app.post('/api/users', authMiddleware, (req, res) => {
  res.status(201).json({ user: req.body });
});

// Write this clean, chainable code:
app.route()
  .use(authMiddleware)
  .get('/api/users', (ctx) => {
    ctx.ok({ users: [] });
  })
  .post('/api/users', (ctx) => {
    ctx.created({ user: ctx.body });
  });
```

**Benefits:**
- **Readable**: Code flows naturally from top to bottom
- **DRY**: Apply middleware once, affects all chained routes
- **Type-safe**: Full TypeScript support with IntelliSense
- **Consistent**: Same pattern for all HTTP methods

### 2. Resource-Based Routing - Automatic CRUD Routes

Generate complete REST APIs with just a few lines of code:

```typescript
// Creates: GET /api/posts, POST /api/posts, GET /api/posts/:id, etc.
app.resource('posts', {
  prefix: '/api',
  middleware: [requireAuth()],
  only: ['index', 'show', 'create'], // Only specific actions
  handlers: {
    index: (ctx) => ctx.ok({ posts: await getPosts() }),
    show: (ctx) => ctx.ok({ post: await getPost(ctx.params.id) }),
    create: (ctx) => ctx.created({ post: await createPost(ctx.body) })
  }
});
```

**Available Actions:**
- `index` - GET `/resource` (list all)
- `show` - GET `/resource/:id` (get one)
- `create` - POST `/resource` (create new)
- `update` - PUT `/resource/:id` (update existing)
- `patch` - PATCH `/resource/:id` (partial update)
- `destroy` - DELETE `/resource/:id` (delete)

**Filtering Options:**
- `only: ['index', 'show']` - Only create specific routes
- `except: ['destroy']` - Create all except specified routes
- `middleware: [...]` - Apply middleware to all resource routes
- `prefix: '/api'` - Add URL prefix to all routes

### 3. Grouped Routes - Organize with Shared Middleware

Group related routes with shared prefixes and middleware:

```typescript
// All routes in this group get /api/v1 prefix and auth middleware
app.group('/api/v1', (router) => {
  router
    .get('/users', (ctx) => ctx.ok({ users: [] }))
    .post('/users', (ctx) => ctx.created({ user: ctx.body }))
    .get('/posts', (ctx) => ctx.ok({ posts: [] }));
});

// Nested groups work too
app.group('/admin', (router) => {
  router
    .use(requireRole('admin'))
    .group('/users', (subRouter) => {
      subRouter
        .get('/', (ctx) => ctx.ok({ adminUsers: [] }))
        .del('/:id', (ctx) => ctx.noContent());
    });
});
```

**Use Cases:**
- **API Versioning**: `/api/v1`, `/api/v2`
- **Admin Routes**: `/admin/users`, `/admin/settings`
- **Feature Modules**: `/auth`, `/billing`, `/notifications`
- **Shared Middleware**: Authentication, logging, rate limiting

### 4. Enhanced Context - Intuitive Response Methods

The context object provides intuitive, chainable response methods:

```typescript
app.get('/api/user/:id', (ctx) => {
  // Intuitive status methods
  ctx.ok({ user: userData });           // 200 OK
  ctx.created({ user: newUser });       // 201 Created
  ctx.noContent();                      // 204 No Content
  ctx.badRequest('Invalid data');       // 400 Bad Request
  ctx.unauthorized('Login required');   // 401 Unauthorized
  ctx.forbidden('Access denied');       // 403 Forbidden
  ctx.notFound('User not found');       // 404 Not Found
  ctx.conflict('User exists');          // 409 Conflict
  ctx.unprocessableEntity('Invalid');   // 422 Unprocessable Entity
  ctx.tooManyRequests('Rate limited');  // 429 Too Many Requests
  ctx.internalServerError('Server error'); // 500 Internal Server Error

  // Convenience methods
  ctx.header('X-Custom', 'value');      // Set headers
  ctx.cookie('token', 'value', {        // Set cookies
    httpOnly: true,
    secure: true,
    maxAge: 3600000
  });
  ctx.clearCookie('token');             // Clear cookies

  // Request helpers
  if (ctx.is('json')) {                 // Check content type
    // Handle JSON request
  }
  
  const acceptType = ctx.accepts(['json', 'html']); // Check accepted types
  const userAgent = ctx.get('User-Agent');          // Get header value
});
```

**Benefits:**
- **Semantic**: Method names clearly indicate the response
- **Chainable**: All methods return `this` for chaining
- **Consistent**: Same pattern across all response types
- **Type-safe**: Full TypeScript support with autocomplete

### 5. Plugin System - Extend Functionality

Create and use plugins to extend your application:

```typescript
// Define a plugin
const databasePlugin = {
  name: 'database',
  version: '1.0.0',
  install: (app) => {
    // Add database connection to app
    app.db = createDatabaseConnection();
    
    // Add middleware
    app.use(async (ctx, next) => {
      ctx.db = app.db;
      await next();
    });
  }
};

// Use the plugin
app.plugin(databasePlugin);

// Now you can use ctx.db in your routes
app.get('/users', (ctx) => {
  const users = await ctx.db.query('SELECT * FROM users');
  ctx.ok({ users });
});
```

**Plugin Features:**
- **Lifecycle Hooks**: `install`, `uninstall`, `beforeRoute`, `afterRoute`
- **Dependencies**: Specify required plugins
- **Configuration**: Pass options to plugins
- **Middleware**: Plugins can add global middleware

## 📦 Organized Imports

Turbyoot provides organized imports for better developer experience:

```typescript
// Core framework
import { Turbyoot, healthCheck, Router, HttpError, errorHandler } from 'turbyoot/core';

// Middleware
import { cors, helmet, rateLimit, validate, requestId, compression, timeout } from 'turbyoot/middleware';

// Utilities
import { initCache, getCache, cacheWithStore, invalidateCache } from 'turbyoot/utils';

// Authentication
import { auth, requireAuth, requireRole, setAuthCookie, clearAuthCookie } from 'turbyoot/auth';

// Types
import { Context, Middleware, AuthUser } from 'turbyoot/types';

// Or import everything (backward compatible)
import { Turbyoot, cors, helmet, rateLimit, validate, auth, requireAuth } from 'turbyoot';
```

## 🏗️ Core Framework

### Basic Server Setup

```typescript
import { Turbyoot } from 'turbyoot';

const app = new Turbyoot();

// HTTP Methods
app.get('/users', (ctx) => ctx.json({ users: [] }));
app.post('/users', (ctx) => ctx.json({ created: true }));
app.put('/users/:id', (ctx) => ctx.json({ updated: true }));
app.del('/users/:id', (ctx) => ctx.json({ deleted: true }));
app.patch('/users/:id', (ctx) => ctx.json({ patched: true }));
app.options('/users', (ctx) => ctx.json({ options: true }));
app.head('/users', (ctx) => ctx.res.end());

app.listen(3000);
```

### Enhanced Context Object

The context object provides both traditional Express-like methods and enhanced intuitive methods:

```typescript
app.get('/users/:id', (ctx) => {
  // Request data
  console.log(ctx.req.method);        // 'GET'
  console.log(ctx.req.url);           // '/users/123'
  console.log(ctx.params.id);         // '123'
  console.log(ctx.query.page);        // '1'
  console.log(ctx.body);              // Request body
  
  // Traditional response methods (still work!)
  ctx.status(200);                    // Set status code
  ctx.json({ user: { id: 123 } });    // Send JSON
  ctx.send('Hello World');            // Send text
  ctx.redirect('/login');             // Redirect
  ctx.type('application/json');       // Set content type
  
  // Enhanced intuitive methods (recommended!)
  ctx.ok({ user: { id: 123 } });      // 200 OK with JSON
  ctx.created({ user: newUser });     // 201 Created
  ctx.badRequest('Invalid data');     // 400 Bad Request
  ctx.unauthorized('Login required'); // 401 Unauthorized
  ctx.notFound('User not found');     // 404 Not Found
  
  // Convenience methods
  ctx.header('X-Custom', 'value');    // Set headers
  ctx.cookie('token', 'value');       // Set cookies
  ctx.clearCookie('token');           // Clear cookies
  
  // Request helpers
  if (ctx.is('json')) {               // Check content type
    // Handle JSON request
  }
  const userAgent = ctx.get('User-Agent'); // Get header value
});
```

## 🛡️ Security

### Security Headers (Helmet-like)

```typescript
import { helmet } from 'turbyoot/middleware';

app.use(helmet({
  contentSecurityPolicy: "default-src 'self'",
  hsts: { maxAge: 31536000, includeSubDomains: true },
  xssFilter: true,
  noSniff: true
}));
```

### CORS

```typescript
import { cors } from 'turbyoot/middleware';

app.use(cors({
  origin: ['http://localhost:3000', 'https://myapp.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
```

### Rate Limiting

```typescript
import { rateLimit } from 'turbyoot/middleware';

app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests, please try again later."
}));
```

## ✅ Validation

### Request Validation

```typescript
import { validate } from 'turbyoot/middleware';

const userValidation = validate({
  schema: {
    body: {
      name: { required: true, type: 'string', minLength: 2 },
      email: { required: true, type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      age: { type: 'number', min: 0, max: 120 }
    },
    params: {
      id: { required: true, type: 'number' }
    }
  }
});

app.post('/users', userValidation, (ctx) => {
  // ctx.body is validated
  ctx.json({ message: 'User created', user: ctx.body });
});
```

### Query Parameter Validation

```typescript
import { validateQuery } from 'turbyoot';

app.get('/search', validateQuery({
  q: { required: true, type: 'string', minLength: 2 },
  page: { type: 'number', min: 1 },
  limit: { type: 'number', min: 1, max: 100 }
}), (ctx) => {
  // ctx.query is validated and parsed
  ctx.json({ results: [], query: ctx.query });
});
```

## 🔐 Authentication & Authorization

### Auth Middleware

```typescript
import { auth, requireAuth, requireRole, requirePermission } from 'turbyoot/auth';

// Configure auth middleware with your own token handling
app.use(auth({
  userResolver: async (token) => {
    // Your JWT validation and user lookup logic
    // You need to implement this yourself
    const user = await validateTokenAndGetUser(token);
    return user;
  }
}));

// Protect routes
app.get('/protected', requireAuth(), (ctx) => {
  ctx.json({ user: ctx.state.user });
});

app.get('/admin', requireRole('admin'), (ctx) => {
  ctx.json({ message: 'Admin only' });
});

app.get('/read-data', requirePermission('read:all'), (ctx) => {
  ctx.json({ data: 'sensitive data' });
});
```

### Cookie Management

```typescript
import { setAuthCookie, clearAuthCookie } from 'turbyoot/auth';

app.post('/login', (ctx) => {
  // Your login logic - you need to implement token generation
  const token = generateToken(user); // You implement this
  setAuthCookie(ctx, token, authOptions);
  ctx.json({ message: 'Logged in' });
});

app.post('/logout', (ctx) => {
  clearAuthCookie(ctx, authOptions);
  ctx.json({ message: 'Logged out' });
});
```

### Complete Auth Example

```typescript
import jwt from 'jsonwebtoken';
import { auth, requireAuth, setAuthCookie, clearAuthCookie } from 'turbyoot/auth';

// Your JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Configure auth middleware
app.use(auth({
  userResolver: async (token) => {
    try {
      // Validate JWT token
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // Look up user in your database
      const user = await getUserById(decoded.userId);
      return user;
    } catch (error) {
      return null; // Invalid token
    }
  }
}));

// Login route
app.post('/login', (ctx) => {
  const { email, password } = ctx.body;
  
  // Your authentication logic
  const user = await authenticateUser(email, password);
  if (!user) {
    ctx.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  
  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  // Set cookie
  setAuthCookie(ctx, token, {});
  ctx.json({ message: 'Logged in', user: { id: user.id, email: user.email } });
});

// Logout route
app.post('/logout', (ctx) => {
  clearAuthCookie(ctx, {});
  ctx.json({ message: 'Logged out' });
});
```

## ⚡ Performance

### Response Caching

```typescript
import { cache, cacheWithStore } from 'turbyoot';

// Header-based caching
app.get('/static-data', cache({
  maxAge: 3600, // 1 hour
  public: true,
  etag: true,
  lastModified: true
}), (ctx) => {
  ctx.json({ data: 'expensive computation' });
});

// Store-based caching
app.get('/users', cacheWithStore({
  maxAge: 300, // 5 minutes
  cacheKey: 'users:list'
}), (ctx) => {
  // This will be cached in memory/Redis
  ctx.json({ users: await getUsersFromDB() });
});
```

### Compression

```typescript
import { compression } from 'turbyoot';

app.use(compression({
  threshold: 1024, // Only compress responses > 1KB
  level: 6 // Compression level (1-9)
}));
```

### Request Timeout

```typescript
import { timeout } from 'turbyoot';

app.use(timeout({
  timeout: 30000, // 30 seconds
  onTimeout: (ctx) => {
    console.log(`Request timed out: ${ctx.req.url}`);
  }
}));
```

## 📊 Monitoring & Logging

### Request Logging

```typescript
import { requestId, logger } from 'turbyoot';

app.use(requestId()); // Add unique request ID
app.use(logger());    // Log all requests
```

### Health Checks

```typescript
import { healthCheck } from 'turbyoot';

app.get('/health', healthCheck([
  {
    name: 'database',
    check: async () => {
      const isConnected = await checkDatabaseConnection();
      return isConnected;
    },
    timeout: 5000
  },
  {
    name: 'redis',
    check: async () => {
      const isConnected = await checkRedisConnection();
      return isConnected;
    },
    timeout: 2000
  }
]));
```

## 🗂️ Route Organization

### Router Groups

```typescript
import { Router } from 'turbyoot';

const apiRouter = new Router({ prefix: '/api' });

apiRouter.get('/users', (ctx) => ctx.json({ users: [] }));
apiRouter.post('/users', (ctx) => ctx.json({ created: true }));

// Mount the router
apiRouter.mount(app);
```

## 🔧 Error Handling

### Built-in Error Handling

```typescript
import { errorHandler, HttpError } from 'turbyoot';

app.use(errorHandler());

app.get('/error', (ctx) => {
  throw new HttpError(400, 'Something went wrong');
});

app.get('/server-error', (ctx) => {
  throw new Error('Internal server error');
});
```

## 📝 Middleware

### Custom Middleware

```typescript
// Custom middleware
app.use(async (ctx, next) => {
  console.log(`Request: ${ctx.req.method} ${ctx.req.url}`);
  await next();
  console.log(`Response: ${ctx.res.statusCode}`);
});

// Middleware with route-specific middleware
app.get('/users', 
  validate({ schema: { query: { page: { type: 'number' } } } }),
  (ctx) => {
    ctx.json({ users: [] });
  }
);
```

## 🎯 TypeScript Support

Turbyoot is built with TypeScript and provides full type safety:

```typescript
import { Turbyoot, Context, Middleware } from 'turbyoot';

const app = new Turbyoot();

const myMiddleware: Middleware = async (ctx: Context, next) => {
  // Full type safety
  console.log(ctx.params.id); // string | undefined
  await next();
};
```

## 🌟 Real-World Examples

### Complete API with Authentication

```typescript
import { Turbyoot, auth, requireAuth, requireRole } from 'turbyoot';

const app = new Turbyoot();

// Global middleware
app.use(helmet());
app.use(cors());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Authentication setup
app.use(auth({
  userResolver: async (token) => {
    // Your JWT validation logic
    return await validateToken(token);
  }
}));

// Public routes
app.get('/health', (ctx) => ctx.ok({ status: 'healthy' }));
app.post('/auth/login', (ctx) => {
  // Login logic
  const token = generateToken(ctx.body);
  ctx.cookie('token', token, { httpOnly: true });
  ctx.ok({ token });
});

// Protected API routes
app.group('/api', (router) => {
  router
    .use(requireAuth())
    .resource('users', {
      handlers: {
        index: async (ctx) => {
          const users = await User.findAll();
          ctx.ok({ users });
        },
        show: async (ctx) => {
          const user = await User.findById(ctx.params.id);
          if (!user) return ctx.notFound('User not found');
          ctx.ok({ user });
        },
        create: async (ctx) => {
          const user = await User.create(ctx.body);
          ctx.created({ user });
        },
        update: async (ctx) => {
          const user = await User.update(ctx.params.id, ctx.body);
          ctx.ok({ user });
        },
        destroy: async (ctx) => {
          await User.delete(ctx.params.id);
          ctx.noContent();
        }
      }
    })
    .resource('posts', {
      only: ['index', 'show', 'create'],
      handlers: {
        index: async (ctx) => {
          const posts = await Post.findByUser(ctx.state.user.id);
          ctx.ok({ posts });
        },
        show: async (ctx) => {
          const post = await Post.findById(ctx.params.id);
          if (!post) return ctx.notFound('Post not found');
          ctx.ok({ post });
        },
        create: async (ctx) => {
          const post = await Post.create({
            ...ctx.body,
            userId: ctx.state.user.id
          });
          ctx.created({ post });
        }
      }
    });
});

// Admin routes
app.group('/admin', (router) => {
  router
    .use(requireRole('admin'))
    .get('/stats', (ctx) => {
      ctx.ok({ stats: await getAdminStats() });
    })
    .del('/users/:id', async (ctx) => {
      await User.forceDelete(ctx.params.id);
      ctx.noContent();
    });
});

app.listen(3000);
```

### E-commerce API with Resource Routing

```typescript
// Products API
app.resource('products', {
  prefix: '/api',
  handlers: {
    index: async (ctx) => {
      const { page = 1, limit = 10, category } = ctx.query;
      const products = await Product.findWithPagination({
        page, limit, category
      });
      ctx.ok({ products, pagination: { page, limit } });
    },
    show: async (ctx) => {
      const product = await Product.findByIdWithReviews(ctx.params.id);
      if (!product) return ctx.notFound('Product not found');
      ctx.ok({ product });
    },
    create: async (ctx) => {
      const product = await Product.create(ctx.body);
      ctx.created({ product });
    }
  }
});

// Orders API with custom actions
app.resource('orders', {
  prefix: '/api',
  middleware: [requireAuth()],
  only: ['index', 'show', 'create'],
  handlers: {
    index: async (ctx) => {
      const orders = await Order.findByUser(ctx.state.user.id);
      ctx.ok({ orders });
    },
    show: async (ctx) => {
      const order = await Order.findByIdAndUser(
        ctx.params.id, 
        ctx.state.user.id
      );
      if (!order) return ctx.notFound('Order not found');
      ctx.ok({ order });
    },
    create: async (ctx) => {
      const order = await Order.createFromCart(
        ctx.state.user.id, 
        ctx.body
      );
      ctx.created({ order });
    }
  }
});

// Custom order actions
app.group('/api/orders', (router) => {
  router
    .use(requireAuth())
    .post('/:id/cancel', async (ctx) => {
      const order = await Order.cancel(ctx.params.id, ctx.state.user.id);
      ctx.ok({ order });
    })
    .post('/:id/refund', requireRole('admin'), async (ctx) => {
      const refund = await Order.refund(ctx.params.id);
      ctx.ok({ refund });
    });
});
```

### Microservice with Plugin System

```typescript
// Database plugin
const databasePlugin = {
  name: 'database',
  install: (app) => {
    app.db = new Database(process.env.DATABASE_URL);
    app.use(async (ctx, next) => {
      ctx.db = app.db;
      await next();
    });
  }
};

// Cache plugin
const cachePlugin = {
  name: 'cache',
  install: (app) => {
    app.cache = new RedisCache(process.env.REDIS_URL);
    app.use(async (ctx, next) => {
      ctx.cache = app.cache;
      await next();
    });
  }
};

// Email plugin
const emailPlugin = {
  name: 'email',
  install: (app) => {
    app.email = new EmailService(process.env.SENDGRID_API_KEY);
    app.use(async (ctx, next) => {
      ctx.email = app.email;
      await next();
    });
  }
};

// Apply plugins
app.plugin(databasePlugin);
app.plugin(cachePlugin);
app.plugin(emailPlugin);

// Use in routes
app.post('/api/notifications', async (ctx) => {
  const notification = await ctx.db.notifications.create(ctx.body);
  
  // Cache the notification
  await ctx.cache.set(`notification:${notification.id}`, notification);
  
  // Send email
  await ctx.email.send({
    to: ctx.body.email,
    subject: 'New Notification',
    template: 'notification',
    data: notification
  });
  
  ctx.created({ notification });
});
```

## 🚀 Advanced Features

### Cache Adapter System

```typescript
import { initCache, MemoryCacheAdapter, RedisCacheAdapter } from 'turbyoot';

// Memory cache (default)
initCache();

// Redis cache
import { createClient } from 'redis';
const redis = createClient({ url: 'redis://localhost:6379' });
await redis.connect();
initCache(new RedisCacheAdapter(redis), 'myapp:');
```

### Enhanced Query Parsing

```typescript
// Automatic type conversion
// ?page=1&active=true&tags=js,node&data={"key":"value"}
// becomes: { page: 1, active: true, tags: ['js', 'node'], data: { key: 'value' } }

app.get('/search', (ctx) => {
  console.log(ctx.query.page);    // number: 1
  console.log(ctx.query.active);  // boolean: true
  console.log(ctx.query.tags);    // array: ['js', 'node']
  console.log(ctx.query.data);    // object: { key: 'value' }
});
```

## 📚 API Reference

### Turbyoot Class

```typescript
class Turbyoot {
  // Traditional HTTP Methods (Express-like)
  get(path: string, handler: RouteHandler): void;
  get(path: string, middleware: Middleware, handler: RouteHandler): void;
  post(path: string, handler: RouteHandler): void;
  post(path: string, middleware: Middleware, handler: RouteHandler): void;
  put(path: string, handler: RouteHandler): void;
  del(path: string, handler: RouteHandler): void;
  patch(path: string, handler: RouteHandler): void;
  options(path: string, handler: RouteHandler): void;
  head(path: string, handler: RouteHandler): void;
  
  // Enhanced Fluent API
  route(): FluentRoute;                    // Create fluent route builder
  group(prefix: string, callback: (router: FluentRouter) => void): void;
  resource(name: string, options: ResourceOptions): void;
  
  // Plugin System
  plugin(plugin: Plugin): Turbyoot;
  
  // Middleware
  use(middleware: Middleware): void;
  
  // Server
  listen(port: number, callback?: () => void): void;
  close(): void;
}
```

### FluentRoute Interface

```typescript
interface FluentRoute {
  // HTTP Methods (chainable)
  get(path: string, handler: RouteHandler): FluentRoute;
  post(path: string, handler: RouteHandler): FluentRoute;
  put(path: string, handler: RouteHandler): FluentRoute;
  del(path: string, handler: RouteHandler): FluentRoute;
  patch(path: string, handler: RouteHandler): FluentRoute;
  options(path: string, handler: RouteHandler): FluentRoute;
  head(path: string, handler: RouteHandler): FluentRoute;
  
  // Middleware (chainable)
  use(middleware: Middleware): FluentRoute;
  
  // Nested groups
  group(prefix: string, callback: (router: FluentRouter) => void): FluentRoute;
}
```

### ResourceOptions Interface

```typescript
interface ResourceOptions {
  prefix?: string;                    // URL prefix (e.g., '/api')
  middleware?: Middleware[];          // Middleware for all routes
  only?: string[];                   // Only create specific actions
  except?: string[];                 // Create all except specified actions
  handlers?: {                       // Custom handlers for each action
    index?: RouteHandler;            // GET /resource
    show?: RouteHandler;             // GET /resource/:id
    create?: RouteHandler;           // POST /resource
    update?: RouteHandler;           // PUT /resource/:id
    patch?: RouteHandler;            // PATCH /resource/:id
    destroy?: RouteHandler;          // DELETE /resource/:id
  };
}
```

### Enhanced Context Object

```typescript
interface Context {
  req: IncomingMessage;
  res: ServerResponse;
  params: Record<string, string>;
  query: Record<string, any>;
  body: any;
  statusCode: number;
  state: Record<string, any>;
  
  // Traditional response methods (Express-like)
  json(data: any): Context;
  status(code: number): Context;
  redirect(url: string, status?: number): void;
  type(contentType: string): Context;
  send(data: any): Context;
  
  // Enhanced intuitive response methods
  ok(data?: any): Context;                    // 200 OK
  created(data?: any): Context;               // 201 Created
  noContent(): Context;                       // 204 No Content
  badRequest(message?: string): Context;      // 400 Bad Request
  unauthorized(message?: string): Context;    // 401 Unauthorized
  forbidden(message?: string): Context;       // 403 Forbidden
  notFound(message?: string): Context;        // 404 Not Found
  conflict(message?: string): Context;        // 409 Conflict
  unprocessableEntity(message?: string): Context; // 422 Unprocessable Entity
  tooManyRequests(message?: string): Context; // 429 Too Many Requests
  internalServerError(message?: string): Context; // 500 Internal Server Error
  
  // Convenience methods
  header(name: string, value: string): Context;
  cookie(name: string, value: string, options?: any): Context;
  clearCookie(name: string): Context;
  
  // Request helpers
  is(type: string): boolean;
  accepts(types: string[]): string | false;
  get(header: string): string | undefined;
}
```

## 🆚 Why Turbyoot Over Express.js?

| Feature | Express.js | Turbyoot |
|---------|------------|----------|
| **Setup** | `const app = express()` | `const app = new Turbyoot()` |
| **Route Definition** | Verbose, repetitive | Fluent, chainable |
| **Resource Routes** | Manual CRUD setup | Automatic with `app.resource()` |
| **Response Methods** | `res.status(200).json()` | `ctx.ok()` |
| **Route Organization** | Manual grouping | `app.group()` with shared middleware |
| **TypeScript** | Additional setup required | Built-in, zero config |
| **Plugin System** | Manual middleware | Structured `app.plugin()` |
| **Error Handling** | Manual setup | Built-in with `HttpError` |
| **Validation** | External libraries | Built-in with `validate()` |
| **Caching** | External libraries | Built-in with `cache()` |
| **Health Checks** | Manual implementation | Built-in with `healthCheck()` |

### Code Comparison

**Express.js:**
```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Global middleware
app.use(cors());
app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Manual CRUD routes
app.get('/api/users', authMiddleware, (req, res) => {
  res.status(200).json({ users: [] });
});
app.post('/api/users', authMiddleware, (req, res) => {
  res.status(201).json({ user: req.body });
});
app.get('/api/users/:id', authMiddleware, (req, res) => {
  res.status(200).json({ user: { id: req.params.id } });
});
app.put('/api/users/:id', authMiddleware, (req, res) => {
  res.status(200).json({ user: { id: req.params.id, ...req.body } });
});
app.delete('/api/users/:id', authMiddleware, (req, res) => {
  res.status(204).send();
});
```

**Turbyoot:**
```typescript
import { Turbyoot } from 'turbyoot';

const app = new Turbyoot();

// Global middleware
app.use(cors());
app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Automatic CRUD routes
app.resource('users', {
  prefix: '/api',
  middleware: [authMiddleware],
  handlers: {
    index: (ctx) => ctx.ok({ users: [] }),
    create: (ctx) => ctx.created({ user: ctx.body }),
    show: (ctx) => ctx.ok({ user: { id: ctx.params.id } }),
    update: (ctx) => ctx.ok({ user: { id: ctx.params.id, ...ctx.body } }),
    destroy: (ctx) => ctx.noContent()
  }
});
```

**Result:** 50% less code, more readable, type-safe, and maintainable! 🚀

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Inspired by Express.js and other modern web frameworks, built with ❤️ for the Node.js community.

---

**Turbyoot** - Lightweight, fast, and flexible. Perfect for building modern web applications. 🚀
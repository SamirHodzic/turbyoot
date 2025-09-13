# 🚀 Turbyoot

A lightweight, high-performance Node.js web framework built for modern applications. Turbyoot provides essential HTTP infrastructure while keeping business logic in your hands.

## ✨ Features

- **🏗️ Modular Architecture** - Clean, organized codebase with logical separation
- **🔒 Security** - Built-in security headers, CORS, and rate limiting
- **⚡ Performance** - Request caching, compression, and timeout handling
- **🛡️ Validation** - Request validation and sanitization
- **🔐 Auth Infrastructure** - Flexible authentication and authorization middleware
- **📊 Monitoring** - Request logging, health checks, and metrics
- **🎯 Developer Experience** - TypeScript support, intuitive API, and comprehensive error handling

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

app.get('/hello', (ctx) => {
  ctx.json({ message: 'Hello from Turbyoot!' });
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

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

### Context Object

```typescript
app.get('/users/:id', (ctx) => {
  // Request data
  console.log(ctx.req.method);        // 'GET'
  console.log(ctx.req.url);           // '/users/123'
  console.log(ctx.params.id);         // '123'
  console.log(ctx.query.page);        // '1'
  console.log(ctx.body);              // Request body
  
  // Response methods
  ctx.status(200);                    // Set status code
  ctx.json({ user: { id: 123 } });    // Send JSON
  ctx.send('Hello World');            // Send text
  ctx.redirect('/login');             // Redirect
  ctx.type('application/json');       // Set content type
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
  // HTTP Methods
  get(path: string, handler: RouteHandler): void;
  get(path: string, middleware: Middleware, handler: RouteHandler): void;
  post(path: string, handler: RouteHandler): void;
  post(path: string, middleware: Middleware, handler: RouteHandler): void;
  put(path: string, handler: RouteHandler): void;
  del(path: string, handler: RouteHandler): void;
  patch(path: string, handler: RouteHandler): void;
  options(path: string, handler: RouteHandler): void;
  head(path: string, handler: RouteHandler): void;
  
  // Middleware
  use(middleware: Middleware): void;
  
  // Server
  listen(port: number, callback?: () => void): void;
  close(): void;
}
```

### Context Object

```typescript
interface Context {
  req: IncomingMessage;
  res: ServerResponse;
  params: Record<string, string>;
  query: Record<string, any>;
  body: any;
  statusCode: number;
  state: Record<string, any>;
  
  // Response methods
  json(data: any): void;
  status(code: number): Context;
  redirect(url: string, status?: number): void;
  type(contentType: string): void;
  send(data: any): void;
}
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Inspired by Express.js and other modern web frameworks, built with ❤️ for the Node.js community.

---

**Turbyoot** - Lightweight, fast, and flexible. Perfect for building modern web applications. 🚀
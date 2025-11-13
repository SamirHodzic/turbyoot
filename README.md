# Turbyoot

[![npm version](https://badgers.space/npm/version/turbyoot)](https://www.npmjs.com/package/turbyoot)
[![GitHub Actions](https://badgers.space/github/checks/SamirHodzic/turbyoot)](https://github.com/SamirHodzic/turbyoot/actions)
[![License: MIT](https://badgers.space/github/license/SamirHodzic/turbyoot)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://badgers.space/badge/node/%3E=20/orange)](https://nodejs.org/)

**A modern, simple and intuitive Node.js web framework that makes building APIs simple and enjoyable.**

Turbyoot is a zero-runtime dependency framework that combines Koa's middleware pattern with Express's routing API, enhanced with modern features like fluent APIs and resource routing. Built with TypeScript, it provides a clean, chainable syntax for defining routes and comes with essential middleware for security, validation, and performance.

> **Note:** Turbyoot is currently just hobby project with occasional development and is not production ready. The API may change, and there may be bugs or rough edges on parts where I didn't pay enough attention. Use at your own risk (or curiosity).

## Installation

This is a [Node.js](https://nodejs.org/en/) module available through the [npm registry](https://www.npmjs.com/).

Before installing, [download and install Node.js](https://nodejs.org/en/download/). Node.js 20 or higher is required.

Installation is done using the [`npm install` command](https://docs.npmjs.com/getting-started/installing-npm-packages-locally):

```bash
npm install turbyoot
```

## Quick Start

The quickest way to get started with Turbyoot:

```js
import { Turbyoot } from 'turbyoot';

const app = new Turbyoot();

app.get('/', (ctx) => {
  ctx.ok({ message: 'Hello World' });
});

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
```

## Features

- **Zero Dependencies** - Lightweight framework with no external runtime dependencies
- **Fluent API** - Chainable, intuitive syntax for clean and readable code
- **Resource Routing** - Automatic CRUD routes with custom handlers and filtering
- **Grouped Routes** - Organize routes with prefixes and shared middleware
- **Plugin System** - Extend functionality with a clean plugin architecture
- **Security** - Built-in security headers, CORS, and rate limiting
- **Performance** - Request caching, compression, and timeout handling
- **Validation** - Request validation and sanitization
- **Auth Infrastructure** - Flexible authentication and authorization middleware
- **TypeScript Support** - Built with TypeScript, full type safety out of the box

## Basic Usage

### Traditional Routing

```js
import { Turbyoot } from 'turbyoot';

const app = new Turbyoot();

app.get('/users', (ctx) => {
  ctx.ok({ users: [] });
});

app.post('/users', (ctx) => {
  ctx.created({ user: ctx.body });
});

app.listen(3000);
```

### Fluent API

```js
app.route()
  .use(authMiddleware)
  .get('/api/users', (ctx) => {
    ctx.ok({ users: [] });
  })
  .post('/api/users', (ctx) => {
    ctx.created({ user: ctx.body });
  });
```

### Resource Routing

```js
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
```

### Grouped Routes

```js
app.group('/api/v1', (router) => {
  router
    .get('/users', (ctx) => ctx.ok({ users: [] }))
    .post('/users', (ctx) => ctx.created({ user: ctx.body }))
    .get('/posts', (ctx) => ctx.ok({ posts: [] }));
});
```

### Middleware

```js
import { cors, helmet, rateLimit, validate } from 'turbyoot/middleware';

app.use(helmet());
app.use(cors({ origin: 'https://example.com' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

app.post('/users', validate({
  schema: {
    body: {
      name: { required: true, type: 'string' },
      email: { required: true, type: 'string' }
    }
  }
}), (ctx) => {
  ctx.created({ user: ctx.body });
});
```

### Enhanced Context

The context object provides intuitive response methods:

```js
app.get('/users/:id', (ctx) => {
  ctx.ok({ user: userData });           // 200 OK
  ctx.created({ user: newUser });       // 201 Created
  ctx.badRequest('Invalid data');       // 400 Bad Request
  ctx.unauthorized('Login required');    // 401 Unauthorized
  ctx.notFound('User not found');       // 404 Not Found
  ctx.internalServerError('Error');     // 500 Internal Server Error
});
```

## Idea

Turbyoot is a hybrid framework that brings together the best of both worlds:

- **Koa-style middleware pattern** - Async/await middleware with context-based request handling
- **Express-style routing API** - Familiar routing methods (`app.get()`, `app.post()`, etc.)
- **Modern enhancements** - Fluent API, resource routing, and enhanced context methods

The framework is designed with zero dependencies, providing a lightweight foundation for building web APIs. It combines the simplicity of traditional routing with powerful features like fluent APIs and resource routing, making it easy to build both simple and complex applications. Or simply - Koa's middleware pattern meets Express's routing, with modern enhancements.

## Examples

To view the examples, clone the Turbyoot repository:

```bash
git clone https://github.com/SamirHodzic/turbyoot.git && cd turbyoot
```

Then install the dependencies:

```bash
npm install
```

Then run whichever example you want:

```bash
node examples/hello-world
```

Available examples:
- [hello-world](./examples/hello-world) - Simple request handler
- [auth-cookies](./examples/auth-cookies) - Authentication with cookie-based sessions
- [auth-jwt](./examples/auht-jwt) - Authentication with JWT tokens
- [static-serving](./examples/static-serving) - Serving static files
- [file-upload](./examples/file-upload) - Uploading files with multipart/form-data
- [fluent-routing](./examples/fluent-routing) - Fluent API for route definitions
- [resource-routing](./examples/resource-routing) - Multiple HTTP operations on the same resource
- [plugins](./examples/plugins) - Working with plugins

See the [examples directory](./examples) for more.

## Contributing

The Turbyoot project welcomes all constructive contributions. Contributions take many forms, from code for bug fixes and enhancements, to additions and fixes to documentation, additional tests, triaging incoming pull requests and issues, and more!

### Running Tests

To run the test suite, first install the dev dependencies:

```bash
npm install
```

Then run `npm test`:

```bash
npm test
```

## License

[MIT](LICENSE)

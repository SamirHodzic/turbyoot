import { Turbyoot } from '../../src/framework.js';
import { Context } from '../../src/types.js';

/**
 * Create a test Turbyoot instance
 */
export function createTestApp(): Turbyoot {
  return new Turbyoot();
}

/**
 * Create a mock context object for testing
 */
export function createMockContext(overrides: Partial<Context> = {}): Context {
  const mockReq = {
    method: 'GET',
    url: '/test',
    headers: {},
    on: jest.fn(),
    ...overrides.req
  } as any;

  const mockRes = {
    statusCode: 200,
    setHeader: jest.fn(),
    removeHeader: jest.fn(),
    writeHead: jest.fn(),
    write: jest.fn(),
    end: jest.fn(),
    ...overrides.res
  } as any;

  const mockContext = {
    req: mockReq,
    res: mockRes,
    params: {},
    query: {},
    body: {},
    statusCode: 200,
    state: {},
    
    // Enhanced response methods
    ok: jest.fn((data?: any) => {
      mockContext.statusCode = 200;
      if (data) {
        mockRes.writeHead(200, { 'Content-Type': 'application/json' });
        mockRes.write(JSON.stringify(data));
        mockRes.end();
      }
      return mockContext;
    }),
    created: jest.fn((data?: any) => {
      mockContext.statusCode = 201;
      if (data) {
        mockRes.writeHead(201, { 'Content-Type': 'application/json' });
        mockRes.write(JSON.stringify(data));
        mockRes.end();
      }
      return mockContext;
    }),
    noContent: jest.fn(() => {
      mockContext.statusCode = 204;
      mockRes.writeHead(204);
      mockRes.end();
      return mockContext;
    }),
    badRequest: jest.fn((message?: string) => {
      mockContext.statusCode = 400;
      mockRes.writeHead(400, { 'Content-Type': 'application/json' });
      mockRes.write(JSON.stringify({ error: message || 'Bad Request' }));
      mockRes.end();
      return mockContext;
    }),
    unauthorized: jest.fn((message?: string) => {
      mockContext.statusCode = 401;
      mockRes.writeHead(401, { 'Content-Type': 'application/json' });
      mockRes.write(JSON.stringify({ error: message || 'Unauthorized' }));
      mockRes.end();
      return mockContext;
    }),
    forbidden: jest.fn((message?: string) => {
      mockContext.statusCode = 403;
      mockRes.writeHead(403, { 'Content-Type': 'application/json' });
      mockRes.write(JSON.stringify({ error: message || 'Forbidden' }));
      mockRes.end();
      return mockContext;
    }),
    notFound: jest.fn((message?: string) => {
      mockContext.statusCode = 404;
      mockRes.writeHead(404, { 'Content-Type': 'application/json' });
      mockRes.write(JSON.stringify({ error: message || 'Not Found' }));
      mockRes.end();
      return mockContext;
    }),
    conflict: jest.fn((message?: string) => {
      mockContext.statusCode = 409;
      mockRes.writeHead(409, { 'Content-Type': 'application/json' });
      mockRes.write(JSON.stringify({ error: message || 'Conflict' }));
      mockRes.end();
      return mockContext;
    }),
    unprocessableEntity: jest.fn((message?: string) => {
      mockContext.statusCode = 422;
      mockRes.writeHead(422, { 'Content-Type': 'application/json' });
      mockRes.write(JSON.stringify({ error: message || 'Unprocessable Entity' }));
      mockRes.end();
      return mockContext;
    }),
    tooManyRequests: jest.fn((message?: string) => {
      mockContext.statusCode = 429;
      mockRes.writeHead(429, { 'Content-Type': 'application/json' });
      mockRes.write(JSON.stringify({ error: message || 'Too Many Requests' }));
      mockRes.end();
      return mockContext;
    }),
    internalError: jest.fn((message?: string) => {
      mockContext.statusCode = 500;
      mockRes.writeHead(500, { 'Content-Type': 'application/json' });
      mockRes.write(JSON.stringify({ error: message || 'Internal Server Error' }));
      mockRes.end();
      return mockContext;
    }),
    
    // Convenience methods
    header: jest.fn((name: string, value: string) => {
      mockRes.setHeader(name, value);
      return mockContext;
    }),
    cookie: jest.fn((name: string, value: string, options: any = {}) => {
      let cookieString = `${name}=${value}`;
      if (options.httpOnly) cookieString += '; HttpOnly';
      if (options.secure) cookieString += '; Secure';
      if (options.maxAge) cookieString += `; Max-Age=${options.maxAge}`;
      mockRes.setHeader('Set-Cookie', cookieString);
      return mockContext;
    }),
    clearCookie: jest.fn((name: string) => {
      mockRes.setHeader('Set-Cookie', `${name}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
      return mockContext;
    }),
    
    // Request helpers
    is: jest.fn((type: string) => {
      const contentType = mockReq.headers['content-type'] || '';
      return contentType.includes(type);
    }),
    accepts: jest.fn((types: string[]) => {
      const accept = mockReq.headers.accept || '';
      for (const type of types) {
        if (accept.includes(type)) return type;
      }
      return false;
    }),
    get: jest.fn((header: string) => {
      return mockReq.headers[header.toLowerCase()];
    }),
    
    // Traditional methods
    status: jest.fn((code: number) => {
      mockContext.statusCode = code;
      return mockContext;
    }),
    json: jest.fn((data: any) => {
      mockRes.writeHead(mockContext.statusCode, { 'Content-Type': 'application/json' });
      mockRes.write(JSON.stringify(data));
      mockRes.end();
      return mockContext;
    }),
    send: jest.fn((data: any) => {
      mockRes.writeHead(mockContext.statusCode, { 'Content-Type': 'text/plain' });
      mockRes.write(data);
      mockRes.end();
      return mockContext;
    }),
    type: jest.fn((contentType: string) => {
      mockRes.setHeader('Content-Type', contentType);
      return mockContext;
    }),
    redirect: jest.fn((url: string, status: number = 302) => {
      mockRes.writeHead(status, { 'Location': url });
      mockRes.end();
    }),
    
    ...overrides
  } as Context;

  return mockContext;
}

/**
 * Wait for a promise to resolve or timeout
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a test server and return both app and close function
 */
export function createTestServer(): { app: Turbyoot; close: () => void } {
  const app = createTestApp();
  
  return {
    app,
    close: () => {
      // Turbyoot doesn't expose the server, so we can't close it
      // This is fine for testing purposes
    }
  };
}

/**
 * Mock middleware for testing
 */
export const mockMiddleware = (name: string) => {
  return jest.fn((ctx: Context, next: () => Promise<void>) => {
    ctx.state[name] = true;
    return next();
  });
};

/**
 * Mock route handler for testing
 */
export const mockHandler = (response: any = { message: 'test' }) => {
  return jest.fn((ctx: Context) => {
    ctx.json(response);
  });
};

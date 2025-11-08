import { describe, it, expect, beforeEach } from '@jest/globals';
import { createContext } from '../../src/context.js';
import { createMockContext } from '../utils/test-helpers.js';
import { IncomingMessage, ServerResponse } from 'http';

describe('Enhanced Context', () => {
  let ctx: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    ctx = createMockContext();
  });

  describe('createContext()', () => {
    it('should create context with default values', () => {
      const mockReq = {
        headers: {},
        on: jest.fn()
      } as any as IncomingMessage;
      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
        statusCode: 200,
        headersSent: false
      } as any as ServerResponse;

      const context = createContext(mockReq, mockRes);

      expect(context.req).toBe(mockReq);
      expect(context.res).toBe(mockRes);
      expect(context.params).toEqual({});
      expect(context.query).toEqual({});
      expect(context.body).toBeNull();
      expect(context.statusCode).toBe(200);
      expect(context.state).toEqual({});
    });

    it('should create context with custom params, query, and body', () => {
      const mockReq = {
        headers: {},
        on: jest.fn()
      } as any as IncomingMessage;
      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
        statusCode: 200,
        headersSent: false
      } as any as ServerResponse;

      const params = { id: '123' };
      const query = { page: '1' };
      const body = { name: 'John' };

      const context = createContext(mockReq, mockRes, params, query, body);

      expect(context.params).toEqual(params);
      expect(context.query).toEqual(query);
      expect(context.body).toEqual(body);
    });
  });

  describe('Enhanced Response Methods', () => {
    it('should have ok method that sets 200 status', () => {
      const result = ctx.ok({ message: 'success' });
      
      expect(ctx.statusCode).toBe(200);
      expect(result).toBe(ctx); // Should return this for chaining
    });

    it('should have created method that sets 201 status', () => {
      const result = ctx.created({ id: 1 });
      
      expect(ctx.statusCode).toBe(201);
      expect(result).toBe(ctx);
    });

    it('should have noContent method that sets 204 status', () => {
      const result = ctx.noContent();
      
      expect(ctx.statusCode).toBe(204);
      expect(result).toBe(ctx);
    });

    it('should have badRequest method that sets 400 status', () => {
      const result = ctx.badRequest('Invalid data');
      
      expect(ctx.statusCode).toBe(400);
      expect(result).toBe(ctx);
    });

    it('should have unauthorized method that sets 401 status', () => {
      const result = ctx.unauthorized('Login required');
      
      expect(ctx.statusCode).toBe(401);
      expect(result).toBe(ctx);
    });

    it('should have forbidden method that sets 403 status', () => {
      const result = ctx.forbidden('Access denied');
      
      expect(ctx.statusCode).toBe(403);
      expect(result).toBe(ctx);
    });

    it('should have notFound method that sets 404 status', () => {
      const result = ctx.notFound('Resource not found');
      
      expect(ctx.statusCode).toBe(404);
      expect(result).toBe(ctx);
    });

    it('should have conflict method that sets 409 status', () => {
      const result = ctx.conflict('Resource already exists');
      
      expect(ctx.statusCode).toBe(409);
      expect(result).toBe(ctx);
    });

    it('should have unprocessableEntity method that sets 422 status', () => {
      const result = ctx.unprocessableEntity('Validation failed');
      
      expect(ctx.statusCode).toBe(422);
      expect(result).toBe(ctx);
    });

    it('should have tooManyRequests method that sets 429 status', () => {
      const result = ctx.tooManyRequests('Rate limit exceeded');
      
      expect(ctx.statusCode).toBe(429);
      expect(result).toBe(ctx);
    });

    it('should have internalError method that sets 500 status', () => {
      const result = ctx.internalError('Server error');
      
      expect(ctx.statusCode).toBe(500);
      expect(result).toBe(ctx);
    });
  });

  describe('Convenience Methods', () => {
    it('should have header method for setting headers', () => {
      const result = ctx.header('X-Custom', 'value');
      
      expect(ctx.res.setHeader).toHaveBeenCalledWith('X-Custom', 'value');
      expect(result).toBe(ctx);
    });

    it('should have cookie method for setting cookies', () => {
      const result = ctx.cookie('token', 'value', { httpOnly: true });
      
      expect(ctx.res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        'token=value; HttpOnly'
      );
      expect(result).toBe(ctx);
    });

    it('should have clearCookie method for clearing cookies', () => {
      const result = ctx.clearCookie('token');
      
      expect(ctx.res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        'token=; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
      );
      expect(result).toBe(ctx);
    });
  });

  describe('Request Helpers', () => {
    it('should have is method for content type checking', () => {
      ctx.req.headers['content-type'] = 'application/json';
      
      expect(ctx.is('json')).toBe(true);
      expect(ctx.is('html')).toBe(false);
    });

    it('should have accepts method for accept header checking', () => {
      ctx.req.headers.accept = 'application/json, text/html';
      
      expect(ctx.accepts(['json', 'html'])).toBe('json');
      expect(ctx.accepts(['xml'])).toBe(false);
    });

    it('should have get method for header retrieval', () => {
      ctx.req.headers['user-agent'] = 'test-agent';
      
      expect(ctx.get('User-Agent')).toBe('test-agent');
      expect(ctx.get('Non-Existent')).toBeUndefined();
    });
  });

  describe('Traditional Methods (Backward Compatibility)', () => {
    it('should have status method for setting status code', () => {
      const result = ctx.status(201);
      
      expect(ctx.statusCode).toBe(201);
      expect(result).toBe(ctx);
    });

    it('should have json method for sending JSON', () => {
      const data = { message: 'test' };
      const result = ctx.json(data);
      
      expect(ctx.res.writeHead).toHaveBeenCalledWith(200, {
        'Content-Type': 'application/json'
      });
      expect(result).toBe(ctx);
    });

    it('should have send method for sending text', () => {
      const result = ctx.send('Hello World');
      
      expect(ctx.res.writeHead).toHaveBeenCalledWith(200, {
        'Content-Type': 'text/plain'
      });
      expect(result).toBe(ctx);
    });

    it('should have type method for setting content type', () => {
      const result = ctx.type('application/xml');
      
      expect(ctx.res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/xml');
      expect(result).toBe(ctx);
    });

    it('should have redirect method for redirects', () => {
      ctx.redirect('/login', 302);
      
      expect(ctx.res.writeHead).toHaveBeenCalledWith(302, {
        'Location': '/login'
      });
      expect(ctx.res.end).toHaveBeenCalled();
    });
  });
});

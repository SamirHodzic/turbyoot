import { describe, it, expect, jest } from '@jest/globals';
import {
  AppError,
  HttpError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  TimeoutError,
  PayloadTooLargeError,
  BadRequestError,
  InternalError,
  ServiceUnavailableError,
  ErrorCode,
  errorHandler,
  createError,
  isAppError,
  isHttpError,
  isValidationError,
  isAuthenticationError,
  isAuthorizationError,
  isNotFoundError,
} from '../../src/errors.js';
import { createMockContext } from '../utils/test-helpers.js';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create an error with default values', () => {
      const error = new AppError(400, 'Test error');

      expect(error.status).toBe(400);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ErrorCode.UNKNOWN);
      expect(error.details).toEqual([]);
      expect(error.expose).toBe(true);
      expect(error.meta).toEqual({});
      expect(error.timestamp).toBeDefined();
    });

    it('should create an error with custom options', () => {
      const error = new AppError(500, 'Server error', {
        code: ErrorCode.INTERNAL,
        details: [{ field: 'test', message: 'Test detail' }],
        expose: false,
        meta: { requestId: '123' },
      });

      expect(error.status).toBe(500);
      expect(error.code).toBe(ErrorCode.INTERNAL);
      expect(error.details).toHaveLength(1);
      expect(error.expose).toBe(false);
      expect(error.meta.requestId).toBe('123');
    });

    it('should serialize to JSON correctly', () => {
      const error = new AppError(400, 'Bad request', {
        code: ErrorCode.BAD_REQUEST,
        details: [{ field: 'email', message: 'Invalid email' }],
        meta: { hint: 'Check format' },
      });

      const json = error.toJSON();

      expect(json.error).toBe('Bad request');
      expect(json.status).toBe(400);
      expect(json.code).toBe(ErrorCode.BAD_REQUEST);
      expect(json.details).toHaveLength(1);
      expect(json.meta).toEqual({ hint: 'Check format' });
      expect(json.timestamp).toBeDefined();
    });

    it('should allow adding details', () => {
      const error = new AppError(400, 'Validation failed');
      error.addDetail({ field: 'name', message: 'Required' });
      error.addDetails([
        { field: 'email', message: 'Invalid' },
        { field: 'age', message: 'Must be positive' },
      ]);

      expect(error.details).toHaveLength(3);
    });
  });

  describe('HttpError', () => {
    it('should create an HttpError with expose flag', () => {
      const error = new HttpError(404, 'Not Found', true);

      expect(error.status).toBe(404);
      expect(error.message).toBe('Not Found');
      expect(error.expose).toBe(true);
      expect(error.name).toBe('HttpError');
    });

    it('should default expose to true', () => {
      const error = new HttpError(400, 'Bad Request');
      expect(error.expose).toBe(true);
    });
  });

  describe('ValidationError', () => {
    it('should create a validation error with details', () => {
      const error = new ValidationError('Validation failed', [
        { field: 'email', message: 'Invalid email format' },
      ]);

      expect(error.status).toBe(400);
      expect(error.code).toBe(ErrorCode.VALIDATION_FAILED);
      expect(error.details).toHaveLength(1);
      expect(error.name).toBe('ValidationError');
    });

    it('should create field error using static method', () => {
      const error = ValidationError.field('username', 'Username is required');

      expect(error.details[0].field).toBe('username');
      expect(error.details[0].message).toBe('Username is required');
    });

    it('should create multiple field errors', () => {
      const error = ValidationError.fields([
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Too short' },
      ]);

      expect(error.details).toHaveLength(2);
    });

    it('should create required field error', () => {
      const error = ValidationError.required('email');

      expect(error.details[0].field).toBe('email');
      expect(error.details[0].code).toBe(ErrorCode.MISSING_REQUIRED_FIELD);
    });

    it('should create type error', () => {
      const error = ValidationError.type('age', 'number', 'string');

      expect(error.details[0].expected).toBe('number');
      expect(error.details[0].received).toBe('string');
      expect(error.details[0].code).toBe(ErrorCode.INVALID_FIELD_TYPE);
    });

    it('should create format error', () => {
      const error = ValidationError.format('email', 'Invalid email format', '^[\\w@.]+$');

      expect(error.details[0].code).toBe(ErrorCode.INVALID_FIELD_FORMAT);
      expect(error.details[0].meta?.pattern).toBe('^[\\w@.]+$');
    });
  });

  describe('AuthenticationError', () => {
    it('should create authentication error', () => {
      const error = new AuthenticationError();

      expect(error.status).toBe(401);
      expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(error.name).toBe('AuthenticationError');
    });

    it('should create invalid token error', () => {
      const error = AuthenticationError.invalidToken();

      expect(error.code).toBe(ErrorCode.INVALID_TOKEN);
    });

    it('should create token expired error', () => {
      const error = AuthenticationError.tokenExpired();

      expect(error.code).toBe(ErrorCode.TOKEN_EXPIRED);
    });

    it('should create missing token error', () => {
      const error = AuthenticationError.missingToken();

      expect(error.code).toBe(ErrorCode.MISSING_TOKEN);
    });

    it('should create invalid credentials error', () => {
      const error = AuthenticationError.invalidCredentials();

      expect(error.code).toBe(ErrorCode.INVALID_CREDENTIALS);
    });
  });

  describe('AuthorizationError', () => {
    it('should create authorization error', () => {
      const error = new AuthorizationError();

      expect(error.status).toBe(403);
      expect(error.code).toBe(ErrorCode.FORBIDDEN);
      expect(error.name).toBe('AuthorizationError');
    });

    it('should create insufficient permissions error', () => {
      const error = AuthorizationError.insufficientPermissions(['admin', 'moderator']);

      expect(error.code).toBe(ErrorCode.INSUFFICIENT_PERMISSIONS);
      expect(error.meta.requiredPermissions).toEqual(['admin', 'moderator']);
    });
  });

  describe('NotFoundError', () => {
    it('should create not found error', () => {
      const error = new NotFoundError();

      expect(error.status).toBe(404);
      expect(error.code).toBe(ErrorCode.NOT_FOUND);
      expect(error.name).toBe('NotFoundError');
    });

    it('should create route not found error', () => {
      const error = NotFoundError.route('/api/users', 'GET');

      expect(error.code).toBe(ErrorCode.ROUTE_NOT_FOUND);
      expect(error.meta.path).toBe('/api/users');
      expect(error.meta.method).toBe('GET');
    });

    it('should create resource not found error', () => {
      const error = NotFoundError.resource('User', '123');

      expect(error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      expect(error.meta.resourceType).toBe('User');
      expect(error.meta.identifier).toBe('123');
    });
  });

  describe('ConflictError', () => {
    it('should create conflict error', () => {
      const error = new ConflictError();

      expect(error.status).toBe(409);
      expect(error.code).toBe(ErrorCode.CONFLICT);
      expect(error.name).toBe('ConflictError');
    });

    it('should create resource exists error', () => {
      const error = ConflictError.resourceExists('User', 'john@example.com');

      expect(error.code).toBe(ErrorCode.RESOURCE_EXISTS);
      expect(error.meta.resourceType).toBe('User');
      expect(error.meta.identifier).toBe('john@example.com');
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error', () => {
      const error = new RateLimitError('Too many requests', {
        retryAfter: 60,
        limit: 100,
        remaining: 0,
      });

      expect(error.status).toBe(429);
      expect(error.code).toBe(ErrorCode.RATE_LIMIT_EXCEEDED);
      expect(error.meta.retryAfter).toBe(60);
      expect(error.meta.limit).toBe(100);
    });
  });

  describe('TimeoutError', () => {
    it('should create timeout error', () => {
      const error = new TimeoutError('Request timeout', 30000);

      expect(error.status).toBe(408);
      expect(error.code).toBe(ErrorCode.REQUEST_TIMEOUT);
      expect(error.meta.timeoutMs).toBe(30000);
    });
  });

  describe('PayloadTooLargeError', () => {
    it('should create payload too large error', () => {
      const error = new PayloadTooLargeError('Payload too large', {
        limit: 1048576,
        received: 2097152,
      });

      expect(error.status).toBe(413);
      expect(error.code).toBe(ErrorCode.PAYLOAD_TOO_LARGE);
      expect(error.meta.limit).toBe(1048576);
      expect(error.meta.received).toBe(2097152);
    });
  });

  describe('BadRequestError', () => {
    it('should create bad request error', () => {
      const error = new BadRequestError();

      expect(error.status).toBe(400);
      expect(error.code).toBe(ErrorCode.BAD_REQUEST);
    });

    it('should create invalid JSON error', () => {
      const error = BadRequestError.invalidJson('Unexpected token');

      expect(error.code).toBe(ErrorCode.INVALID_JSON);
      expect(error.meta.parseError).toBe('Unexpected token');
    });

    it('should create invalid content type error', () => {
      const error = BadRequestError.invalidContentType('application/json', 'text/plain');

      expect(error.code).toBe(ErrorCode.INVALID_CONTENT_TYPE);
      expect(error.meta.expected).toBe('application/json');
      expect(error.meta.received).toBe('text/plain');
    });
  });

  describe('InternalError', () => {
    it('should create internal error', () => {
      const cause = new Error('Database connection failed');
      const error = new InternalError('Something went wrong', cause);

      expect(error.status).toBe(500);
      expect(error.code).toBe(ErrorCode.INTERNAL);
      expect(error.expose).toBe(false);
      expect(error.originalError).toBe(cause);
    });
  });

  describe('ServiceUnavailableError', () => {
    it('should create service unavailable error', () => {
      const error = new ServiceUnavailableError('Service maintenance', 3600);

      expect(error.status).toBe(503);
      expect(error.code).toBe(ErrorCode.SERVICE_UNAVAILABLE);
      expect(error.meta.retryAfter).toBe(3600);
    });
  });
});

describe('Error Handler Middleware', () => {
  it('should pass through when no error occurs', async () => {
    const middleware = errorHandler();
    const ctx = createMockContext();
    const next = jest.fn(async () => {});

    await middleware(ctx, next);

    expect(next).toHaveBeenCalled();
    expect(ctx.statusCode).toBe(200);
  });

  it('should handle AppError with expose flag', async () => {
    const middleware = errorHandler();
    const ctx = createMockContext();
    const error = new ValidationError('Validation failed', [
      { field: 'email', message: 'Invalid' },
    ]);
    const next = jest.fn(async () => {
      throw error;
    });

    await middleware(ctx, next);

    expect(ctx.statusCode).toBe(400);
    expect(ctx.res.statusCode).toBe(400);
    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Validation failed',
        status: 400,
        code: ErrorCode.VALIDATION_FAILED,
        details: [{ field: 'email', message: 'Invalid' }],
      })
    );
  });

  it('should handle AppError without expose flag', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const middleware = errorHandler();
    const ctx = createMockContext();
    const error = new InternalError('Database error');
    const next = jest.fn(async () => {
      throw error;
    });

    await middleware(ctx, next);

    expect(ctx.statusCode).toBe(500);
    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Internal Server Error',
        status: 500,
        code: ErrorCode.INTERNAL,
      })
    );

    consoleErrorSpy.mockRestore();
  });

  it('should handle HttpError with expose flag', async () => {
    const middleware = errorHandler();
    const ctx = createMockContext();
    const error = new HttpError(404, 'Not Found', true);
    const next = jest.fn(async () => {
      throw error;
    });

    await middleware(ctx, next);

    expect(ctx.statusCode).toBe(404);
    expect(ctx.res.statusCode).toBe(404);
  });

  it('should handle HttpError without expose flag', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const middleware = errorHandler();
    const ctx = createMockContext();
    const error = new HttpError(500, 'Internal Error', false);
    const next = jest.fn(async () => {
      throw error;
    });

    await middleware(ctx, next);

    expect(ctx.statusCode).toBe(500);
    expect(ctx.res.statusCode).toBe(500);
    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Internal Server Error',
        status: 500,
      })
    );

    consoleErrorSpy.mockRestore();
  });

  it('should handle non-AppError exceptions', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const middleware = errorHandler();
    const ctx = createMockContext();
    const error = new Error('Generic error');
    const next = jest.fn(async () => {
      throw error;
    });

    await middleware(ctx, next);

    expect(ctx.statusCode).toBe(500);
    expect(ctx.res.statusCode).toBe(500);
    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Internal Server Error',
        status: 500,
        code: ErrorCode.INTERNAL,
      })
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith('Unhandled error:', error);

    consoleErrorSpy.mockRestore();
  });

  it('should not send response if headers already sent', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const middleware = errorHandler();
    const ctx = createMockContext({
      res: {
        headersSent: true,
        statusCode: 200,
        setHeader: jest.fn(),
        end: jest.fn()
      } as any
    });
    const error = new Error('Error after headers sent');
    const next = jest.fn(async () => {
      throw error;
    });

    await middleware(ctx, next);

    expect(ctx.json).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error after response sent:', error);

    consoleErrorSpy.mockRestore();
  });

  it('should call onError hook when provided', async () => {
    const onError = jest.fn<(error: Error, ctx: any) => void>();
    const middleware = errorHandler({ onError });
    const ctx = createMockContext();
    const error = new ValidationError('Test error');
    const next = jest.fn(async () => {
      throw error;
    });

    await middleware(ctx, next);

    expect(onError).toHaveBeenCalledWith(error, ctx);
  });

  it('should include stack trace when includeStack is true', async () => {
    const middleware = errorHandler({ includeStack: true });
    const ctx = createMockContext();
    const error = new ValidationError('Test error');
    const next = jest.fn(async () => {
      throw error;
    });

    await middleware(ctx, next);

    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        stack: expect.any(String),
      })
    );
  });

  it('should use custom logger when provided', async () => {
    const customLogger = { error: jest.fn() };
    const middleware = errorHandler({ logger: customLogger });
    const ctx = createMockContext();
    const error = new Error('Test error');
    const next = jest.fn(async () => {
      throw error;
    });

    await middleware(ctx, next);

    expect(customLogger.error).toHaveBeenCalledWith('Unhandled error:', error);
  });
});

describe('Helper Functions', () => {
  describe('createError', () => {
    it('should create an AppError', () => {
      const error = createError(400, 'Bad request', { code: ErrorCode.BAD_REQUEST });

      expect(error).toBeInstanceOf(AppError);
      expect(error.status).toBe(400);
      expect(error.code).toBe(ErrorCode.BAD_REQUEST);
    });
  });

  describe('Type Guards', () => {
    it('should correctly identify AppError', () => {
      expect(isAppError(new AppError(400, 'Test'))).toBe(true);
      expect(isAppError(new ValidationError())).toBe(true);
      expect(isAppError(new Error('Test'))).toBe(false);
    });

    it('should correctly identify HttpError', () => {
      expect(isHttpError(new HttpError(400, 'Test'))).toBe(true);
      expect(isHttpError(new AppError(400, 'Test'))).toBe(false);
    });

    it('should correctly identify ValidationError', () => {
      expect(isValidationError(new ValidationError())).toBe(true);
      expect(isValidationError(new AppError(400, 'Test'))).toBe(false);
    });

    it('should correctly identify AuthenticationError', () => {
      expect(isAuthenticationError(new AuthenticationError())).toBe(true);
      expect(isAuthenticationError(new AppError(401, 'Test'))).toBe(false);
    });

    it('should correctly identify AuthorizationError', () => {
      expect(isAuthorizationError(new AuthorizationError())).toBe(true);
      expect(isAuthorizationError(new AppError(403, 'Test'))).toBe(false);
    });

    it('should correctly identify NotFoundError', () => {
      expect(isNotFoundError(new NotFoundError())).toBe(true);
      expect(isNotFoundError(new AppError(404, 'Test'))).toBe(false);
    });
  });
});

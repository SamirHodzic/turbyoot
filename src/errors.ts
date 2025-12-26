import { Context } from './types.js';

export const ErrorCode = {
  UNKNOWN: 'ERR_UNKNOWN',
  INTERNAL: 'ERR_INTERNAL',

  BAD_REQUEST: 'ERR_BAD_REQUEST',
  VALIDATION_FAILED: 'ERR_VALIDATION_FAILED',
  INVALID_JSON: 'ERR_INVALID_JSON',
  INVALID_CONTENT_TYPE: 'ERR_INVALID_CONTENT_TYPE',
  PAYLOAD_TOO_LARGE: 'ERR_PAYLOAD_TOO_LARGE',
  MISSING_REQUIRED_FIELD: 'ERR_MISSING_REQUIRED_FIELD',
  INVALID_FIELD_TYPE: 'ERR_INVALID_FIELD_TYPE',
  INVALID_FIELD_FORMAT: 'ERR_INVALID_FIELD_FORMAT',

  UNAUTHORIZED: 'ERR_UNAUTHORIZED',
  INVALID_TOKEN: 'ERR_INVALID_TOKEN',
  TOKEN_EXPIRED: 'ERR_TOKEN_EXPIRED',
  MISSING_TOKEN: 'ERR_MISSING_TOKEN',
  INVALID_CREDENTIALS: 'ERR_INVALID_CREDENTIALS',

  FORBIDDEN: 'ERR_FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'ERR_INSUFFICIENT_PERMISSIONS',

  NOT_FOUND: 'ERR_NOT_FOUND',
  ROUTE_NOT_FOUND: 'ERR_ROUTE_NOT_FOUND',
  RESOURCE_NOT_FOUND: 'ERR_RESOURCE_NOT_FOUND',

  METHOD_NOT_ALLOWED: 'ERR_METHOD_NOT_ALLOWED',
  CONFLICT: 'ERR_CONFLICT',
  RESOURCE_EXISTS: 'ERR_RESOURCE_EXISTS',

  UNPROCESSABLE_ENTITY: 'ERR_UNPROCESSABLE_ENTITY',
  TOO_MANY_REQUESTS: 'ERR_TOO_MANY_REQUESTS',
  RATE_LIMIT_EXCEEDED: 'ERR_RATE_LIMIT_EXCEEDED',

  REQUEST_TIMEOUT: 'ERR_REQUEST_TIMEOUT',
  SERVICE_UNAVAILABLE: 'ERR_SERVICE_UNAVAILABLE',
  GATEWAY_TIMEOUT: 'ERR_GATEWAY_TIMEOUT',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface ErrorDetail {
  field?: string;
  message: string;
  code?: ErrorCodeType | string;
  expected?: unknown;
  received?: unknown;
  meta?: Record<string, unknown>;
}

export interface ErrorOptions {
  code?: ErrorCodeType | string;
  details?: ErrorDetail[];
  cause?: Error;
  expose?: boolean;
  meta?: Record<string, unknown>;
}

export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCodeType | string;
  readonly details: ErrorDetail[];
  readonly expose: boolean;
  readonly meta: Record<string, unknown>;
  readonly timestamp: string;
  readonly originalError?: Error;

  constructor(status: number, message: string, options: ErrorOptions = {}) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = options.code ?? ErrorCode.UNKNOWN;
    this.details = options.details ?? [];
    this.expose = options.expose ?? status < 500;
    this.meta = options.meta ?? {};
    this.timestamp = new Date().toISOString();

    if (options.cause) {
      this.originalError = options.cause;
    }

    Error.captureStackTrace?.(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    const json: Record<string, unknown> = {
      error: this.message,
      status: this.status,
      code: this.code,
      timestamp: this.timestamp,
    };

    if (this.details.length > 0) {
      json.details = this.details;
    }

    if (Object.keys(this.meta).length > 0) {
      json.meta = this.meta;
    }

    return json;
  }

  addDetail(detail: ErrorDetail): this {
    this.details.push(detail);
    return this;
  }

  addDetails(details: ErrorDetail[]): this {
    this.details.push(...details);
    return this;
  }
}

export class HttpError extends AppError {
  constructor(status: number, message: string, expose: boolean = true) {
    super(status, message, { expose });
    this.name = 'HttpError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details: ErrorDetail[] = []) {
    super(400, message, {
      code: ErrorCode.VALIDATION_FAILED,
      details,
      expose: true,
    });
    this.name = 'ValidationError';
  }

  static field(field: string, message: string, options?: Partial<ErrorDetail>): ValidationError {
    return new ValidationError('Validation failed', [
      { field, message, ...options },
    ]);
  }

  static fields(details: ErrorDetail[]): ValidationError {
    return new ValidationError('Validation failed', details);
  }

  static required(field: string): ValidationError {
    return new ValidationError('Validation failed', [
      { field, message: `${field} is required`, code: ErrorCode.MISSING_REQUIRED_FIELD },
    ]);
  }

  static type(field: string, expected: string, received: string): ValidationError {
    return new ValidationError('Validation failed', [
      {
        field,
        message: `${field} must be a ${expected}`,
        code: ErrorCode.INVALID_FIELD_TYPE,
        expected,
        received,
      },
    ]);
  }

  static format(field: string, message: string, pattern?: string): ValidationError {
    return new ValidationError('Validation failed', [
      {
        field,
        message,
        code: ErrorCode.INVALID_FIELD_FORMAT,
        meta: pattern ? { pattern } : undefined,
      },
    ]);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', code: ErrorCodeType = ErrorCode.UNAUTHORIZED) {
    super(401, message, { code, expose: true });
    this.name = 'AuthenticationError';
  }

  static invalidToken(message: string = 'Invalid authentication token'): AuthenticationError {
    const error = new AuthenticationError(message, ErrorCode.INVALID_TOKEN);
    error.name = 'AuthenticationError';
    return error;
  }

  static tokenExpired(message: string = 'Authentication token has expired'): AuthenticationError {
    const error = new AuthenticationError(message, ErrorCode.TOKEN_EXPIRED);
    error.name = 'AuthenticationError';
    return error;
  }

  static missingToken(message: string = 'Authentication token is required'): AuthenticationError {
    const error = new AuthenticationError(message, ErrorCode.MISSING_TOKEN);
    error.name = 'AuthenticationError';
    return error;
  }

  static invalidCredentials(message: string = 'Invalid credentials'): AuthenticationError {
    const error = new AuthenticationError(message, ErrorCode.INVALID_CREDENTIALS);
    error.name = 'AuthenticationError';
    return error;
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied', code: ErrorCodeType = ErrorCode.FORBIDDEN) {
    super(403, message, { code, expose: true });
    this.name = 'AuthorizationError';
  }

  static insufficientPermissions(required?: string[]): AuthorizationError {
    const error = new AuthorizationError(
      'Insufficient permissions',
      ErrorCode.INSUFFICIENT_PERMISSIONS
    );
    if (required) {
      (error.meta as Record<string, unknown>).requiredPermissions = required;
    }
    return error;
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', code: ErrorCodeType = ErrorCode.NOT_FOUND) {
    super(404, message, { code, expose: true });
    this.name = 'NotFoundError';
  }

  static route(path: string, method: string): NotFoundError {
    const error = new NotFoundError(`Route ${method} ${path} not found`, ErrorCode.ROUTE_NOT_FOUND);
    (error.meta as Record<string, unknown>).path = path;
    (error.meta as Record<string, unknown>).method = method;
    return error;
  }

  static resource(resourceType: string, identifier?: string): NotFoundError {
    const message = identifier
      ? `${resourceType} with identifier '${identifier}' not found`
      : `${resourceType} not found`;
    const error = new NotFoundError(message, ErrorCode.RESOURCE_NOT_FOUND);
    (error.meta as Record<string, unknown>).resourceType = resourceType;
    if (identifier) {
      (error.meta as Record<string, unknown>).identifier = identifier;
    }
    return error;
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', code: ErrorCodeType = ErrorCode.CONFLICT) {
    super(409, message, { code, expose: true });
    this.name = 'ConflictError';
  }

  static resourceExists(resourceType: string, identifier?: string): ConflictError {
    const message = identifier
      ? `${resourceType} with identifier '${identifier}' already exists`
      : `${resourceType} already exists`;
    const error = new ConflictError(message, ErrorCode.RESOURCE_EXISTS);
    (error.meta as Record<string, unknown>).resourceType = resourceType;
    if (identifier) {
      (error.meta as Record<string, unknown>).identifier = identifier;
    }
    return error;
  }
}

export class RateLimitError extends AppError {
  constructor(
    message: string = 'Too many requests',
    options?: { retryAfter?: number; limit?: number; remaining?: number }
  ) {
    super(429, message, {
      code: ErrorCode.RATE_LIMIT_EXCEEDED,
      expose: true,
      meta: options ? { ...options } : {},
    });
    this.name = 'RateLimitError';
  }
}

export class TimeoutError extends AppError {
  constructor(message: string = 'Request timeout', timeoutMs?: number) {
    super(408, message, {
      code: ErrorCode.REQUEST_TIMEOUT,
      expose: true,
      meta: timeoutMs ? { timeoutMs } : {},
    });
    this.name = 'TimeoutError';
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message: string = 'Payload too large', options?: { limit?: number; received?: number }) {
    super(413, message, {
      code: ErrorCode.PAYLOAD_TOO_LARGE,
      expose: true,
      meta: options ? { ...options } : {},
    });
    this.name = 'PayloadTooLargeError';
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', code: ErrorCodeType = ErrorCode.BAD_REQUEST) {
    super(400, message, { code, expose: true });
    this.name = 'BadRequestError';
  }

  static invalidJson(parseError?: string): BadRequestError {
    const error = new BadRequestError('Invalid JSON in request body', ErrorCode.INVALID_JSON);
    if (parseError) {
      (error.meta as Record<string, unknown>).parseError = parseError;
    }
    return error;
  }

  static invalidContentType(expected: string, received: string): BadRequestError {
    const error = new BadRequestError(
      `Invalid content type. Expected ${expected}, received ${received}`,
      ErrorCode.INVALID_CONTENT_TYPE
    );
    (error.meta as Record<string, unknown>).expected = expected;
    (error.meta as Record<string, unknown>).received = received;
    return error;
  }
}

export class InternalError extends AppError {
  constructor(message: string = 'Internal server error', cause?: Error) {
    super(500, message, {
      code: ErrorCode.INTERNAL,
      expose: false,
      cause,
    });
    this.name = 'InternalError';
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service unavailable', retryAfter?: number) {
    super(503, message, {
      code: ErrorCode.SERVICE_UNAVAILABLE,
      expose: true,
      meta: retryAfter ? { retryAfter } : {},
    });
    this.name = 'ServiceUnavailableError';
  }
}

export interface ErrorHandlerOptions {
  includeStack?: boolean;
  onError?: (error: Error, ctx: Context) => void | Promise<void>;
  logger?: {
    error: (message: string, ...args: unknown[]) => void;
  };
}

export function errorHandler(options: ErrorHandlerOptions = {}) {
  const { includeStack = false, onError, logger = console } = options;

  return async (ctx: Context, next: () => Promise<void>) => {
    try {
      await next();
    } catch (err) {
      if (onError) {
        try {
          await onError(err as Error, ctx);
        } catch (hookError) {
          logger.error('Error in onError hook:', hookError);
        }
      }

      if (!ctx.res.headersSent) {
        if (err instanceof AppError) {
          ctx.statusCode = err.status;
          ctx.res.statusCode = err.status;

          if (err.expose) {
            const response = err.toJSON();
            if (includeStack && err.stack) {
              response.stack = err.stack;
            }
            ctx.json(response);
          } else {
            logger.error('Internal error:', err);
            ctx.json({
              error: 'Internal Server Error',
              status: 500,
              code: ErrorCode.INTERNAL,
              timestamp: new Date().toISOString(),
            });
          }
        } else {
          logger.error('Unhandled error:', err);
          ctx.statusCode = 500;
          ctx.res.statusCode = 500;
          const response: Record<string, unknown> = {
            error: 'Internal Server Error',
            status: 500,
            code: ErrorCode.INTERNAL,
            timestamp: new Date().toISOString(),
          };
          if (includeStack && err instanceof Error && err.stack) {
            response.stack = err.stack;
          }
          ctx.json(response);
        }
      } else {
        logger.error('Error after response sent:', err);
      }
    }
  };
}

export function createError(status: number, message: string, options?: ErrorOptions): AppError {
  return new AppError(status, message, options);
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

export function isAuthorizationError(error: unknown): error is AuthorizationError {
  return error instanceof AuthorizationError;
}

export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

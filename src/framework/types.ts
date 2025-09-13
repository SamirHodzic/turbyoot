import { IncomingMessage, ServerResponse } from 'http';

// Core framework types
export interface Context {
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

export type Middleware = (ctx: Context, next: () => Promise<void>) => Promise<void> | void;
export type RouteHandler = (ctx: Context) => Promise<void> | void;

export interface Route {
  method: string;
  path: string;
  handler: RouteHandler;
  middleware?: Middleware[];
}

export interface CompiledRoute extends Route {
  regex: RegExp;
  paramNames: string[];
}

// Middleware types
export interface SecurityOptions {
  contentSecurityPolicy?: boolean | string;
  crossOriginEmbedderPolicy?: boolean | string;
  crossOriginOpenerPolicy?: boolean | string;
  crossOriginResourcePolicy?: boolean | string;
  dnsPrefetchControl?: boolean;
  frameguard?: boolean | { action: 'deny' | 'sameorigin' };
  hidePoweredBy?: boolean;
  hsts?: boolean | { maxAge: number; includeSubDomains?: boolean; preload?: boolean };
  ieNoOpen?: boolean;
  noSniff?: boolean;
  originAgentCluster?: boolean;
  permittedCrossDomainPolicies?: boolean | string;
  referrerPolicy?: boolean | string;
  xssFilter?: boolean;
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  skip?: (ctx: Context) => boolean;
  keyGenerator?: (ctx: Context) => string;
}

export interface ValidationSchema {
  body?: Record<string, any>;
  query?: Record<string, any>;
  params?: Record<string, any>;
  headers?: Record<string, any>;
}

export interface ValidationOptions {
  schema: ValidationSchema;
  allowUnknown?: boolean;
  stripUnknown?: boolean;
}

export interface TimeoutOptions {
  timeout: number;
  onTimeout?: (ctx: Context) => void;
}

export interface CacheOptions {
  maxAge?: number;
  sMaxAge?: number;
  public?: boolean;
  private?: boolean;
  noCache?: boolean;
  noStore?: boolean;
  mustRevalidate?: boolean;
  proxyRevalidate?: boolean;
  immutable?: boolean;
  staleWhileRevalidate?: number;
  staleIfError?: number;
  vary?: string[];
  etag?: boolean;
  lastModified?: boolean;
  cacheKey?: string | ((ctx: Context) => string);
  skipCache?: (ctx: Context) => boolean;
}

export interface CompressionOptions {
  threshold?: number;
  level?: number;
  memLevel?: number;
  chunkSize?: number;
  windowBits?: number;
  strategy?: number;
  filter?: (req: IncomingMessage) => boolean;
}

// Cache adapter types
export interface CacheAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  delPattern(pattern: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  expire(key: string, ttl: number): Promise<void>;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  dels: number;
  hitRate: number;
}

// Router types
export interface RouterOptions {
  prefix?: string;
  middleware?: Middleware[];
}

// Health check types
export interface HealthCheck {
  name: string;
  check: () => Promise<boolean> | boolean;
  timeout?: number;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: Record<string, {
    status: 'pass' | 'fail';
    responseTime?: number;
    error?: string;
  }>;
}

// Error types
export class HttpError extends Error {
  status: number;
  expose: boolean;

  constructor(status: number, message: string, expose: boolean = true) {
    super(message);
    this.status = status;
    this.expose = expose;
    this.name = 'HttpError';
  }
}

// Query parsing types
export interface QueryParseOptions {
  parseNumbers?: boolean;
  parseBooleans?: boolean;
  parseArrays?: boolean;
  arrayLimit?: number;
  allowPrototypes?: boolean;
  plainObjects?: boolean;
  allowDots?: boolean;
  depth?: number;
  parameterLimit?: number;
  strictNullHandling?: boolean;
  ignoreQueryPrefix?: boolean;
  delimiter?: string | RegExp;
  charset?: string;
  charsetSentinel?: boolean;
  interpretNumericEntities?: boolean;
  parseValues?: boolean;
  sortFn?: (a: any, b: any) => number;
  decoder?: (str: string, defaultDecoder: (str: string) => string) => string;
  encodeValuesOnly?: boolean;
  format?: string;
  formatter?: (value: any) => any;
  validate?: (value: any) => boolean;
  skipNulls?: boolean;
  comma?: boolean;
  allowEmptyArrays?: boolean;
  duplicates?: 'combine' | 'first' | 'last';
  allowSparse?: boolean;
  arrayFormat?: 'indices' | 'brackets' | 'repeat' | 'comma';
  arrayFormatSeparator?: string;
  serializeDate?: (date: Date) => string;
  serialize?: (value: any, defaultSerializer: (value: any) => string) => string;
  serializeParams?: (params: Record<string, any>) => string;
  serializeQueryKey?: (key: string) => string;
  serializeQueryValue?: (value: any) => string;
  serializeQuery?: (query: Record<string, any>) => string;
  serializeFragment?: (fragment: string) => string;
  serializeHash?: (hash: string) => string;
  serializeHost?: (host: string) => string;
  serializePassword?: (password: string) => string;
  serializePathname?: (pathname: string) => string;
  serializePort?: (port: number) => string;
  serializeProtocol?: (protocol: string) => string;
  serializeSearch?: (search: string) => string;
  serializeUsername?: (username: string) => string;
  serializeUserinfo?: (userinfo: string) => string;
}

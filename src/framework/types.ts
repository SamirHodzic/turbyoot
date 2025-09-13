import { IncomingMessage, ServerResponse } from 'http';

// Core types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

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

export type Next = () => Promise<void>;

export type Middleware = (ctx: Context, next: Next) => Promise<void>;

export type Handler = (ctx: Context) => Promise<void> | void;

export interface Route {
  method: string;
  path: string;
  handler: Handler;
  middleware?: Middleware[];
}

export interface CompiledRoute {
  method: string;
  path: string;
  regex: RegExp;
  paramNames: string[];
  handler: Handler;
  middleware?: Middleware[];
}

export type RouteHandler = (ctx: Context) => Promise<void> | void;

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

// Cache types
export interface CacheAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(pattern?: string): Promise<string[]>;
  delPattern(pattern: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  expire(key: string, ttl: number): Promise<void>;
}

export interface CacheOptions {
  maxAge?: number;
  public?: boolean;
  private?: boolean;
  noCache?: boolean;
  noStore?: boolean;
  mustRevalidate?: boolean;
  proxyRevalidate?: boolean;
  sMaxAge?: number;
  etag?: boolean;
  lastModified?: boolean;
  vary?: string[];
  immutable?: boolean;
  staleWhileRevalidate?: number;
  staleIfError?: number;
  cacheKey?: (ctx: Context) => string;
  skipCache?: (ctx: Context) => boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  dels: number;
  size: number;
  hitRate: number;
}

export interface CacheManagerOptions {
  adapter: CacheAdapter;
  prefix?: string;
  defaultTtl?: number;
}

// Timeout types
export interface TimeoutOptions {
  timeout: number;
  onTimeout?: (ctx: Context) => void;
}

// Validation types
export interface ValidationSchema {
  body?: Record<string, any>;
  query?: Record<string, any>;
  params?: Record<string, any>;
  headers?: Record<string, any>;
}

export interface ValidationOptions {
  schema: ValidationSchema;
  stripUnknown?: boolean;
  abortEarly?: boolean;
  allowUnknown?: boolean;
}

// Security types
export interface SecurityOptions {
  contentSecurityPolicy?: string | boolean;
  crossOriginEmbedderPolicy?: boolean | string;
  crossOriginOpenerPolicy?: boolean | string;
  crossOriginResourcePolicy?: boolean | string;
  dnsPrefetchControl?: boolean;
  frameguard?: boolean | { action?: 'DENY' | 'SAMEORIGIN' };
  hidePoweredBy?: boolean;
  hsts?: boolean | { maxAge?: number; includeSubDomains?: boolean; preload?: boolean };
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
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  skip?: (ctx: Context) => boolean;
  keyGenerator?: (ctx: Context) => string;
}

// Compression types
export interface CompressionOptions {
  threshold?: number;
  level?: number;
  memLevel?: number;
  strategy?: number;
  chunkSize?: number;
  windowBits?: number;
  filter?: (req: IncomingMessage, res: ServerResponse) => boolean;
}

// Query parsing types
export interface QueryParseOptions {
  parseNumbers?: boolean;
  parseBooleans?: boolean;
  parseArrays?: boolean;
  arrayLimit?: number;
  depth?: number;
  parameterLimit?: number;
  allowPrototypes?: boolean;
  plainObjects?: boolean;
  allowDots?: boolean;
  charset?: string;
  charsetSentinel?: boolean;
  interpretNumericEntities?: boolean;
  delimiter?: string | RegExp;
  strictNullHandling?: boolean;
  skipNulls?: boolean;
  encodeValuesOnly?: boolean;
  sort?: (a: string, b: string) => number;
  decoder?: (str: string, defaultDecoder: (str: string) => string) => string;
  ignoreQueryPrefix?: boolean;
  parseValues?: boolean;
  sortFn?: (a: string, b: string) => number;
  format?: string;
  formatter?: any;
  validate?: any;
  comma?: boolean;
  allowEmptyArrays?: boolean;
  duplicates?: string;
  allowSparse?: boolean;
  arrayFormat?: string;
  arrayFormatSeparator?: string;
  serializeDate?: any;
  serialize?: any;
  serializeParams?: any;
  serializeQueryKey?: any;
  serializeQueryValue?: any;
  serializeQuery?: any;
  serializeFragment?: any;
  serializeHash?: any;
  serializeHost?: any;
  serializePassword?: any;
  serializePathname?: any;
  serializePort?: any;
  serializeProtocol?: any;
  serializeSearch?: any;
  serializeUsername?: any;
  serializeUserinfo?: any;
}

// Router types
export interface RouterOptions {
  prefix?: string;
  middleware?: Middleware[];
}

// Auth types
export interface AuthUser {
  id: string;
  [key: string]: any;
}

export interface AuthOptions {
  cookieName?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  tokenExtractor?: (ctx: Context) => string | null;
  userResolver?: (token: string) => Promise<AuthUser | null>;
}
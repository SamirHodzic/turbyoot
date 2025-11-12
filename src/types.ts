import { IncomingMessage, ServerResponse } from 'http';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

export interface Context {
  req: IncomingMessage;
  res: ServerResponse;
  params: Record<string, string>;
  query: Record<string, any>;
  body: any;
  statusCode: number;
  state: Record<string, any>;
  
  json(data: any): Context;
  status(code: number): Context;
  redirect(url: string, status?: number): Context;
  type(contentType: string): Context;
  send(data: any): Context;
  
  ok(data?: any): Context;
  created(data?: any): Context;
  noContent(): Context;
  badRequest(message?: string): Context;
  unauthorized(message?: string): Context;
  forbidden(message?: string): Context;
  notFound(message?: string): Context;
  conflict(message?: string): Context;
  unprocessableEntity(message?: string): Context;
  tooManyRequests(message?: string): Context;
  internalError(message?: string): Context;
  
  header(name: string, value: string): Context;
  cookie(name: string, value: string, options?: any): Context;
  clearCookie(name: string, options?: any): Context;
  
  is(mimeType: string): boolean;
  accepts(types: string[]): string | false;
  get(field: string): string | undefined;
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

export interface TimeoutOptions {
  timeout: number;
  onTimeout?: (ctx: Context) => void;
}

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

export interface CompressionOptions {
  threshold?: number;
  level?: number;
  memLevel?: number;
  strategy?: number;
  chunkSize?: number;
  windowBits?: number;
  filter?: (req: IncomingMessage, res: ServerResponse) => boolean;
}

export interface StaticOptions {
  prefix?: string;
  maxAge?: number;
  etag?: boolean;
  lastModified?: boolean;
  index?: string | string[];
  dotfiles?: 'allow' | 'deny' | 'ignore';
}

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
  charsetSentinel?: boolean;
  interpretNumericEntities?: boolean;
  delimiter?: string | RegExp;
  strictNullHandling?: boolean;
  skipNulls?: boolean;
  decoder?: (str: string, defaultDecoder: (str: string) => string) => string;
  ignoreQueryPrefix?: boolean;
  parseValues?: boolean;
  sortFn?: (a: string, b: string) => number;
  validate?: (key: string, value: any) => boolean;
  comma?: boolean;
  allowEmptyArrays?: boolean;
  duplicates?: 'combine' | 'first' | 'last';
  allowSparse?: boolean;
  arrayFormat?: 'indices' | 'brackets' | 'repeat' | 'comma';
  arrayFormatSeparator?: string;
}

export interface RouterOptions {
  prefix?: string;
  middleware?: Middleware[];
}

export interface FluentRoute {
  get(path: string, handler: RouteHandler): FluentRoute;
  post(path: string, handler: RouteHandler): FluentRoute;
  put(path: string, handler: RouteHandler): FluentRoute;
  del(path: string, handler: RouteHandler): FluentRoute;
  patch(path: string, handler: RouteHandler): FluentRoute;
  options(path: string, handler: RouteHandler): FluentRoute;
  head(path: string, handler: RouteHandler): FluentRoute;
  use(middleware: Middleware): FluentRoute;
  resource(name: string, options?: ResourceOptions): FluentRoute;
  group(prefix: string, callback: (router: FluentRoute) => void): FluentRoute;
}

// Resource-based routing
export interface ResourceOptions {
  only?: string[];
  except?: string[];
  middleware?: Middleware[];
  prefix?: string;
  handlers?: {
    index?: RouteHandler;
    show?: RouteHandler;
    create?: RouteHandler;
    update?: RouteHandler;
    patch?: RouteHandler;
    destroy?: RouteHandler;
  };
}


// Plugin system
export interface Plugin {
  name: string;
  version: string;
  install(app: any): void | Promise<void>;
}

export interface PluginOptions {
  [key: string]: any;
}

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

export interface HttpsOptions {
  key: string | Buffer | Array<Buffer | Object>;
  cert: string | Buffer | Array<string | Buffer>;
  ca?: string | Buffer | Array<string | Buffer>;
  pfx?: string | Buffer | Array<string | Buffer | Object>;
  passphrase?: string;
  secureProtocol?: string;
  secureOptions?: number;
  ciphers?: string;
  honorCipherOrder?: boolean;
  requestCert?: boolean;
  rejectUnauthorized?: boolean;
  sessionIdContext?: string;
  ticketKeys?: Buffer;
  [key: string]: any;
}

export interface Http2Options {
  maxDeflateDynamicTableSize?: number;
  maxSettings?: number;
  maxSessionMemory?: number;
  maxHeaderListPairs?: number;
  maxOutstandingPings?: number;
  maxReservedRemoteStreams?: number;
  maxSendHeaderBlockLength?: number;
  paddingStrategy?: number;
  peerMaxConcurrentStreams?: number;
  settings?: {
    headerTableSize?: number;
    enablePush?: boolean;
    initialWindowSize?: number;
    maxFrameSize?: number;
    maxConcurrentStreams?: number;
    maxHeaderListSize?: number;
    enableConnectProtocol?: boolean;
  };
  allowHTTP1?: boolean;
  origins?: string[];
  unknownProtocolTimeout?: number;
  [key: string]: any;
}

export interface ServerOptions {
  protocol?: 'http' | 'https' | 'http2';
  https?: HttpsOptions;
  http2?: Http2Options;
  host?: string;
  backlog?: number;
  exclusive?: boolean;
  ipv6Only?: boolean;
}
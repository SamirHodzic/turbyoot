import { CacheAdapter, CacheStats } from '../types.js';

// Memory cache adapter
export class MemoryCacheAdapter implements CacheAdapter {
  private cache = new Map<string, { value: string; expires?: number }>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    dels: 0,
    hitRate: 0
  };

  async get(key: string): Promise<string | null> {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
    
    if (item.expires && Date.now() > item.expires) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
    
    this.stats.hits++;
    this.updateHitRate();
    return item.value;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    const expires = ttl ? Date.now() + (ttl * 1000) : undefined;
    this.cache.set(key, { value, expires });
    this.stats.sets++;
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
    this.stats.dels++;
  }

  async delPattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        this.stats.dels++;
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    return item ? !(item.expires && Date.now() > item.expires) : false;
  }

  async expire(key: string, ttl: number): Promise<void> {
    const item = this.cache.get(key);
    if (item) {
      item.expires = Date.now() + (ttl * 1000);
    }
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }
}

// Redis cache adapter
export class RedisCacheAdapter implements CacheAdapter {
  private redis: any;

  constructor(redisClient: any) {
    this.redis = redisClient;
  }

  async get(key: string): Promise<string | null> {
    return await this.redis.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redis.setex(key, ttl, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  async expire(key: string, ttl: number): Promise<void> {
    await this.redis.expire(key, ttl);
  }
}

// Cache manager
export class CacheManager {
  private adapter: CacheAdapter;
  private keyPrefix: string;

  constructor(adapter: CacheAdapter = new MemoryCacheAdapter(), keyPrefix = 'turbyoot:') {
    this.adapter = adapter;
    this.keyPrefix = keyPrefix;
  }

  private getKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  async get(key: string): Promise<string | null> {
    const fullKey = this.getKey(key);
    const result = await this.adapter.get(fullKey);
    return result;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    const fullKey = this.getKey(key);
    await this.adapter.set(fullKey, value, ttl);
  }

  async del(key: string): Promise<void> {
    await this.adapter.del(this.getKey(key));
  }

  async delPattern(pattern: string): Promise<void> {
    await this.adapter.delPattern(this.getKey(pattern));
  }

  async invalidatePatterns(patterns: string[]): Promise<void> {
    for (const pattern of patterns) {
      await this.delPattern(pattern);
    }
  }

  async exists(key: string): Promise<boolean> {
    return await this.adapter.exists(this.getKey(key));
  }

  async expire(key: string, ttl: number): Promise<void> {
    await this.adapter.expire(this.getKey(key), ttl);
  }

  generateCacheKey(ctx: any, customKey?: string | ((ctx: any) => string)): string {
    if (customKey) {
      return typeof customKey === 'function' ? customKey(ctx) : customKey;
    }
    
    return `${ctx.req.method}:${ctx.req.url}`;
  }
}

// Global cache instance
let cacheManager: CacheManager | null = null;

export function initCache(adapter?: CacheAdapter, keyPrefix?: string): void {
  cacheManager = new CacheManager(adapter, keyPrefix);
  console.log('Cache initialized with adapter: ', adapter ? adapter.constructor.name : 'MemoryCacheAdapter');
}

export function getCache(): CacheManager {
  if (!cacheManager) {
    initCache();
  }
  return cacheManager!;
}

export function getCacheStats(): CacheStats | null {
  if (cacheManager && (cacheManager as any).adapter instanceof MemoryCacheAdapter) {
    return ((cacheManager as any).adapter as MemoryCacheAdapter).getStats();
  }
  return null;
}

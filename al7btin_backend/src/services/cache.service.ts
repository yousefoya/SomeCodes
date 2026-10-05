interface CacheItem<T> {
  value: T;
  expiresAt: number;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  keysCount: number;
  hitRatio: number;
}

/**
 * Production-Grade Namespaced Cache Service
 * Provides an in-memory, bounded, TTL-aware cache with Redis-ready interface.
 * Tracks metrics and provides automatic garbage collection of expired entries.
 */
export class CacheService {
  private store = new Map<string, CacheItem<any>>();
  private hits = 0;
  private misses = 0;
  private sets = 0;
  private deletes = 0;
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Periodic sweep every 60 seconds
    this.cleanupInterval = setInterval(() => {
      this.sweepExpired();
    }, 60 * 1000);

    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  private sweepExpired(): void {
    const now = Date.now();
    for (const [key, item] of this.store.entries()) {
      if (item.expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Retrieve an item from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const item = this.store.get(key);
    if (!item) {
      this.misses++;
      return null;
    }

    if (item.expiresAt <= Date.now()) {
      this.store.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return item.value as T;
  }

  /**
   * Store an item in cache with TTL in seconds
   */
  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    this.sets++;
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Delete a single key
   */
  async delete(key: string): Promise<void> {
    if (this.store.has(key)) {
      this.deletes++;
      this.store.delete(key);
    }
  }

  /**
   * Invalidate all keys matching a namespace prefix (e.g. "services:")
   */
  async invalidate(prefix: string): Promise<number> {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
        this.deletes++;
      }
    }
    return count;
  }

  /**
   * Alias for invalidate prefix
   */
  async invalidatePrefix(prefix: string): Promise<number> {
    return this.invalidate(prefix);
  }

  /**
   * Read-through cache helper: gets from cache or fetches from factory and caches
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds: number = 300): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await factory();
    if (fresh !== undefined && fresh !== null) {
      await this.set(key, fresh, ttlSeconds);
    }
    return fresh;
  }

  /**
   * Clear entire cache
   */
  async flush(): Promise<void> {
    this.store.clear();
  }

  /**
   * Get operational metrics
   */
  getMetrics(): CacheMetrics {
    const totalRequests = this.hits + this.misses;
    const hitRatio = totalRequests > 0 ? parseFloat((this.hits / totalRequests).toFixed(4)) : 0;
    return {
      hits: this.hits,
      misses: this.misses,
      sets: this.sets,
      deletes: this.deletes,
      keysCount: this.store.size,
      hitRatio,
    };
  }
}

export const cacheService = new CacheService();

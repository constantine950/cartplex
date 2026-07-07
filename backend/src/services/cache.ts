import { redis } from "../lib/redis.js";
import { logger } from "../utils/logger.js";

const CACHE_TTL = 5 * 60; // 5 minutes

// ── Generic cache wrapper ─────────────────────────────────────
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = CACHE_TTL,
): Promise<T> {
  try {
    const cached = await redis.get(key);
    if (cached) {
      logger.debug(`Cache hit: ${key}`);
      return JSON.parse(cached) as T;
    }
  } catch (err) {
    logger.warn("Cache read failed, falling through to DB", { key, err });
  }

  const data = await fetcher();

  try {
    await redis.setex(key, ttl, JSON.stringify(data));
    logger.debug(`Cache set: ${key} (TTL ${ttl}s)`);
  } catch (err) {
    logger.warn("Cache write failed", { key, err });
  }

  return data;
}

// ── Invalidate cache ──────────────────────────────────────────
export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length) {
      await redis.del(...keys);
      logger.debug(
        `Cache invalidated: ${keys.length} keys matching "${pattern}"`,
      );
    }
  } catch (err) {
    logger.warn("Cache invalidation failed", { pattern, err });
  }
}

// ── Cache key builders ────────────────────────────────────────
export const cacheKeys = {
  product: (slug: string) => `product:${slug}`,
  products: (filter: string) => `products:${filter}`,
  vendor: (slug: string) => `vendor:${slug}`,
  vendors: () => "vendors:all",
  productsByVendor: (vendorId: string) => `products:vendor:${vendorId}`,
};

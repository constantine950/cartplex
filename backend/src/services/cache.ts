import { redis } from "../lib/redis.js";
import { logger } from "../utils/logger.js";

const CACHE_TTL = 5 * 60;

export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = CACHE_TTL,
): Promise<T> {
  try {
    const cached = await redis.get(key);
    if (cached) {
      logger.debug(`Cache HIT: ${key}`);
      return JSON.parse(cached) as T;
    }
  } catch (err) {
    logger.warn("Cache read failed", { key });
  }

  logger.debug(`Cache MISS: ${key}`);
  const data = await fetcher();

  try {
    await redis.setex(key, ttl, JSON.stringify(data));
    logger.debug(`Cache SET: ${key}`);
  } catch (err) {
    logger.warn("Cache write failed", { key });
  }

  return data;
}

export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length) {
      await redis.del(...keys);
      logger.info(
        `Cache INVALIDATED: ${keys.length} keys matching "${pattern}"`,
      );
    }
  } catch (err) {
    logger.warn("Cache invalidation failed", { pattern });
  }
}

export const cacheKeys = {
  product: (slug: string) => `product:${slug}`,
  products: (filter: string) => `products:${filter}`,
  vendor: (slug: string) => `vendor:${slug}`,
  vendors: () => "vendors:all",
  productsByVendor: (vendorId: string) => `products:vendor:${vendorId}`,
};

import Redis from "ioredis";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

export const redis = new Redis(config.redis.url, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on("connect", () => logger.info("Redis connected"));
redis.on("error", (err) => logger.error("Redis error", { err }));
redis.on("reconnecting", () => logger.warn("Redis reconnecting..."));

export async function connectRedis(): Promise<void> {
  await redis.connect();
}

export const CART_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
export const RESERVATION_TTL_SECONDS = 15 * 60; // 15 minutes
export const cartKey = (sessionId: string) => `cart:${sessionId}`;
export const reservationKey = (variantId: string, sessionId: string) =>
  `reservation:${variantId}:${sessionId}`;

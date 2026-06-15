import type { PrismaClient } from "@prisma/client";
import type { redis } from "../../lib/redis.js";

export interface ApolloContext {
  userId?: string;
  vendorId?: string;
  role?: "BUYER" | "VENDOR" | "ADMIN";
  prisma: PrismaClient;
  redis: typeof redis;
}

// ── Shared resolver arg types ─────────────────────────────────
export interface PaginationArgs {
  page?: number;
  perPage?: number;
}

export interface ProductsFilterArgs extends PaginationArgs {
  search?: string;
  category?: string;
  vendorId?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  tags?: string[];
  sortBy?: "RELEVANCE" | "PRICE_ASC" | "PRICE_DESC" | "NEWEST" | "BEST_RATED";
}

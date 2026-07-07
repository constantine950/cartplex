import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger.js";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      { level: "error", emit: "stdout" },
      { level: "warn", emit: "stdout" },
      { level: "query", emit: "event" },
    ],
  });

// Log slow queries (>100ms)
prisma.$on("query", (e) => {
  if (e.duration > 100) {
    logger.warn(`Slow query (${e.duration}ms): ${e.query.slice(0, 120)}...`);
  } else if (process.env.LOG_LEVEL === "debug") {
    logger.debug(`Query (${e.duration}ms): ${e.query.slice(0, 80)}`);
  }
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function connectDB() {
  await prisma.$connect();
  logger.info("Database connected");
}

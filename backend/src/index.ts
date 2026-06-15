import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import express from "express";
import http from "http";
import cors from "cors";
import bodyParser from "body-parser";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { config } from "./config/index.js";
import { logger } from "./utils/logger.js";
import { prisma } from "./lib/prisma.js";
import { connectRedis, redis } from "./lib/redis.js";
import { pingElasticsearch, ensureProductIndex } from "./lib/elasticsearch.js";
import { bulkSyncAllProducts } from "./services/search.js";
import { resolvers } from "./graphql/resolvers/index.js";
import { verifyToken, extractToken } from "./middleware/auth.js";
import type { ApolloContext } from "./graphql/types/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const typeDefs = readFileSync(
  join(__dirname, "graphql/schema.graphql"),
  "utf-8",
);

async function bootstrap() {
  await connectRedis();

  // ES is non-fatal — app works without it (falls back to Prisma queries)
  try {
    await pingElasticsearch();
    await ensureProductIndex();
    await bulkSyncAllProducts();
    logger.info("Elasticsearch ready and products indexed");
  } catch (err) {
    logger.warn("Elasticsearch unavailable, running without search index", {
      message: err instanceof Error ? err.message : String(err),
    });
  }

  await prisma.$connect();
  logger.info("Database connected");

  const app = express();
  const httpServer = http.createServer(app);

  const server = new ApolloServer<ApolloContext>({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    introspection: true,
    formatError: (err) => {
      logger.error("GraphQL error", { message: err.message, path: err.path });
      return err;
    },
  });

  await server.start();

  app.use(
    "/graphql",
    cors<cors.CorsRequest>(),
    bodyParser.json(),
    expressMiddleware(server, {
      context: async ({ req }): Promise<ApolloContext> => {
        const token = extractToken(req.headers.authorization);
        const payload = token ? verifyToken(token) : null;
        return {
          userId: payload?.userId,
          vendorId: payload?.vendorId,
          role: payload?.role,
          prisma,
          redis,
        };
      },
    }),
  );

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", env: config.env });
  });

  await new Promise<void>((resolve) =>
    httpServer.listen({ port: config.port }, resolve),
  );

  logger.info(`🚀 CartPlex API ready at http://localhost:4000/graphql`);
}

bootstrap().catch((err) => {
  logger.error("Failed to start server", {
    err: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});

import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import express from "express";
import http from "http";
import cors from "cors";
import bodyParser from "body-parser";

import { config } from "./config/index.js";
import { logger } from "./utils/logger.js";
import { prisma } from "./lib/prisma.js";
import { connectRedis } from "./lib/redis.js";
import { pingElasticsearch } from "./lib/elasticsearch.js";
import { resolvers } from "./graphql/resolvers/index.js";

// Placeholder — real schema loaded on Day 4
const typeDefs = `#graphql
  type Query {
    _health: String
  }
`;

export interface ApolloContext {
  userId?: string;
  vendorId?: string;
}

async function bootstrap() {
  await connectRedis();
  await pingElasticsearch();
  await prisma.$connect();
  logger.info("Database connected");

  const app = express();
  const httpServer = http.createServer(app);

  const server = new ApolloServer<ApolloContext>({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    introspection: true,
  });

  await server.start();

  app.use(
    "/graphql",
    cors<cors.CorsRequest>(),
    bodyParser.json(),
    expressMiddleware(server, {
      context: async () => ({}),
    }),
  );

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", env: config.env });
  });

  await new Promise<void>((resolve) =>
    httpServer.listen({ port: config.port }, resolve),
  );

  logger.info(
    `🚀 CartPlex API ready at http://localhost:${config.port}/graphql`,
  );
}

bootstrap().catch((err) => {
  logger.error("Failed to start server", { err });
  process.exit(1);
});

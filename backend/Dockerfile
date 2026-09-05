FROM oven/bun:1 AS base
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --trust-all-plugins

FROM base AS development
COPY . .
RUN bunx prisma generate
EXPOSE 4000
CMD ["bun", "--watch", "src/index.ts"]

FROM base AS builder
COPY . .
RUN bunx prisma generate
RUN bun build src/index.ts --outdir dist --target node

FROM oven/bun:1 AS production
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --production --trust-all-plugins
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

RUN groupadd --system app && useradd --system --gid app app
USER app

EXPOSE 4000
CMD ["bun", "dist/index.js"]
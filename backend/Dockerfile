FROM oven/bun:1 AS base
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install

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
RUN bun install --production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma
EXPOSE 4000
CMD ["bun", "dist/index.js"]
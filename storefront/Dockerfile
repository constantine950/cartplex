FROM oven/bun:1 AS base
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install

FROM base AS development
COPY . .
EXPOSE 3000
CMD ["bun", "run", "dev"]

FROM base AS builder
COPY . .
RUN bun run build

FROM oven/bun:1 AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["bun", "server.js"]
import "dotenv/config";

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export const config = {
  env: process.env.NODE_ENV ?? "development",
  port: parseInt(process.env.PORT ?? "4000", 10),
  db: {
    url: required("DATABASE_URL"),
  },
  redis: {
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
  },
  elasticsearch: {
    url: process.env.ELASTICSEARCH_URL ?? "http://localhost:9200",
    indices: {
      products: "cartplex_products",
    },
  },
  jwt: {
    secret: required("JWT_SECRET"),
    expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  },
  stripe: {
    secretKey: required("STRIPE_SECRET_KEY"),
    webhookSecret: required("STRIPE_WEBHOOK_SECRET"),
  },
  platform: {
    feePercent: parseFloat(process.env.PLATFORM_FEE_PERCENT ?? "10"),
  },
} as const;

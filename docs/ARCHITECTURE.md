# CartPlex — Architecture

## System Overview

Buyer / Vendor / Admin

│

▼

Next.js Storefront ──┐

Next.js Admin ├──► GraphQL API (Apollo Server + Express)

Next.js Vendor Dash ──┘ │

┌────┴─────┐

│ │

Prisma Elasticsearch

│ │

Postgres cartplex_products index

│

Redis

(cart, reservations)

│

Stripe

(payments, payouts)

## Request Lifecycle

1. Client sends GraphQL query/mutation with `Authorization: Bearer <jwt>`
2. Apollo context extracts and verifies JWT → attaches `userId`, `role`, `vendorId`
3. Fresh DataLoader instances created per request (batches DB calls within one operation)
4. Resolver runs — reads from Prisma (Postgres) or Elasticsearch depending on query type
5. Response returned; any side effects (ES sync, Stripe calls) fire async

## Data Flow by Operation

### Product Search

Client → products(filter) resolver

→ Elasticsearch (if any filter/search param present)

→ returns IDs + facet aggregations

→ Prisma.findMany({ id: { in: esIds } }) (hydrate full records)

→ return sorted results + facets
Fallback: if ES unavailable → Prisma directly

### Checkout

Client → checkout mutation

→ validate cart items (Redis)

→ check inventory (Postgres row lock)

→ create Order + OrderItems (Postgres)

→ decrement variant inventoryCount

→ create Stripe PaymentIntent

→ return order + client_secret
On Stripe webhook (payment_intent.succeeded):

→ update Order.status = PAID

→ split payout per vendor (Stripe Connect transfer)

→ store Payout records

### Product Write → ES Sync

createProduct / updateProduct / updateInventory mutation

→ write to Postgres via Prisma

→ syncProductToES() fires async (non-blocking)

→ fetch full product with vendor + variants

→ esClient.index({ id, document })

## Key Technical Decisions

### Why GraphQL?

Single endpoint for all four frontends. Each client requests exactly the fields it needs — the storefront fetches images and price, the vendor dashboard fetches inventory counts, the admin fetches payout totals. No over-fetching.

### Why Elasticsearch?

Faceted search (category + price range + vendor + tags simultaneously) is not practical in Postgres without full-text extensions and complex lateral joins. ES aggregations return all facet counts in a single query.

### Why Redis for Cart?

Cart state is ephemeral, session-scoped, and written on every add/remove/update. Postgres would add unnecessary write pressure. Redis TTL handles cart expiry automatically (30 days). Inventory reservations use a 15-minute TTL to release held stock on abandoned checkouts.

### Why Stripe Connect?

Multi-vendor payouts require splitting a single buyer payment across multiple vendor accounts minus a platform fee. Stripe Connect Express handles vendor onboarding, KYC, and transfer routing without CartPlex storing banking details.

## DataLoader Pattern

Each GraphQL request gets a fresh set of DataLoader instances. When a list of products is returned, each product's `vendor` field resolver calls `loaders.vendor.load(vendorId)`. DataLoader batches all vendor IDs collected during the tick into a single `WHERE id IN (...)` query, eliminating N+1.

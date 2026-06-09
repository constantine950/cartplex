## 1. Overview

## CartPlex is a headless multi-vendor commerce engine. It enables independent vendors to list and sell products through a shared marketplace storefront, with the marketplace operator earning a platform fee on every transaction. All commerce operations are exposed via a GraphQL API, making the frontend fully decoupled and replaceable.

## 2. Actors

### 2.1 Buyer

A registered or guest user who browses the marketplace, adds products to a cart, applies coupons, and completes checkout via Stripe.

**Capabilities:**

- Browse and search products across all vendors
- Filter and sort by category, price, rating, stock status
- Manage a persistent cart (guest cart merges on login)
- Apply coupon/discount codes at checkout
- Pay via Stripe (card)
- Track order status
- Leave verified reviews on purchased products

### 2.2 Vendor

A registered business or individual seller who has been approved by the marketplace admin. Each vendor operates an isolated storefront within the platform.

**Capabilities:**

- Onboard via Stripe Connect Express (to receive payouts)
- Create and manage product listings with variants (size, colour, etc.)
- Set per-product pricing and inventory quantities
- Enable/disable backorder on products
- View and fulfil incoming orders (mark as shipped, add tracking number)
- View payout history and pending balance

### 2.3 Marketplace Admin

The platform operator with full visibility across all vendors, orders, and revenue.

**Capabilities:**

- Approve or suspend vendor accounts
- View all orders across all vendors
- Create, disable, and monitor coupon/discount campaigns
- View platform revenue dashboard: GMV, platform fees collected, total payouts disbursed

---

## 3. Commerce Entities

### 3.1 Product

A sellable item listed by a vendor.

| Field       | Type      | Notes                                    |
| ----------- | --------- | ---------------------------------------- |
| id          | UUID      |                                          |
| vendor_id   | UUID      | FK → vendors                             |
| name        | string    | Indexed in Elasticsearch                 |
| description | text      | Indexed in Elasticsearch                 |
| category    | string    | Keyword facet in ES                      |
| tags        | string[]  | Keyword facet in ES                      |
| base_price  | decimal   | Per-unit price before variant adjustment |
| images      | string[]  | Array of URLs                            |
| is_active   | boolean   | Soft delete / de-listing                 |
| avg_rating  | decimal   | Computed from reviews                    |
| created_at  | timestamp |                                          |

### 3.2 Product Variant

A specific configuration of a product (e.g. "Red, Size L").

| Field               | Type    | Notes                                   |
| ------------------- | ------- | --------------------------------------- |
| id                  | UUID    |                                         |
| product_id          | UUID    | FK → products                           |
| sku                 | string  | Unique per variant                      |
| options             | JSON    | e.g. `{ "size": "L", "colour": "Red" }` |
| price_modifier      | decimal | Added to base_price                     |
| inventory_count     | integer | Current stock level                     |
| low_stock_threshold | integer | Triggers vendor alert                   |
| backorder_enabled   | boolean | Allow orders at 0 stock                 |

### 3.3 Inventory

Stock movement log for audit purposes (separate from the count on the variant).

| Field      | Type      | Notes                                                   |
| ---------- | --------- | ------------------------------------------------------- |
| id         | UUID      |                                                         |
| variant_id | UUID      | FK → product_variants                                   |
| delta      | integer   | Positive = restock, negative = sale                     |
| reason     | enum      | `sale`, `restock`, `adjustment`, `reserved`, `released` |
| created_at | timestamp |                                                         |

### 3.4 Order

A completed checkout, potentially spanning multiple vendors.

| Field                    | Type      | Notes                                                               |
| ------------------------ | --------- | ------------------------------------------------------------------- |
| id                       | UUID      |                                                                     |
| buyer_id                 | UUID      | FK → users                                                          |
| status                   | enum      | `pending_payment` → `paid` → `fulfilling` → `shipped` → `delivered` |
| subtotal                 | decimal   | Before discounts                                                    |
| discount_amount          | decimal   |                                                                     |
| shipping_amount          | decimal   |                                                                     |
| tax_amount               | decimal   |                                                                     |
| total                    | decimal   | Final charged amount                                                |
| stripe_payment_intent_id | string    |                                                                     |
| coupon_id                | UUID      | FK → coupons (nullable)                                             |
| created_at               | timestamp |                                                                     |

### 3.5 Order Item

A single line item within an order, always belonging to one vendor.

| Field      | Type    | Notes                                            |
| ---------- | ------- | ------------------------------------------------ |
| id         | UUID    |                                                  |
| order_id   | UUID    | FK → orders                                      |
| vendor_id  | UUID    | FK → vendors (denormalised for payout splitting) |
| variant_id | UUID    | FK → product_variants                            |
| quantity   | integer |                                                  |
| unit_price | decimal | Price at time of purchase (snapshot)             |
| line_total | decimal | unit_price × quantity                            |

### 3.6 Coupon

A discount rule that can be applied to a cart at checkout.

| Field                  | Type      | Notes                                                 |
| ---------------------- | --------- | ----------------------------------------------------- |
| id                     | UUID      |                                                       |
| code                   | string    | Unique, case-insensitive                              |
| type                   | enum      | `percentage`, `fixed_amount`, `free_shipping`, `bogo` |
| value                  | decimal   | Amount or percentage                                  |
| min_order_value        | decimal   | Nullable — minimum cart subtotal                      |
| applies_to_product_ids | UUID[]    | Nullable — restrict to specific products              |
| applies_to_vendor_ids  | UUID[]    | Nullable — restrict to specific vendors               |
| usage_limit            | integer   | Nullable — max total redemptions                      |
| usage_count            | integer   | Atomically incremented on redemption                  |
| expires_at             | timestamp | Nullable                                              |
| is_active              | boolean   |                                                       |

### 3.7 Payout

A record of a Stripe Connect transfer to a vendor.

| Field              | Type      | Notes                            |
| ------------------ | --------- | -------------------------------- |
| id                 | UUID      |                                  |
| vendor_id          | UUID      | FK → vendors                     |
| order_id           | UUID      | FK → orders                      |
| gross_amount       | decimal   | Vendor's total from order items  |
| platform_fee       | decimal   | Marketplace cut                  |
| net_amount         | decimal   | gross_amount − platform_fee      |
| stripe_transfer_id | string    | From Stripe API                  |
| status             | enum      | `pending`, `completed`, `failed` |
| created_at         | timestamp |                                  |

---

## 4. Search Requirements

CartPlex uses Elasticsearch for all product search and discovery.

### 4.1 Full-text Search

- Fields: `name` (boosted ×3), `description`, `tags`
- Fuzzy matching enabled for typo tolerance
- Ranked by relevance score by default

### 4.2 Facets

All facets are computed via Elasticsearch aggregations and returned alongside results so the UI can render filter checkboxes dynamically.

| Facet       | ES Type             | Notes                |
| ----------- | ------------------- | -------------------- |
| Category    | `terms` aggregation | Keyword field        |
| Vendor      | `terms` aggregation | Keyword field        |
| Price Range | `range` aggregation | Configurable buckets |
| Avg Rating  | `range` aggregation | 1–2, 3–4, 4–5 stars  |
| In Stock    | `terms` aggregation | Boolean field        |
| Tags        | `terms` aggregation | Keyword array field  |

### 4.3 Filters

Buyers can apply one or more filters simultaneously. Filters narrow the result set; facet counts update dynamically to reflect remaining options.

| Filter   | Behaviour              |
| -------- | ---------------------- |
| Category | Exact match (keyword)  |
| Vendor   | Exact match (keyword)  |
| Price    | Range filter — min/max |
| In Stock | Boolean must-match     |
| Rating   | Minimum rating filter  |
| Tags     | One or more tag match  |

### 4.4 Sort Options

| Option              | ES Sort           |
| ------------------- | ----------------- |
| Relevance (default) | `_score` desc     |
| Price: Low to High  | `price` asc       |
| Price: High to Low  | `price` desc      |
| Newest              | `created_at` desc |
| Best Rated          | `avg_rating` desc |

### 4.5 Index Mapping (summary)

```json
{
  "mappings": {
    "properties": {
      "name": { "type": "text", "boost": 3 },
      "description": { "type": "text" },
      "category": { "type": "keyword" },
      "vendor_id": { "type": "keyword" },
      "tags": { "type": "keyword" },
      "price": { "type": "float" },
      "avg_rating": { "type": "float" },
      "in_stock": { "type": "boolean" },
      "created_at": { "type": "date" }
    }
  }
}
```

---

## 5. Non-Functional Requirements

| Requirement                     | Target                              |
| ------------------------------- | ----------------------------------- |
| GraphQL API response time (p95) | < 200ms                             |
| Search response time (p95)      | < 150ms                             |
| Cart session TTL                | 30 days (Redis)                     |
| Inventory reservation hold      | 15 minutes (Redis TTL)              |
| Stripe webhook idempotency      | Enforced via event ID deduplication |
| Platform fee                    | Configurable (default 10%)          |

---

## 6. Out of Scope (v1)

- Mobile app
- Recommendation engine / personalisation
- Multi-currency support
- Physical shipping carrier integrations (rates are estimated flat-fee in v1)
- Vendor-to-vendor messaging
- Subscription / recurring billing

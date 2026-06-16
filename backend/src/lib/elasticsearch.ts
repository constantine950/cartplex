import { Client } from "@elastic/elasticsearch";
import { HttpConnection } from "@elastic/transport";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

export const esClient = new Client({
  node: config.elasticsearch.url,
  Connection: HttpConnection,
  requestTimeout: 10000,
});

export async function pingElasticsearch(): Promise<void> {
  const info = await esClient.info();
  logger.info(`Elasticsearch connected — cluster: ${info.cluster_name}`);
}

const INDEX = config.elasticsearch.indices.products;

export async function ensureProductIndex(): Promise<void> {
  const exists = await esClient.indices.exists({ index: INDEX });
  if (exists) {
    logger.info(`ES index "${INDEX}" already exists`);
    return;
  }

  await esClient.indices.create({
    index: INDEX,
    mappings: {
      properties: {
        id: { type: "keyword" },
        vendorId: { type: "keyword" },
        vendorName: { type: "keyword" },
        vendorSlug: { type: "keyword" },
        name: { type: "text" },
        description: { type: "text" },
        category: { type: "keyword" },
        tags: { type: "keyword" },
        basePrice: { type: "float" },
        avgRating: { type: "float" },
        inStock: { type: "boolean" },
        isActive: { type: "boolean" },
        images: { type: "keyword", index: false },
        slug: { type: "keyword" },
        createdAt: { type: "date" },
      },
    },
    settings: {
      number_of_shards: 1,
      number_of_replicas: 0,
    },
  });

  logger.info(`ES index "${INDEX}" created`);
}

export interface ProductDocument {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorSlug: string;
  name: string;
  description: string | null;
  category: string;
  tags: string[];
  basePrice: number;
  avgRating: number;
  inStock: boolean;
  isActive: boolean;
  images: string[];
  slug: string;
  createdAt: string;
}

export async function indexProduct(doc: ProductDocument): Promise<void> {
  try {
    await esClient.index({ index: INDEX, id: doc.id, document: doc });
  } catch (err) {
    logger.error("Failed to index product", { id: doc.id, err });
  }
}

export async function deleteProductFromIndex(id: string): Promise<void> {
  try {
    await esClient.delete({ index: INDEX, id });
  } catch (err) {
    logger.warn("Failed to delete product from index", { id, err });
  }
}

export async function bulkIndexProducts(
  docs: ProductDocument[],
): Promise<void> {
  if (!docs.length) return;

  const operations = docs.flatMap((doc) => [
    { index: { _index: INDEX, _id: doc.id } },
    doc,
  ]);

  const result = await esClient.bulk({ operations, refresh: true });

  if (result.errors) {
    const errors = result.items
      .filter((i) => i.index?.error)
      .map((i) => i.index?.error);
    logger.error("Bulk index had errors", { errors });
  } else {
    logger.info(`Bulk indexed ${docs.length} products`);
  }
}

export interface SearchParams {
  search?: string;
  category?: string;
  vendorId?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  tags?: string[];
  sortBy?: string;
  page?: number;
  perPage?: number;
}

export async function searchProducts(params: SearchParams) {
  const {
    search,
    category,
    vendorId,
    minPrice,
    maxPrice,
    inStock,
    tags,
    sortBy = "NEWEST",
    page = 1,
    perPage = 20,
  } = params;

  // ── Base query — always active products ───────────────────
  const baseFilter: any[] = [{ term: { isActive: true } }];

  // ── Full-text search ──────────────────────────────────────
  const must: any[] = [];
  if (search) {
    must.push({
      multi_match: {
        query: search,
        fields: ["name^3", "description", "tags"],
        fuzziness: "AUTO",
        operator: "or",
      },
    });
  }

  // ── Narrowing filters (applied to results AND facet counts) ─
  const activeFilters: any[] = [...baseFilter];
  if (category) activeFilters.push({ term: { category } });
  if (vendorId) activeFilters.push({ term: { vendorId } });
  if (inStock !== undefined) activeFilters.push({ term: { inStock } });
  if (tags?.length) activeFilters.push({ terms: { tags } });
  if (minPrice !== undefined || maxPrice !== undefined) {
    const range: any = {};
    if (minPrice !== undefined) range.gte = minPrice;
    if (maxPrice !== undefined) range.lte = maxPrice;
    activeFilters.push({ range: { basePrice: range } });
  }

  // ── Sort ──────────────────────────────────────────────────
  const sort: any[] = (() => {
    switch (sortBy) {
      case "PRICE_ASC":
        return [{ basePrice: { order: "asc" } }];
      case "PRICE_DESC":
        return [{ basePrice: { order: "desc" } }];
      case "BEST_RATED":
        return [{ avgRating: { order: "desc" } }];
      case "NEWEST":
        return [{ createdAt: { order: "desc" } }];
      default:
        return [{ _score: { order: "desc" } }];
    }
  })();

  const from = (page - 1) * perPage;

  const response = await esClient.search({
    index: INDEX,
    from,
    size: perPage,
    query: {
      bool: {
        must: must.length ? must : [{ match_all: {} }],
        filter: activeFilters,
      },
    },
    sort,
    // ── Aggregations for facets ───────────────────────────
    aggs: {
      // Category facet — excludes current category filter so all options show
      categories: {
        filter: {
          bool: {
            must: must.length ? must : [{ match_all: {} }],
            filter: activeFilters.filter((f) => !f.term?.category),
          },
        },
        aggs: {
          buckets: { terms: { field: "category", size: 30 } },
        },
      },

      // Vendor facet — excludes current vendor filter
      vendors: {
        filter: {
          bool: {
            must: must.length ? must : [{ match_all: {} }],
            filter: activeFilters.filter((f) => !f.term?.vendorId),
          },
        },
        aggs: {
          buckets: { terms: { field: "vendorName", size: 30 } },
        },
      },

      // Tags facet — excludes current tag filter
      tags: {
        filter: {
          bool: {
            must: must.length ? must : [{ match_all: {} }],
            filter: activeFilters.filter((f) => !f.terms?.tags),
          },
        },
        aggs: {
          buckets: { terms: { field: "tags", size: 50 } },
        },
      },

      // Price ranges — excludes current price filter
      price_ranges: {
        filter: {
          bool: {
            must: must.length ? must : [{ match_all: {} }],
            filter: activeFilters.filter((f) => !f.range?.basePrice),
          },
        },
        aggs: {
          buckets: {
            range: {
              field: "basePrice",
              ranges: [
                { key: "under-25", from: 0, to: 25 },
                { key: "25-50", from: 25, to: 50 },
                { key: "50-100", from: 50, to: 100 },
                { key: "over-100", from: 100 },
              ],
            },
          },
        },
      },

      // In-stock count
      in_stock_count: {
        filter: { term: { inStock: true } },
      },

      // Total price stats for slider bounds
      price_stats: {
        stats: { field: "basePrice" },
      },
    },
  });

  const hits = response.hits.hits;
  const total =
    typeof response.hits.total === "number"
      ? response.hits.total
      : (response.hits.total?.value ?? 0);

  const aggs = response.aggregations as any;

  return {
    ids: hits.map((h) => h._id as string),
    total,
    priceStats: {
      min: aggs?.price_stats?.min ?? 0,
      max: aggs?.price_stats?.max ?? 1000,
    },
    facets: {
      categories: (aggs?.categories?.buckets?.buckets ?? []).map((b: any) => ({
        key: b.key,
        count: b.doc_count,
      })),
      vendors: (aggs?.vendors?.buckets?.buckets ?? []).map((b: any) => ({
        key: b.key,
        count: b.doc_count,
      })),
      tags: (aggs?.tags?.buckets?.buckets ?? []).map((b: any) => ({
        key: b.key,
        count: b.doc_count,
      })),
      priceRanges: (aggs?.price_ranges?.buckets?.buckets ?? []).map(
        (b: any) => ({
          from: b.from ?? null,
          to: b.to ?? null,
          count: b.doc_count,
        }),
      ),
    },
  };
}

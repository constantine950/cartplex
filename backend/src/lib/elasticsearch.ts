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

// ── Index mapping ─────────────────────────────────────────────
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

  const must: any[] = [{ term: { isActive: true } }];
  const filter: any[] = [];

  if (search) {
    must.push({
      multi_match: {
        query: search,
        fields: ["name^3", "description", "tags"],
        fuzziness: "AUTO",
      },
    });
  }

  if (category) filter.push({ term: { category } });
  if (vendorId) filter.push({ term: { vendorId } });
  if (inStock !== undefined) filter.push({ term: { inStock } });
  if (tags?.length) filter.push({ terms: { tags } });
  if (minPrice !== undefined || maxPrice !== undefined) {
    const range: any = {};
    if (minPrice !== undefined) range.gte = minPrice;
    if (maxPrice !== undefined) range.lte = maxPrice;
    filter.push({ range: { basePrice: range } });
  }

  const sort: any[] = (() => {
    switch (sortBy) {
      case "PRICE_ASC":
        return [{ basePrice: "asc" }];
      case "PRICE_DESC":
        return [{ basePrice: "desc" }];
      case "BEST_RATED":
        return [{ avgRating: "desc" }];
      case "NEWEST":
        return [{ createdAt: "desc" }];
      default:
        return ["_score"];
    }
  })();

  const from = (page - 1) * perPage;

  const response = await esClient.search({
    index: INDEX,
    from,
    size: perPage,
    query: { bool: { must, filter } },
    sort,
    aggs: {
      categories: { terms: { field: "category", size: 20 } },
      vendors: { terms: { field: "vendorName", size: 20 } },
      tags: { terms: { field: "tags", size: 30 } },
      price_ranges: {
        range: {
          field: "basePrice",
          ranges: [
            { from: 0, to: 25 },
            { from: 25, to: 50 },
            { from: 50, to: 100 },
            { from: 100 },
          ],
        },
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
    ids: hits.map((h) => h._id),
    total,
    facets: {
      categories: (aggs?.categories?.buckets ?? []).map((b: any) => ({
        key: b.key,
        count: b.doc_count,
      })),
      vendors: (aggs?.vendors?.buckets ?? []).map((b: any) => ({
        key: b.key,
        count: b.doc_count,
      })),
      tags: (aggs?.tags?.buckets ?? []).map((b: any) => ({
        key: b.key,
        count: b.doc_count,
      })),
      priceRanges: (aggs?.price_ranges?.buckets ?? []).map((b: any) => ({
        from: b.from ?? null,
        to: b.to ?? null,
        count: b.doc_count,
      })),
    },
  };
}

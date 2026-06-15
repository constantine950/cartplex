import { prisma } from "../lib/prisma.js";
import {
  indexProduct,
  bulkIndexProducts,
  deleteProductFromIndex,
  type ProductDocument,
} from "../lib/elasticsearch.js";

function toDoc(product: any): ProductDocument {
  const totalStock = (product.variants ?? []).reduce(
    (sum: number, v: any) => sum + (v.inventoryCount ?? 0),
    0,
  );

  return {
    id: product.id,
    vendorId: product.vendorId,
    vendorName: product.vendor?.name ?? "",
    vendorSlug: product.vendor?.slug ?? "",
    name: product.name,
    description: product.description ?? null,
    category: product.category,
    tags: product.tags ?? [],
    basePrice: parseFloat(product.basePrice),
    avgRating: parseFloat(product.avgRating ?? "0"),
    inStock: totalStock > 0,
    isActive: product.isActive,
    images: product.images ?? [],
    slug: product.slug,
    createdAt: product.createdAt.toISOString(),
  };
}

export async function syncProductToES(productId: string): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { vendor: true, variants: true },
  });
  if (!product) return;

  if (!product.isActive) {
    await deleteProductFromIndex(productId);
    return;
  }

  await indexProduct(toDoc(product));
}

export async function bulkSyncAllProducts(): Promise<void> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { vendor: true, variants: true },
  });

  await bulkIndexProducts(products.map(toDoc));
}

import DataLoader from "dataloader";
import { prisma } from "../lib/prisma.js";

// Vendor loader
export function createVendorLoader() {
  return new DataLoader(async (ids: readonly string[]) => {
    const vendors = await prisma.vendor.findMany({
      where: { id: { in: [...ids] } },
    });
    const map = new Map(vendors.map((v: any) => [v.id, v]));
    return ids.map((id) => map.get(id) ?? null);
  });
}

// Product loader
export function createProductLoader() {
  return new DataLoader(async (ids: readonly string[]) => {
    const products = await prisma.product.findMany({
      where: { id: { in: [...ids] } },
    });
    const map = new Map(products.map((p: any) => [p.id, p]));
    return ids.map((id) => map.get(id) ?? null);
  });
}

// Variants by product loader
export function createVariantsByProductLoader() {
  return new DataLoader(async (productIds: readonly string[]) => {
    const variants = await prisma.productVariant.findMany({
      where: { productId: { in: [...productIds] } },
    });
    return productIds.map((id) =>
      variants.filter((v: any) => v.productId === id),
    );
  });
}

// Reviews by product loader
export function createReviewsByProductLoader() {
  return new DataLoader(async (productIds: readonly string[]) => {
    const reviews = await prisma.review.findMany({
      where: { productId: { in: [...productIds] } },
      include: { buyer: true },
      orderBy: { createdAt: "desc" },
    });
    return productIds.map((id) =>
      reviews.filter((r: any) => r.productId === id),
    );
  });
}

// Products by vendor loader
export function createProductsByVendorLoader() {
  return new DataLoader(async (vendorIds: readonly string[]) => {
    const products = await prisma.product.findMany({
      where: { vendorId: { in: [...vendorIds] }, isActive: true },
      include: { variants: true },
    });
    return vendorIds.map((id) =>
      products.filter((p: any) => p.vendorId === id),
    );
  });
}

// User loader
export function createUserLoader() {
  return new DataLoader(async (ids: readonly string[]) => {
    const users = await prisma.user.findMany({
      where: { id: { in: [...ids] } },
    });
    const map = new Map(users.map((u: any) => [u.id, u]));
    return ids.map((id) => map.get(id) ?? null);
  });
}

//Factory — one set of loaders per request
export function createLoaders() {
  return {
    vendor: createVendorLoader(),
    product: createProductLoader(),
    variantsByProduct: createVariantsByProductLoader(),
    reviewsByProduct: createReviewsByProductLoader(),
    productsByVendor: createProductsByVendorLoader(),
    user: createUserLoader(),
  };
}

export type Loaders = ReturnType<typeof createLoaders>;

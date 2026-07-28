import { prisma } from "../../lib/prisma.js";
import { requireVendor } from "../../middleware/auth.js";
import { syncProductToES } from "../../services/search.js";
import { searchProducts } from "../../lib/elasticsearch.js";
import { withCache, invalidateCache, cacheKeys } from "../../services/cache.js";
import type { ApolloContext } from "../types/index.js";

export const productResolvers = {
  Query: {
    products: async (
      _: unknown,
      { filter = {} }: { filter: any },
      context: ApolloContext,
    ) => {
      try {
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
        } = filter;

        const useES = !!(
          search ||
          category ||
          vendorId ||
          minPrice !== undefined ||
          maxPrice !== undefined ||
          inStock !== undefined ||
          tags?.length
        );

        if (useES) {
          try {
            const esResult = await searchProducts({
              search,
              category,
              vendorId,
              minPrice,
              maxPrice,
              inStock,
              tags,
              sortBy,
              page,
              perPage,
            });

            const products = await prisma.product.findMany({
              where: { id: { in: esResult.ids } },
              include: { vendor: true, variants: true },
            });

            const sorted = esResult.ids
              .map((id) => products.find((p: any) => p.id === id))
              .filter(Boolean);

            return {
              items: sorted,
              pageInfo: {
                total: esResult.total,
                page,
                perPage,
                totalPages: Math.ceil(esResult.total / perPage),
              },
              facets: esResult.facets,
              priceStats: esResult.priceStats,
            };
          } catch (err) {
            console.error("ES search failed, falling back to Prisma:", err);
          }
        }

        // Cached unfiltered listing
        const cacheKey = cacheKeys.products(`${sortBy}:${page}:${perPage}`);

        return withCache(cacheKey, async () => {
          const orderBy = (() => {
            switch (sortBy) {
              case "PRICE_ASC":
                return { basePrice: "asc" as const };
              case "PRICE_DESC":
                return { basePrice: "desc" as const };
              case "BEST_RATED":
                return { avgRating: "desc" as const };
              default:
                return { createdAt: "desc" as const };
            }
          })();

          const skip = (page - 1) * perPage;

          const [items, total] = await Promise.all([
            prisma.product.findMany({
              where: { isActive: true },
              orderBy,
              skip,
              take: perPage,
              include: { vendor: true, variants: true },
            }),
            prisma.product.count({ where: { isActive: true } }),
          ]);

          const [categories, vendors] = await Promise.all([
            prisma.product.groupBy({
              by: ["category"],
              where: { isActive: true },
              _count: { category: true },
            }),
            prisma.vendor.findMany({
              where: { status: "APPROVED" },
              select: {
                id: true,
                name: true,
                _count: { select: { products: true } },
              },
            }),
          ]);

          return {
            items,
            pageInfo: {
              total,
              page,
              perPage,
              totalPages: Math.ceil(total / perPage),
            },
            facets: {
              categories: categories.map((c: any) => ({
                key: c.category,
                count: c._count.category,
              })),
              vendors: vendors.map((v: any) => ({
                key: v.name,
                count: v._count.products,
              })),
              priceRanges: [
                { from: 0, to: 25, count: 0 },
                { from: 25, to: 50, count: 0 },
                { from: 50, to: 100, count: 0 },
                { from: 100, to: null, count: 0 },
              ],
              tags: [],
            },
            priceStats: null,
          };
        });
      } catch (err) {
        console.error("products resolver error:", err);
        throw err;
      }
    },

    // Cached single product
    product: async (_: unknown, { slug }: { slug: string }) => {
      return withCache(cacheKeys.product(slug), () =>
        prisma.product.findUnique({
          where: { slug },
          include: {
            vendor: true,
            variants: true,
            reviews: {
              include: { buyer: true },
              orderBy: { createdAt: "desc" },
              take: 20,
            },
          },
        }),
      );
    },
  },

  Mutation: {
    createProduct: async (
      _: unknown,
      { input }: { input: any },
      context: ApolloContext,
    ) => {
      const vendorId = requireVendor(context);
      const slug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const existing = await prisma.product.findUnique({ where: { slug } });
      const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

      const product = await prisma.product.create({
        data: {
          vendorId,
          name: input.name,
          slug: finalSlug,
          description: input.description,
          category: input.category,
          tags: input.tags ?? [],
          basePrice: input.basePrice,
          images: input.images ?? [],
        },
        include: { vendor: true, variants: true },
      });

      // Invalidate product list caches
      await invalidateCache("products:*");
      syncProductToES(product.id).catch(console.error);
      return product;
    },

    updateProduct: async (
      _: unknown,
      { id, input }: { id: string; input: any },
      context: ApolloContext,
    ) => {
      const vendorId = requireVendor(context);
      const product = await prisma.product.findUnique({ where: { id } });
      if (!product) throw new Error("Product not found");
      if (product.vendorId !== vendorId && context.role !== "ADMIN")
        throw new Error("FORBIDDEN");

      const updated = await prisma.product.update({
        where: { id },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.description !== undefined && {
            description: input.description,
          }),
          ...(input.category && { category: input.category }),
          ...(input.tags && { tags: input.tags }),
          ...(input.basePrice !== undefined && { basePrice: input.basePrice }),
          ...(input.images && { images: input.images }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
        },
        include: { vendor: true, variants: true },
      });

      // Invalidate specific product cache + list caches
      await Promise.all([
        invalidateCache(`product:${updated.slug}`),
        invalidateCache("products:*"),
      ]);
      syncProductToES(id).catch(console.error);
      return updated;
    },

    deleteProduct: async (
      _: unknown,
      { id }: { id: string },
      context: ApolloContext,
    ) => {
      const vendorId = requireVendor(context);
      const product = await prisma.product.findUnique({ where: { id } });
      if (!product) throw new Error("Product not found");
      if (product.vendorId !== vendorId && context.role !== "ADMIN")
        throw new Error("FORBIDDEN");

      await prisma.product.update({ where: { id }, data: { isActive: false } });
      await Promise.all([
        invalidateCache(`product:${product.slug}`),
        invalidateCache("products:*"),
      ]);
      syncProductToES(id).catch(console.error);
      return true;
    },

    addVariant: async (
      _: unknown,
      { productId, input }: { productId: string; input: any },
      context: ApolloContext,
    ) => {
      const vendorId = requireVendor(context);
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });
      if (!product) throw new Error("Product not found");
      if (product.vendorId !== vendorId && context.role !== "ADMIN")
        throw new Error("FORBIDDEN");

      const variant = await prisma.productVariant.create({
        data: {
          productId,
          sku: input.sku,
          options: input.options,
          priceModifier: input.priceModifier ?? 0,
          inventoryCount: input.inventoryCount,
          lowStockThreshold: input.lowStockThreshold ?? 5,
          backorderEnabled: input.backorderEnabled ?? false,
        },
        include: { product: true },
      });

      await invalidateCache(`product:${product.slug}`);
      syncProductToES(productId).catch(console.error);
      return variant;
    },

    updateInventory: async (
      _: unknown,
      { input }: { input: any },
      context: ApolloContext,
    ) => {
      requireVendor(context);
      const variant = await prisma.productVariant.findUnique({
        where: { id: input.variantId },
      });
      if (!variant) throw new Error("Variant not found");

      const [updated] = await prisma.$transaction([
        prisma.productVariant.update({
          where: { id: input.variantId },
          data: { inventoryCount: { increment: input.delta } },
          include: { product: true },
        }),
        prisma.inventory.create({
          data: {
            variantId: input.variantId,
            delta: input.delta,
            reason: input.reason,
          },
        }),
      ]);

      const product = await prisma.product.findUnique({
        where: { id: variant.productId },
      });
      if (product) await invalidateCache(`product:${product.slug}`);
      syncProductToES(variant.productId).catch(console.error);
      return updated;
    },
  },

  Product: {
    vendor: (parent: any, _: any, context: ApolloContext) =>
      parent.vendor ?? context.loaders.vendor.load(parent.vendorId),
    variants: (parent: any, _: any, context: ApolloContext) =>
      parent.variants ?? context.loaders.variantsByProduct.load(parent.id),
    reviews: (parent: any, _: any, context: ApolloContext) =>
      parent.reviews ?? context.loaders.reviewsByProduct.load(parent.id),
  },

  ProductVariant: {
    product: (parent: any, _: any, context: ApolloContext) =>
      parent.product ?? context.loaders.product.load(parent.productId),
    finalPrice: (parent: any) =>
      Number(parent.priceModifier ?? 0) +
      (parent.product ? Number(parent.product.basePrice) : 0),
  },
};

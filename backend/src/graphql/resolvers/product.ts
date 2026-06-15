import { prisma } from "../../lib/prisma.js";
import { requireAuth, requireVendor } from "../../middleware/auth.js";
import type { ApolloContext } from "../types/index.js";

export const productResolvers = {
  Query: {
    // ── List products with filters + pagination ────────────────
    products: async (_: unknown, { filter = {} }: { filter: any }) => {
      const {
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

      const where: any = { isActive: true };

      if (category) where.category = category;
      if (vendorId) where.vendorId = vendorId;
      if (tags?.length) where.tags = { hasSome: tags };
      if (minPrice !== undefined || maxPrice !== undefined) {
        where.basePrice = {};
        if (minPrice !== undefined) where.basePrice.gte = minPrice;
        if (maxPrice !== undefined) where.basePrice.lte = maxPrice;
      }
      if (inStock) {
        where.variants = { some: { inventoryCount: { gt: 0 } } };
      }

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
          where,
          orderBy,
          skip,
          take: perPage,
          include: {
            vendor: true,
            variants: true,
            reviews: { take: 0 }, // count only — full reviews on product page
          },
        }),
        prisma.product.count({ where }),
      ]);

      // ── Basic facets from Postgres (ES facets added Day 8) ───
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
          categories: categories.map((c) => ({
            key: c.category,
            count: c._count.category,
          })),
          vendors: vendors.map((v) => ({
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
      };
    },

    // ── Single product by slug ────────────────────────────────
    product: async (_: unknown, { slug }: { slug: string }) => {
      return prisma.product.findUnique({
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
      });
    },
  },

  Mutation: {
    // ── Create product (vendor only) ──────────────────────────
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

      // Ensure slug uniqueness
      const existing = await prisma.product.findUnique({ where: { slug } });
      const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

      return prisma.product.create({
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
    },

    // ── Update product ────────────────────────────────────────
    updateProduct: async (
      _: unknown,
      { id, input }: { id: string; input: any },
      context: ApolloContext,
    ) => {
      const vendorId = requireVendor(context);

      const product = await prisma.product.findUnique({ where: { id } });
      if (!product) throw new Error("Product not found");
      if (product.vendorId !== vendorId && context.role !== "ADMIN") {
        throw new Error("FORBIDDEN");
      }

      return prisma.product.update({
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
    },

    // ── Delete product ────────────────────────────────────────
    deleteProduct: async (
      _: unknown,
      { id }: { id: string },
      context: ApolloContext,
    ) => {
      const vendorId = requireVendor(context);

      const product = await prisma.product.findUnique({ where: { id } });
      if (!product) throw new Error("Product not found");
      if (product.vendorId !== vendorId && context.role !== "ADMIN") {
        throw new Error("FORBIDDEN");
      }

      await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });

      return true;
    },

    // ── Add variant ───────────────────────────────────────────
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
      if (product.vendorId !== vendorId && context.role !== "ADMIN") {
        throw new Error("FORBIDDEN");
      }

      return prisma.productVariant.create({
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
    },

    // ── Update inventory ──────────────────────────────────────
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

      return updated;
    },
  },

  // ── Field resolvers ───────────────────────────────────────
  Product: {
    vendor: (parent: any) =>
      parent.vendor ??
      prisma.vendor.findUnique({ where: { id: parent.vendorId } }),

    variants: (parent: any) =>
      parent.variants ??
      prisma.productVariant.findMany({ where: { productId: parent.id } }),

    reviews: (parent: any) =>
      parent.reviews ??
      prisma.review.findMany({
        where: { productId: parent.id },
        include: { buyer: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
  },

  ProductVariant: {
    product: (parent: any) =>
      parent.product ??
      prisma.product.findUnique({ where: { id: parent.productId } }),

    finalPrice: (parent: any) =>
      Number(parent.priceModifier ?? 0) +
      (parent.product ? Number(parent.product.basePrice) : 0),
  },
};

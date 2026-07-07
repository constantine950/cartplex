import { prisma } from "../../lib/prisma.js";
import { requireVendor, signToken } from "../../middleware/auth.js";
import bcrypt from "bcryptjs";
import type { ApolloContext } from "../types/index.js";
import { cacheKeys, invalidateCache, withCache } from "../../services/cache.js";

export const vendorResolvers = {
  Query: {
    vendors: async () => {
      return withCache(cacheKeys.vendors(), () =>
        prisma.vendor.findMany({ where: { status: "APPROVED" } }),
      );
    },

    vendor: async (_: unknown, { slug }: { slug: string }) => {
      return withCache(cacheKeys.vendor(slug), () =>
        prisma.vendor.findUnique({ where: { slug } }),
      );
    },

    me: async (_: unknown, __: unknown, context: ApolloContext) => {
      if (!context.userId) return null;
      return prisma.user.findUnique({ where: { id: context.userId } });
    },

    allVendors: async (
      _: unknown,
      { status }: { status?: string },
      context: ApolloContext,
    ) => {
      if (context.role !== "ADMIN") throw new Error("FORBIDDEN");
      return prisma.vendor.findMany({
        where: status ? { status: status as any } : undefined,
      });
    },

    inventoryHistory: async (
      _: unknown,
      { variantId, limit }: { variantId: string; limit?: number },
      context: ApolloContext,
    ) => {
      requireVendor(context);
      const { getInventoryHistory } =
        await import("../../services/inventory.js");
      return getInventoryHistory(variantId, limit);
    },

    lowStockVariants: async (
      _: unknown,
      __: unknown,
      context: ApolloContext,
    ) => {
      const vendorId = requireVendor(context);
      return prisma.productVariant.findMany({
        where: {
          product: { vendorId },
          inventoryCount: {
            lte: prisma.productVariant.fields.lowStockThreshold,
          },
        },
        include: { product: true },
      });
    },
  },

  Mutation: {
    register: async (_: unknown, { input }: { input: any }) => {
      const existing = await prisma.user.findUnique({
        where: { email: input.email },
      });
      if (existing) throw new Error("Email already in use");

      const passwordHash = await bcrypt.hash(input.password, 10);
      const user = await prisma.user.create({
        data: {
          email: input.email,
          passwordHash,
          name: input.name,
          role: "BUYER",
        },
      });

      const token = signToken({ userId: user.id, role: "BUYER" });
      return { token, user };
    },

    login: async (_: unknown, { input }: { input: any }) => {
      const user = await prisma.user.findUnique({
        where: { email: input.email },
        include: { vendor: true },
      });
      if (!user) throw new Error("Invalid credentials");

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) throw new Error("Invalid credentials");

      const token = signToken({
        userId: user.id,
        role: user.role as any,
        vendorId: user.vendor?.id,
      });

      return { token, user };
    },

    approveVendor: async (
      _: unknown,
      { vendorId }: { vendorId: string },
      context: ApolloContext,
    ) => {
      if (context.role !== "ADMIN") throw new Error("FORBIDDEN");
      const vendor = await prisma.vendor.update({
        where: { id: vendorId },
        data: { status: "APPROVED" },
      });
      await Promise.all([
        invalidateCache(`vendor:${vendor.slug}`),
        invalidateCache("vendors:all"),
      ]);
      return vendor;
    },

    suspendVendor: async (
      _: unknown,
      { vendorId }: { vendorId: string },
      context: ApolloContext,
    ) => {
      if (context.role !== "ADMIN") throw new Error("FORBIDDEN");
      const vendor = await prisma.vendor.update({
        where: { id: vendorId },
        data: { status: "SUSPENDED" },
      });
      await Promise.all([
        invalidateCache(`vendor:${vendor.slug}`),
        invalidateCache("vendors:all"),
      ]);
      return vendor;
    },

    restockVariant: async (
      _: unknown,
      { variantId, quantity }: { variantId: string; quantity: number },
      context: ApolloContext,
    ) => {
      const vendorId = requireVendor(context);
      const { restockVariant } = await import("../../services/inventory.js");
      return restockVariant(variantId, quantity, vendorId);
    },

    toggleBackorder: async (
      _: unknown,
      { variantId, enabled }: { variantId: string; enabled: boolean },
      context: ApolloContext,
    ) => {
      const vendorId = requireVendor(context);
      const { toggleBackorder } = await import("../../services/inventory.js");
      return toggleBackorder(variantId, enabled, vendorId);
    },

    reserveStock: async (
      _: unknown,
      {
        sessionId,
        variantId,
        quantity,
      }: { sessionId: string; variantId: string; quantity: number },
    ) => {
      const { reserveStock } = await import("../../services/inventory.js");
      await reserveStock(sessionId, variantId, quantity);
      return true;
    },

    releaseStock: async (
      _: unknown,
      { sessionId, variantId }: { sessionId: string; variantId: string },
    ) => {
      const { releaseReservation } =
        await import("../../services/inventory.js");
      await releaseReservation(sessionId, variantId);
      return true;
    },
  },

  // ── Field resolvers using DataLoaders ─────────────────────
  Vendor: {
    products: (parent: any, _: any, context: ApolloContext) =>
      parent.products ?? context.loaders.productsByVendor.load(parent.id),
  },

  User: {
    vendor: (parent: any, _: any, context: ApolloContext) =>
      parent.vendor ??
      prisma.vendor.findUnique({ where: { userId: parent.id } }),
  },
};

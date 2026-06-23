import { prisma } from "../../lib/prisma.js";
import {
  requireAuth,
  requireVendor,
  requireAdmin,
} from "../../middleware/auth.js";
import { checkout, updateOrderStatus } from "../../services/checkout.js";
import type { ApolloContext } from "../types/index.js";

export const orderResolvers = {
  Query: {
    orders: async (_: unknown, __: unknown, context: ApolloContext) => {
      const buyerId = requireAuth(context);
      return prisma.order.findMany({
        where: { buyerId },
        include: {
          items: { include: { variant: true, vendor: true } },
          coupon: true,
          payouts: true,
        },
        orderBy: { createdAt: "desc" },
      });
    },

    order: async (
      _: unknown,
      { id }: { id: string },
      context: ApolloContext,
    ) => {
      const buyerId = requireAuth(context);
      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          buyer: true,
          items: { include: { variant: true, vendor: true } },
          coupon: true,
          payouts: true,
        },
      });

      if (!order) throw new Error("Order not found");
      if (order.buyerId !== buyerId && context.role !== "ADMIN") {
        throw new Error("FORBIDDEN");
      }

      return order;
    },

    allOrders: async (
      _: unknown,
      {
        status,
        page = 1,
        perPage = 20,
      }: { status?: string; page?: number; perPage?: number },
      context: ApolloContext,
    ) => {
      requireAdmin(context);
      return prisma.order.findMany({
        where: status ? { status: status as any } : undefined,
        include: {
          buyer: true,
          items: { include: { variant: true, vendor: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      });
    },

    myPayouts: async (_: unknown, __: unknown, context: ApolloContext) => {
      if (!context.vendorId) throw new Error("FORBIDDEN");
      return prisma.payout.findMany({
        where: { vendorId: context.vendorId },
        include: { order: true },
        orderBy: { createdAt: "desc" },
      });
    },
  },

  Mutation: {
    checkout: async (
      _: unknown,
      {
        input,
      }: {
        input: { sessionId: string; shippingAddress: any; couponCode?: string };
      },
      context: ApolloContext,
    ) => {
      const buyerId = requireAuth(context);
      const result = await checkout(
        input.sessionId,
        buyerId,
        input.shippingAddress,
        input.couponCode,
      );
      return result.order;
    },

    updateOrderStatus: async (
      _: unknown,
      { orderId, status }: { orderId: string; status: string },
      context: ApolloContext,
    ) => {
      if (!context.userId) throw new Error("UNAUTHENTICATED");
      const vendorId = context.role === "VENDOR" ? context.vendorId : undefined;
      return updateOrderStatus(orderId, status, vendorId);
    },

    createStripeAccount: async (
      _: unknown,
      __: unknown,
      context: ApolloContext,
    ) => {
      const vendorId = requireVendor(context);
      const { createStripeConnectAccount } =
        await import("../../services/payout.js");
      return createStripeConnectAccount(vendorId);
    },

    createOnboardingLink: async (
      _: unknown,
      __: unknown,
      context: ApolloContext,
    ) => {
      const vendorId = requireVendor(context);
      const { createOnboardingLink } = await import("../../services/payout.js");
      return createOnboardingLink(vendorId);
    },

    processPayouts: async (
      _: unknown,
      { orderId }: { orderId: string },
      context: ApolloContext,
    ) => {
      requireAdmin(context);
      try {
        const { processOrderPayouts } =
          await import("../../services/payout.js");
        await processOrderPayouts(orderId);
        return true;
      } catch (err) {
        console.error("processPayouts error:", err);
        throw err;
      }
    },
  },

  Order: {
    buyer: (parent: any, _: any, context: ApolloContext) =>
      parent.buyer ?? context.loaders.user.load(parent.buyerId),

    items: (parent: any) =>
      parent.items ??
      prisma.orderItem.findMany({
        where: { orderId: parent.id },
        include: { variant: true, vendor: true },
      }),

    payouts: (parent: any) =>
      parent.payouts ??
      prisma.payout.findMany({ where: { orderId: parent.id } }),

    coupon: (parent: any) =>
      parent.coupon ??
      (parent.couponId
        ? prisma.coupon.findUnique({ where: { id: parent.couponId } })
        : null),
  },

  OrderItem: {
    vendor: (parent: any, _: any, context: ApolloContext) =>
      parent.vendor ?? context.loaders.vendor.load(parent.vendorId),

    variant: (parent: any, _: any, context: ApolloContext) =>
      parent.variant ?? context.loaders.product.load(parent.variantId),
  },

  Payout: {
    vendor: (parent: any, _: any, context: ApolloContext) =>
      parent.vendor ?? context.loaders.vendor.load(parent.vendorId),

    order: (parent: any) =>
      parent.order ??
      prisma.order.findUnique({ where: { id: parent.orderId } }),
  },
};

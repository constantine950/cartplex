import { prisma } from "../../lib/prisma.js";
import { requireAdmin } from "../../middleware/auth.js";
import {
  validateAndComputeDiscount,
  createCoupon,
  disableCoupon,
} from "../../services/discount.js";
import { getCart } from "../../services/cart.js";
import type { ApolloContext } from "../types/index.js";

export const couponResolvers = {
  Query: {
    coupon: async (
      _: unknown,
      { code }: { code: string },
      context: ApolloContext,
    ) => {
      requireAdmin(context);
      return prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    },

    coupons: async (_: unknown, __: unknown, context: ApolloContext) => {
      requireAdmin(context);
      return prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
    },
  },

  Mutation: {
    applyDiscount: async (
      _: unknown,
      { input }: { input: { sessionId: string; couponCode: string } },
    ) => {
      const cart = await getCart(input.sessionId);
      if (!cart.items.length) throw new Error("Cart is empty");

      const result = await validateAndComputeDiscount(
        input.couponCode,
        cart.subtotal,
        cart.items,
      );

      // Return cart with discount info attached
      return {
        ...cart,
        discountAmount: result.discountAmount,
        discountDescription: result.description,
        freeShipping: result.freeShipping,
      };
    },

    createCoupon: async (
      _: unknown,
      { input }: { input: any },
      context: ApolloContext,
    ) => {
      requireAdmin(context);
      return createCoupon(input);
    },

    disableCoupon: async (
      _: unknown,
      { id }: { id: string },
      context: ApolloContext,
    ) => {
      requireAdmin(context);
      return disableCoupon(id);
    },
  },
};

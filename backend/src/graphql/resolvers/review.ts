import { requireAuth } from "../../middleware/auth.js";
import { createReview, getProductReviews } from "../../services/review.js";
import type { ApolloContext } from "../types/index.js";

export const reviewResolvers = {
  Query: {
    productReviews: async (
      _: unknown,
      {
        productId,
        page,
        perPage,
      }: { productId: string; page?: number; perPage?: number },
    ) => {
      return getProductReviews(productId, page, perPage);
    },
  },

  Mutation: {
    createReview: async (
      _: unknown,
      {
        input,
      }: { input: { productId: string; rating: number; text?: string } },
      context: ApolloContext,
    ) => {
      try {
        const buyerId = requireAuth(context);
        return createReview(buyerId, input.productId, input.rating, input.text);
      } catch (err) {
        console.error("createReview error:", err);
        throw err;
      }
    },
  },
};

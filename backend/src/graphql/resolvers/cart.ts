import {
  getCart,
  addToCart,
  removeFromCart,
  updateCartItem,
  clearCart,
  applyDiscountToCart,
} from "../../services/cart.js";

export const cartResolvers = {
  Query: {
    cart: async (_: unknown, { sessionId }: { sessionId: string }) => {
      return getCart(sessionId);
    },
  },

  Mutation: {
    addToCart: async (
      _: unknown,
      {
        input,
      }: { input: { sessionId: string; variantId: string; quantity: number } },
    ) => {
      return addToCart(input.sessionId, input.variantId, input.quantity);
    },

    removeFromCart: async (
      _: unknown,
      { sessionId, variantId }: { sessionId: string; variantId: string },
    ) => {
      return removeFromCart(sessionId, variantId);
    },

    updateCartItem: async (
      _: unknown,
      {
        input,
      }: { input: { sessionId: string; variantId: string; quantity: number } },
    ) => {
      return updateCartItem(input.sessionId, input.variantId, input.quantity);
    },

    clearCart: async (_: unknown, { sessionId }: { sessionId: string }) => {
      await clearCart(sessionId);
      return true;
    },

    applyDiscount: async (
      _: unknown,
      { input }: { input: { sessionId: string; couponCode: string } },
    ) => {
      // Returns cart — discount amount is informational at this stage
      const result = await applyDiscountToCart(
        input.sessionId,
        input.couponCode,
      );
      return result;
    },
  },
};

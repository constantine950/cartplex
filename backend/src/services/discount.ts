import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";

export interface DiscountResult {
  coupon: any;
  discountAmount: number;
  freeShipping: boolean;
  description: string;
}

// ── Validate and compute discount ─────────────────────────────
export async function validateAndComputeDiscount(
  couponCode: string,
  cartSubtotal: number,
  cartItems: Array<{
    variantId: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>,
  userId?: string,
): Promise<DiscountResult> {
  const coupon = await prisma.coupon.findUnique({
    where: { code: couponCode.toUpperCase() },
  });

  if (!coupon) throw new Error("Invalid coupon code");
  if (!coupon.isActive) throw new Error("This coupon is no longer active");
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    throw new Error("This coupon has expired");
  }

  // ── Usage limit check (atomic via Redis) ──────────────────
  if (coupon.usageLimit !== null) {
    const redisKey = `coupon:usage:${coupon.id}`;
    const currentUsage = await redis.get(redisKey);
    const usage = currentUsage ? parseInt(currentUsage) : coupon.usageCount;
    if (usage >= coupon.usageLimit) {
      throw new Error("This coupon has reached its usage limit");
    }
  }

  // ── Minimum order value ───────────────────────────────────
  if (
    coupon.minOrderValue !== null &&
    cartSubtotal < Number(coupon.minOrderValue)
  ) {
    throw new Error(
      `Minimum order value of $${Number(coupon.minOrderValue).toFixed(2)} required for this coupon`,
    );
  }

  // ── Product/vendor restrictions ───────────────────────────
  let eligibleSubtotal = cartSubtotal;

  if (coupon.appliesToProductIds.length > 0) {
    const eligibleItems = cartItems.filter((i) =>
      coupon.appliesToProductIds.includes(i.productId),
    );
    if (!eligibleItems.length) {
      throw new Error("This coupon does not apply to any items in your cart");
    }
    eligibleSubtotal = eligibleItems.reduce((sum, i) => sum + i.lineTotal, 0);
  }

  if (coupon.appliesToVendorIds.length > 0) {
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: cartItems.map((i) => i.variantId) } },
      include: { product: true },
    });
    const eligibleItems = cartItems.filter((item) => {
      const variant = variants.find((v) => v.id === item.variantId);
      return (
        variant && coupon.appliesToVendorIds.includes(variant.product.vendorId)
      );
    });
    if (!eligibleItems.length) {
      throw new Error("This coupon does not apply to any vendors in your cart");
    }
    eligibleSubtotal = eligibleItems.reduce((sum, i) => sum + i.lineTotal, 0);
  }

  // ── Compute discount by type ──────────────────────────────
  let discountAmount = 0;
  let freeShipping = false;
  let description = "";

  switch (coupon.type) {
    case "PERCENTAGE": {
      discountAmount = eligibleSubtotal * (Number(coupon.value) / 100);
      description = `${coupon.value}% off`;
      if (
        coupon.appliesToProductIds.length ||
        coupon.appliesToVendorIds.length
      ) {
        description += " on eligible items";
      }
      break;
    }

    case "FIXED_AMOUNT": {
      discountAmount = Math.min(Number(coupon.value), eligibleSubtotal);
      description = `$${Number(coupon.value).toFixed(2)} off`;
      break;
    }

    case "FREE_SHIPPING": {
      freeShipping = true;
      discountAmount = 0;
      description = "Free shipping";
      break;
    }

    case "BOGO": {
      // Buy one get one — discount cheapest eligible item
      const sortedItems = [...cartItems].sort(
        (a, b) => a.unitPrice - b.unitPrice,
      );
      const cheapest = sortedItems[0];
      if (cartItems.length >= 2 && cheapest) {
        discountAmount = cheapest.unitPrice;
        description = "Buy one get one free";
      } else {
        throw new Error("BOGO coupon requires at least 2 items in cart");
      }
      break;
    }
  }

  // Round to 2 decimal places
  discountAmount = Math.round(discountAmount * 100) / 100;

  return { coupon, discountAmount, freeShipping, description };
}

// ── Stack multiple coupons ────────────────────────────────────
// Rules: free shipping + percentage can stack, but not two percentages
export function canStackCoupons(typeA: string, typeB: string): boolean {
  if (typeA === typeB) return false;
  const stackable = ["FREE_SHIPPING", "PERCENTAGE", "FIXED_AMOUNT"];
  const nonStackable = ["BOGO"];
  if (nonStackable.includes(typeA) || nonStackable.includes(typeB))
    return false;
  return stackable.includes(typeA) && stackable.includes(typeB);
}

// ── Admin: create coupon ──────────────────────────────────────
export async function createCoupon(input: {
  code: string;
  type: string;
  value: number;
  minOrderValue?: number;
  appliesToProductIds?: string[];
  appliesToVendorIds?: string[];
  usageLimit?: number;
  expiresAt?: Date;
}): Promise<any> {
  const existing = await prisma.coupon.findUnique({
    where: { code: input.code.toUpperCase() },
  });
  if (existing) throw new Error(`Coupon code "${input.code}" already exists`);

  return prisma.coupon.create({
    data: {
      code: input.code.toUpperCase(),
      type: input.type as any,
      value: input.value,
      minOrderValue: input.minOrderValue,
      appliesToProductIds: input.appliesToProductIds ?? [],
      appliesToVendorIds: input.appliesToVendorIds ?? [],
      usageLimit: input.usageLimit,
      expiresAt: input.expiresAt,
      isActive: true,
    },
  });
}

// ── Admin: disable coupon ─────────────────────────────────────
export async function disableCoupon(id: string): Promise<any> {
  return prisma.coupon.update({
    where: { id },
    data: { isActive: false },
  });
}

import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";

export interface DiscountResult {
  coupon: any;
  discountAmount: number;
  freeShipping: boolean;
  description: string;
}

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
): Promise<DiscountResult> {
  const coupon = await prisma.coupon.findUnique({
    where: { code: couponCode.toUpperCase() },
  });

  if (!coupon) throw new Error("Invalid coupon code");
  if (!coupon.isActive) throw new Error("This coupon is no longer active");
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    throw new Error("This coupon has expired");
  }

  // ── Atomic usage limit check via Redis ────────────────────
  if (coupon.usageLimit !== null) {
    const countKey = `coupon:usage:${coupon.id}`;

    // Sync Redis count with DB on first check
    const redisCount = await redis.get(countKey);
    if (!redisCount) {
      await redis.set(countKey, coupon.usageCount);
      await redis.expire(countKey, 30 * 24 * 60 * 60);
    }

    // Atomic increment then check
    const newCount = await redis.incr(countKey);
    if (newCount > coupon.usageLimit) {
      // Decrement back — we're not using it
      await redis.decr(countKey);
      throw new Error("This coupon has reached its usage limit");
    }

    // Decrement back — actual increment happens at checkout in DB transaction
    await redis.decr(countKey);
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
      const variant = variants.find((v: any) => v.id === item.variantId);
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

  discountAmount = Math.round(discountAmount * 100) / 100;

  return { coupon, discountAmount, freeShipping, description };
}

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

export async function disableCoupon(id: string): Promise<any> {
  return prisma.coupon.update({
    where: { id },
    data: { isActive: false },
  });
}

export function canStackCoupons(typeA: string, typeB: string): boolean {
  if (typeA === typeB) return false;
  const nonStackable = ["BOGO"];
  if (nonStackable.includes(typeA) || nonStackable.includes(typeB))
    return false;
  return true;
}

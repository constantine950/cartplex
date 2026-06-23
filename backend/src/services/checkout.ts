import { prisma } from "../lib/prisma.js";
import { stripe } from "../lib/stripe.js";
import { getCart, clearCart } from "./cart.js";

// Inline type to avoid Prisma version type issues
type VariantWithProduct = {
  id: string;
  productId: string;
  sku: string;
  options: any;
  priceModifier: any;
  inventoryCount: number;
  lowStockThreshold: number;
  backorderEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  product: {
    id: string;
    vendorId: string;
    name: string;
    slug: string;
    description: string | null;
    category: string;
    tags: string[];
    basePrice: any;
    images: string[];
    isActive: boolean;
    avgRating: any;
    createdAt: Date;
    updatedAt: Date;
    vendor: {
      id: string;
      name: string;
      slug: string;
      [key: string]: any;
    };
  };
};

export async function checkout(
  sessionId: string,
  buyerId: string,
  shippingAddress: Record<string, any>,
  couponCode?: string,
) {
  const cart = await getCart(sessionId);
  if (!cart.items.length) throw new Error("Cart is empty");

  const variantIds = cart.items.map((i) => i.variantId);
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    include: { product: { include: { vendor: true } } },
  });

  const variantMap = new Map<string, VariantWithProduct>(
    variants.map((v) => [v.id, v as unknown as VariantWithProduct]),
  );

  for (const item of cart.items) {
    const variant = variantMap.get(item.variantId);
    if (!variant) throw new Error(`Variant ${item.variantId} not found`);
    if (!variant.product.isActive) {
      throw new Error(`${variant.product.name} is no longer available`);
    }
    if (!variant.backorderEnabled && variant.inventoryCount < item.quantity) {
      throw new Error(
        `Only ${variant.inventoryCount} units of ${variant.product.name} available`,
      );
    }
  }

  let coupon = null;
  let discountAmount = 0;
  let freeShipping = false;

  if (couponCode) {
    coupon = await prisma.coupon.findUnique({
      where: { code: couponCode.toUpperCase() },
    });

    if (coupon && coupon.isActive) {
      switch (coupon.type) {
        case "PERCENTAGE":
          discountAmount = cart.subtotal * (Number(coupon.value) / 100);
          break;
        case "FIXED_AMOUNT":
          discountAmount = Math.min(Number(coupon.value), cart.subtotal);
          break;
        case "FREE_SHIPPING":
          freeShipping = true;
          break;
        case "BOGO": {
          const sorted = [...cart.items].sort(
            (a, b) => a.unitPrice - b.unitPrice,
          );
          if (sorted.length >= 2) discountAmount = sorted[0].unitPrice;
          break;
        }
      }
    }
  }

  const subtotal = cart.subtotal;
  const shippingAmount = freeShipping ? 0 : subtotal > 100 ? 0 : 9.99;
  const taxAmount = (subtotal - discountAmount) * 0.08;
  const total = subtotal - discountAmount + shippingAmount + taxAmount;

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(total * 100),
    currency: "usd",
    metadata: {
      sessionId,
      buyerId,
      couponCode: couponCode ?? "",
    },
    automatic_payment_methods: { enabled: true },
  });

  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        buyerId,
        status: "PENDING_PAYMENT",
        subtotal,
        discountAmount,
        shippingAmount,
        taxAmount,
        total,
        stripePaymentIntentId: paymentIntent.id,
        couponId: coupon?.id,
        items: {
          create: cart.items.map((item) => {
            const variant = variantMap.get(item.variantId)!;
            return {
              variantId: item.variantId,
              vendorId: variant.product.vendorId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
            };
          }),
        },
      },
      include: {
        items: {
          include: {
            variant: { include: { product: true } },
            vendor: true,
          },
        },
        coupon: true,
      },
    });

    for (const item of cart.items) {
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { inventoryCount: { decrement: item.quantity } },
      });

      await tx.inventory.create({
        data: {
          variantId: item.variantId,
          delta: -item.quantity,
          reason: "SALE",
        },
      });
    }

    if (coupon) {
      await tx.coupon.update({
        where: { id: coupon.id },
        data: { usageCount: { increment: 1 } },
      });
    }

    return newOrder;
  });

  await clearCart(sessionId);

  return {
    order,
    clientSecret: paymentIntent.client_secret,
  };
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
  vendorId?: string,
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) throw new Error("Order not found");

  if (vendorId) {
    const hasItem = order.items.some((i) => i.vendorId === vendorId);
    if (!hasItem) throw new Error("FORBIDDEN");
  }

  return prisma.order.update({
    where: { id: orderId },
    data: { status: status as any },
    include: {
      buyer: true,
      items: { include: { variant: true, vendor: true } },
      payouts: true,
    },
  });
}

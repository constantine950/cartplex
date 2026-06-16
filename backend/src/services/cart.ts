import { redis, cartKey, CART_TTL_SECONDS } from "../lib/redis.js";
import { prisma } from "../lib/prisma.js";

export interface CartLineItem {
  variantId: string;
  productId: string;
  name: string;
  image: string;
  sku: string;
  options: Record<string, any>;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface CartData {
  sessionId: string;
  items: CartLineItem[];
  subtotal: number;
  itemCount: number;
}

// ── Read cart from Redis ──────────────────────────────────────
export async function getCart(sessionId: string): Promise<CartData> {
  const raw = await redis.get(cartKey(sessionId));
  const items: CartLineItem[] = raw ? JSON.parse(raw) : [];
  return buildCartResponse(sessionId, items);
}

// ── Persist cart to Redis ─────────────────────────────────────
async function saveCart(
  sessionId: string,
  items: CartLineItem[],
): Promise<CartData> {
  await redis.setex(
    cartKey(sessionId),
    CART_TTL_SECONDS,
    JSON.stringify(items),
  );
  return buildCartResponse(sessionId, items);
}

// ── Add item ──────────────────────────────────────────────────
export async function addToCart(
  sessionId: string,
  variantId: string,
  quantity: number,
): Promise<CartData> {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: { include: { vendor: true } } },
  });

  if (!variant) throw new Error("Variant not found");
  if (!variant.product.isActive)
    throw new Error("Product is no longer available");

  const availableStock = variant.inventoryCount;
  if (!variant.backorderEnabled && availableStock < quantity) {
    throw new Error(`Only ${availableStock} units available`);
  }

  const raw = await redis.get(cartKey(sessionId));
  const items: CartLineItem[] = raw ? JSON.parse(raw) : [];

  const existingIndex = items.findIndex((i) => i.variantId === variantId);
  const unitPrice =
    Number(variant.product.basePrice) + Number(variant.priceModifier);

  if (existingIndex >= 0) {
    const newQty = items[existingIndex].quantity + quantity;
    if (!variant.backorderEnabled && newQty > availableStock) {
      throw new Error(`Only ${availableStock} units available`);
    }
    items[existingIndex].quantity = newQty;
    items[existingIndex].lineTotal = unitPrice * newQty;
  } else {
    items.push({
      variantId,
      productId: variant.productId,
      name: variant.product.name,
      image: variant.product.images[0] ?? "",
      sku: variant.sku,
      options: variant.options as Record<string, any>,
      unitPrice,
      quantity,
      lineTotal: unitPrice * quantity,
    });
  }

  return saveCart(sessionId, items);
}

// ── Remove item ───────────────────────────────────────────────
export async function removeFromCart(
  sessionId: string,
  variantId: string,
): Promise<CartData> {
  const raw = await redis.get(cartKey(sessionId));
  const items: CartLineItem[] = raw ? JSON.parse(raw) : [];
  const filtered = items.filter((i) => i.variantId !== variantId);
  return saveCart(sessionId, filtered);
}

// ── Update quantity ───────────────────────────────────────────
export async function updateCartItem(
  sessionId: string,
  variantId: string,
  quantity: number,
): Promise<CartData> {
  if (quantity <= 0) return removeFromCart(sessionId, variantId);

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
  });
  if (!variant) throw new Error("Variant not found");
  if (!variant.backorderEnabled && quantity > variant.inventoryCount) {
    throw new Error(`Only ${variant.inventoryCount} units available`);
  }

  const raw = await redis.get(cartKey(sessionId));
  const items: CartLineItem[] = raw ? JSON.parse(raw) : [];

  const index = items.findIndex((i) => i.variantId === variantId);
  if (index === -1) throw new Error("Item not in cart");

  items[index].quantity = quantity;
  items[index].lineTotal = items[index].unitPrice * quantity;

  return saveCart(sessionId, items);
}

// ── Clear cart ────────────────────────────────────────────────
export async function clearCart(sessionId: string): Promise<void> {
  await redis.del(cartKey(sessionId));
}

// ── Apply discount to cart ────────────────────────────────────
export async function applyDiscountToCart(
  sessionId: string,
  couponCode: string,
): Promise<CartData & { discountAmount: number; coupon: any }> {
  const cart = await getCart(sessionId);
  if (!cart.items.length) throw new Error("Cart is empty");

  const coupon = await prisma.coupon.findUnique({
    where: { code: couponCode.toUpperCase() },
  });

  if (!coupon) throw new Error("Invalid coupon code");
  if (!coupon.isActive) throw new Error("Coupon is no longer active");
  if (coupon.expiresAt && coupon.expiresAt < new Date())
    throw new Error("Coupon has expired");
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    throw new Error("Coupon usage limit reached");
  }
  if (
    coupon.minOrderValue !== null &&
    cart.subtotal < Number(coupon.minOrderValue)
  ) {
    throw new Error(`Minimum order value of $${coupon.minOrderValue} required`);
  }

  let discountAmount = 0;

  switch (coupon.type) {
    case "PERCENTAGE":
      discountAmount = cart.subtotal * (Number(coupon.value) / 100);
      break;
    case "FIXED_AMOUNT":
      discountAmount = Math.min(Number(coupon.value), cart.subtotal);
      break;
    case "FREE_SHIPPING":
      discountAmount = 0; // applied at checkout
      break;
    case "BOGO":
      // find cheapest item and discount it
      const sorted = [...cart.items].sort((a, b) => a.unitPrice - b.unitPrice);
      if (sorted.length >= 2) discountAmount = sorted[0].unitPrice;
      break;
  }

  return {
    ...cart,
    discountAmount,
    coupon,
  };
}

// ── Merge guest cart on login ─────────────────────────────────
export async function mergeCarts(
  guestSessionId: string,
  userSessionId: string,
): Promise<CartData> {
  const guestRaw = await redis.get(cartKey(guestSessionId));
  if (!guestRaw) return getCart(userSessionId);

  const guestItems: CartLineItem[] = JSON.parse(guestRaw);
  const userRaw = await redis.get(cartKey(userSessionId));
  const userItems: CartLineItem[] = userRaw ? JSON.parse(userRaw) : [];

  // Merge: if variant exists in both, sum quantities
  for (const guestItem of guestItems) {
    const existing = userItems.findIndex(
      (i) => i.variantId === guestItem.variantId,
    );
    if (existing >= 0) {
      userItems[existing].quantity += guestItem.quantity;
      userItems[existing].lineTotal =
        userItems[existing].unitPrice * userItems[existing].quantity;
    } else {
      userItems.push(guestItem);
    }
  }

  await redis.del(cartKey(guestSessionId));
  return saveCart(userSessionId, userItems);
}

// ── Build response object ─────────────────────────────────────
function buildCartResponse(sessionId: string, items: CartLineItem[]): CartData {
  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  return { sessionId, items, subtotal, itemCount };
}

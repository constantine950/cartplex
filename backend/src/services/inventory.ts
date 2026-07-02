import { prisma } from "../lib/prisma.js";
import {
  redis,
  RESERVATION_TTL_SECONDS,
  reservationKey,
} from "../lib/redis.js";
import { syncProductToES } from "./search.js";
import { logger } from "../utils/logger.js";

// ── Reserve stock on checkout start ──────────────────────────
export async function reserveStock(
  sessionId: string,
  variantId: string,
  quantity: number,
): Promise<void> {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: true },
  });

  if (!variant) throw new Error("Variant not found");

  // Check available stock minus any existing reservation
  const existingReservation = await redis.get(
    reservationKey(variantId, sessionId),
  );
  const alreadyReserved = existingReservation
    ? parseInt(existingReservation)
    : 0;
  const availableStock = variant.inventoryCount + alreadyReserved;

  if (!variant.backorderEnabled && availableStock < quantity) {
    throw new Error(
      `Only ${availableStock} units of "${variant.product.name}" available`,
    );
  }

  // Store reservation in Redis with 15min TTL
  await redis.setex(
    reservationKey(variantId, sessionId),
    RESERVATION_TTL_SECONDS,
    quantity.toString(),
  );

  // Decrement inventory count to reflect reservation
  await prisma.productVariant.update({
    where: { id: variantId },
    data: { inventoryCount: { decrement: quantity - alreadyReserved } },
  });

  // Log reservation
  await prisma.inventory.create({
    data: {
      variantId,
      delta: -(quantity - alreadyReserved),
      reason: "RESERVED",
    },
  });

  logger.info("Stock reserved", { variantId, sessionId, quantity });

  // Sync to ES so inStock status updates
  syncProductToES(variant.productId).catch(console.error);
}

// ── Release reservation (abandoned checkout) ──────────────────
export async function releaseReservation(
  sessionId: string,
  variantId: string,
): Promise<void> {
  const key = reservationKey(variantId, sessionId);
  const reserved = await redis.get(key);

  if (!reserved) return; // already released or expired

  const quantity = parseInt(reserved);

  await redis.del(key);

  await prisma.productVariant.update({
    where: { id: variantId },
    data: { inventoryCount: { increment: quantity } },
  });

  await prisma.inventory.create({
    data: { variantId, delta: quantity, reason: "RELEASED" },
  });

  logger.info("Stock reservation released", { variantId, sessionId, quantity });

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
  });
  if (variant) syncProductToES(variant.productId).catch(console.error);
}

// ── Release all reservations for a session ────────────────────
export async function releaseAllReservations(
  sessionId: string,
  variantIds: string[],
): Promise<void> {
  await Promise.all(
    variantIds.map((variantId) => releaseReservation(sessionId, variantId)),
  );
}

// ── Confirm reservation on payment success ────────────────────
// (converts reservation to actual sale — inventory already decremented)
export async function confirmReservation(
  sessionId: string,
  variantId: string,
): Promise<void> {
  const key = reservationKey(variantId, sessionId);
  await redis.del(key); // just remove the reservation key, stock stays decremented
  logger.info("Reservation confirmed", { variantId, sessionId });
}

// ── Check low stock and alert ─────────────────────────────────
export async function checkLowStock(variantId: string): Promise<void> {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: { include: { vendor: true } } },
  });

  if (!variant) return;

  if (
    variant.inventoryCount <= variant.lowStockThreshold &&
    variant.inventoryCount > 0
  ) {
    logger.warn("Low stock alert", {
      variantId,
      sku: variant.sku,
      product: variant.product.name,
      vendor: variant.product.vendor.name,
      currentStock: variant.inventoryCount,
      threshold: variant.lowStockThreshold,
    });

    // In production: send email/webhook to vendor here
    // For now we log — Day 24 adds real-time WebSocket alerts
  }

  if (variant.inventoryCount === 0 && !variant.backorderEnabled) {
    logger.warn("Out of stock", {
      variantId,
      sku: variant.sku,
      product: variant.product.name,
    });
  }
}

// ── Restock variant ───────────────────────────────────────────
export async function restockVariant(
  variantId: string,
  quantity: number,
  vendorId: string,
): Promise<any> {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: true },
  });

  if (!variant) throw new Error("Variant not found");

  // Debug log
  console.log("restockVariant debug:", {
    variantProductVendorId: variant.product.vendorId,
    contextVendorId: vendorId,
    match: variant.product.vendorId === vendorId,
  });

  if (variant.product.vendorId !== vendorId) throw new Error("FORBIDDEN");

  const updated = await prisma.productVariant.update({
    where: { id: variantId },
    data: { inventoryCount: { increment: quantity } },
    include: { product: true },
  });

  await prisma.inventory.create({
    data: { variantId, delta: quantity, reason: "RESTOCK" },
  });

  syncProductToES(variant.productId).catch(console.error);
  return updated;
}

// ── Toggle backorder ──────────────────────────────────────────
export async function toggleBackorder(
  variantId: string,
  enabled: boolean,
  vendorId: string,
): Promise<any> {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: true },
  });

  if (!variant) throw new Error("Variant not found");
  if (variant.product.vendorId !== vendorId) throw new Error("FORBIDDEN");

  const updated = await prisma.productVariant.update({
    where: { id: variantId },
    data: { backorderEnabled: enabled },
    include: { product: true },
  });

  syncProductToES(variant.productId).catch(console.error);

  return updated;
}

// ── Get inventory history for a variant ──────────────────────
export async function getInventoryHistory(variantId: string, limit = 20) {
  return prisma.inventory.findMany({
    where: { variantId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// ── Atomic decrement with row-level lock ──────────────────────
// Used at checkout to prevent race conditions
export async function atomicDecrementStock(
  variantId: string,
  quantity: number,
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "ProductVariant"
    SET "inventoryCount" = "inventoryCount" - ${quantity}
    WHERE id = ${variantId}
    AND ("backorderEnabled" = true OR "inventoryCount" >= ${quantity})
  `;

  const updated = await prisma.productVariant.findUnique({
    where: { id: variantId },
  });

  if (!updated) throw new Error("Variant not found");

  // Check if we went negative (race condition guard)
  if (!updated.backorderEnabled && updated.inventoryCount < 0) {
    // Rollback
    await prisma.productVariant.update({
      where: { id: variantId },
      data: { inventoryCount: { increment: quantity } },
    });
    throw new Error("Insufficient stock — please try again");
  }

  await checkLowStock(variantId);
}

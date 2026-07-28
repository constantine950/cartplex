import { stripe } from "../lib/stripe.js";
import { prisma } from "../lib/prisma.js";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";
import { redis } from "../lib/redis.js";

// Onboard vendor to Stripe Connect
export async function createStripeConnectAccount(
  vendorId: string,
): Promise<string> {
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: { user: true },
  });
  if (!vendor) throw new Error("Vendor not found");

  const account = await stripe.accounts.create({
    type: "express",
    email: vendor.user.email,
    capabilities: {
      transfers: { requested: true },
    },
    metadata: { vendorId },
  });

  await prisma.vendor.update({
    where: { id: vendorId },
    data: { stripeAccountId: account.id },
  });

  return account.id;
}

// Generate onboarding link
export async function createOnboardingLink(vendorId: string): Promise<string> {
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) throw new Error("Vendor not found");
  if (!vendor.stripeAccountId)
    throw new Error(
      "No Stripe account — call createStripeConnectAccount first",
    );

  const link = await stripe.accountLinks.create({
    account: vendor.stripeAccountId,
    refresh_url: `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/vendor/onboarding/refresh`,
    return_url: `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/vendor/onboarding/complete`,
    type: "account_onboarding",
  });

  return link.url;
}

// Split payouts for a paid order
export async function processOrderPayouts(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          vendor: true,
        },
      },
    },
  });

  if (!order) throw new Error("Order not found");
  if (order.status !== "PAID") throw new Error("Order is not paid");

  // Group items by vendor
  const vendorTotals = new Map<string, { vendor: any; gross: number }>();

  for (const item of order.items) {
    const existing = vendorTotals.get(item.vendorId);
    if (existing) {
      existing.gross += Number(item.lineTotal);
    } else {
      vendorTotals.set(item.vendorId, {
        vendor: item.vendor,
        gross: Number(item.lineTotal),
      });
    }
  }

  // Transfer to each vendor minus platform fee
  for (const [vendorId, { vendor, gross }] of vendorTotals) {
    const platformFee = gross * (config.platform.feePercent / 100);
    const net = gross - platformFee;

    // Skip if vendor not onboarded
    if (!vendor.stripeAccountId || !vendor.stripeOnboardingDone) {
      logger.warn(`Vendor ${vendor.name} not onboarded, skipping payout`, {
        vendorId,
      });

      await prisma.payout.create({
        data: {
          vendorId,
          orderId,
          grossAmount: gross,
          platformFee,
          netAmount: net,
          status: "PENDING",
        },
      });
      continue;
    }

    try {
      const transfer = await stripe.transfers.create({
        amount: Math.round(net * 100), // cents
        currency: "usd",
        destination: vendor.stripeAccountId,
        metadata: { orderId, vendorId },
      });

      await prisma.payout.create({
        data: {
          vendorId,
          orderId,
          grossAmount: gross,
          platformFee,
          netAmount: net,
          stripeTransferId: transfer.id,
          status: "COMPLETED",
        },
      });

      logger.info(`Payout completed for vendor ${vendor.name}`, {
        vendorId,
        net,
        transferId: transfer.id,
      });
    } catch (err) {
      logger.error(`Payout failed for vendor ${vendor.name}`, {
        vendorId,
        err,
      });

      await prisma.payout.create({
        data: {
          vendorId,
          orderId,
          grossAmount: gross,
          platformFee,
          netAmount: net,
          status: "FAILED",
        },
      });
    }
  }
}

// Handle Stripe webhook
export async function handleStripeWebhook(
  payload: Buffer,
  signature: string,
): Promise<void> {
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      config.stripe.webhookSecret,
    );
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${err}`);
  }

  // Idempotency — deduplicate events via Redis
  const idempotencyKey = `webhook:processed:${event.id}`;
  const alreadyProcessed = await redis.get(idempotencyKey);

  if (alreadyProcessed) {
    logger.info(`Webhook already processed, skipping: ${event.id}`);
    return;
  }

  // Mark as processed immediately (24hr TTL)
  await redis.setex(idempotencyKey, 24 * 60 * 60, "1");

  logger.info(`Processing webhook: ${event.type} (${event.id})`);

  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as any;
      const order = await prisma.order.findFirst({
        where: { stripePaymentIntentId: paymentIntent.id },
      });

      if (!order) {
        logger.warn("No order found for PaymentIntent", {
          id: paymentIntent.id,
        });
        break;
      }

      if (order.status === "PAID") {
        logger.info("Order already PAID, skipping", { orderId: order.id });
        break;
      }

      await prisma.order.update({
        where: { id: order.id },
        data: { status: "PAID" },
      });

      logger.info("Order marked as PAID", { orderId: order.id });
      await processOrderPayouts(order.id);
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as any;

      // Release inventory back to stock on payment failure
      const order = await prisma.order.findFirst({
        where: { stripePaymentIntentId: paymentIntent.id },
        include: { items: true },
      });

      if (order && order.status === "PENDING_PAYMENT") {
        await prisma.$transaction(async (tx: any) => {
          // Restore inventory
          for (const item of order.items) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { inventoryCount: { increment: item.quantity } },
            });
            await tx.inventory.create({
              data: {
                variantId: item.variantId,
                delta: item.quantity,
                reason: "RELEASED",
              },
            });
          }

          await tx.order.update({
            where: { id: order.id },
            data: { status: "CANCELLED" },
          });
        });

        logger.info("Order cancelled + inventory restored", {
          orderId: order.id,
        });
      }
      break;
    }

    case "account.updated": {
      const account = event.data.object as any;
      if (account.charges_enabled) {
        await prisma.vendor.updateMany({
          where: { stripeAccountId: account.id },
          data: { stripeOnboardingDone: true },
        });
        logger.info("Vendor onboarding complete", { accountId: account.id });
      }
      break;
    }

    default:
      logger.info(`Unhandled webhook: ${event.type}`);
  }
}

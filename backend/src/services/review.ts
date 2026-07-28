import { prisma } from "../lib/prisma.js";
import { syncProductToES } from "./search.js";

export async function createReview(
  buyerId: string,
  productId: string,
  rating: number,
  text?: string,
): Promise<any> {
  // Validate rating
  if (rating < 1 || rating > 5)
    throw new Error("Rating must be between 1 and 5");

  // Check for verified purchase
  const purchase = await prisma.orderItem.findFirst({
    where: {
      order: {
        buyerId,
        status: { in: ["PAID", "FULFILLING", "SHIPPED", "DELIVERED"] },
      },
      variant: { productId },
    },
  });

  const verifiedPurchase = !!purchase;

  // Upsert review (one per buyer per product)
  const review = await prisma.review.upsert({
    where: { buyerId_productId: { buyerId, productId } },
    update: { rating, text, verifiedPurchase },
    create: { buyerId, productId, rating, text, verifiedPurchase },
    include: { buyer: true, product: true },
  });

  // Update product avg rating
  await updateProductRating(productId);

  return review;
}

async function updateProductRating(productId: string): Promise<void> {
  const result = await prisma.review.aggregate({
    where: { productId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  const avgRating = result._avg.rating ?? 0;

  await prisma.product.update({
    where: { id: productId },
    data: { avgRating },
  });

  // Sync updated rating to ES
  syncProductToES(productId).catch(console.error);
}

export async function getProductReviews(
  productId: string,
  page = 1,
  perPage = 20,
) {
  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: { productId },
      include: { buyer: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.review.count({ where: { productId } }),
  ]);

  const stats = await prisma.review.groupBy({
    by: ["rating"],
    where: { productId },
    _count: { rating: true },
  });

  const ratingBreakdown = [1, 2, 3, 4, 5].map((r) => ({
    rating: r,
    count: stats.find((s: any) => s.rating === r)?._count.rating ?? 0,
  }));

  return {
    reviews,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
    ratingBreakdown,
  };
}

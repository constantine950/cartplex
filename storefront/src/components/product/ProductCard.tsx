import Link from "next/link";
import Image from "next/image";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    basePrice: number;
    avgRating: number;
    images: string[];
    category: string;
    vendor: { name: string; slug: string };
    variants: Array<{
      inventoryCount: number;
      options: any;
      priceModifier: number;
    }>;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const totalStock = product.variants.reduce(
    (sum, v) => sum + v.inventoryCount,
    0,
  );
  const isOutOfStock = totalStock === 0;
  const isLowStock = totalStock > 0 && totalStock <= 5;

  const minPrice = Math.min(
    ...product.variants.map((v) => product.basePrice + (v.priceModifier ?? 0)),
  );
  const maxPrice = Math.max(
    ...product.variants.map((v) => product.basePrice + (v.priceModifier ?? 0)),
  );
  const priceDisplay =
    minPrice === maxPrice
      ? `$${minPrice.toFixed(2)}`
      : `$${minPrice.toFixed(2)} – $${maxPrice.toFixed(2)}`;

  return (
    <Link href={`/product/${product.slug}`} className="group">
      <div className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden mb-3">
        {product.images[0] ? (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <span className="text-4xl opacity-50">
              {product.category === "Audio"
                ? "🎧"
                : product.category === "Peripherals"
                  ? "⌨️"
                  : product.category === "Kitchen"
                    ? "☕"
                    : product.category === "Decor"
                      ? "🕯️"
                      : product.category === "Outerwear"
                        ? "🧥"
                        : product.category === "Footwear"
                          ? "👟"
                          : product.category === "Bags"
                            ? "👜"
                            : "📦"}
            </span>
          </div>
        )}

        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="text-sm font-medium text-gray-500">
              Out of stock
            </span>
          </div>
        )}

        {isLowStock && !isOutOfStock && (
          <div className="absolute top-2 left-2 bg-orange-100 text-orange-700 text-xs font-medium px-2 py-0.5 rounded-full">
            Only {totalStock} left
          </div>
        )}
      </div>

      <div>
        <p className="text-xs text-gray-400 mb-0.5">{product.vendor.name}</p>
        <h3 className="text-sm font-medium text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-2 mb-1">
          {product.name}
        </h3>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{priceDisplay}</p>
          {product.avgRating > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-yellow-400 text-xs">★</span>
              <span className="text-xs text-gray-500">
                {Number(product.avgRating).toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

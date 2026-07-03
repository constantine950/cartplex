import { ProductCard } from "../product/ProductCard";

interface ProductGridProps {
  products: any[];
  loading: boolean;
}

export function ProductGrid({ products, loading }: ProductGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-square bg-gray-100 rounded-xl animate-pulse" />
            <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-4">🔍</p>
        <p className="text-lg font-medium text-gray-900">No products found</p>
        <p className="text-sm text-gray-500 mt-1">
          Try adjusting your filters or search term
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

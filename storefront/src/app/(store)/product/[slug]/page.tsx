import { Suspense } from "react";
import { ProductDetail } from "@/components/product/ProductDetail";

interface ProductPageProps {
  params: { slug: string };
}

export function generateMetadata({ params }: ProductPageProps) {
  return {
    title: params.slug
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()),
  };
}

export default function ProductPage({ params }: ProductPageProps) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductDetail slug={params.slug} />
    </Suspense>
  );
}

function ProductSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="aspect-square bg-gray-100 rounded-2xl animate-pulse" />
        <div className="space-y-4">
          <div className="h-8 bg-gray-100 rounded animate-pulse w-3/4" />
          <div className="h-6 bg-gray-100 rounded animate-pulse w-1/4" />
          <div className="h-24 bg-gray-100 rounded animate-pulse" />
          <div className="h-12 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

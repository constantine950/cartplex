import { Suspense } from "react";
import { VendorStorefront } from "@/components/vendor/VendorStorefront";

interface VendorPageProps {
  params: { slug: string };
}

export function generateMetadata({ params }: VendorPageProps) {
  return {
    title: params.slug
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()),
  };
}

export default function VendorPage({ params }: VendorPageProps) {
  return (
    <Suspense fallback={<VendorSkeleton />}>
      <VendorStorefront slug={params.slug} />
    </Suspense>
  );
}

function VendorSkeleton() {
  return (
    <div>
      <div className="h-48 bg-gray-100 animate-pulse" />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-64 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

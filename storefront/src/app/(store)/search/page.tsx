import { Suspense } from "react";
import { SearchResults } from "@/components/search/SearchResults";

interface SearchPageProps {
  searchParams: {
    q?: string;
    category?: string;
    vendor?: string;
    minPrice?: string;
    maxPrice?: string;
    inStock?: string;
    tags?: string;
    sort?: string;
    page?: string;
  };
}

export function generateMetadata({ searchParams }: SearchPageProps) {
  const q = searchParams.q;
  return {
    title: q ? `"${q}" — Search` : "Browse Products",
  };
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-6">
        {searchParams.q ? (
          <>
            Results for{" "}
            <span className="text-gray-500">"{searchParams.q}"</span>
          </>
        ) : searchParams.category ? (
          searchParams.category
        ) : (
          "All Products"
        )}
      </h1>
      <Suspense fallback={<SearchSkeleton />}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function SearchSkeleton() {
  return (
    <div className="flex gap-8">
      <div className="w-64 shrink-0 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-64 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}

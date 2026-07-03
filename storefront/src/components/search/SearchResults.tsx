"use client";

import { useQuery, gql } from "@apollo/client";
import { useRouter, usePathname } from "next/navigation";
import { FacetSidebar } from "./FacetSidebar";
import { ProductGrid } from "./ProductGrid";
import { SortDropdown } from "./SortDropdown";

const SEARCH_PRODUCTS = gql`
  query SearchProducts($filter: ProductsFilterInput) {
    products(filter: $filter) {
      items {
        id
        name
        slug
        basePrice
        avgRating
        images
        category
        vendor {
          name
          slug
        }
        variants {
          id
          inventoryCount
          options
          priceModifier
        }
      }
      pageInfo {
        total
        page
        perPage
        totalPages
      }
      facets {
        categories {
          key
          count
        }
        vendors {
          key
          count
        }
        tags {
          key
          count
        }
        priceRanges {
          from
          to
          count
        }
      }
      priceStats {
        min
        max
      }
    }
  }
`;

interface SearchResultsProps {
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

export function SearchResults({ searchParams }: SearchResultsProps) {
  const router = useRouter();
  const pathname = usePathname();

  const filter = {
    search: searchParams.q,
    category: searchParams.category,
    minPrice: searchParams.minPrice
      ? parseFloat(searchParams.minPrice)
      : undefined,
    maxPrice: searchParams.maxPrice
      ? parseFloat(searchParams.maxPrice)
      : undefined,
    inStock: searchParams.inStock === "true" ? true : undefined,
    tags: searchParams.tags ? searchParams.tags.split(",") : undefined,
    sortBy: searchParams.sort ?? "NEWEST",
    page: searchParams.page ? parseInt(searchParams.page) : 1,
    perPage: 12,
  };

  const { data, loading, error } = useQuery(SEARCH_PRODUCTS, {
    variables: { filter },
  });

  function updateParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const current: Record<string, string> = {
      ...(searchParams.q && { q: searchParams.q }),
      ...(searchParams.category && { category: searchParams.category }),
      ...(searchParams.minPrice && { minPrice: searchParams.minPrice }),
      ...(searchParams.maxPrice && { maxPrice: searchParams.maxPrice }),
      ...(searchParams.inStock && { inStock: searchParams.inStock }),
      ...(searchParams.tags && { tags: searchParams.tags }),
      ...(searchParams.sort && { sort: searchParams.sort }),
    };

    const merged = { ...current, ...updates };
    Object.entries(merged).forEach(([k, v]) => {
      if (v !== undefined && v !== "") params.set(k, v);
    });

    router.push(`${pathname}?${params.toString()}`);
  }

  if (error) {
    return (
      <div className="text-center py-16 text-red-500">
        Failed to load products. Please try again.
      </div>
    );
  }

  const products = data?.products?.items ?? [];
  const pageInfo = data?.products?.pageInfo;
  const facets = data?.products?.facets;
  const priceStats = data?.products?.priceStats;

  return (
    <div className="flex gap-8">
      {/* Facet sidebar */}
      <aside className="w-64 shrink-0 hidden lg:block">
        <FacetSidebar
          facets={facets}
          priceStats={priceStats}
          searchParams={searchParams}
          onUpdate={updateParams}
        />
      </aside>

      {/* Results */}
      <div className="flex-1 min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">
            {loading ? (
              <span className="inline-block w-24 h-4 bg-gray-100 animate-pulse rounded" />
            ) : (
              `${pageInfo?.total ?? 0} product${pageInfo?.total === 1 ? "" : "s"}`
            )}
          </p>
          <SortDropdown
            value={searchParams.sort ?? "NEWEST"}
            onChange={(sort) => updateParams({ sort, page: "1" })}
          />
        </div>

        {/* Grid */}
        <ProductGrid products={products} loading={loading} />

        {/* Pagination */}
        {pageInfo && pageInfo.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-10">
            {[...Array(pageInfo.totalPages)].map((_, i) => {
              const p = i + 1;
              const isCurrent = p === pageInfo.page;
              return (
                <button
                  key={p}
                  onClick={() => updateParams({ page: p.toString() })}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    isCurrent
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

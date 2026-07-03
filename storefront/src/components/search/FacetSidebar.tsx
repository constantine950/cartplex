"use client";

import { useState } from "react";

interface FacetSidebarProps {
  facets: any;
  priceStats: any;
  searchParams: any;
  onUpdate: (updates: Record<string, string | undefined>) => void;
}

export function FacetSidebar({
  facets,
  priceStats,
  searchParams,
  onUpdate,
}: FacetSidebarProps) {
  const [minPrice, setMinPrice] = useState(searchParams.minPrice ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.maxPrice ?? "");

  function applyPrice() {
    onUpdate({
      minPrice: minPrice || undefined,
      maxPrice: maxPrice || undefined,
      page: "1",
    });
  }

  function clearAll() {
    onUpdate({
      category: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      inStock: undefined,
      tags: undefined,
      page: "1",
    });
    setMinPrice("");
    setMaxPrice("");
  }

  const hasFilters =
    searchParams.category ||
    searchParams.minPrice ||
    searchParams.maxPrice ||
    searchParams.inStock ||
    searchParams.tags;

  return (
    <div className="space-y-6">
      {hasFilters && (
        <button
          onClick={clearAll}
          className="text-sm text-gray-500 hover:text-gray-900 underline"
        >
          Clear all filters
        </button>
      )}

      {/* In stock */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={searchParams.inStock === "true"}
            onChange={(e) =>
              onUpdate({
                inStock: e.target.checked ? "true" : undefined,
                page: "1",
              })
            }
            className="rounded border-gray-300"
          />
          <span className="text-sm font-medium">In stock only</span>
        </label>
      </div>

      {/* Categories */}
      {facets?.categories?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 text-gray-900">Category</h3>
          <ul className="space-y-2">
            {facets.categories.map((cat: any) => (
              <li key={cat.key}>
                <button
                  onClick={() =>
                    onUpdate({
                      category:
                        searchParams.category === cat.key ? undefined : cat.key,
                      page: "1",
                    })
                  }
                  className={`flex items-center justify-between w-full text-sm px-2 py-1 rounded-lg transition-colors ${
                    searchParams.category === cat.key
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <span>{cat.key}</span>
                  <span
                    className={`text-xs ${searchParams.category === cat.key ? "text-gray-300" : "text-gray-400"}`}
                  >
                    {cat.count}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Price range */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-gray-900">Price</h3>
        {priceStats && (
          <p className="text-xs text-gray-400 mb-2">
            ${Math.floor(priceStats.min)} – ${Math.ceil(priceStats.max)}
          </p>
        )}
        <div className="flex gap-2 items-center">
          <input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <span className="text-gray-400 text-sm">–</span>
          <input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <button
          onClick={applyPrice}
          className="mt-2 w-full text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-1.5 rounded-lg transition-colors"
        >
          Apply
        </button>
      </div>

      {/* Vendors */}
      {facets?.vendors?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 text-gray-900">Vendor</h3>
          <ul className="space-y-2">
            {facets.vendors.map((v: any) => (
              <li key={v.key}>
                <button
                  onClick={() =>
                    onUpdate({
                      vendor: searchParams.vendor === v.key ? undefined : v.key,
                      page: "1",
                    })
                  }
                  className={`flex items-center justify-between w-full text-sm px-2 py-1 rounded-lg transition-colors ${
                    searchParams.vendor === v.key
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <span>{v.key}</span>
                  <span
                    className={`text-xs ${searchParams.vendor === v.key ? "text-gray-300" : "text-gray-400"}`}
                  >
                    {v.count}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tags */}
      {facets?.tags?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 text-gray-900">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {facets.tags.slice(0, 12).map((tag: any) => {
              const activeTags = searchParams.tags
                ? searchParams.tags.split(",")
                : [];
              const isActive = activeTags.includes(tag.key);
              return (
                <button
                  key={tag.key}
                  onClick={() => {
                    const next = isActive
                      ? activeTags.filter((t) => t !== tag.key)
                      : [...activeTags, tag.key];
                    onUpdate({
                      tags: next.length ? next.join(",") : undefined,
                      page: "1",
                    });
                  }}
                  className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                    isActive
                      ? "bg-gray-900 text-white border-gray-900"
                      : "border-gray-200 text-gray-600 hover:border-gray-400"
                  }`}
                >
                  {tag.key}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useQuery, gql } from "@apollo/client";
import { ProductCard } from "../product/ProductCard";

const GET_VENDOR = gql`
  query GetVendor($slug: String!) {
    vendor(slug: $slug) {
      id
      name
      slug
      description
      status
      createdAt
      products {
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
    }
  }
`;

const CATEGORIES_FROM_PRODUCTS = (products: any[]) => {
  const cats = new Set(products.map((p) => p.category));
  return ["All", ...Array.from(cats)];
};

interface VendorStorefrontProps {
  slug: string;
}

export function VendorStorefront({ slug }: VendorStorefrontProps) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState<
    "newest" | "price_asc" | "price_desc" | "rated"
  >("newest");

  const { data, loading, error } = useQuery(GET_VENDOR, {
    variables: { slug },
  });

  if (loading) return null;
  if (error || !data?.vendor) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Vendor not found.</p>
      </div>
    );
  }

  const vendor = data.vendor;
  const allProducts: any[] = vendor.products ?? [];
  const categories = CATEGORIES_FROM_PRODUCTS(allProducts);

  const filtered = allProducts
    .filter((p) => activeCategory === "All" || p.category === activeCategory)
    .sort((a, b) => {
      switch (sortBy) {
        case "price_asc":
          return a.basePrice - b.basePrice;
        case "price_desc":
          return b.basePrice - a.basePrice;
        case "rated":
          return b.avgRating - a.avgRating;
        default:
          return 0;
      }
    });

  const totalStock = allProducts.reduce(
    (sum, p) =>
      sum + p.variants.reduce((s: number, v: any) => s + v.inventoryCount, 0),
    0,
  );

  const avgRating =
    allProducts.filter((p) => p.avgRating > 0).length > 0
      ? allProducts.reduce((sum, p) => sum + Number(p.avgRating), 0) /
        allProducts.filter((p) => p.avgRating > 0).length
      : 0;

  const memberSince = new Date(vendor.createdAt).getFullYear();

  const VENDOR_EMOJI: Record<string, string> = {
    techgear: "💻",
    stylehouse: "👗",
    homenest: "🏡",
  };

  const emoji = VENDOR_EMOJI[slug] ?? "🏪";

  return (
    <div>
      {/* ── Banner ────────────────────────────────────────────── */}
      <div className="bg-gray-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 bg-gray-800 rounded-2xl flex items-center justify-center text-4xl shrink-0">
              {emoji}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold">{vendor.name}</h1>
                {vendor.status === "APPROVED" && (
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30">
                    ✓ Verified
                  </span>
                )}
              </div>
              {vendor.description && (
                <p className="text-gray-400 mb-4 max-w-xl">
                  {vendor.description}
                </p>
              )}

              {/* Stats */}
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <p className="text-gray-400">Products</p>
                  <p className="font-semibold text-white">
                    {allProducts.length}
                  </p>
                </div>
                {avgRating > 0 && (
                  <div>
                    <p className="text-gray-400">Avg Rating</p>
                    <p className="font-semibold text-white flex items-center gap-1">
                      <span className="text-yellow-400">★</span>
                      {avgRating.toFixed(1)}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-gray-400">In Stock</p>
                  <p className="font-semibold text-white">{totalStock} units</p>
                </div>
                <div>
                  <p className="text-gray-400">Member Since</p>
                  <p className="font-semibold text-white">{memberSince}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Products ──────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          {/* Category filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rated">Best Rated</option>
          </select>
        </div>

        {/* Count */}
        <p className="text-sm text-gray-400 mb-6">
          {filtered.length} product{filtered.length !== 1 ? "s" : ""}
          {activeCategory !== "All" && ` in ${activeCategory}`}
        </p>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">📦</p>
            <p className="text-gray-500">No products in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

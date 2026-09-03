"use client";

import { useQuery, useMutation, gql } from "@apollo/client";
import { useState } from "react";
import Link from "next/link";

const MY_PRODUCTS = gql`
  query MyProducts {
    me {
      vendor {
        id
        products {
          id
          name
          slug
          category
          basePrice
          isActive
          avgRating
          variants {
            id
            sku
            inventoryCount
            lowStockThreshold
            backorderEnabled
            options
          }
        }
      }
    }
  }
`;

const UPDATE_PRODUCT = gql`
  mutation UpdateProduct($id: String!, $input: UpdateProductInput!) {
    updateProduct(id: $id, input: $input) {
      id
      isActive
    }
  }
`;

const RESTOCK = gql`
  mutation Restock($variantId: String!, $quantity: Int!) {
    restockVariant(variantId: $variantId, quantity: $quantity) {
      id
      inventoryCount
    }
  }
`;

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("cartplex_token") ?? "";
}

export default function VendorProductsPage() {
  const [restockingId, setRestockingId] = useState<string | null>(null);
  const [restockQty, setRestockQty] = useState(10);

  const ctx = {
    context: { headers: { Authorization: `Bearer ${getToken()}` } },
  };
  const { data, loading, refetch } = useQuery(MY_PRODUCTS, ctx);
  const [updateProduct] = useMutation(UPDATE_PRODUCT, {
    ...ctx,
    onCompleted: () => refetch(),
  });
  const [restockVariant] = useMutation(RESTOCK, {
    ...ctx,
    onCompleted: () => {
      refetch();
      setRestockingId(null);
    },
  });

  const products = data?.me?.vendor?.products ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Products</h1>
        <Link
          href="/vendor-dashboard/products/new"
          className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          + New Product
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-20 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📦</p>
          <p>No products yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((product: any) => (
            <div
              key={product.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href={`/product/${product.slug}`}
                        className="font-semibold text-gray-900 hover:text-gray-600 transition-colors truncate"
                      >
                        {product.name}
                      </Link>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                          product.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {product.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">
                      {product.category} · $
                      {Number(product.basePrice).toFixed(2)}
                    </p>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() =>
                        updateProduct({
                          variables: {
                            id: product.id,
                            input: { isActive: !product.isActive },
                          },
                        })
                      }
                      className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg hover:border-gray-400 transition-colors"
                    >
                      {product.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>

                {/* Variants */}
                <div className="mt-3 space-y-2">
                  {product.variants.map((variant: any) => {
                    const isLow =
                      variant.inventoryCount <= variant.lowStockThreshold &&
                      variant.inventoryCount > 0;
                    const isOOS = variant.inventoryCount === 0;

                    return (
                      <div
                        key={variant.id}
                        className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm"
                      >
                        <div>
                          <span className="font-mono text-xs text-gray-500">
                            {variant.sku}
                          </span>
                          {Object.entries(variant.options ?? {}).map(
                            ([k, v]: any) => (
                              <span
                                key={k}
                                className="ml-2 text-xs text-gray-400 capitalize"
                              >
                                {k}: {v}
                              </span>
                            ),
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`text-xs font-medium ${
                              isOOS
                                ? "text-red-500"
                                : isLow
                                  ? "text-orange-500"
                                  : "text-green-600"
                            }`}
                          >
                            {isOOS
                              ? "✕ OOS"
                              : isLow
                                ? `⚡ ${variant.inventoryCount} left`
                                : `✓ ${variant.inventoryCount}`}
                          </span>

                          {restockingId === variant.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={restockQty}
                                onChange={(e) =>
                                  setRestockQty(parseInt(e.target.value))
                                }
                                className="w-16 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-gray-900"
                                min={1}
                              />
                              <button
                                onClick={() =>
                                  restockVariant({
                                    variables: {
                                      variantId: variant.id,
                                      quantity: restockQty,
                                    },
                                  })
                                }
                                className="text-xs bg-gray-900 text-white px-2 py-1 rounded hover:bg-gray-700 transition-colors"
                              >
                                Add
                              </button>
                              <button
                                onClick={() => setRestockingId(null)}
                                className="text-xs text-gray-400 hover:text-gray-600"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setRestockingId(variant.id)}
                              className="text-xs text-gray-500 hover:text-gray-900 underline transition-colors"
                            >
                              Restock
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

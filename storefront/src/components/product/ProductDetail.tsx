"use client";

import { useState } from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import Image from "next/image";
import Link from "next/link";
import { ReviewSection } from "./ReviewSection";
import { StockIndicator } from "./StockIndicator";

const GET_PRODUCT = gql`
  query GetProduct($slug: String!) {
    product(slug: $slug) {
      id
      name
      slug
      description
      category
      tags
      basePrice
      avgRating
      images
      vendor {
        id
        name
        slug
      }
      variants {
        id
        sku
        options
        priceModifier
        inventoryCount
        backorderEnabled
        lowStockThreshold
      }
      reviews {
        id
        rating
        text
        verifiedPurchase
        createdAt
        buyer {
          name
        }
      }
    }
  }
`;

const ADD_TO_CART = gql`
  mutation AddToCart($input: AddToCartInput!) {
    addToCart(input: $input) {
      sessionId
      itemCount
      subtotal
    }
  }
`;

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("cartplex_session_id");
  if (!id) {
    id = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem("cartplex_session_id", id);
  }
  return id;
}

interface ProductDetailProps {
  slug: string;
}

export function ProductDetail({ slug }: ProductDetailProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    null,
  );
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);

  const { data, loading, error } = useQuery(GET_PRODUCT, {
    variables: { slug },
    onCompleted: (data) => {
      if (data.product?.variants?.length > 0) {
        setSelectedVariantId(data.product.variants[0].id);
      }
    },
  });

  const [addToCart, { loading: addingToCart }] = useMutation(ADD_TO_CART, {
    onCompleted: () => {
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2000);
    },
  });

  if (loading) return null;
  if (error || !data?.product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Product not found.</p>
        <Link href="/search" className="text-sm underline mt-2 inline-block">
          Back to search
        </Link>
      </div>
    );
  }

  const product = data.product;
  const selectedVariant = product.variants.find(
    (v: any) => v.id === selectedVariantId,
  );
  const finalPrice = selectedVariant
    ? product.basePrice + (selectedVariant.priceModifier ?? 0)
    : product.basePrice;

  const variantOptions = selectedVariant?.options as Record<
    string,
    string
  > | null;

  async function handleAddToCart() {
    if (!selectedVariantId) return;
    await addToCart({
      variables: {
        input: {
          sessionId: getSessionId(),
          variantId: selectedVariantId,
          quantity,
        },
      },
    });
  }

  // Group variants by option key (e.g. size, colour)
  const optionKeys =
    product.variants.length > 0
      ? Object.keys(product.variants[0].options ?? {})
      : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-400 mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-gray-600">
          Home
        </Link>
        <span>/</span>
        <Link href="/search" className="hover:text-gray-600">
          Products
        </Link>
        <span>/</span>
        <Link
          href={`/search?category=${product.category}`}
          className="hover:text-gray-600"
        >
          {product.category}
        </Link>
        <span>/</span>
        <span className="text-gray-600 truncate max-w-xs">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* ── Image gallery ─────────────────────────────────── */}
        <div className="space-y-4">
          <div className="relative aspect-square bg-gray-100 rounded-2xl overflow-hidden">
            {product.images[activeImage] ? (
              <Image
                src={product.images[activeImage]}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl text-gray-300">
                📦
              </div>
            )}
          </div>

          {product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {product.images.map((img: string, i: number) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`relative w-20 h-20 shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                    activeImage === i ? "border-gray-900" : "border-transparent"
                  }`}
                >
                  <Image
                    src={img}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Product info ───────────────────────────────────── */}
        <div className="space-y-6">
          {/* Vendor */}
          <Link
            href={`/vendor/${product.vendor.slug}`}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            {product.vendor.name}
          </Link>

          {/* Name */}
          <h1 className="text-3xl font-bold text-gray-900 leading-tight">
            {product.name}
          </h1>

          {/* Rating */}
          {product.avgRating > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`text-lg ${
                      star <= Math.round(product.avgRating)
                        ? "text-yellow-400"
                        : "text-gray-200"
                    }`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="text-sm text-gray-500">
                {Number(product.avgRating).toFixed(1)} ·{" "}
                {product.reviews.length} review
                {product.reviews.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* Price */}
          <p className="text-3xl font-bold">${finalPrice.toFixed(2)}</p>

          {/* Description */}
          {product.description && (
            <p className="text-gray-600 leading-relaxed">
              {product.description}
            </p>
          )}

          {/* Variant selector */}
          {optionKeys.map((key) => {
            const values = [
              ...new Set(product.variants.map((v: any) => v.options[key])),
            ] as string[];
            return (
              <div key={key}>
                <p className="text-sm font-medium text-gray-900 mb-2 capitalize">
                  {key}:{" "}
                  <span className="font-normal text-gray-500">
                    {selectedVariant?.options[key]}
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {values.map((val) => {
                    const variant = product.variants.find(
                      (v: any) => v.options[key] === val,
                    );
                    const isSelected = selectedVariantId === variant?.id;
                    const isOOS =
                      variant &&
                      variant.inventoryCount === 0 &&
                      !variant.backorderEnabled;

                    return (
                      <button
                        key={val}
                        onClick={() =>
                          variant && setSelectedVariantId(variant.id)
                        }
                        disabled={isOOS}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          isSelected
                            ? "border-gray-900 bg-gray-900 text-white"
                            : isOOS
                              ? "border-gray-200 text-gray-300 cursor-not-allowed line-through"
                              : "border-gray-200 text-gray-700 hover:border-gray-400"
                        }`}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Stock indicator */}
          {selectedVariant && (
            <StockIndicator
              inventoryCount={selectedVariant.inventoryCount}
              backorderEnabled={selectedVariant.backorderEnabled}
              lowStockThreshold={selectedVariant.lowStockThreshold}
            />
          )}

          {/* Quantity + Add to cart */}
          <div className="flex gap-3">
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3 py-3 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                −
              </button>
              <span className="px-4 py-3 text-sm font-medium min-w-[3rem] text-center">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="px-3 py-3 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                +
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={
                addingToCart ||
                !selectedVariantId ||
                (selectedVariant?.inventoryCount === 0 &&
                  !selectedVariant?.backorderEnabled)
              }
              className={`flex-1 py-3 px-6 rounded-lg font-semibold text-sm transition-all ${
                addedToCart
                  ? "bg-green-600 text-white"
                  : "bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              }`}
            >
              {addedToCart
                ? "✓ Added to cart"
                : addingToCart
                  ? "Adding..."
                  : "Add to cart"}
            </button>
          </div>

          {/* Tags */}
          {product.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {product.tags.map((tag: string) => (
                <Link
                  key={tag}
                  href={`/search?tags=${tag}`}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 transition-colors"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reviews */}
      <div className="mt-16 border-t border-gray-200 pt-12">
        <ReviewSection
          productId={product.id}
          reviews={product.reviews}
          avgRating={product.avgRating}
        />
      </div>
    </div>
  );
}

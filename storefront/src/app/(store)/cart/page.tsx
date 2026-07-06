"use client";

import { useQuery, useMutation, gql } from "@apollo/client";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";

const GET_CART = gql`
  query GetCart($sessionId: String!) {
    cart(sessionId: $sessionId) {
      sessionId
      items {
        variantId
        productId
        name
        image
        sku
        options
        unitPrice
        quantity
        lineTotal
      }
      subtotal
      itemCount
    }
  }
`;

const UPDATE_CART = gql`
  mutation UpdateCartItem($input: UpdateCartItemInput!) {
    updateCartItem(input: $input) {
      sessionId
      items {
        variantId
        quantity
        lineTotal
      }
      subtotal
      itemCount
    }
  }
`;

const REMOVE_FROM_CART = gql`
  mutation RemoveFromCart($sessionId: String!, $variantId: String!) {
    removeFromCart(sessionId: $sessionId, variantId: $variantId) {
      sessionId
      items {
        variantId
        quantity
        lineTotal
      }
      subtotal
      itemCount
    }
  }
`;

const APPLY_DISCOUNT = gql`
  mutation ApplyDiscount($input: ApplyDiscountInput!) {
    applyDiscount(input: $input) {
      subtotal
      discountAmount
      discountDescription
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

export default function CartPage() {
  const [sessionId, setSessionId] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState<{
    amount: number;
    description: string;
  } | null>(null);
  const [couponError, setCouponError] = useState("");

  useEffect(() => {
    setSessionId(getSessionId());
  }, []);

  const { data, loading, refetch } = useQuery(GET_CART, {
    variables: { sessionId },
    skip: !sessionId,
  });

  const [updateCartItem] = useMutation(UPDATE_CART);
  const [removeFromCart] = useMutation(REMOVE_FROM_CART);
  const [applyDiscount, { loading: applyingDiscount }] = useMutation(
    APPLY_DISCOUNT,
    {
      onCompleted: (data) => {
        setDiscount({
          amount: data.applyDiscount.discountAmount,
          description: data.applyDiscount.discountDescription,
        });
        setCouponError("");
      },
      onError: (err) => {
        setCouponError(err.message);
        setDiscount(null);
      },
    },
  );

  async function handleQuantityChange(variantId: string, quantity: number) {
    if (quantity === 0) {
      await removeFromCart({ variables: { sessionId, variantId } });
    } else {
      await updateCartItem({
        variables: { input: { sessionId, variantId, quantity } },
      });
    }
    refetch();
  }

  async function handleRemove(variantId: string) {
    await removeFromCart({ variables: { sessionId, variantId } });
    refetch();
  }

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    await applyDiscount({
      variables: { input: { sessionId, couponCode: couponCode.trim() } },
    });
  }

  const cart = data?.cart;
  const subtotal = cart?.subtotal ?? 0;
  const discountAmount = discount?.amount ?? 0;
  const shipping =
    subtotal - discountAmount > 100 ? 0 : subtotal > 0 ? 9.99 : 0;
  const tax = (subtotal - discountAmount) * 0.08;
  const total = subtotal - discountAmount + shipping + tax;

  if (loading || !sessionId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">Your Cart</h1>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-24 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!cart?.items?.length) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-5xl mb-6">🛒</p>
        <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
        <p className="text-gray-500 mb-8">Add some products to get started.</p>
        <Link
          href="/search"
          className="inline-block bg-gray-900 text-white font-semibold px-8 py-3 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-8">
        Your Cart{" "}
        <span className="text-gray-400 font-normal text-lg">
          ({cart.itemCount} items)
        </span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item: any) => (
            <div
              key={item.variantId}
              className="flex gap-4 p-4 bg-white border border-gray-100 rounded-xl shadow-sm"
            >
              {/* Image */}
              <div className="relative w-20 h-20 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">
                    📦
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 truncate">
                  {item.name}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{item.sku}</p>
                {item.options &&
                  Object.entries(item.options).map(([k, v]: any) => (
                    <p key={k} className="text-xs text-gray-500 capitalize">
                      {k}: {v}
                    </p>
                  ))}
                <p className="text-sm font-semibold mt-2">
                  ${item.unitPrice.toFixed(2)}
                </p>
              </div>

              {/* Quantity controls */}
              <div className="flex flex-col items-end justify-between">
                <button
                  onClick={() => handleRemove(item.variantId)}
                  className="text-gray-300 hover:text-red-400 transition-colors text-lg"
                >
                  ×
                </button>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() =>
                      handleQuantityChange(item.variantId, item.quantity - 1)
                    }
                    className="px-2 py-1 text-gray-600 hover:bg-gray-50 text-sm transition-colors"
                  >
                    −
                  </button>
                  <span className="px-3 py-1 text-sm font-medium">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      handleQuantityChange(item.variantId, item.quantity + 1)
                    }
                    className="px-2 py-1 text-gray-600 hover:bg-gray-50 text-sm transition-colors"
                  >
                    +
                  </button>
                </div>
                <p className="text-sm font-semibold">
                  ${item.lineTotal.toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 rounded-xl p-6 sticky top-24 space-y-4">
            <h2 className="font-bold text-lg">Order Summary</h2>

            {/* Coupon */}
            <div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Coupon code"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                <button
                  onClick={handleApplyCoupon}
                  disabled={applyingDiscount}
                  className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
              {couponError && (
                <p className="text-red-500 text-xs mt-1">{couponError}</p>
              )}
              {discount && (
                <p className="text-green-600 text-xs mt-1">
                  ✓ {discount.description} applied
                </p>
              )}
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discount && discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>−${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>
                  {shipping === 0 ? (
                    <span className="text-green-600">Free</span>
                  ) : (
                    `$${shipping.toFixed(2)}`
                  )}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax (8%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-base">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="block w-full text-center bg-gray-900 text-white font-semibold py-3 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Proceed to checkout
            </Link>

            <Link
              href="/search"
              className="block text-center text-sm text-gray-500 hover:text-gray-700"
            >
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

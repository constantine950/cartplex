"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import { useRouter } from "next/navigation";

const GET_CART = gql`
  query GetCart($sessionId: String!) {
    cart(sessionId: $sessionId) {
      items {
        name
        quantity
        unitPrice
        lineTotal
        image
      }
      subtotal
      itemCount
    }
  }
`;

const CHECKOUT = gql`
  mutation Checkout($input: CheckoutInput!) {
    checkout(input: $input) {
      id
      status
      total
      stripePaymentIntentId
    }
  }
`;

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("cartplex_session_id") ?? "";
}

function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("cartplex_token") ?? "";
}

export default function CheckoutPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    line1: "",
    city: "",
    state: "",
    country: "US",
    zip: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    setSessionId(getSessionId());
  }, []);

  const { data } = useQuery(GET_CART, {
    variables: { sessionId },
    skip: !sessionId,
  });

  const [checkout, { loading }] = useMutation(CHECKOUT, {
    context: {
      headers: { Authorization: `Bearer ${getToken()}` },
    },
    onCompleted: (data) => {
      router.push(`/order-confirmation/${data.checkout.id}`);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    await checkout({
      variables: {
        input: {
          sessionId,
          shippingAddress: form,
        },
      },
    });
  }

  const cart = data?.cart;
  const subtotal = cart?.subtotal ?? 0;
  const shipping = subtotal > 100 ? 0 : 9.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="font-semibold text-lg">Shipping Information</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full name
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <input
                name="line1"
                value={form.line1}
                onChange={handleChange}
                required
                placeholder="123 Main St"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                required
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State / Region
              </label>
              <input
                name="state"
                value={form.state}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ZIP / Postal code
              </label>
              <input
                name="zip"
                value={form.zip}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country
              </label>
              <select
                name="country"
                value={form.country}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
              >
                <option value="US">United States</option>
                <option value="NG">Nigeria</option>
                <option value="GB">United Kingdom</option>
                <option value="CA">Canada</option>
                <option value="AU">Australia</option>
                <option value="DE">Germany</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
              {error === "UNAUTHENTICATED"
                ? "Please sign in to complete checkout."
                : error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !cart?.items?.length}
            className="w-full bg-gray-900 text-white font-semibold py-3 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? "Processing..." : `Place order · $${total.toFixed(2)}`}
          </button>

          <p className="text-xs text-gray-400 text-center">
            By placing your order you agree to our terms of service.
          </p>
        </form>

        {/* Order summary */}
        <div>
          <h2 className="font-semibold text-lg mb-4">Order Summary</h2>
          <div className="space-y-3 mb-6">
            {cart?.items?.map((item: any, i: number) => (
              <div key={i} className="flex gap-3">
                <div className="relative w-14 h-14 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl">
                      📦
                    </div>
                  )}
                  <span className="absolute -top-1 -right-1 bg-gray-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {item.quantity}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 line-clamp-1">
                    {item.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    ${item.unitPrice.toFixed(2)} each
                  </p>
                </div>
                <p className="text-sm font-semibold">
                  ${item.lineTotal.toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
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
        </div>
      </div>
    </div>
  );
}

"use client";

import { useQuery, gql } from "@apollo/client";
import { useEffect, useState } from "react";
import Link from "next/link";

const GET_ORDER = gql`
  query GetOrder($id: String!) {
    order(id: $id) {
      id
      status
      subtotal
      discountAmount
      shippingAmount
      taxAmount
      total
      createdAt
      coupon {
        code
        type
        value
      }
      items {
        quantity
        unitPrice
        lineTotal
        variant {
          sku
          options
        }
        vendor {
          name
          slug
        }
      }
    }
  }
`;

const STATUS_STEPS = [
  "PENDING_PAYMENT",
  "PAID",
  "FULFILLING",
  "SHIPPED",
  "DELIVERED",
];

const STATUS_INFO: Record<
  string,
  { label: string; description: string; color: string }
> = {
  PENDING_PAYMENT: {
    label: "Awaiting Payment",
    description: "Your order is waiting for payment confirmation from Stripe.",
    color: "text-yellow-600",
  },
  PAID: {
    label: "Payment Confirmed",
    description:
      "Payment received. Vendors have been notified and will begin preparing your order.",
    color: "text-green-600",
  },
  FULFILLING: {
    label: "Being Prepared",
    description: "Your order is being prepared for shipment.",
    color: "text-blue-600",
  },
  SHIPPED: {
    label: "Shipped",
    description: "Your order is on its way!",
    color: "text-purple-600",
  },
  DELIVERED: {
    label: "Delivered",
    description: "Your order has been delivered. Enjoy!",
    color: "text-gray-700",
  },
};

export default function OrderConfirmationPage({
  params,
}: {
  params: { id: string };
}) {
  const [token, setToken] = useState("");
  const [show, setShow] = useState(false);

  useEffect(() => {
    setToken(localStorage.getItem("cartplex_token") ?? "");
    setTimeout(() => setShow(true), 100);
  }, []);

  const { data, loading } = useQuery(GET_ORDER, {
    variables: { id: params.id },
    context: { headers: { Authorization: `Bearer ${token}` } },
    skip: !token,
    pollInterval: 10000, // poll every 10s to catch status updates
  });

  const order = data?.order;
  const currentStep = order ? STATUS_STEPS.indexOf(order.status) : 0;
  const statusInfo = order ? STATUS_INFO[order.status] : null;

  if (loading || !order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="space-y-4">
          <div className="h-8 bg-gray-100 rounded animate-pulse w-1/2" />
          <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
          <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
      <div
        className={`transition-all duration-500 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      >
        {/* Success header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">
            Order confirmed!
          </h1>
          <p className="text-gray-500 text-sm">
            Thank you for your purchase ·{" "}
            <span className="font-mono">
              #{params.id.slice(0, 8).toUpperCase()}
            </span>
          </p>
        </div>

        {/* Status card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-4 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className={`text-sm font-semibold ${statusInfo?.color}`}>
              {statusInfo?.label}
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-5">
            {statusInfo?.description}
          </p>

          {/* Progress */}
          {order.status !== "CANCELLED" && (
            <div>
              <div className="flex items-center">
                {STATUS_STEPS.map((s, i) => (
                  <div
                    key={s}
                    className="flex items-center flex-1 last:flex-none"
                  >
                    <div
                      className={`w-3 h-3 rounded-full shrink-0 transition-colors ${
                        i <= currentStep ? "bg-gray-900" : "bg-gray-200"
                      }`}
                    />
                    {i < STATUS_STEPS.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 transition-colors ${
                          i < currentStep ? "bg-gray-900" : "bg-gray-200"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2">
                {STATUS_STEPS.map((s) => (
                  <p
                    key={s}
                    className="text-gray-400"
                    style={{ fontSize: "10px" }}
                  >
                    {s.replace("_", " ")}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Order items */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm mb-4">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold">Order Items</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {order.items.map((item: any, i: number) => (
              <div
                key={i}
                className="px-5 py-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-sm text-gray-900">
                    {item.variant?.sku}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Link
                      href={`/vendor/${item.vendor?.slug}`}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      by {item.vendor?.name}
                    </Link>
                    {item.variant?.options &&
                      Object.entries(item.variant.options).map(
                        ([k, v]: any) => (
                          <span
                            key={k}
                            className="text-xs text-gray-400 capitalize"
                          >
                            {k}: {v}
                          </span>
                        ),
                      )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">
                    ${Number(item.lineTotal).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400">qty {item.quantity}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 space-y-2 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>${Number(order.subtotal).toFixed(2)}</span>
            </div>
            {Number(order.discountAmount) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount {order.coupon && `(${order.coupon.code})`}</span>
                <span>−${Number(order.discountAmount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-500">
              <span>Shipping</span>
              <span>
                {Number(order.shippingAmount) === 0
                  ? "Free"
                  : `$${Number(order.shippingAmount).toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Tax</span>
              <span>${Number(order.taxAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200">
              <span>Total</span>
              <span>${Number(order.total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/account/orders"
            className="flex-1 text-center bg-gray-900 text-white font-semibold py-3 rounded-lg hover:bg-gray-700 transition-colors text-sm"
          >
            View all orders
          </Link>
          <Link
            href="/search"
            className="flex-1 text-center border border-gray-200 text-gray-700 font-semibold py-3 rounded-lg hover:border-gray-400 transition-colors text-sm"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useQuery, gql } from "@apollo/client";
import { useEffect, useState } from "react";
import Link from "next/link";

const MY_ORDERS = gql`
  query MyOrders {
    orders {
      id
      status
      total
      createdAt
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
      coupon {
        code
      }
      payouts {
        status
      }
    }
  }
`;

const STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: "bg-yellow-100 text-yellow-700",
  PAID: "bg-green-100 text-green-700",
  FULFILLING: "bg-blue-100 text-blue-700",
  SHIPPED: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-gray-100 text-gray-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const STATUS_STEPS = [
  "PENDING_PAYMENT",
  "PAID",
  "FULFILLING",
  "SHIPPED",
  "DELIVERED",
];

export default function OrdersPage() {
  const [token, setToken] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem("cartplex_token") ?? "");
  }, []);

  const { data, loading } = useQuery(MY_ORDERS, {
    context: { headers: { Authorization: `Bearer ${token}` } },
    skip: !token,
  });

  const orders = data?.orders ?? [];

  if (!token) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-4xl mb-4">🔒</p>
        <h2 className="text-xl font-bold mb-2">Sign in to view your orders</h2>
        <Link href="/account/login" className="text-sm text-gray-900 underline">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-8">My Orders</h1>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-20 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-4">📦</p>
          <h2 className="text-lg font-medium mb-2">No orders yet</h2>
          <p className="text-gray-500 text-sm mb-6">
            Start shopping to place your first order.
          </p>
          <Link
            href="/search"
            className="bg-gray-900 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-gray-700 transition-colors text-sm"
          >
            Browse products
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => {
            const currentStep = STATUS_STEPS.indexOf(order.status);
            return (
              <div
                key={order.id}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
              >
                {/* Header */}
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() =>
                    setExpanded(expanded === order.id ? null : order.id)
                  }
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-mono text-xs text-gray-400">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[order.status]}`}
                      >
                        {order.status.replace("_", " ")}
                      </span>
                      {order.coupon && (
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-mono">
                          {order.coupon.code}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <p className="font-bold text-gray-900">
                    ${Number(order.total).toFixed(2)}
                  </p>
                  <span className="text-gray-400 text-sm">
                    {expanded === order.id ? "▲" : "▼"}
                  </span>
                </div>

                {/* Progress bar */}
                {order.status !== "CANCELLED" && (
                  <div className="px-5 pb-4">
                    <div className="flex items-center gap-1">
                      {STATUS_STEPS.map((s, i) => (
                        <div key={s} className="flex items-center gap-1 flex-1">
                          <div
                            className={`w-2 h-2 rounded-full shrink-0 ${i <= currentStep ? "bg-gray-900" : "bg-gray-200"}`}
                          />
                          {i < STATUS_STEPS.length - 1 && (
                            <div
                              className={`flex-1 h-0.5 ${i < currentStep ? "bg-gray-900" : "bg-gray-200"}`}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-1">
                      {STATUS_STEPS.map((s) => (
                        <p
                          key={s}
                          className="text-xs text-gray-400"
                          style={{ fontSize: "10px" }}
                        >
                          {s.replace("_", " ")}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Expanded items */}
                {expanded === order.id && (
                  <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
                      Items
                    </p>
                    <div className="space-y-3">
                      {order.items.map((item: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-sm"
                        >
                          <div>
                            <p className="font-medium text-gray-900">
                              {item.variant?.sku}
                            </p>
                            <Link
                              href={`/vendor/${item.vendor?.slug}`}
                              className="text-xs text-gray-400 hover:text-gray-600"
                            >
                              by {item.vendor?.name}
                            </Link>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              ${Number(item.lineTotal).toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-400">
                              qty {item.quantity} × $
                              {Number(item.unitPrice).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

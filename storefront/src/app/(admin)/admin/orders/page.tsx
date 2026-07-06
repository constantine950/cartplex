"use client";

import { useQuery, useMutation, gql } from "@apollo/client";
import { useState } from "react";

const GET_ORDERS = gql`
  query AdminOrders($status: OrderStatus) {
    allOrders(status: $status, page: 1, perPage: 50) {
      id
      status
      total
      subtotal
      createdAt
      buyer {
        name
        email
      }
      items {
        quantity
        lineTotal
        vendor {
          name
        }
        variant {
          sku
        }
      }
      payouts {
        vendorId
        grossAmount
        platformFee
        netAmount
        status
      }
    }
  }
`;

const UPDATE_STATUS = gql`
  mutation UpdateStatus($orderId: String!, $status: OrderStatus!) {
    updateOrderStatus(orderId: $orderId, status: $status) {
      id
      status
    }
  }
`;

const PROCESS_PAYOUTS = gql`
  mutation ProcessPayouts($orderId: String!) {
    processPayouts(orderId: $orderId)
  }
`;

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("cartplex_token") ?? "";
}

const STATUSES = [
  "PENDING_PAYMENT",
  "PAID",
  "FULFILLING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

const STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: "bg-yellow-100 text-yellow-700",
  PAID: "bg-green-100 text-green-700",
  FULFILLING: "bg-blue-100 text-blue-700",
  SHIPPED: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-gray-100 text-gray-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function AdminOrders() {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);

  const ctx = {
    context: { headers: { Authorization: `Bearer ${getToken()}` } },
  };

  const { data, loading, refetch } = useQuery(GET_ORDERS, {
    ...ctx,
    variables: { status: statusFilter === "ALL" ? undefined : statusFilter },
  });

  const [updateStatus] = useMutation(UPDATE_STATUS, {
    ...ctx,
    onCompleted: () => refetch(),
  });
  const [processPayouts] = useMutation(PROCESS_PAYOUTS, {
    ...ctx,
    onCompleted: () => refetch(),
  });

  const orders = data?.allOrders ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-sm text-gray-400">{orders.length} orders</p>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {["ALL", ...STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              statusFilter === s
                ? "bg-gray-900 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"
            }`}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-20 bg-white rounded-xl animate-pulse border border-gray-100"
            />
          ))
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center text-gray-400 border border-gray-100">
            No orders found.
          </div>
        ) : (
          orders.map((order: any) => (
            <div
              key={order.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
            >
              {/* Order header */}
              <div
                className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() =>
                  setExpanded(expanded === order.id ? null : order.id)
                }
              >
                <div className="flex-1 grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="font-mono text-xs text-gray-400">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="font-medium text-gray-900">
                      {order.buyer?.name}
                    </p>
                  </div>
                  <div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[order.status]}`}
                    >
                      {order.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="font-semibold">
                    ${Number(order.total).toFixed(2)}
                  </div>
                  <div className="text-gray-400 text-xs">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <span className="text-gray-400 text-sm">
                  {expanded === order.id ? "▲" : "▼"}
                </span>
              </div>

              {/* Expanded details */}
              {expanded === order.id && (
                <div className="border-t border-gray-100 px-6 py-4 bg-gray-50">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Items */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
                        Items
                      </p>
                      <div className="space-y-2">
                        {order.items.map((item: any, i: number) => (
                          <div key={i} className="flex justify-between text-sm">
                            <div>
                              <p className="font-medium text-gray-900">
                                {item.variant?.sku}
                              </p>
                              <p className="text-xs text-gray-400">
                                {item.vendor?.name} · qty {item.quantity}
                              </p>
                            </div>
                            <p className="font-semibold">
                              ${Number(item.lineTotal).toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
                        Actions
                      </p>
                      <div className="space-y-2">
                        <div className="flex gap-2 flex-wrap">
                          {STATUSES.filter((s) => s !== order.status).map(
                            (s) => (
                              <button
                                key={s}
                                onClick={() =>
                                  updateStatus({
                                    variables: { orderId: order.id, status: s },
                                  })
                                }
                                className="text-xs bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:border-gray-400 transition-colors"
                              >
                                → {s.replace("_", " ")}
                              </button>
                            ),
                          )}
                        </div>
                        {order.status === "PAID" &&
                          order.payouts.length === 0 && (
                            <button
                              onClick={() =>
                                processPayouts({
                                  variables: { orderId: order.id },
                                })
                              }
                              className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-200 transition-colors font-medium"
                            >
                              💸 Process payouts
                            </button>
                          )}
                      </div>

                      {/* Payouts */}
                      {order.payouts.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                            Payouts
                          </p>
                          {order.payouts.map((p: any, i: number) => (
                            <div
                              key={i}
                              className="text-xs text-gray-600 flex justify-between"
                            >
                              <span>
                                Net ${Number(p.netAmount).toFixed(2)} (fee $
                                {Number(p.platformFee).toFixed(2)})
                              </span>
                              <span
                                className={
                                  p.status === "COMPLETED"
                                    ? "text-green-600"
                                    : "text-yellow-600"
                                }
                              >
                                {p.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

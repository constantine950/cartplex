"use client";

import { useQuery, useMutation, gql } from "@apollo/client";
import { useState } from "react";

const MY_ORDERS = gql`
  query MyOrders {
    orders {
      id
      status
      total
      createdAt
      buyer {
        name
        email
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
          id
        }
      }
    }
  }
`;

const UPDATE_STATUS = gql`
  mutation UpdateOrderStatus($orderId: String!, $status: OrderStatus!) {
    updateOrderStatus(orderId: $orderId, status: $status) {
      id
      status
    }
  }
`;

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("cartplex_token") ?? "";
}

const STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: "bg-yellow-100 text-yellow-700",
  PAID: "bg-green-100 text-green-700",
  FULFILLING: "bg-blue-100 text-blue-700",
  SHIPPED: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-gray-100 text-gray-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const VENDOR_ACTIONS: Record<string, string[]> = {
  PAID: ["FULFILLING"],
  FULFILLING: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
};

export default function VendorOrdersPage() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const ctx = {
    context: { headers: { Authorization: `Bearer ${getToken()}` } },
  };

  const { data, loading, refetch } = useQuery(MY_ORDERS, ctx);
  const [updateStatus] = useMutation(UPDATE_STATUS, {
    ...ctx,
    onCompleted: () => refetch(),
  });

  const orders = data?.orders ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Orders</h1>
        <p className="text-sm text-gray-400">{orders.length} orders</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-16 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🛍️</p>
          <p>No orders yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order: any) => (
            <div
              key={order.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() =>
                  setExpanded(expanded === order.id ? null : order.id)
                }
              >
                <div className="flex-1 grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="font-mono text-xs text-gray-400">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="font-medium">{order.buyer?.name}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium w-fit ${STATUS_COLOR[order.status]}`}
                  >
                    {order.status.replace("_", " ")}
                  </span>
                  <p className="font-semibold">
                    ${Number(order.total).toFixed(2)}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-gray-400 text-xs">
                  {expanded === order.id ? "▲" : "▼"}
                </span>
              </div>

              {expanded === order.id && (
                <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
                        Items
                      </p>
                      <div className="space-y-2">
                        {order.items.map((item: any, i: number) => (
                          <div key={i} className="text-sm">
                            <p className="font-mono text-xs text-gray-500">
                              {item.variant?.sku}
                            </p>
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Qty {item.quantity} × $
                                {Number(item.unitPrice).toFixed(2)}
                              </span>
                              <span className="font-medium">
                                ${Number(item.lineTotal).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
                        Update Status
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(VENDOR_ACTIONS[order.status] ?? []).map(
                          (nextStatus) => (
                            <button
                              key={nextStatus}
                              onClick={() =>
                                updateStatus({
                                  variables: {
                                    orderId: order.id,
                                    status: nextStatus,
                                  },
                                })
                              }
                              className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                            >
                              Mark as {nextStatus.replace("_", " ")}
                            </button>
                          ),
                        )}
                        {!VENDOR_ACTIONS[order.status] && (
                          <p className="text-xs text-gray-400">
                            No actions available for{" "}
                            {order.status.replace("_", " ")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

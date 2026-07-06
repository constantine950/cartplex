"use client";

import { useQuery, gql } from "@apollo/client";

const DASHBOARD_DATA = gql`
  query DashboardData {
    allOrders(page: 1, perPage: 100) {
      id
      status
      total
      createdAt
      buyer {
        name
        email
      }
      items {
        lineTotal
        vendor {
          name
        }
      }
      payouts {
        netAmount
        platformFee
        status
      }
    }
    allVendors {
      id
      name
      status
      products {
        id
      }
    }
  }
`;

function getAdminToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("cartplex_token") ?? "";
}

export default function AdminDashboard() {
  const { data, loading } = useQuery(DASHBOARD_DATA, {
    context: { headers: { Authorization: `Bearer ${getAdminToken()}` } },
  });

  const orders = data?.allOrders ?? [];
  const vendors = data?.allVendors ?? [];

  const gmv = orders.reduce((sum: number, o: any) => sum + Number(o.total), 0);
  const platformFees = orders.reduce(
    (sum: number, o: any) =>
      sum +
      o.payouts.reduce((s: number, p: any) => s + Number(p.platformFee), 0),
    0,
  );
  const paidOrders = orders.filter((o: any) => o.status === "PAID").length;
  const approvedVendors = vendors.filter(
    (v: any) => v.status === "APPROVED",
  ).length;

  const recentOrders = [...orders]
    .sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 8);

  const STATUS_COLOR: Record<string, string> = {
    PENDING_PAYMENT: "bg-yellow-100 text-yellow-700",
    PAID: "bg-green-100 text-green-700",
    FULFILLING: "bg-blue-100 text-blue-700",
    SHIPPED: "bg-purple-100 text-purple-700",
    DELIVERED: "bg-gray-100 text-gray-700",
    CANCELLED: "bg-red-100 text-red-700",
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-8">Dashboard</h1>
        <div className="grid grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-gray-400">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          {
            label: "Gross Revenue",
            value: `$${gmv.toFixed(2)}`,
            sub: "All time GMV",
            color: "text-gray-900",
          },
          {
            label: "Platform Fees",
            value: `$${platformFees.toFixed(2)}`,
            sub: "10% of GMV",
            color: "text-green-600",
          },
          {
            label: "Paid Orders",
            value: paidOrders,
            sub: `${orders.length} total`,
            color: "text-blue-600",
          },
          {
            label: "Active Vendors",
            value: approvedVendors,
            sub: `${vendors.length} total`,
            color: "text-purple-600",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
            <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-400 mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold">Recent Orders</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-6 py-3 text-left">Order ID</th>
                <th className="px-6 py-3 text-left">Buyer</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Total</th>
                <th className="px-6 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentOrders.map((order: any) => (
                <tr
                  key={order.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 font-mono text-xs text-gray-500">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">
                      {order.buyer?.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {order.buyer?.email}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[order.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {order.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold">
                    ${Number(order.total).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

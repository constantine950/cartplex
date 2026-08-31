"use client";

import { useQuery, gql } from "@apollo/client";
import Link from "next/link";

const VENDOR_OVERVIEW = gql`
  query VendorOverview {
    me {
      name
      vendor {
        id
        name
        slug
        status
        stripeOnboardingDone
        products {
          id
          name
          isActive
          avgRating
          variants {
            inventoryCount
          }
        }
      }
    }
    myPayouts {
      id
      grossAmount
      platformFee
      netAmount
      status
      createdAt
    }
    orders {
      id
      status
      total
      createdAt
      items {
        lineTotal
        quantity
        vendor {
          id
        }
      }
    }
  }
`;

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("cartplex_token") ?? "";
}

export default function VendorDashboardPage() {
  const { data, loading } = useQuery(VENDOR_OVERVIEW, {
    context: {
      headers: {
        Authorization: `Bearer ${typeof window !== "undefined" ? (localStorage.getItem("cartplex_token") ?? "") : ""}`,
      },
    },
  });

  const vendor = data?.me?.vendor;
  const products = vendor?.products ?? [];
  const payouts = data?.myPayouts ?? [];
  const orders = data?.orders ?? [];

  const totalRevenue = payouts
    .filter((p: any) => p.status === "COMPLETED")
    .reduce((sum: number, p: any) => sum + Number(p.netAmount), 0);

  const pendingPayouts = payouts
    .filter((p: any) => p.status === "PENDING")
    .reduce((sum: number, p: any) => sum + Number(p.netAmount), 0);

  const totalStock = products.reduce(
    (sum: number, p: any) =>
      sum + p.variants.reduce((s: number, v: any) => s + v.inventoryCount, 0),
    0,
  );

  const lowStockProducts = products.filter((p: any) =>
    p.variants.some((v: any) => v.inventoryCount <= 5 && v.inventoryCount > 0),
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-28 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-4">🔒</p>
        <h2 className="text-xl font-bold mb-2">Vendor access required</h2>
        <p className="text-gray-500 mb-6">
          Please sign in with a vendor account.
        </p>
        <button
          onClick={() => {
            const token = prompt("Paste your vendor JWT token:");
            if (token) {
              localStorage.setItem("cartplex_token", token);
              window.location.reload();
            }
          }}
          className="bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          Set vendor token
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{vendor.name}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {vendor.status === "APPROVED" ? "✓ Approved vendor" : vendor.status}
          </p>
        </div>
        <Link
          href={`/vendor/${vendor.slug}`}
          className="text-sm border border-gray-200 px-4 py-2 rounded-lg hover:border-gray-400 transition-colors"
        >
          View storefront →
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        {[
          {
            label: "Net Revenue",
            value: `$${totalRevenue.toFixed(2)}`,
            sub: "Completed payouts",
            color: "text-green-600",
          },
          {
            label: "Pending",
            value: `$${pendingPayouts.toFixed(2)}`,
            sub: "Awaiting transfer",
            color: "text-yellow-600",
          },
          {
            label: "Products",
            value: products.length,
            sub: `${products.filter((p: any) => p.isActive).length} active`,
            color: "text-blue-600",
          },
          {
            label: "Total Stock",
            value: totalStock,
            sub: `${lowStockProducts.length} low stock`,
            color: "text-gray-900",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
          >
            <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Low stock alert */}
      {lowStockProducts.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-orange-700 mb-2">
            ⚡ Low stock alert — {lowStockProducts.length} product
            {lowStockProducts.length !== 1 ? "s" : ""} running low
          </p>
          <ul className="space-y-1">
            {lowStockProducts.map((p: any) => (
              <li key={p.id} className="text-sm text-orange-600">
                {p.name}
              </li>
            ))}
          </ul>
          <Link
            href="/vendor-dashboard/products"
            className="text-xs text-orange-700 underline mt-2 inline-block"
          >
            Manage inventory →
          </Link>
        </div>
      )}

      {/* Stripe onboarding */}
      {!vendor.stripeOnboardingDone && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-blue-700 mb-1">
            💳 Connect Stripe to receive payouts
          </p>
          <p className="text-xs text-blue-600 mb-3">
            Complete Stripe onboarding to start receiving payments directly to
            your bank account.
          </p>
          <button className="text-xs bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-medium">
            Start onboarding
          </button>
        </div>
      )}

      {/* Recent orders */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-sm">Recent Orders</h2>
          <Link
            href="/vendor-dashboard/orders"
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            View all →
          </Link>
        </div>
        {orders.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-400 text-sm">
            No orders yet.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {orders.slice(0, 5).map((order: any) => (
              <div
                key={order.id}
                className="px-5 py-3 flex items-center justify-between text-sm"
              >
                <span className="font-mono text-xs text-gray-400">
                  #{order.id.slice(0, 8).toUpperCase()}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    order.status === "PAID"
                      ? "bg-green-100 text-green-700"
                      : order.status === "PENDING_PAYMENT"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {order.status.replace("_", " ")}
                </span>
                <span className="font-semibold">
                  ${Number(order.total).toFixed(2)}
                </span>
                <span className="text-gray-400 text-xs">
                  {new Date(order.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

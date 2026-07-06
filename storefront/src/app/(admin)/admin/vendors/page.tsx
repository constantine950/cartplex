"use client";

import { useQuery, useMutation, gql } from "@apollo/client";
import { useState } from "react";

const GET_VENDORS = gql`
  query AdminVendors {
    allVendors {
      id
      name
      slug
      status
      stripeOnboardingDone
      createdAt
      products {
        id
      }
      user {
        email
      }
    }
  }
`;

const APPROVE_VENDOR = gql`
  mutation ApproveVendor($vendorId: String!) {
    approveVendor(vendorId: $vendorId) {
      id
      status
    }
  }
`;

const SUSPEND_VENDOR = gql`
  mutation SuspendVendor($vendorId: String!) {
    suspendVendor(vendorId: $vendorId) {
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
  APPROVED: "bg-green-100 text-green-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  SUSPENDED: "bg-red-100 text-red-700",
};

export default function AdminVendors() {
  const [filter, setFilter] = useState<string>("ALL");
  const ctx = {
    context: { headers: { Authorization: `Bearer ${getToken()}` } },
  };

  const { data, loading, refetch } = useQuery(GET_VENDORS, ctx);
  const [approve] = useMutation(APPROVE_VENDOR, {
    ...ctx,
    onCompleted: () => refetch(),
  });
  const [suspend] = useMutation(SUSPEND_VENDOR, {
    ...ctx,
    onCompleted: () => refetch(),
  });

  const vendors = (data?.allVendors ?? []).filter(
    (v: any) => filter === "ALL" || v.status === filter,
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Vendors</h1>
        <div className="flex gap-2">
          {["ALL", "APPROVED", "PENDING", "SUSPENDED"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filter === s
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-6 py-3 text-left">Vendor</th>
              <th className="px-6 py-3 text-left">Email</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Products</th>
              <th className="px-6 py-3 text-left">Stripe</th>
              <th className="px-6 py-3 text-left">Joined</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : (
              vendors.map((vendor: any) => (
                <tr
                  key={vendor.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-900">{vendor.name}</p>
                    <p className="text-xs text-gray-400">/{vendor.slug}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {vendor.user?.email}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[vendor.status]}`}
                    >
                      {vendor.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-700 font-medium">
                    {vendor.products?.length ?? 0}
                  </td>
                  <td className="px-6 py-4">
                    {vendor.stripeOnboardingDone ? (
                      <span className="text-green-600 text-xs">
                        ✓ Connected
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">
                        Not connected
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {new Date(vendor.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {vendor.status !== "APPROVED" && (
                        <button
                          onClick={() =>
                            approve({ variables: { vendorId: vendor.id } })
                          }
                          className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-lg hover:bg-green-200 transition-colors font-medium"
                        >
                          Approve
                        </button>
                      )}
                      {vendor.status !== "SUSPENDED" && (
                        <button
                          onClick={() =>
                            suspend({ variables: { vendorId: vendor.id } })
                          }
                          className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-lg hover:bg-red-200 transition-colors font-medium"
                        >
                          Suspend
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

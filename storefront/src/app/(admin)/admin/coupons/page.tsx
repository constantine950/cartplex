"use client";

import { useQuery, useMutation, gql } from "@apollo/client";
import { useState } from "react";

const GET_COUPONS = gql`
  query AdminCoupons {
    coupons {
      id
      code
      type
      value
      minOrderValue
      usageCount
      usageLimit
      isActive
      expiresAt
      createdAt
    }
  }
`;

const CREATE_COUPON = gql`
  mutation CreateCoupon($input: CreateCouponInput!) {
    createCoupon(input: $input) {
      id
      code
    }
  }
`;

const DISABLE_COUPON = gql`
  mutation DisableCoupon($id: String!) {
    disableCoupon(id: $id) {
      id
      isActive
    }
  }
`;

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("cartplex_token") ?? "";
}

export default function AdminCoupons() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: "",
    type: "PERCENTAGE",
    value: "",
    minOrderValue: "",
    usageLimit: "",
  });

  const ctx = {
    context: { headers: { Authorization: `Bearer ${getToken()}` } },
  };
  const { data, loading, refetch } = useQuery(GET_COUPONS, ctx);
  const [createCoupon, { loading: creating }] = useMutation(CREATE_COUPON, {
    ...ctx,
    onCompleted: () => {
      refetch();
      setShowForm(false);
      setForm({
        code: "",
        type: "PERCENTAGE",
        value: "",
        minOrderValue: "",
        usageLimit: "",
      });
    },
  });
  const [disableCoupon] = useMutation(DISABLE_COUPON, {
    ...ctx,
    onCompleted: () => refetch(),
  });

  const coupons = data?.coupons ?? [];

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createCoupon({
      variables: {
        input: {
          code: form.code.toUpperCase(),
          type: form.type,
          value: parseFloat(form.value),
          minOrderValue: form.minOrderValue
            ? parseFloat(form.minOrderValue)
            : undefined,
          usageLimit: form.usageLimit ? parseInt(form.usageLimit) : undefined,
        },
      },
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Coupons</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          + New Coupon
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-xl border border-gray-100 p-6 mb-6 shadow-sm"
        >
          <h2 className="font-semibold mb-4">Create Coupon</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Code
              </label>
              <input
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                }
                required
                placeholder="SUMMER20"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Type
              </label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, type: e.target.value }))
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
              >
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED_AMOUNT">Fixed Amount</option>
                <option value="FREE_SHIPPING">Free Shipping</option>
                <option value="BOGO">BOGO</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Value {form.type === "PERCENTAGE" ? "(%)" : "($)"}
              </label>
              <input
                type="number"
                value={form.value}
                onChange={(e) =>
                  setForm((f) => ({ ...f, value: e.target.value }))
                }
                required
                min="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Min Order ($)
              </label>
              <input
                type="number"
                value={form.minOrderValue}
                onChange={(e) =>
                  setForm((f) => ({ ...f, minOrderValue: e.target.value }))
                }
                placeholder="Optional"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Usage Limit
              </label>
              <input
                type="number"
                value={form.usageLimit}
                onChange={(e) =>
                  setForm((f) => ({ ...f, usageLimit: e.target.value }))
                }
                placeholder="Unlimited"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              type="submit"
              disabled={creating}
              className="bg-gray-900 text-white text-sm font-medium px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create coupon"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-sm text-gray-500 px-4 py-2 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Coupons table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-6 py-3 text-left">Code</th>
              <th className="px-6 py-3 text-left">Type</th>
              <th className="px-6 py-3 text-left">Value</th>
              <th className="px-6 py-3 text-left">Usage</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : (
              coupons.map((coupon: any) => (
                <tr
                  key={coupon.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 font-mono font-bold text-gray-900">
                    {coupon.code}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {coupon.type.replace("_", " ")}
                  </td>
                  <td className="px-6 py-4 font-medium">
                    {coupon.type === "PERCENTAGE"
                      ? `${coupon.value}%`
                      : coupon.type === "FREE_SHIPPING"
                        ? "Free ship"
                        : `$${Number(coupon.value).toFixed(2)}`}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {coupon.usageCount}
                    {coupon.usageLimit ? `/${coupon.usageLimit}` : ""}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        coupon.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {coupon.isActive ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {coupon.isActive && (
                      <button
                        onClick={() =>
                          disableCoupon({ variables: { id: coupon.id } })
                        }
                        className="text-xs text-red-500 hover:text-red-700 transition-colors"
                      >
                        Disable
                      </button>
                    )}
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

"use client";

import { useQuery, useMutation, gql } from "@apollo/client";
import { useState, useEffect } from "react";

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

export default function AdminCoupons() {
  const [showForm, setShowForm] = useState(false);
  const [token, setToken] = useState("");
  const [form, setForm] = useState({
    code: "",
    type: "PERCENTAGE",
    value: "",
    minOrderValue: "",
    usageLimit: "",
  });

  useEffect(() => {
    setToken(localStorage.getItem("cartplex_token") ?? "");
  }, []);

  const ctx = { context: { headers: { Authorization: `Bearer ${token}` } } };
  const { data, loading, refetch } = useQuery(GET_COUPONS, {
    ...ctx,
    skip: !token,
  });
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

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-xl border border-gray-100 p-6 mb-6 shadow-sm"
        >
          <h2 className="font-semibold mb-4">Create Coupon</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              {
                label: "Code",
                key: "code",
                placeholder: "SUMMER20",
                mono: true,
              },
              {
                label: "Value",
                key: "value",
                placeholder: "10",
                type: "number",
              },
              {
                label: "Min Order ($)",
                key: "minOrderValue",
                placeholder: "Optional",
                type: "number",
              },
              {
                label: "Usage Limit",
                key: "usageLimit",
                placeholder: "Unlimited",
                type: "number",
              },
            ].map((field) => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {field.label}
                </label>
                <input
                  type={field.type ?? "text"}
                  value={(form as any)[field.key]}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      [field.key]:
                        field.key === "code"
                          ? e.target.value.toUpperCase()
                          : e.target.value,
                    }))
                  }
                  placeholder={field.placeholder}
                  className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 ${field.mono ? "font-mono" : ""}`}
                />
              </div>
            ))}
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
            ) : coupons.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                  No coupons yet.
                </td>
              </tr>
            ) : (
              coupons.map((coupon: any) => (
                <tr
                  key={coupon.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 font-mono font-bold">
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
                      className={`text-xs px-2 py-1 rounded-full font-medium ${coupon.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
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
                        className="text-xs text-red-500 hover:text-red-700"
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

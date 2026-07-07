"use client";

import { useQuery, gql } from "@apollo/client";

const MY_PAYOUTS = gql`
  query MyPayouts {
    myPayouts {
      id
      grossAmount
      platformFee
      netAmount
      status
      stripeTransferId
      createdAt
      order {
        id
        total
      }
    }
  }
`;

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("cartplex_token") ?? "";
}

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: "bg-green-100 text-green-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  FAILED: "bg-red-100 text-red-700",
};

export default function VendorPayoutsPage() {
  const { data, loading } = useQuery(MY_PAYOUTS, {
    context: { headers: { Authorization: `Bearer ${getToken()}` } },
  });

  const payouts = data?.myPayouts ?? [];
  const completed = payouts.filter((p: any) => p.status === "COMPLETED");
  const pending = payouts.filter((p: any) => p.status === "PENDING");

  const totalEarned = completed.reduce(
    (sum: number, p: any) => sum + Number(p.netAmount),
    0,
  );
  const totalPending = pending.reduce(
    (sum: number, p: any) => sum + Number(p.netAmount),
    0,
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Payouts</h1>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500 mb-1">Total Earned</p>
          <p className="text-2xl font-bold text-green-600">
            ${totalEarned.toFixed(2)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {completed.length} completed payouts
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500 mb-1">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">
            ${totalPending.toFixed(2)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {pending.length} pending transfers
          </p>
        </div>
      </div>

      {/* Payouts table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-sm">Payout History</h2>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-12 bg-gray-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : payouts.length === 0 ? (
          <div className="px-5 py-12 text-center text-gray-400">
            <p className="text-3xl mb-3">💸</p>
            <p className="text-sm">No payouts yet.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3 text-left">Order</th>
                <th className="px-5 py-3 text-left">Gross</th>
                <th className="px-5 py-3 text-left">Fee (10%)</th>
                <th className="px-5 py-3 text-left">Net</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payouts.map((payout: any) => (
                <tr
                  key={payout.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-5 py-3 font-mono text-xs text-gray-400">
                    #{payout.order?.id?.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-5 py-3">
                    ${Number(payout.grossAmount).toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-gray-400">
                    −${Number(payout.platformFee).toFixed(2)}
                  </td>
                  <td className="px-5 py-3 font-bold">
                    ${Number(payout.netAmount).toFixed(2)}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[payout.status]}`}
                    >
                      {payout.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {new Date(payout.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

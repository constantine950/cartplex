"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/vendor-dashboard", label: "Overview", icon: "📊" },
  { href: "/vendor-dashboard/products", label: "My Products", icon: "📦" },
  { href: "/vendor-dashboard/orders", label: "My Orders", icon: "🛍️" },
  { href: "/vendor-dashboard/payouts", label: "My Payouts", icon: "💸" },
];

export default function VendorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const current = NAV_ITEMS.find((i) => i.href === pathname);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Mobile nav toggle */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="flex items-center gap-2 text-sm font-medium border border-gray-200 px-4 py-2 rounded-lg w-full justify-between"
        >
          <span>
            {current?.icon} {current?.label ?? "Dashboard"}
          </span>
          <span className="text-gray-400">{mobileNavOpen ? "▲" : "▼"}</span>
        </button>
        {mobileNavOpen && (
          <div className="mt-2 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-sm border-b border-gray-50 last:border-0 transition-colors ${
                  pathname === item.href
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-8">
        {/* Desktop sidebar */}
        <aside className="w-52 shrink-0 hidden lg:block">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden sticky top-24">
            <div className="p-4 border-b border-gray-100">
              <p className="font-semibold text-sm">Vendor Dashboard</p>
            </div>
            <nav className="p-2">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    pathname === item.href
                      ? "bg-gray-900 text-white font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}

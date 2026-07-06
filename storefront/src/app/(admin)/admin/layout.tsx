import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <aside className="fixed left-0 top-0 flex min-h-screen w-56 flex-col bg-gray-950 text-white">
          <div className="border-b border-gray-800 p-6">
            <p className="text-lg font-bold">
              Cart<span className="text-gray-400">Plex</span>
            </p>
            <p className="mt-0.5 text-xs text-gray-500">Admin Console</p>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            {[
              { href: "/admin", label: "Dashboard", icon: "📊" },
              { href: "/admin/vendors", label: "Vendors", icon: "🏪" },
              { href: "/admin/orders", label: "Orders", icon: "📦" },
              { href: "/admin/coupons", label: "Coupons", icon: "🎟️" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="border-t border-gray-800 p-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-xs text-gray-500 transition-colors hover:text-gray-300"
            >
              ← Back to store
            </Link>
          </div>
        </aside>

        {/* Main */}
        <main className="ml-56 flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}

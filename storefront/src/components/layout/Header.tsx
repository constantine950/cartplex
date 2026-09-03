"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { CartIcon } from "./CartIcon";
import { SearchBar } from "../search/SearchBar";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";

export function Header() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("cartplex_user");
    if (stored) setUser(JSON.parse(stored));
    window.addEventListener("auth:updated", () => {
      const u = localStorage.getItem("cartplex_user");
      setUser(u ? JSON.parse(u) : null);
    });
  }, []);

  async function handleSignOut() {
    const sessionId = localStorage.getItem("cartplex_session_id");
    if (sessionId) {
      try {
        await fetch("http://localhost:4000/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `mutation { clearCart(sessionId: "${sessionId}") }`,
          }),
        });
      } catch {}
    }
    localStorage.removeItem("cartplex_token");
    localStorage.removeItem("cartplex_user");
    localStorage.removeItem("cartplex_session_id");
    setUser(null);
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    window.dispatchEvent(new Event("cart:updated"));
    toast("Signed out successfully", "info");
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link
            href="/"
            className="flex-shrink-0 font-bold text-xl tracking-tight"
          >
            Cart<span className="text-gray-400">Plex</span>
          </Link>

          {/* Search — hidden on mobile */}
          <div className="hidden md:flex flex-1 max-w-2xl">
            <SearchBar />
          </div>

          {/* Right nav */}
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/search"
              className="hidden md:block text-sm text-gray-600 hover:text-gray-900"
            >
              Browse
            </Link>
            <CartIcon />

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  <div className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {user.name?.[0]?.toUpperCase()}
                  </div>
                  <span className="hidden sm:block">
                    {user.name?.split(" ")[0]}
                  </span>
                </button>

                {dropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-20">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-xs font-medium text-gray-900 truncate">
                          {user.name}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {user.email}
                        </p>
                      </div>

                      {user.role === "BUYER" && (
                        <Link
                          href="/account/orders"
                          onClick={() => setDropdownOpen(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          My Orders
                        </Link>
                      )}
                      {user.role === "VENDOR" && (
                        <Link
                          href="/vendor-dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Vendor Dashboard
                        </Link>
                      )}
                      {user.role === "ADMIN" && (
                        <Link
                          href="/admin"
                          onClick={() => setDropdownOpen(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Admin Console
                        </Link>
                      )}
                      <Link
                        href="/cart"
                        onClick={() => setDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        My Cart
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                href="/account/login"
                className="text-sm font-medium bg-gray-900 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Sign in
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900"
            >
              {mobileMenuOpen ? (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </nav>
        </div>

        {/* Mobile search */}
        <div className="md:hidden pb-3">
          <SearchBar />
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 py-3 space-y-1">
            <Link
              href="/search"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
            >
              Browse products
            </Link>
            {user?.role === "BUYER" && (
              <Link
                href="/account/orders"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
              >
                My Orders
              </Link>
            )}
            {user?.role === "VENDOR" && (
              <Link
                href="/vendor-dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
              >
                Vendor Dashboard
              </Link>
            )}
            {!user && (
              <Link
                href="/account/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-2 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 rounded-lg"
              >
                Sign in
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

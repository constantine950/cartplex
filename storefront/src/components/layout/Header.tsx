"use client";

import Link from "next/link";
import { useState } from "react";
import { CartIcon } from "./CartIcon";
import { SearchBar } from "../search/SearchBar";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

          {/* Nav */}
          <nav className="flex items-center gap-6">
            <Link
              href="/search"
              className="hidden md:block text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Browse
            </Link>
            <CartIcon />
            <Link
              href="/account/login"
              className="hidden md:block text-sm font-medium bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Sign in
            </Link>
          </nav>
        </div>

        {/* Mobile search */}
        <div className="md:hidden pb-3">
          <SearchBar />
        </div>
      </div>
    </header>
  );
}

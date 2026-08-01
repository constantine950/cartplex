"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const CATEGORIES = [
  { name: "Audio", emoji: "🎧", slug: "Audio" },
  { name: "Peripherals", emoji: "⌨️", slug: "Peripherals" },
  { name: "Accessories", emoji: "🔌", slug: "Accessories" },
  { name: "Kitchen", emoji: "☕", slug: "Kitchen" },
  { name: "Decor", emoji: "🕯️", slug: "Decor" },
  { name: "Outerwear", emoji: "🧥", slug: "Outerwear" },
  { name: "Footwear", emoji: "👟", slug: "Footwear" },
  { name: "Bags", emoji: "👜", slug: "Bags" },
];

export default function HomePage() {
  const [sellHref, setSellHref] = useState("/account/vendor-register");

  useEffect(() => {
    const stored = localStorage.getItem("cartplex_user");
    if (stored) {
      const user = JSON.parse(stored);
      if (user.role === "VENDOR") setSellHref("/vendor-dashboard");
      else if (user.role === "ADMIN") setSellHref("/admin");
      else setSellHref("/account/vendor-register");
    }
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="bg-gray-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Shop from independent
            <br />
            <span className="text-gray-400">vendors you trust.</span>
          </h1>
          <p className="text-lg text-gray-400 mb-10 max-w-xl mx-auto">
            CartPlex brings together curated vendors across tech, fashion, and
            home goods — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/search"
              className="bg-white text-gray-900 font-semibold px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Browse all products
            </Link>
            <Link
              href={sellHref}
              className="border border-gray-600 text-white font-semibold px-8 py-3 rounded-lg hover:border-gray-400 transition-colors"
            >
              {sellHref === "/vendor-dashboard"
                ? "Go to dashboard"
                : "Start selling"}
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold mb-8">Shop by category</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/search?category=${encodeURIComponent(cat.slug)}`}
              className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-center group"
            >
              <span className="text-3xl">{cat.emoji}</span>
              <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured vendors */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8">Featured vendors</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                name: "TechGear",
                slug: "techgear",
                desc: "Premium tech accessories and gadgets.",
                emoji: "💻",
              },
              {
                name: "StyleHouse",
                slug: "stylehouse",
                desc: "Trendy fashion for every occasion.",
                emoji: "👗",
              },
              {
                name: "HomeNest",
                slug: "homenest",
                desc: "Beautiful homewares and decor.",
                emoji: "🏡",
              },
            ].map((vendor) => (
              <Link
                key={vendor.slug}
                href={`/vendor/${vendor.slug}`}
                className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-400 hover:shadow-md transition-all group"
              >
                <div className="text-4xl mb-3">{vendor.emoji}</div>
                <h3 className="font-bold text-lg group-hover:text-gray-600 transition-colors">
                  {vendor.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{vendor.desc}</p>
                <p className="text-sm font-medium mt-4 text-gray-900 group-hover:underline">
                  View store →
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to explore?</h2>
        <p className="text-gray-500 mb-8">
          Over 20 products from 3 independent vendors, with more joining every
          day.
        </p>
        <Link
          href="/search"
          className="inline-block bg-gray-900 text-white font-semibold px-8 py-3 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Shop now
        </Link>
      </section>
    </div>
  );
}

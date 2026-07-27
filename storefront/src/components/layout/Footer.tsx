import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <p className="font-bold text-lg mb-2">
              Cart<span className="text-gray-400">Plex</span>
            </p>
            <p className="text-sm text-gray-500">
              A multi-vendor marketplace for independent sellers.
            </p>
          </div>

          <div>
            <p className="font-medium text-sm mb-3">Shop</p>
            <ul className="space-y-2 text-sm text-gray-500">
              <li>
                <Link href="/search" className="hover:text-gray-900">
                  All Products
                </Link>
              </li>
              <li>
                <Link
                  href="/search?category=Audio"
                  className="hover:text-gray-900"
                >
                  Audio
                </Link>
              </li>
              <li>
                <Link
                  href="/search?category=Peripherals"
                  className="hover:text-gray-900"
                >
                  Peripherals
                </Link>
              </li>
              <li>
                <Link
                  href="/search?category=Decor"
                  className="hover:text-gray-900"
                >
                  Home Decor
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="font-medium text-sm mb-3">Sell</p>
            <ul className="space-y-2 text-sm text-gray-500">
              <li>
                <Link href="/vendor/register" className="hover:text-gray-900">
                  Become a Vendor
                </Link>
              </li>
              <li>
                <Link href="/vendor/dashboard" className="hover:text-gray-900">
                  Vendor Dashboard
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="font-medium text-sm mb-3">Support</p>
            <ul className="space-y-2 text-sm text-gray-500">
              <li>
                <Link href="/help" className="hover:text-gray-900">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/returns" className="hover:text-gray-900">
                  Returns
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-gray-900">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-8 pt-8 text-sm text-gray-400 text-center">
          © {new Date().getFullYear()} CartPlex
        </div>
      </div>
    </footer>
  );
}

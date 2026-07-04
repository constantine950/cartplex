"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function OrderConfirmationPage({
  params,
}: {
  params: { id: string };
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setTimeout(() => setShow(true), 100);
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div
        className={`transition-all duration-500 ${
          show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="text-3xl font-bold mb-2">Order confirmed!</h1>
        <p className="text-gray-500 mb-2">Thank you for your purchase.</p>
        <p className="text-sm text-gray-400 mb-8 font-mono bg-gray-50 px-4 py-2 rounded-lg inline-block">
          Order #{params.id.slice(0, 8).toUpperCase()}
        </p>

        <div className="bg-gray-50 rounded-xl p-6 text-left mb-8">
          <h2 className="font-semibold mb-3">What happens next?</h2>
          <ol className="space-y-3 text-sm text-gray-600">
            <li className="flex gap-3">
              <span className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                1
              </span>
              <span>Your payment is being processed by Stripe.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                2
              </span>
              <span>
                Vendors will be notified and begin fulfilling your order.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                3
              </span>
              <span>
                You'll receive shipping updates once your items are dispatched.
              </span>
            </li>
          </ol>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/search"
            className="bg-gray-900 text-white font-semibold px-8 py-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Continue shopping
          </Link>
          <Link
            href="/"
            className="border border-gray-200 text-gray-700 font-semibold px-8 py-3 rounded-lg hover:border-gray-400 transition-colors"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useQuery, gql } from "@apollo/client";
import { useEffect, useState } from "react";

const GET_CART_COUNT = gql`
  query GetCartCount($sessionId: String!) {
    cart(sessionId: $sessionId) {
      itemCount
    }
  }
`;

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("cartplex_session_id");
  if (!id) {
    id = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem("cartplex_session_id", id);
  }
  return id;
}

export function CartIcon() {
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    setSessionId(getSessionId());
  }, []);

  const { data } = useQuery(GET_CART_COUNT, {
    variables: { sessionId },
    skip: !sessionId,
    pollInterval: 5000, // refresh every 5s
  });

  const itemCount = data?.cart?.itemCount ?? 0;

  return (
    <Link
      href="/cart"
      className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
        />
      </svg>
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-gray-900 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      )}
    </Link>
  );
}

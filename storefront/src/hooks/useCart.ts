"use client";

import { useState, useEffect } from "react";

const SESSION_KEY = "cartplex_session_id";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function useCart() {
  const [itemCount, setItemCount] = useState(0);
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    setSessionId(getSessionId());
  }, []);

  // Item count is updated by cart mutations — components call refreshCart
  function refreshCart(count: number) {
    setItemCount(count);
  }

  return { itemCount, sessionId, refreshCart };
}

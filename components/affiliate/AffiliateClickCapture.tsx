"use client";

import { useEffect } from "react";

// Sends one click for an affiliate link when a visitor lands on /shop?ref=CODE. The server decides whether the code is an
// active affiliate link; a referral code or any other value is simply not counted. Nothing is shown to the visitor.
const CODE_SHAPE = /^[A-Za-z0-9-]{6,12}$/;

export function AffiliateClickCapture() {
  useEffect(() => {
    let code = "";
    try {
      code = (new URLSearchParams(window.location.search).get("ref") ?? "").trim();
    } catch {
      return;
    }
    if (!CODE_SHAPE.test(code)) return;
    fetch("/api/shop/affiliate/click", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
      credentials: "same-origin",
      keepalive: true,
    }).catch(() => undefined);
  }, []);
  return null;
}

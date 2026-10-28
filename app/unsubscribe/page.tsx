"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BRAND_NAME } from "@/config/site";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const emailParam = searchParams.get("email") || "";

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (token) {
      fetch(`/api/unsubscribe?token=${encodeURIComponent(token)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.ok && data.email) {
            setEmail(data.email);
          }
        })
        .catch(() => {});
    } else if (emailParam) {
      setEmail(emailParam);
    }
  }, [token, emailParam]);

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email: email || emailParam }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMessage(data.error || "Failed to unsubscribe. Please try again.");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center">
        <h1 className="text-2xl font-black text-white tracking-wider mb-2">
          {BRAND_NAME}
        </h1>
        <p className="text-sm text-slate-400 mb-6">Email Subscription Management</p>

        {status === "success" ? (
          <div className="bg-emerald-950/50 border border-emerald-800 text-emerald-300 p-6 rounded-2xl mb-6">
            <h2 className="text-lg font-bold mb-2">Unsubscribed Successfully</h2>
            <p className="text-xs text-emerald-400 leading-relaxed">
              Your email address has been removed from GLOW VAI marketing updates. Transactional order updates will still be delivered if you place future orders.
            </p>
          </div>
        ) : (
          <form onSubmit={handleUnsubscribe} className="space-y-4">
            <div className="text-left">
              <label htmlFor="unsub-email" className="block text-xs font-semibold text-slate-300 mb-1">
                Email Address
              </label>
              <input
                id="unsub-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            {status === "error" && (
              <p className="text-xs text-rose-400 text-left bg-rose-950/40 p-3 rounded-lg border border-rose-900">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-lg active:scale-98"
            >
              {status === "submitting" ? "Processing..." : "Confirm Unsubscribe"}
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-slate-800 flex justify-center gap-4 text-xs text-slate-400">
          <Link href="/" className="hover:text-blue-400 transition-colors">
            Return to Store
          </Link>
          <span>|</span>
          <Link href="/privacy" className="hover:text-blue-400 transition-colors">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading...</div>}>
      <UnsubscribeContent />
    </Suspense>
  );
}

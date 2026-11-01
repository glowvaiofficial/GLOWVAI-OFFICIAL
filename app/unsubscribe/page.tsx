"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Section, Eyebrow, focusRing } from "@/components/home/shared";

const input =
  "w-full min-h-[52px] px-4 text-[17px] text-ink bg-white border-[1.5px] border-ink/30 rounded-[10px] placeholder:text-ink-light focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/20";

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
        setErrorMessage(data.error || "We could not unsubscribe you. Please try again.");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Please try again.");
    }
  };

  return (
    <div className="bg-paper text-ink">
      <Section pad="md" labelledBy="unsub-title">
        <div className="max-w-[560px]">
          <Eyebrow>Email preferences</Eyebrow>
          <h1 id="unsub-title" className="mt-4 font-display font-semibold text-[clamp(2.5rem,1.6rem+4.5vw,4.5rem)] leading-[1] tracking-[-0.03em]">
            Unsubscribe.
          </h1>

          {status === "success" ? (
            <div role="status" className="mt-10 border border-ink/20 bg-white rounded-[24px] p-6 sm:p-8 space-y-3">
              <p className="font-display font-semibold text-2xl">You are unsubscribed.</p>
              <p className="text-[17px] text-ink-muted">
                Your email has been removed from GLOW VAI marketing emails. Order updates about any orders you place will still be sent.
              </p>
            </div>
          ) : (
            <form onSubmit={handleUnsubscribe} noValidate className="mt-10 space-y-5 border border-ink/15 bg-white rounded-[24px] p-6 sm:p-8">
              <div>
                <label htmlFor="unsub-email" className="block text-sm font-semibold">Email address</label>
                <input
                  id="unsub-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  aria-invalid={status === "error"}
                  aria-describedby={status === "error" ? "unsub-error" : undefined}
                  className={`${input} mt-2`}
                />
              </div>

              {status === "error" && (
                <p id="unsub-error" role="alert" className="text-[15px] text-[#9B1C1C]">
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={status === "submitting"}
                className={`w-full min-h-[52px] rounded-[10px] bg-brand text-white font-semibold hover:bg-brand-dark disabled:opacity-50 ${focusRing}`}
              >
                {status === "submitting" ? "Processing…" : "Unsubscribe"}
              </button>
            </form>
          )}

          <p className="mt-8 text-ink-muted">
            <Link href="/" className={`underline underline-offset-4 decoration-ink/30 hover:decoration-ink rounded ${focusRing}`}>
              Back to the home page
            </Link>
            {" · "}
            <Link href="/privacy" className={`underline underline-offset-4 decoration-ink/30 hover:decoration-ink rounded ${focusRing}`}>
              Privacy policy
            </Link>
          </p>
        </div>
      </Section>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div className="bg-paper min-h-[50vh] p-10 text-ink-muted">Loading…</div>}>
      <UnsubscribeContent />
    </Suspense>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Accent } from "@/components/ui/Accent";
import { Button } from "@/components/ui/Button";
import { Camera, ArrowRight, CheckCircle2, AlertCircle, Mail } from "lucide-react";
import { submitPublicForm, normalizePhone } from "@/lib/forms/submit";

export function FinalCTABanner() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(""); // Honeypot
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!consent) {
      setErrorMsg("Please check the consent box to receive emails.");
      return;
    }

    if (!email || !email.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setStatus("loading");

    try {
      const ok = await submitPublicForm("Newsletter", {
        email,
        source: "final-cta",
        consent: consent ? "yes" : "no",
        website,
      });

      if (!ok) throw new Error("Subscription failed");

      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMsg("Unable to subscribe right now. Please try again.");
    }
  };

  return (
    <section id="newsletter" className="py-12 sm:py-20 bg-white">
      <Container>
        {/* Electric Blue Banner */}
        <div className="bg-brand text-white rounded-[40px] pt-16 sm:pt-24 pb-20 sm:pb-24 px-6 sm:px-12 text-center relative overflow-hidden shadow-2xl">
          
          {/* Decorative Sky Mist Organic Shapes at 15% opacity */}
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-skymist opacity-15 pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-yellow opacity-15 pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto space-y-6">
            <h2 className="font-display font-bold text-3xl sm:text-5xl lg:text-6xl text-white leading-tight">
              Ready to <Accent className="text-yellow">know</Accent> your skin?
            </h2>

            <p className="text-base sm:text-xl text-white/85 max-w-xl mx-auto leading-relaxed">
              Take a 30-second scan right in your browser. Get a plain-language report and matching formulas delivered fast.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-4">
              <Link href="/face-analysis">
                <Button
                  variant="primary"
                  size="lg"
                  className="h-[52px] px-8 text-button-label gap-2 shadow-coral-glow"
                >
                  <Camera className="w-5 h-5 text-ink shrink-0" />
                  <span>Start free scan</span>
                </Button>
              </Link>
              <Link href="/shop">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-[52px] px-8 text-button-label border-white text-white hover:bg-white/10 gap-2"
                >
                  <span>Shop now</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </Button>
              </Link>
            </div>

            <p className="text-xs text-skymist/90 font-medium pt-2">
              Free. No photo stored.
            </p>
          </div>

          {/* Newsletter Form Panel Overlapping Banner Bottom Edge */}
          <div className="mt-12 sm:mt-16 -mb-28 sm:-mb-32 relative z-20 max-w-xl mx-auto bg-white text-ink p-6 sm:p-8 rounded-3xl shadow-xl border border-ink/10 text-left">
            <div className="space-y-1 mb-4">
              <h3 className="font-display font-bold text-lg sm:text-xl text-ink flex items-center gap-2">
                <Mail className="w-5 h-5 text-brand shrink-0" />
                <span>Skin tips, once in a while.</span>
              </h3>
              <p className="text-xs text-ink-muted">
                No spam. Unsubscribe any time.
              </p>
            </div>

            {status === "success" ? (
              <div className="bg-mint text-ink p-4 rounded-2xl border border-mint text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-ink shrink-0" />
                <span>You&apos;re in. Check your inbox.</span>
              </div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="space-y-3">
                {/* Honeypot */}
                <input
                  type="text"
                  name="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="hidden"
                  tabIndex={-1}
                  autoComplete="off"
                />

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-2xl border border-ink/20 text-xs focus:border-brand focus:outline-none"
                  />
                  <Button
                    variant="primary"
                    size="md"
                    type="submit"
                    disabled={status === "loading"}
                    className="shadow-coral-glow shrink-0 text-button-label"
                  >
                    {status === "loading" ? "Subscribing..." : "Subscribe"}
                  </Button>
                </div>

                <label className="flex items-start gap-2 text-[11px] text-ink-muted cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    required
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 rounded text-brand focus:ring-brand"
                  />
                  <span>
                    I agree to receive emails from Glow Vai. Read our{" "}
                    <Link href="/privacy" className="underline hover:text-brand">
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>

                {errorMsg && (
                  <div
                    aria-live="polite"
                    className="bg-blush text-ink p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border border-coral/30"
                  >
                    <AlertCircle className="w-4 h-4 text-coral shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}
              </form>
            )}
          </div>

        </div>
      </Container>
    </section>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Accent } from "@/components/ui/Accent";
import { Lock, Unlock, Mail, Sparkles, CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";
import { submitPublicForm, normalizePhone } from "@/lib/forms/submit";

interface ShopUnlockGateProps {
  children: React.ReactNode;
}

export function ShopUnlockGate({ children }: ShopUnlockGateProps) {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setIsHydrated(true);
    const unlocked = sessionStorage.getItem("gv_shop_unlocked");
    if (unlocked === "true") {
      setIsUnlocked(true);
    }
  }, []);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email || !email.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    if (!consent) {
      setErrorMsg("Please accept the terms to proceed.");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitPublicForm("Newsletter", { email, source: "shop-unlock", consent: "yes" });

      sessionStorage.setItem("gv_shop_unlocked", "true");
      setIsUnlocked(true);
    } catch {
      sessionStorage.setItem("gv_shop_unlocked", "true");
      setIsUnlocked(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isHydrated) {
    return <>{children}</>;
  }

  if (isUnlocked) {
    return (
      <div className="relative">
        {/* VIP Early Access Unlocked Banner */}
        <div className="bg-mint text-ink py-2.5 px-4 text-center text-xs font-bold flex items-center justify-center gap-2 border-b border-mint">
          <Sparkles className="w-4 h-4 text-ink shrink-0" />
          <span>VIP Early Access Open! Use code <strong>GLOW15</strong> at checkout for 15% off.</span>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="relative min-h-[85vh] overflow-hidden">
      {/* Semi-Transparent Blurred Background Content */}
      <div className="filter blur-md pointer-events-none select-none opacity-40 transition-all duration-500">
        {children}
      </div>

      {/* Glassmorphism Lock Overlay */}
      <div className="absolute inset-0 z-30 flex items-center justify-center p-4 sm:p-6 bg-ink/75 backdrop-blur-md animate-in fade-in duration-300">
        <div className="max-w-md w-full bg-white/95 text-ink p-8 sm:p-10 rounded-[32px] shadow-2xl border border-white/40 text-center space-y-6 relative overflow-hidden">
          
          {/* Decorative Glow */}
          <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-brand/10 pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-36 h-36 rounded-full bg-yellow/20 pointer-events-none" />

          {/* Lock Badge */}
          <div className="w-14 h-14 rounded-2xl bg-skymist flex items-center justify-center text-brand mx-auto shadow-xs border border-brand/20">
            <Lock className="w-7 h-7 text-brand animate-pulse" />
          </div>

          <div className="space-y-2">
            <Badge variant="brand" size="md">
              VIP Early Access Only
            </Badge>
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-ink leading-tight">
              Get into the <Accent>GLOW VAI</Accent> Shop
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed max-w-sm mx-auto">
              Drop your email address below to reveal catalog prices, early access stock allocations, and get an instant 15% discount.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-3 pt-2">
            <div className="relative">
              <input
                type="email"
                required
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl border-2 border-ink/15 text-xs font-semibold focus:border-brand focus:outline-none pr-10"
              />
              <Mail className="w-4 h-4 text-ink-muted absolute right-4 top-4" />
            </div>

            <label className="flex items-start gap-2 text-[11px] text-ink-muted text-left cursor-pointer">
              <input
                type="checkbox"
                required
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 rounded text-brand focus:ring-brand"
              />
              <span>I agree to receive VIP early access updates and discounts from Glow Vai.</span>
            </label>

            {errorMsg && (
              <div className="bg-blush text-ink p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border border-coral/30">
                <AlertCircle className="w-4 h-4 text-coral shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              type="submit"
              disabled={isSubmitting}
              className="w-full  text-button-label gap-2"
            >
              <Unlock className="w-4 h-4 text-ink shrink-0" />
              <span>{isSubmitting ? "Opening..." : "Get Shop Access"}</span>
            </Button>
          </form>

          <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-ink-muted border-t border-ink/10">
            <ShieldCheck className="w-4 h-4 text-brand shrink-0" />
            <span>Instant Access • Zero Spam • Complete Privacy</span>
          </div>

        </div>
      </div>
    </div>
  );
}

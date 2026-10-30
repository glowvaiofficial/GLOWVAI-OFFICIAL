"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Accent } from "@/components/ui/Accent";
import { Lock, Unlock, Mail, ScanLine, CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";
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
        <div className="bg-paper-deep text-ink py-3 px-4 text-center text-sm font-medium flex items-center justify-center gap-2 border-b border-ink/15">
          <ScanLine className="w-4 h-4 text-ink shrink-0" />
          <span>VIP Early Access Open! Use code <strong>GLOW15</strong> at checkout for 15% off.</span>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="relative min-h-[85vh] overflow-hidden">
      {/* Semi-Transparent Blurred Background Content */}
      <div className="pointer-events-none select-none opacity-30" aria-hidden="true">
        {children}
      </div>

      {/* Glassmorphism Lock Overlay */}
      <div className="absolute inset-0 z-30 flex items-center justify-center p-4 sm:p-6 bg-paper/85">
        <div className="max-w-md w-full bg-white text-ink p-8 sm:p-10 rounded-[24px] border border-ink/15 text-center space-y-6">
          
          {/* Lock Badge */}
          <div className="w-14 h-14 rounded-[10px] bg-paper flex items-center justify-center text-brand mx-auto border border-ink/15">
            <Lock className="w-7 h-7 text-brand" />
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
                className="w-full min-h-[52px] px-4 pr-10 rounded-[10px] border-[1.5px] border-ink/30 text-[15px] font-medium focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/20"
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
              <div role="alert" className="bg-paper text-ink p-3 rounded-[10px] text-sm font-medium flex items-center gap-2 border border-ink/20">
                <AlertCircle className="w-4 h-4 text-coral shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              type="submit"
              disabled={isSubmitting}
              className="w-full  gv-btn-label gap-2"
            >
              <Unlock className="w-4 h-4 text-ink shrink-0" />
              <span>{isSubmitting ? "Opening..." : "Get Shop Access"}</span>
            </Button>
          </form>

          <div className="pt-4 flex items-center justify-center gap-2 text-[13px] text-ink-muted border-t border-ink/15">
            <ShieldCheck className="w-4 h-4 text-brand shrink-0" />
            <span>Instant Access • Zero Spam • Complete Privacy</span>
          </div>

        </div>
      </div>
    </div>
  );
}

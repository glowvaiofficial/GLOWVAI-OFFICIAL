"use client";

import { useEffect } from "react";
import { referralCodeFromLink, savePendingReferral } from "@/lib/shop/growth/pendingReferral";

/**
 * ReferralCapture: reads the ref (or partnerId, driverId, studentId) query value on any page load.
 *
 * - A customer's referral code (the share link glowvai.in/shop?ref=CODE) is kept on this device until the visitor signs
 *   in with a phone account; the shop then applies it once through /api/shop/referral/apply (see
 *   glowvai-app/features/profile/pendingReferral.ts). Affiliate links use the same ?ref= value: the shop page still sends
 *   it as an affiliate click (AffiliateClickCapture), and the server decides which kind of code it is.
 * - An old partner id (GLV-AUTO-..., GLV-STUDENT-...) is stored for the referral portal as before.
 */
export function ReferralCapture() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    let params: URLSearchParams;
    try {
      params = new URLSearchParams(window.location.search);
    } catch {
      return;
    }
    const ref =
      params.get("ref") ||
      params.get("partnerId") ||
      params.get("driverId") ||
      params.get("studentId");
    if (!ref || !ref.trim()) return;

    try {
      const code = params.get("ref") ? referralCodeFromLink(params.get("ref")) : "";
      if (code) {
        savePendingReferral(window.localStorage, code, Date.now());
        return;
      }

      // Only store if not already set (don't overwrite an existing session partner)
      const existing = localStorage.getItem("v_partner_id");
      if (!existing) {
        localStorage.setItem("v_partner_id", ref.trim());
        localStorage.setItem("v_referred_at", new Date().toISOString());
        // Attempt to infer category from ID prefix
        if (ref.startsWith("GLV-STUDENT")) {
          localStorage.setItem("v_partner_category", "STUDENT");
          localStorage.setItem("v_partner_name", "Campus Ambassador");
          localStorage.setItem("v_partner_meta", "Student Ambassador");
        } else {
          localStorage.setItem("v_partner_category", "DRIVER");
          localStorage.setItem("v_partner_name", "Auto Partner");
          localStorage.setItem("v_partner_meta", "Auto Partner");
        }
      }
    } catch {
      // Storage blocked: the link is not remembered.
    }
  }, []);

  return null;
}

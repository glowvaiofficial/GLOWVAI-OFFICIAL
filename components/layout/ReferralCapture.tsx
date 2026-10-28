"use client";

import React, { useEffect } from "react";

/**
 * ReferralCapture: intercepts ?ref= query param on ANY page load
 * and stores it in localStorage so the referral portal can credit it
 * even if the user lands on the homepage (not /referral directly).
 */
export function ReferralCapture() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref =
      params.get("ref") ||
      params.get("partnerId") ||
      params.get("driverId") ||
      params.get("studentId");

    if (ref && ref.trim()) {
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
    }
  }, []);

  return null;
}

"use client";

import React, { useState } from "react";
import { dataRequestSchema } from "@/lib/schemas";
import { Button } from "@/components/ui/Button";
import { CheckCircle2 } from "lucide-react";
import { submitPublicForm, normalizePhone } from "@/lib/forms/submit";

export function DataRequestForm() {
  const [dataReq, setDataReq] = useState({
    contact: "",
    type: "delete" as "delete" | "access" | "withdraw_consent",
    details: "",
    website: "",
  });
  const [reqStatus, setReqStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [reqError, setReqError] = useState("");

  const handleDataRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReqError("");

    const validated = dataRequestSchema.safeParse(dataReq);
    if (!validated.success) {
      setReqError("Please enter a valid phone number or email address.");
      return;
    }

    setReqStatus("loading");
    try {
      const ok = await submitPublicForm("DataRequests", {
        contact: dataReq.contact.includes("@") ? dataReq.contact.trim() : normalizePhone(dataReq.contact),
        type: dataReq.type,
        website: dataReq.website,
      });

      if (!ok) throw new Error("Request failed");
      setReqStatus("success");
    } catch {
      setReqStatus("error");
      setReqError("Failed to submit request. Please try again or email us directly.");
    }
  };

  return (
    <div className="space-y-4">
      {reqStatus === "success" ? (
        <div className="bg-mint text-ink p-4 rounded-2xl border border-mint text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-ink shrink-0" />
          <span>Request received. We will process it within statutory timeframes (7 days).</span>
        </div>
      ) : (
        <form onSubmit={handleDataRequestSubmit} className="space-y-3 bg-white p-4 rounded-2xl border border-ink/10">
          {/* Honeypot */}
          <input
            type="text"
            name="website"
            value={dataReq.website}
            onChange={(e) => setDataReq({ ...dataReq, website: e.target.value })}
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
          />

          <div className="space-y-1">
            <label className="block text-xs font-bold text-ink">Phone or Email *</label>
            <input
              type="text"
              required
              placeholder="Enter phone or email associated with your scan"
              value={dataReq.contact}
              onChange={(e) => setDataReq({ ...dataReq, contact: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-ink/20 text-xs focus:outline-none focus:border-brand"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-ink">Request Type *</label>
            <select
              value={dataReq.type}
              onChange={(e) => setDataReq({ ...dataReq, type: e.target.value as any })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-ink/20 text-xs focus:outline-none focus:border-brand bg-white font-semibold"
            >
              <option value="delete">Erasure (Delete My Data & Photos)</option>
              <option value="withdraw_consent">Withdraw Consent</option>
              <option value="access">Access Data Summary</option>
            </select>
          </div>

          {reqError && (
            <p className="text-xs text-coral font-bold">{reqError}</p>
          )}

          <Button
            variant="primary"
            size="sm"
            type="submit"
            disabled={reqStatus === "loading"}
            className="w-full "
          >
            {reqStatus === "loading" ? "Submitting..." : "Submit Data Request"}
          </Button>
        </form>
      )}
    </div>
  );
}

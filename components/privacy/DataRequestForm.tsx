"use client";

import React, { useState } from "react";
import { dataRequestSchema } from "@/lib/schemas";
import { submitPublicForm, normalizePhone } from "@/lib/forms/submit";
import { focusRing } from "@/components/home/shared";
import { Check } from "lucide-react";

const input =
  "w-full min-h-[52px] px-4 text-[17px] text-ink bg-white border-[1.5px] border-ink/30 rounded-[10px] placeholder:text-ink-light focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/20";

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
      setReqError("We could not send your request. Please try again, or email contact@glowvai.in.");
    }
  };

  if (reqStatus === "success") {
    return (
      <div role="status" className="flex items-start gap-3 rounded-[10px] border border-ink/20 bg-white p-5 text-[17px]">
        <Check className="w-5 h-5 text-brand shrink-0 mt-0.5" aria-hidden="true" />
        <p>Request received. We will process it within the statutory timeframe of 7 days.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleDataRequestSubmit} noValidate className="space-y-5 border border-ink/15 bg-white rounded-[24px] p-6 sm:p-8">
      {/* Honeypot: hidden from people, filled by bots */}
      <div className="hidden" aria-hidden="true">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" value={dataReq.website} onChange={(e) => setDataReq({ ...dataReq, website: e.target.value })} />
      </div>

      <div>
        <label htmlFor="dr-contact" className="block text-sm font-semibold">Phone or email</label>
        <input
          id="dr-contact"
          type="text"
          required
          placeholder="The phone or email you used for your scan"
          value={dataReq.contact}
          onChange={(e) => setDataReq({ ...dataReq, contact: e.target.value })}
          aria-invalid={!!reqError}
          aria-describedby={reqError ? "dr-error" : undefined}
          className={`${input} mt-2`}
        />
      </div>

      <div>
        <label htmlFor="dr-type" className="block text-sm font-semibold">What do you want to do?</label>
        <select id="dr-type" value={dataReq.type} onChange={(e) => setDataReq({ ...dataReq, type: e.target.value as typeof dataReq.type })} className={`${input} mt-2`}>
          <option value="delete">Delete my data and photos</option>
          <option value="withdraw_consent">Withdraw my consent</option>
          <option value="access">See a summary of my data</option>
        </select>
      </div>

      {reqError && (
        <p id="dr-error" role="alert" className="text-[15px] text-[#9B1C1C]">
          {reqError}
        </p>
      )}

      <button
        type="submit"
        disabled={reqStatus === "loading"}
        className={`w-full min-h-[52px] rounded-[10px] bg-brand text-white font-semibold hover:bg-brand-dark disabled:opacity-50 ${focusRing}`}
      >
        {reqStatus === "loading" ? "Sending…" : "Send request"}
      </button>
    </form>
  );
}

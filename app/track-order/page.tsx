"use client";

import React, { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Section } from "@/components/home/shared";
import { InfoHero } from "@/components/pages/InfoPage";
import { Button } from "@/components/ui/Button";
import { emailFor } from "@/config/emails";

const input =
  "w-full min-h-[52px] px-4 text-[17px] text-ink bg-white border-[1.5px] border-ink/30 rounded-[10px] placeholder:text-ink-light focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/20";

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState("");
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);
  const valid = orderId.trim().length >= 3 && /^\d{10}$/.test(phone);

  const text = encodeURIComponent(`Hello GLOW VAI, please share the status of my order ${orderId.trim()}. Phone: ${phone}`);

  return (
    <div className="bg-paper text-ink">
      <InfoHero
        id="track-title"
        eyebrow="Track order"
        title="Where is my order?"
        intro="Enter your order number and phone number. We reply on WhatsApp with the live status from the store and rider."
      />
      <Section pad="tight">
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            window.open(`https://wa.me/918977855998?text=${text}`, "_blank", "noopener,noreferrer");
            setSent(true);
          }}
          className="max-w-[560px] bg-white border border-ink/15 rounded-[24px] p-6 sm:p-8"
        >
          <label htmlFor="order-id" className="block text-sm font-semibold">Order number</label>
          <input
            id="order-id"
            value={orderId}
            onChange={(e) => {
              setOrderId(e.target.value);
              setSent(false);
            }}
            placeholder="From your order message"
            className={`${input} mt-2`}
            autoComplete="off"
          />
          <label htmlFor="order-phone" className="mt-5 block text-sm font-semibold">Phone number (10 digits)</label>
          <input
            id="order-phone"
            inputMode="numeric"
            maxLength={10}
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value.replace(/\D/g, ""));
              setSent(false);
            }}
            placeholder="9876543210"
            className={`${input} mt-2`}
            autoComplete="tel-national"
          />
          <Button type="submit" variant="primary" size="lg" disabled={!valid} className="mt-6 w-full">
            <MessageCircle className="w-5 h-5" aria-hidden="true" />
            <span>Check status on WhatsApp</span>
          </Button>
          <p role="status" aria-live="polite" className="mt-3 min-h-6 text-[15px] text-ink-muted">
            {sent ? "WhatsApp opened with your details. We reply on working days." : ""}
          </p>
        </form>
        <p className="mt-6 text-ink-muted max-w-[56ch]">
          Problem with an order? Write to{" "}
          <a className="underline underline-offset-4" href={`mailto:${emailFor("support")}`}>
            {emailFor("support")}
          </a>
          .
        </p>
      </Section>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { submitPublicForm, normalizePhone } from "@/lib/forms/submit";
import { Section, Eyebrow, focusRing } from "@/components/home/shared";
import { siteConfig } from "@/config/site";
import { complianceConfig } from "@/config/compliance";
import { contactFormSchema } from "@/lib/schemas";
import { Check, Mail, Phone } from "lucide-react";

const input =
  "w-full min-h-[52px] px-4 text-[17px] text-ink bg-white border-[1.5px] border-ink/30 rounded-[10px] placeholder:text-ink-light focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/20";

const label = "block text-sm font-semibold text-ink";
const err = "mt-1 text-sm text-[#9B1C1C]";

export function ContactClient() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    topic: "scan" as "order" | "scan" | "product" | "press" | "other",
    message: "",
    consent: false,
    website: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validated = contactFormSchema.safeParse(form);
    if (!validated.success) {
      const errMap: Record<string, string> = {};
      validated.error.issues.forEach((i) => {
        if (i.path[0]) errMap[i.path[0].toString()] = i.message;
      });
      setErrors(errMap);
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await submitPublicForm("Contact", {
        name: form.name,
        email: form.email,
        phone: normalizePhone(form.phone),
        topic: form.topic,
        message: form.message,
        website: form.website,
      });

      if (!ok) throw new Error("Submission failed");
      setSuccess(true);
    } catch {
      setErrors({ form: "Could not send your message. Please try again, or email us directly." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasGrievanceInfo = Boolean(complianceConfig.grievanceOfficerName || complianceConfig.grievanceOfficerEmail);

  return (
    <div className="bg-paper text-ink">
      <Section pad="md" labelledBy="contact-title">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-12">
          <div className="lg:col-span-5">
            <Eyebrow>Get in touch</Eyebrow>
            <h1 id="contact-title" className="mt-4 font-display font-semibold text-[clamp(2.5rem,1.6rem+4.5vw,5rem)] leading-[1] tracking-[-0.03em]">
              We reply on working days.
            </h1>
            <p className="mt-6 text-[clamp(1.0625rem,1rem+0.4vw,1.25rem)] leading-[1.5] text-ink-muted max-w-[40ch]">
              Ask about your scan report, a routine, or an order. Tell us what you need and we will reply.
            </p>

            <ul className="mt-10 border-t border-ink/20">
              {siteConfig.supportEmail && siteConfig.supportEmail.trim() !== "" && (
                <li className="flex items-start gap-4 py-5 border-b border-ink/20">
                  <Mail className="w-5 h-5 text-brand shrink-0 mt-1" aria-hidden="true" />
                  <div>
                    <p className="font-semibold">Email</p>
                    <a href={`mailto:${siteConfig.supportEmail}`} className={`text-[17px] text-ink-muted underline underline-offset-4 decoration-ink/30 hover:decoration-ink rounded ${focusRing}`}>
                      {siteConfig.supportEmail}
                    </a>
                  </div>
                </li>
              )}
              {siteConfig.phone && siteConfig.phone.trim() !== "" && (
                <li className="flex items-start gap-4 py-5 border-b border-ink/20">
                  <Phone className="w-5 h-5 text-brand shrink-0 mt-1" aria-hidden="true" />
                  <div>
                    <p className="font-semibold">Phone and WhatsApp</p>
                    <a
                      href={`https://wa.me/${siteConfig.phone.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-[17px] text-ink-muted underline underline-offset-4 decoration-ink/30 hover:decoration-ink rounded ${focusRing}`}
                    >
                      {siteConfig.phone}
                    </a>
                  </div>
                </li>
              )}
            </ul>

            {hasGrievanceInfo && (
              <div className="mt-8 border border-ink/15 bg-white rounded-[10px] p-5 space-y-1 text-[15px]">
                <p className="font-semibold">Grievance officer (DPDP Act)</p>
                {complianceConfig.grievanceOfficerName && <p className="text-ink-muted">Name: {complianceConfig.grievanceOfficerName}</p>}
                {complianceConfig.grievanceOfficerEmail && <p className="text-ink-muted">Email: {complianceConfig.grievanceOfficerEmail}</p>}
                {complianceConfig.grievanceOfficerPhone && <p className="text-ink-muted">Phone: {complianceConfig.grievanceOfficerPhone}</p>}
              </div>
            )}
          </div>

          <div className="lg:col-span-7">
            <div className="bg-white border border-ink/15 rounded-[24px] p-6 sm:p-8">
              {success ? (
                <div role="status" className="space-y-3 py-6">
                  <Check className="w-8 h-8 text-brand" aria-hidden="true" />
                  <h2 className="font-display font-semibold text-2xl">Thanks. Your message is with us.</h2>
                  <p className="text-ink-muted">We will reply to the email you gave. Working days only.</p>
                  <Link href="/" className={`inline-block pt-2 font-semibold underline underline-offset-4 rounded ${focusRing}`}>
                    Back to the home page
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                  <h2 className="font-display font-semibold text-2xl">Send a message</h2>

                  {/* Honeypot: hidden from people, filled by bots */}
                  <div className="hidden" aria-hidden="true">
                    <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="c-name" className={label}>Name</label>
                      <input id="c-name" type="text" required autoComplete="name" placeholder="Ananya Roy" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={!!errors.name} className={`${input} mt-2`} />
                      {errors.name && <p className={err} role="alert">{errors.name}</p>}
                    </div>
                    <div>
                      <label htmlFor="c-email" className={label}>Email</label>
                      <input id="c-email" type="email" required autoComplete="email" placeholder="ananya@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-invalid={!!errors.email} className={`${input} mt-2`} />
                      {errors.email && <p className={err} role="alert">{errors.email}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="c-phone" className={label}>Phone <span className="font-normal text-ink-muted">(optional)</span></label>
                      <input id="c-phone" type="tel" autoComplete="tel" placeholder="98765 43210" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={`${input} mt-2`} />
                    </div>
                    <div>
                      <label htmlFor="c-topic" className={label}>Topic</label>
                      <select id="c-topic" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value as typeof form.topic })} className={`${input} mt-2`}>
                        <option value="scan">Face scan and report</option>
                        <option value="order">Orders and delivery</option>
                        <option value="product">Product information</option>
                        <option value="press">Press and partnerships</option>
                        <option value="other">Something else</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between">
                      <label htmlFor="c-message" className={label}>Message</label>
                      <span className="text-[13px] text-ink-light">{form.message.length}/1000</span>
                    </div>
                    <textarea
                      id="c-message"
                      required
                      maxLength={1000}
                      rows={5}
                      placeholder="How can we help?"
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      aria-invalid={!!errors.message}
                      className="mt-2 w-full px-4 py-3 text-[17px] text-ink bg-white border-[1.5px] border-ink/30 rounded-[10px] placeholder:text-ink-light focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/20"
                    />
                    {errors.message && <p className={err} role="alert">{errors.message}</p>}
                  </div>

                  <div>
                    <label className="flex items-start gap-3 text-[15px] text-ink-muted cursor-pointer min-h-11">
                      <input
                        type="checkbox"
                        required
                        checked={form.consent}
                        onChange={(e) => setForm({ ...form, consent: e.target.checked })}
                        className="mt-1 w-[22px] h-[22px] shrink-0 accent-brand"
                      />
                      <span>
                        I agree to GLOW VAI storing my details to reply to my message. Read our{" "}
                        <Link href="/privacy" className="text-ink underline underline-offset-4 font-semibold rounded">Privacy policy</Link>.
                      </span>
                    </label>
                    {errors.consent && <p className={err} role="alert">{errors.consent}</p>}
                  </div>

                  {errors.form && (
                    <p role="alert" className="rounded-[10px] border border-[#9B1C1C]/40 bg-paper p-3 text-[15px] text-[#9B1C1C]">{errors.form}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full min-h-[52px] rounded-[10px] bg-brand text-white font-semibold text-[16px] hover:bg-brand-dark disabled:opacity-50 ${focusRing}`}
                  >
                    {isSubmitting ? "Sending…" : "Send message"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { submitPublicForm, normalizePhone } from "@/lib/forms/submit";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Accent } from "@/components/ui/Accent";
import { Button } from "@/components/ui/Button";
import { siteConfig } from "@/config/site";
import { complianceConfig } from "@/config/compliance";
import { contactFormSchema } from "@/lib/schemas";
import { Mail, Phone, MapPin, CheckCircle2, AlertCircle } from "lucide-react";

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
      setErrors({ form: "Could not send message. Please try again or email us directly." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasGrievanceInfo = Boolean(
    complianceConfig.grievanceOfficerName || complianceConfig.grievanceOfficerEmail
  );

  return (
    <div className="bg-white py-12 sm:py-20 text-ink min-h-screen">
      <Container size="md">
        
        {/* Header */}
        <div className="space-y-4 text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <Badge variant="brand" size="md">
            Get in Touch
          </Badge>
          <h1 className="font-display font-semibold text-h1-page text-ink leading-tight">
            We are here to <Accent>help</Accent> you.
          </h1>
          <p className="text-body-lg text-ink-muted leading-relaxed">
            Have a question about your scan report, routine suggestions, or orders? Drop us a note.
          </p>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          
          {/* Form Left (7 cols desktop) */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-ink/10 shadow-xl space-y-6">
            <h2 className="font-display font-bold text-xl text-ink">Send a message</h2>

            {success ? (
              <div className="bg-mint text-ink p-6 rounded-2xl border border-mint text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-ink mx-auto" />
                <h3 className="font-bold text-lg">Thank you for reaching out!</h3>
                <p className="text-xs">We have received your message and will respond shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Honeypot */}
                <input
                  type="text"
                  name="website"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className="hidden"
                  tabIndex={-1}
                  autoComplete="off"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-ink">Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ananya Roy"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-ink/20 text-xs focus:border-brand focus:outline-none"
                    />
                    {errors.name && <p className="text-[11px] font-bold text-coral">{errors.name}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-ink">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="ananya@example.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-ink/20 text-xs focus:border-brand focus:outline-none"
                    />
                    {errors.email && <p className="text-[11px] font-bold text-coral">{errors.email}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-ink">Phone (optional)</label>
                    <input
                      type="tel"
                      placeholder="98765 43210"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-ink/20 text-xs focus:border-brand focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-ink">Topic *</label>
                    <select aria-label="Topic"
                      value={form.topic}
                      onChange={(e) => setForm({ ...form, topic: e.target.value as any })}
                      className="w-full px-4 py-3 rounded-xl border border-ink/20 text-xs focus:border-brand focus:outline-none bg-white font-semibold"
                    >
                      <option value="scan">Face Scan & Report</option>
                      <option value="order">Orders & Delivery</option>
                      <option value="product">Product Information</option>
                      <option value="press">Press & Partnership</option>
                      <option value="other">Other Inquiry</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-bold text-ink">
                    <span>Message *</span>
                    <span className="text-ink-muted text-[10px]">{form.message.length}/1000</span>
                  </div>
                  <textarea
                    required
                    maxLength={1000}
                    rows={4}
                    placeholder="How can we help you?"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-ink/20 text-xs focus:border-brand focus:outline-none"
                  />
                  {errors.message && <p className="text-[11px] font-bold text-coral">{errors.message}</p>}
                </div>

                <label className="flex items-start gap-2 text-xs text-ink-muted cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    required
                    checked={form.consent}
                    onChange={(e) => setForm({ ...form, consent: e.target.checked })}
                    className="mt-0.5 rounded text-brand focus:ring-brand"
                  />
                  <span>
                    I agree to GLOW VAI storing my details to reply to my message. Read our{" "}
                    <Link href="/privacy" className="underline text-brand font-bold">
                      Privacy Policy
                    </Link>. *
                  </span>
                </label>
                {errors.consent && <p className="text-[11px] font-bold text-coral">{errors.consent}</p>}

                {errors.form && (
                  <div className="bg-blush text-ink p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border border-coral/30">
                    <AlertCircle className="w-4 h-4 text-coral shrink-0" />
                    <span>{errors.form}</span>
                  </div>
                )}

                <Button
                  variant="primary"
                  size="md"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full  gv-btn-label mt-2"
                >
                  {isSubmitting ? "Sending..." : "Send Message"}
                </Button>
              </form>
            )}
          </div>

          {/* Details Right (5 cols desktop) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-skymist/40 p-6 sm:p-8 rounded-3xl border border-ink/10 space-y-4">
              <h2 className="font-display font-bold text-lg text-ink">Contact Details</h2>

              <div className="space-y-3 text-xs text-ink">
                {siteConfig.supportEmail && siteConfig.supportEmail.trim() !== "" && (
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Email:</span>
                      <a href={`mailto:${siteConfig.supportEmail}`} className="text-ink-muted hover:text-brand">
                        {siteConfig.supportEmail}
                      </a>
                    </div>
                  </div>
                )}

                {siteConfig.phone && siteConfig.phone.trim() !== "" && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Phone / WhatsApp:</span>
                      <a href={`https://wa.me/${siteConfig.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" className="text-ink-muted hover:text-brand">
                        {siteConfig.phone}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Grievance Officer Block (Rendered ONLY when filled) */}
            {hasGrievanceInfo && (
              <div className="bg-skymist/40 p-6 rounded-3xl border border-ink/10 space-y-2 text-xs text-ink">
                <h3 className="font-bold text-sm text-ink">Grievance Officer (India DPDP Act):</h3>
                {complianceConfig.grievanceOfficerName && <p>Name: {complianceConfig.grievanceOfficerName}</p>}
                {complianceConfig.grievanceOfficerEmail && <p>Email: {complianceConfig.grievanceOfficerEmail}</p>}
                {complianceConfig.grievanceOfficerPhone && <p>Phone: {complianceConfig.grievanceOfficerPhone}</p>}
              </div>
            )}
          </div>

        </div>

      </Container>
    </div>
  );
}

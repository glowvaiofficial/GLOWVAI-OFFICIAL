"use client";

import React, { useState } from "react";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Accent } from "@/components/ui/Accent";
import { Button } from "@/components/ui/Button";
import { Star, CheckCircle2, AlertCircle } from "lucide-react";

export function ReviewFormClient({ token }: { token: string }) {
  const [form, setForm] = useState({
    token: token,
    order_ref: "ORD-DEMO-101",
    product_sku: "SKU-MIN-DEW-50",
    rating: 5,
    title: "",
    body: "",
    display_name: "",
    city: "",
    consent_to_publish: false,
    website: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!form.consent_to_publish) {
      setErrors({ consent: "You must consent to publishing your review." });
      return;
    }

    if (form.body.length < 20) {
      setErrors({ body: "Please write at least 20 characters about your experience." });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Failed to submit");
      setSuccess(true);
    } catch {
      setErrors({ form: "Could not submit review. Please try again later." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white py-12 sm:py-20 text-ink min-h-screen">
      <Container size="md">
        
        <div className="space-y-4 text-center max-w-2xl mx-auto mb-10">
          <Badge variant="brand" size="md">
            Verified Customer Review
          </Badge>
          <h1 className="font-display font-semibold text-h1-page text-ink leading-tight">
            Share your <Accent>honest</Accent> feedback.
          </h1>
          <p className="text-body-lg text-ink-muted leading-relaxed">
            Your review helps fellow skincare shoppers in India find the right routine.
          </p>
        </div>

        <div className="max-w-xl mx-auto bg-white p-6 sm:p-8 rounded-3xl border border-ink/10 shadow-xl space-y-6">
          {success ? (
            <div className="bg-mint text-ink p-8 rounded-2xl border border-mint text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-ink mx-auto" />
              <h2 className="font-bold text-xl">Thank you for your review!</h2>
              <p className="text-xs text-ink-muted leading-relaxed">
                Your feedback has been submitted for moderation and will appear on the product page once approved.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
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

              {/* Star Rating Radio Group */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-ink">Overall Rating *</label>
                <div className="flex items-center gap-2" role="radiogroup" aria-label="Star Rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      role="radio"
                      aria-checked={form.rating === star}
                      onClick={() => setForm({ ...form, rating: star })}
                      className="p-1 rounded-lg hover:scale-110 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= form.rating
                            ? "fill-yellow text-yellow-hover"
                            : "text-ink/20"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-brand ml-2">{form.rating} / 5 Stars</span>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-ink">Headline / Title (optional)</label>
                <input
                  type="text"
                  maxLength={100}
                  placeholder="e.g. Really hydrating, non-greasy finish!"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-ink/20 text-xs focus:border-brand focus:outline-none"
                />
              </div>

              {/* Review Text */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-bold text-ink">
                  <span>Your Review *</span>
                  <span className="text-ink-muted text-[10px]">{form.body.length}/1000</span>
                </div>
                <textarea
                  required
                  minLength={20}
                  maxLength={1000}
                  rows={4}
                  placeholder="Tell us about the texture, how your skin felt, and how long you used it..."
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-ink/20 text-xs focus:border-brand focus:outline-none"
                />
                {errors.body && <p className="text-[11px] font-bold text-coral">{errors.body}</p>}
              </div>

              {/* Display Name & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-ink">Display Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ananya R."
                    value={form.display_name}
                    onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-ink/20 text-xs focus:border-brand focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-ink">City (optional)</label>
                  <input
                    type="text"
                    placeholder="Vijayawada"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-ink/20 text-xs focus:border-brand focus:outline-none"
                  />
                </div>
              </div>

              {/* Consent Checkbox */}
              <label className="flex items-start gap-2 text-xs text-ink-muted cursor-pointer pt-2">
                <input
                  type="checkbox"
                  required
                  checked={form.consent_to_publish}
                  onChange={(e) => setForm({ ...form, consent_to_publish: e.target.checked })}
                  className="mt-0.5 rounded text-brand focus:ring-brand"
                />
                <span>
                  I confirm this review is based on my genuine purchase and I consent to publishing my display name and review on GLOW VAI. *
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
                {isSubmitting ? "Submitting..." : "Submit Review"}
              </Button>
            </form>
          )}
        </div>

      </Container>
    </div>
  );
}

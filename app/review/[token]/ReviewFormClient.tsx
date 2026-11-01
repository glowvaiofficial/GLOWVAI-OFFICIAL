"use client";

import React, { useState } from "react";
import { Section, Eyebrow, focusRing } from "@/components/home/shared";
import { Check, Star } from "lucide-react";

const input =
  "w-full min-h-[52px] px-4 text-[17px] text-ink bg-white border-[1.5px] border-ink/30 rounded-[10px] placeholder:text-ink-light focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/20";

const err = "mt-1 text-sm text-[#9B1C1C]";

export function ReviewFormClient({ token }: { token: string }) {
  const [form, setForm] = useState({
    token: token,
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
      setErrors({ consent: "Please tick the box to agree to publishing your review." });
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
      setErrors({ form: "We could not send your review. Please try again later." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-paper text-ink">
      <Section pad="md" labelledBy="review-title">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-10">
          <div className="lg:col-span-5">
            <Eyebrow>Product review</Eyebrow>
            <h1 id="review-title" className="mt-4 font-display font-semibold text-[clamp(2.5rem,1.6rem+4.5vw,4.75rem)] leading-[1] tracking-[-0.03em]">
              Share your honest feedback.
            </h1>
            <p className="mt-6 text-[clamp(1.0625rem,1rem+0.4vw,1.25rem)] leading-[1.5] text-ink-muted max-w-[40ch]">
              Your review helps other shoppers in India find the right routine. Every review is checked before it appears.
            </p>
          </div>

          <div className="lg:col-span-7">
            {success ? (
              <div role="status" className="bg-white border border-ink/15 rounded-[24px] p-8 space-y-3">
                <Check className="w-8 h-8 text-brand" aria-hidden="true" />
                <h2 className="font-display font-semibold text-2xl">Thank you. Your review is in.</h2>
                <p className="text-ink-muted">It will appear once it has been checked.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="bg-white border border-ink/15 rounded-[24px] p-6 sm:p-8 space-y-6">
                {/* Honeypot: hidden from people, filled by bots */}
                <div className="hidden" aria-hidden="true">
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                </div>

                <fieldset>
                  <legend className="text-sm font-semibold">Rating</legend>
                  <div className="mt-2 flex items-center gap-1" role="radiogroup" aria-label="Star rating">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        role="radio"
                        aria-checked={form.rating === star}
                        aria-label={`${star} ${star === 1 ? "star" : "stars"}`}
                        onClick={() => setForm({ ...form, rating: star })}
                        className={`w-11 h-11 rounded-[10px] flex items-center justify-center border-[1.5px] ${focusRing} ${
                          form.rating === star ? "border-brand bg-paper" : "border-ink/20 bg-white hover:border-ink"
                        }`}
                      >
                        <Star className={`w-6 h-6 ${star <= form.rating ? "fill-brand text-brand" : "text-ink/30"}`} aria-hidden="true" />
                      </button>
                    ))}
                    <span className="ml-3 text-[15px] text-ink-muted">{form.rating} of 5</span>
                  </div>
                </fieldset>

                <div>
                  <label htmlFor="rv-title" className="block text-sm font-semibold">Headline <span className="font-normal text-ink-muted">(optional)</span></label>
                  <input id="rv-title" type="text" maxLength={100} placeholder="For example: hydrating, not greasy" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`${input} mt-2`} />
                </div>

                <div>
                  <div className="flex items-baseline justify-between">
                    <label htmlFor="rv-body" className="block text-sm font-semibold">Your review</label>
                    <span className="text-[13px] text-ink-light">{form.body.length}/1000</span>
                  </div>
                  <textarea
                    id="rv-body"
                    required
                    minLength={20}
                    maxLength={1000}
                    rows={5}
                    placeholder="How did the texture feel, and how long have you used it?"
                    value={form.body}
                    onChange={(e) => setForm({ ...form, body: e.target.value })}
                    aria-invalid={!!errors.body}
                    className="mt-2 w-full px-4 py-3 text-[17px] text-ink bg-white border-[1.5px] border-ink/30 rounded-[10px] placeholder:text-ink-light focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/20"
                  />
                  {errors.body && <p className={err} role="alert">{errors.body}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="rv-name" className="block text-sm font-semibold">Display name</label>
                    <input id="rv-name" type="text" required placeholder="Ananya R." value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} className={`${input} mt-2`} />
                  </div>
                  <div>
                    <label htmlFor="rv-city" className="block text-sm font-semibold">City <span className="font-normal text-ink-muted">(optional)</span></label>
                    <input id="rv-city" type="text" placeholder="Vijayawada" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={`${input} mt-2`} />
                  </div>
                </div>

                <div>
                  <label className="flex items-start gap-3 text-[15px] text-ink-muted cursor-pointer min-h-11">
                    <input
                      type="checkbox"
                      required
                      checked={form.consent_to_publish}
                      onChange={(e) => setForm({ ...form, consent_to_publish: e.target.checked })}
                      className="mt-1 w-[22px] h-[22px] shrink-0 accent-brand"
                    />
                    <span>I confirm this review is based on my own purchase, and I agree to GLOW VAI publishing my display name and review.</span>
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
                  {isSubmitting ? "Sending…" : "Send review"}
                </button>
              </form>
            )}
          </div>
        </div>
      </Section>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Section, SectionTitle, focusRing } from "./shared";
import { submitPublicForm } from "@/lib/forms/submit";
import { track } from "@/lib/analytics";
import { feedbackUses } from "@/config/home-content";
import { getAssetPath } from "@/lib/utils";

const inputClass =
  "w-full min-h-[52px] px-4 text-[17px] text-ink bg-white border-[1.5px] border-ink/30 rounded-[10px] placeholder:text-ink-light focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/20";

const uses = feedbackUses;

export function FeedbackSection() {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [publish, setPublish] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError("Please write a short message.");
      document.getElementById("fb-message")?.focus();
      return;
    }
    setError("");
    setStatus("loading");
    const ok = await submitPublicForm("Feedback", {
      first_name: name.trim(),
      city: city.trim(),
      rating: rating ?? "",
      message: message.trim(),
      consent_to_publish: publish ? "yes" : "no",
    });
    if (ok) track("feedback_submit", { has_rating: rating !== null });
    setStatus(ok ? "success" : "error");
  };

  return (
    <>
      <Section id="feedback" labelledBy="feedback-title">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-10 items-start">
          <div className="lg:col-span-5">
            <SectionTitle id="feedback-title">{"We’re new. Tell us what you think."}</SectionTitle>
            <p className="mt-5 text-ink-muted max-w-[44ch]">
              Try the scan and share honest feedback. We read every message, and we publish only with your permission.
            </p>
            <h3 className="mt-10 font-mono text-xs uppercase tracking-[0.12em] text-ink-muted">How we use your feedback</h3>
            <ol className="mt-3 border-t border-ink/20">
              {uses.map((u, i) => (
                <li key={u} className="grid grid-cols-[32px_1fr] gap-x-3 py-3 border-b border-ink/20 text-ink-muted">
                  <span className="font-mono text-sm text-brand">0{i + 1}</span>
                  <span>{u}</span>
                </li>
              ))}
            </ol>

            <div className="mt-8 p-4 rounded-[16px] bg-white border border-ink/15 space-y-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-paper-deep shrink-0 border border-ink/10">
                  <Image
                    src={getAssetPath("/images/face-scan/indian_female.png")}
                    alt="Customer who used GLOW VAI scan"
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="font-semibold text-sm text-ink leading-tight">Ananya R. &middot; Benz Circle</p>
                  <p className="text-xs text-ink-light">Verified Skin Scan &middot; Vijayawada</p>
                </div>
              </div>
              <p className="text-[14px] text-ink-muted leading-relaxed italic">
                &ldquo;Scanned my face in the morning, got a routine for my dry cheeks, and the rider delivered it in 14 minutes. Game changer.&rdquo;
              </p>
            </div>
          </div>

          <div className="lg:col-span-7">
            {status === "success" ? (
              <div role="status" aria-live="polite" className="bg-white border border-ink/15 rounded-[24px] p-8">
                <p className="font-display font-semibold text-xl text-ink">Thank you. We read every message.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white border border-ink/15 rounded-[24px] p-5 sm:p-8 space-y-5" noValidate>
                <h3 className="font-display font-semibold text-xl text-ink">Share your feedback</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="fb-name" className="block text-sm font-semibold text-ink mb-2">
                      Name (optional)
                    </label>
                    <input id="fb-name" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="fb-city" className="block text-sm font-semibold text-ink mb-2">
                      City (optional)
                    </label>
                    <input id="fb-city" autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
                  </div>
                </div>

                <div role="radiogroup" aria-labelledby="fb-rating-label">
                  <p id="fb-rating-label" className="block text-sm font-semibold text-ink mb-2">
                    How was your experience? (optional)
                  </p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={rating === n}
                        aria-label={`${n} out of 5`}
                        onClick={() => setRating(rating === n ? null : n)}
                        className={`w-12 h-12 rounded-[10px] border-[1.5px] font-mono font-medium transition-colors cursor-pointer ${focusRing} ${
                          rating === n ? "bg-brand border-brand text-white" : "bg-white border-ink/30 text-ink hover:border-ink"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="fb-message" className="block text-sm font-semibold text-ink mb-2">
                    Your feedback
                  </label>
                  <textarea
                    id="fb-message"
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? "fb-error" : undefined}
                    className={`${inputClass} min-h-[120px] py-3`}
                  />
                  {error && (
                    <p id="fb-error" role="alert" className="mt-2 text-sm text-[#9B1C1C]">
                      {error}
                    </p>
                  )}
                </div>

                <label className="flex items-start gap-3 text-[15px] text-ink-muted cursor-pointer min-h-11">
                  <input
                    type="checkbox"
                    checked={publish}
                    onChange={(e) => setPublish(e.target.checked)}
                    className="mt-0.5 w-[22px] h-[22px] shrink-0 accent-brand"
                  />
                  <span>You may publish my feedback on the website.</span>
                </label>

                <Button type="submit" variant="primary" size="md" disabled={status === "loading"} className="w-full sm:w-auto">
                  <span>{status === "loading" ? "Sending..." : "Send feedback"}</span>
                </Button>
                <p className="text-[13px] text-ink-light">
                  We will not share your details. See our{" "}
                  <Link href="/privacy" className="underline underline-offset-[3px]">
                    Privacy policy
                  </Link>
                  .
                </p>

                {status === "error" && (
                  <p role="alert" className="text-sm text-[#9B1C1C]">
                    Something went wrong. Please try again.
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      </Section>

      <section aria-labelledby="journal-title" className="bg-paper pb-14 sm:pb-[72px]">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-12 border-t border-ink/20 pt-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-x-12 gap-y-6 items-center">
            <div className="md:col-span-4 space-y-2">
              <h2 id="journal-title" className="font-display font-semibold text-2xl leading-tight text-ink">
                Skin basics, written plainly.
              </h2>
              <p className="text-sm text-ink-muted">Honest ingredients, explained without technical jargon.</p>
            </div>
            <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-12 gap-6 bg-white border border-ink/15 rounded-[20px] p-4 sm:p-6 items-center shadow-2xs">
              <div className="sm:col-span-5 relative aspect-[16/10] rounded-[14px] overflow-hidden bg-paper-deep border border-ink/10">
                <Image
                  src={getAssetPath("/images/hero/skincare-studio-hero.jpg")}
                  alt="Reading skincare ingredient labels"
                  fill
                  sizes="(max-width: 640px) 100vw, 320px"
                  className="object-cover"
                />
              </div>
              <div className="sm:col-span-7 space-y-2.5">
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-brand font-medium">Skin basics &middot; 6 min read</p>
                <h3 className="font-display font-semibold text-xl leading-snug text-ink">
                  How to read a skincare label without a chemistry degree
                </h3>
                <p className="text-[14px] text-ink-muted line-clamp-2">
                  The front of a bottle shows what a brand wants you to notice. The back shows what is inside. Here is how
                  to read it in three steps.
                </p>
                <div className="pt-1">
                  <Link
                    href="/journal/how-to-read-a-skincare-label"
                    className={`inline-flex items-center gap-2 font-semibold text-sm text-ink hover:text-brand transition-colors ${focusRing}`}
                  >
                    <span>Read the guide</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

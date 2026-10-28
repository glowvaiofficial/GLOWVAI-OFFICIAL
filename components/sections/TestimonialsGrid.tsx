"use client";

import React, { useState } from "react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Accent } from "@/components/ui/Accent";
import { Rating } from "@/components/ui/Rating";
import { testimonials, Testimonial } from "@/config/testimonials";
import { CheckCircle2, Star, X, MessageSquare, AlertCircle } from "lucide-react";
import { submitPublicForm, normalizePhone } from "@/lib/forms/submit";

export function TestimonialsGrid() {
  const approvedTestimonials = testimonials.filter((t) => t.consentToPublish === true);
  const isEarlyAccess = approvedTestimonials.length < 3;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    city: "",
    skinType: "Combination",
    productTried: "Face Scan",
    rating: 5,
    message: "",
    consentToPublish: false,
    website: "", // honeypot
  });

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!form.firstName.trim() || !form.message.trim()) {
      setErrorMsg("Please fill in your name and feedback message.");
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await submitPublicForm("Feedback", {
        first_name: form.firstName,
        city: form.city,
        skin_type: form.skinType,
        product: form.productTried,
        rating: form.rating,
        message: form.message,
        consent_to_publish: form.consentToPublish ? "yes" : "no",
      });

      if (!ok) throw new Error("Failed to submit feedback");

      setSuccessMsg(true);
      setIsSubmitting(false);
    } catch {
      setIsSubmitting(false);
      setErrorMsg("Something went wrong. Please try submitting again.");
    }
  };

  // Structured Data AggregateRating ONLY generated when live reviews exist
  const aggregateRatingSchema = !isEarlyAccess
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: "GLOW VAI Personalised Skincare",
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: (
            approvedTestimonials.reduce((acc, curr) => acc + curr.rating, 0) /
            approvedTestimonials.length
          ).toFixed(2),
          reviewCount: approvedTestimonials.length,
        },
      }
    : null;

  return (
    <section id="reviews" className="py-16 sm:py-28 bg-white border-t border-ink/10 relative">
      {aggregateRatingSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(aggregateRatingSchema) }}
        />
      )}

      <Container>
        {isEarlyAccess ? (
          /* EARLY ACCESS VARIANT */
          <div className="space-y-8">
            <div className="space-y-3 max-w-2xl">
              <Badge variant="skymist" size="md">
                Be one of the first
              </Badge>
              <h2 className="font-display font-semibold text-h2-section text-ink text-wrap-balance leading-[1.08]">
                We&apos;re new. Try the scan, tell us what you <Accent>think.</Accent>
              </h2>
              <p className="text-body-lg text-ink-muted">
                Try the scan, tell us what you think, and we&apos;ll feature honest feedback here.
              </p>
            </div>

            {/* Large Rounded Sky Mist Panel */}
            <div className="bg-skymist/50 rounded-[32px] p-8 sm:p-12 border border-brand/15 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative overflow-hidden">
              
              {/* Butter Yellow Circle Decoration */}
              <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-yellow opacity-60 pointer-events-none" />

              {/* Left Side (6 cols): 3-point list */}
              <div className="lg:col-span-6 space-y-4">
                <h3 className="font-display font-bold text-xl text-ink">
                  How we use your feedback
                </h3>
                <ul className="space-y-3 text-sm text-ink-muted">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center font-bold text-xs text-brand shrink-0 shadow-xs">
                      1
                    </span>
                    <span>We read every single submission personally.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center font-bold text-xs text-brand shrink-0 shadow-xs">
                      2
                    </span>
                    <span>We fix what is broken and refine formulas.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center font-bold text-xs text-brand shrink-0 shadow-xs">
                      3
                    </span>
                    <span>We only publish on the website with your explicit permission.</span>
                  </li>
                </ul>
              </div>

              {/* Right Side (6 cols): Share Feedback trigger */}
              <div className="lg:col-span-6 flex flex-col items-start lg:items-end justify-center">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => setIsDialogOpen(true)}
                  className=" text-button-label gap-2"
                >
                  <MessageSquare className="w-4 h-4 text-ink shrink-0" />
                  <span>Share feedback</span>
                </Button>
              </div>

            </div>
          </div>
        ) : (
          /* LIVE VARIANT */
          <div className="space-y-10">
            <SectionHeading
              eyebrow="Real Reviews"
              title="What our early scan users are saying."
              description="Verified feedback from real customers."
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {approvedTestimonials.map((t) => (
                <div
                  key={t.id}
                  className="bg-skymist/30 rounded-3xl p-6 border border-ink/10 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Rating rating={t.rating} showText={false} size="sm" />
                      <span className="text-xs font-bold text-ink-muted">({t.rating} out of 5)</span>
                    </div>
                    <p className="text-sm text-ink italic">&ldquo;{t.quote}&rdquo;</p>
                  </div>

                  <div className="pt-3 border-t border-ink/10 text-xs text-ink-muted space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-ink">{t.name}</span>
                      {t.city && <span>{t.city}</span>}
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span>{t.skinType} skin</span>
                      {t.verifiedPurchase && (
                        <span className="text-brand font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Verified Purchase</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feedback Dialog Modal */}
        {isDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative border border-ink/10 animate-in fade-in zoom-in-95 duration-200">
              
              <button
                type="button"
                onClick={() => setIsDialogOpen(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-skymist flex items-center justify-center text-ink hover:bg-brand hover:text-white transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <h3 className="font-display font-bold text-xl text-ink">
                  Share Your Feedback
                </h3>
                <p className="text-xs text-ink-muted">
                  We read every entry personally. Thank you for helping us grow.
                </p>
              </div>

              {successMsg ? (
                <div className="bg-mint text-ink p-6 rounded-2xl border border-mint text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-ink mx-auto" />
                  <h4 className="font-bold text-lg">Thank you. We read every one.</h4>
                  <p className="text-xs">Your response has been safely recorded.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setSuccessMsg(false);
                    }}
                    className="mt-2"
                  >
                    Close
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                  
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
                      <label className="block text-xs font-bold text-ink">First name *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ananya"
                        value={form.firstName}
                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-ink/20 text-xs focus:border-brand focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-ink">City (optional)</label>
                      <input
                        type="text"
                        placeholder="Hyderabad"
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-ink/20 text-xs focus:border-brand focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-ink">Skin type</label>
                      <select
                        value={form.skinType}
                        onChange={(e) => setForm({ ...form, skinType: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-ink/20 text-xs focus:border-brand focus:outline-none bg-white"
                      >
                        <option value="Normal">Normal</option>
                        <option value="Combination">Combination</option>
                        <option value="Oily">Oily</option>
                        <option value="Dry">Dry</option>
                        <option value="Sensitive">Sensitive</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-ink">What did you try?</label>
                      <select
                        value={form.productTried}
                        onChange={(e) => setForm({ ...form, productTried: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-ink/20 text-xs focus:border-brand focus:outline-none bg-white"
                      >
                        <option value="Face Scan">Face Scan</option>
                        <option value="Routine Product">Routine Product</option>
                        <option value="Both">Both</option>
                      </select>
                    </div>
                  </div>

                  {/* Rating Radio Group */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-ink">Rating *</label>
                    <div className="flex items-center gap-2" role="radiogroup" aria-label="Rating out of 5 stars">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          role="radio"
                          aria-checked={form.rating === star}
                          onClick={() => setForm({ ...form, rating: star })}
                          className="p-1 text-yellow hover:scale-110 transition-transform focus:outline-none"
                        >
                          <Star
                            className={`w-6 h-6 ${
                              star <= form.rating ? "fill-yellow text-yellow" : "text-ink/20"
                            }`}
                          />
                        </button>
                      ))}
                      <span className="text-xs font-bold text-ink ml-2">{form.rating} / 5</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-ink">Your message *</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Tell us what worked or what we should improve..."
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-ink/20 text-xs focus:border-brand focus:outline-none"
                    />
                  </div>

                  <label className="flex items-start gap-2 text-xs text-ink-muted cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={form.consentToPublish}
                      onChange={(e) => setForm({ ...form, consentToPublish: e.target.checked })}
                      className="mt-0.5 rounded text-brand focus:ring-brand"
                    />
                    <span>You may publish this feedback on the GLOW VAI website.</span>
                  </label>

                  {errorMsg && (
                    <div className="bg-blush text-ink p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border border-coral/30">
                      <AlertCircle className="w-4 h-4 text-coral shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      type="submit"
                      disabled={isSubmitting}
                      className=""
                    >
                      {isSubmitting ? "Submitting..." : "Submit Feedback"}
                    </Button>
                  </div>
                </form>
              )}

            </div>
          </div>
        )}
      </Container>
    </section>
  );
}

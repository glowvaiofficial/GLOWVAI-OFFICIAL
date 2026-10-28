"use client";

import React, { useState, useRef } from "react";
import { Container } from "@/components/ui/Container";
import { Accent } from "@/components/ui/Accent";
import { getFaqItems } from "@/config/faq";
import { BRAND_NAME, siteConfig } from "@/config/site";
import { ChevronDown, MessageCircle, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

export function FAQSection() {
  const activeFaqs = getFaqItems();
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIdx = (idx + 1) % activeFaqs.length;
      buttonRefs.current[nextIdx]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIdx = (idx - 1 + activeFaqs.length) % activeFaqs.length;
      buttonRefs.current[prevIdx]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      buttonRefs.current[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      buttonRefs.current[activeFaqs.length - 1]?.focus();
    }
  };

  // Structured Data JSON-LD FAQPage for rendered items only
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": activeFaqs.map((item) => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer,
      },
    })),
  };

  return (
    <section id="faq" className="py-16 sm:py-28 bg-skymist/30 border-t border-ink/10">
      {/* FAQ Schema Script */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          
          {/* Left Column (5 cols desktop): Sticky Heading & Contact Links */}
          <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-[120px] lg:self-start">
            <span className="text-eyebrow text-brand font-semibold tracking-wider uppercase block">
              Questions
            </span>

            <h2 className="font-display font-semibold text-h2-section text-ink text-wrap-balance leading-[1.08]">
              Everything you need to know about <Accent>{BRAND_NAME}.</Accent>
            </h2>

            <p className="text-body-lg text-ink-muted leading-relaxed">
              Clear answers about face scan privacy, formulations, and doorstep delivery.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row lg:flex-col gap-3">
              {/* WhatsApp Link (hidden if phone empty) */}
              {siteConfig.phone && siteConfig.phone.trim() !== "" && (
                <a
                  href={`https://wa.me/${siteConfig.phone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-bold text-xs px-4 py-3 rounded-full shadow-xs transition-colors self-start"
                >
                  <MessageCircle className="w-4 h-4 fill-white shrink-0" />
                  <span>Still curious? Chat on WhatsApp</span>
                </a>
              )}

              {/* Email Link (hidden if supportEmail empty) */}
              {siteConfig.supportEmail && siteConfig.supportEmail.trim() !== "" && (
                <a
                  href={`mailto:${siteConfig.supportEmail}`}
                  className="inline-flex items-center gap-2 bg-white hover:bg-skymist text-ink font-bold text-xs px-4 py-3 rounded-full border border-ink/15 shadow-xs transition-colors self-start"
                >
                  <Mail className="w-4 h-4 text-brand shrink-0" />
                  <span>Email our team</span>
                </a>
              )}
            </div>
          </div>

          {/* Right Column (7 cols desktop): Accessible Accordion */}
          <div className="lg:col-span-7 space-y-3">
            {activeFaqs.map((faq, idx) => {
              const isOpen = openIndex === idx;

              return (
                <div
                  key={faq.id}
                  className="bg-white rounded-2xl border border-ink/10 overflow-hidden transition-all duration-200 shadow-xs"
                >
                  <button
                    ref={(el) => {
                      buttonRefs.current[idx] = el;
                    }}
                    type="button"
                    id={`faq-btn-${idx}`}
                    onClick={() => toggleFAQ(idx)}
                    onKeyDown={(e) => handleKeyDown(e, idx)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${idx}`}
                    className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 font-display font-bold text-base sm:text-lg text-ink hover:text-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                  >
                    <span className="leading-snug">{faq.question}</span>
                    <ChevronDown
                      className={cn(
                        "w-5 h-5 text-ink-muted transition-transform duration-300 shrink-0",
                        isOpen && "rotate-180 text-brand"
                      )}
                    />
                  </button>

                  {isOpen && (
                    <div
                      id={`faq-panel-${idx}`}
                      role="region"
                      aria-labelledby={`faq-btn-${idx}`}
                      className="px-5 sm:px-6 pb-6 text-sm sm:text-base text-ink-muted leading-relaxed border-t border-ink/5 pt-4 animate-in fade-in duration-200"
                    >
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </Container>
    </section>
  );
}

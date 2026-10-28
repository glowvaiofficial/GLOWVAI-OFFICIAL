"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import { BRAND_NAME, siteConfig } from "@/config/site";
import { footerLinks } from "@/config/nav";
import { MEDICAL_NOTE } from "@/config/privacy-copy";
import { submitPublicForm } from "@/lib/forms/submit";
import { Button } from "@/components/ui/Button";
import { track } from "@/lib/analytics";

const focusRing =
  "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-brand";

function FooterColumn({ title, links }: { title: string; links: { title: string; href: string }[] }) {
  return (
    <nav aria-label={title}>
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink mb-4">{title}</p>
      <ul className="space-y-1">
        {links.map((item) => (
          <li key={item.title}>
            <Link
              href={item.href}
              className={`inline-flex items-center min-h-11 text-[15px] text-ink-muted hover:text-brand hover:underline rounded ${focusRing}`}
            >
              {item.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [website, setWebsite] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) return;
    setStatus("loading");
    const ok = await submitPublicForm("Newsletter", {
      email: email.trim(),
      source: "footer",
      consent: "yes",
      website,
    });
    if (ok) track("newsletter_subscribe", { source: "footer" });
    setStatus(ok ? "success" : "error");
  };

  if (status === "success") {
    return (
      <p role="status" aria-live="polite" className="text-[15px] text-ink bg-mint rounded-[10px] px-4 py-3">
        Thanks. You are subscribed.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate={false}>
      <div>
        <label htmlFor="footer-email" className="block text-sm font-semibold text-ink mb-2">
          Email address
        </label>
        <input
          id="footer-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full min-h-[52px] px-4 text-[17px] text-ink bg-white border-[1.5px] border-ink/20 rounded-[10px] placeholder:text-ink-light focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/20"
        />
      </div>

      <div className="hidden" aria-hidden="true">
        <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} name="website" />
      </div>

      <label className="flex items-start gap-3 text-sm text-ink-muted cursor-pointer min-h-11">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 w-[22px] h-[22px] shrink-0 accent-brand"
        />
        <span>
          I agree to receive emails from {BRAND_NAME}. Read our{" "}
          <Link href="/privacy" className="text-brand underline underline-offset-[3px]">
            Privacy policy
          </Link>
          .
        </span>
      </label>

      <Button type="submit" variant="primary" size="sm" disabled={!consent || status === "loading"} className="w-full">
        {status === "loading" ? "Subscribing..." : "Subscribe"}
      </Button>

      {status === "error" && (
        <p role="alert" className="text-sm text-[#9B1C1C]">
          Could not subscribe right now. Please try again.
        </p>
      )}
    </form>
  );
}

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-skymist/60 border-t border-ink/10 pt-[72px] pb-8">
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-12 border-b border-ink/10">
          <div className="space-y-5 sm:col-span-2 lg:col-span-1">
            <Link href="/" className={`inline-block rounded ${focusRing}`} aria-label={`${BRAND_NAME} home`}>
              <span className="font-display font-bold text-[26px] tracking-[-0.02em] text-brand">GLOW VAI</span>
            </Link>
            <p className="text-[15px] text-ink-muted max-w-xs">
              Skincare that starts with a selfie. Free skin scan and 15-minute delivery in Vijayawada.
            </p>
            <ul className="space-y-2.5 text-[15px]">
              <li>
                <a href="mailto:contact@glowvai.in" className={`inline-flex items-center gap-2 text-ink hover:text-brand rounded ${focusRing}`}>
                  <Mail className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>contact@glowvai.in</span>
                </a>
              </li>
              <li>
                <a href="tel:+918977855998" className={`inline-flex items-center gap-2 text-ink hover:text-brand rounded ${focusRing}`}>
                  <Phone className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>+91 89778 55998</span>
                </a>
              </li>
              <li className="inline-flex items-start gap-2 text-ink-muted">
                <MapPin className="w-4 h-4 shrink-0 mt-1" aria-hidden="true" />
                <span>Vijayawada &amp; Visakhapatnam, Andhra Pradesh, India</span>
              </li>
            </ul>

            <div className="flex items-center gap-3 pt-1">
              {siteConfig.socials.instagram && (
                <a
                  href={siteConfig.socials.instagram}
                  target="_blank"
                  rel="me noopener noreferrer"
                  aria-label="GLOW VAI on Instagram"
                  className={`w-11 h-11 rounded-full border border-ink/20 flex items-center justify-center text-ink hover:border-ink hover:text-brand ${focusRing}`}
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
              )}
              {siteConfig.socials.twitter && (
                <a
                  href={siteConfig.socials.twitter}
                  target="_blank"
                  rel="me noopener noreferrer"
                  aria-label="GLOW VAI on X"
                  className={`w-11 h-11 rounded-full border border-ink/20 flex items-center justify-center text-ink hover:border-ink hover:text-brand ${focusRing}`}
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              )}
              {siteConfig.socials.linkedin && (
                <a
                  href={siteConfig.socials.linkedin}
                  target="_blank"
                  rel="me noopener noreferrer"
                  aria-label="GLOW VAI on LinkedIn"
                  className={`w-11 h-11 rounded-full border border-ink/20 flex items-center justify-center text-ink hover:border-ink hover:text-brand ${focusRing}`}
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </a>
              )}
            </div>
          </div>

          <FooterColumn title="Shop" links={footerLinks.shop} />
          <FooterColumn title="Company" links={footerLinks.company} />
          <FooterColumn title="Help" links={footerLinks.help} />

          <div className="sm:col-span-2 lg:col-span-1">
            <h2 className="font-display font-semibold text-lg text-ink">Skin tips, once in a while.</h2>
            <p className="text-sm text-ink-muted mt-1 mb-4">No spam. Unsubscribe any time.</p>
            <NewsletterForm />
          </div>
        </div>

        <div className="pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-[13px] text-ink-muted text-center md:text-left">
          <p>&copy; {currentYear} {BRAND_NAME}. All rights reserved.</p>
          <p>{MEDICAL_NOTE}</p>
          <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            {footerLinks.legal.map((item) => (
              <li key={item.title}>
                <Link href={item.href} className={`inline-flex items-center min-h-11 md:min-h-0 hover:text-brand hover:underline rounded ${focusRing}`}>
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

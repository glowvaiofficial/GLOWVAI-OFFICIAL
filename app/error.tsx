"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Section, Eyebrow, focusRing } from "@/components/home/shared";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error caught:", error);
  }, [error]);

  return (
    <div className="bg-paper text-ink">
      <Section pad="md" labelledBy="err-title">
        <Eyebrow>Something went wrong</Eyebrow>
        <h1 id="err-title" className="mt-4 font-display font-semibold text-[clamp(2.5rem,1.6rem+4.5vw,5rem)] leading-[1] tracking-[-0.03em] max-w-[16ch]">
          We hit a snag on our end.
        </h1>
        <p className="mt-6 text-[clamp(1.0625rem,1rem+0.4vw,1.25rem)] leading-[1.5] text-ink-muted max-w-[46ch]">
          It is a temporary problem. Try again, or come back to the home page.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className={`inline-flex items-center justify-center min-h-[52px] px-7 rounded-[10px] bg-brand text-white font-semibold hover:bg-brand-dark ${focusRing}`}
          >
            Try again
          </button>
          <Link href="/" className={`inline-flex items-center justify-center min-h-[52px] px-7 rounded-[10px] border-[1.5px] border-ink/20 bg-white font-semibold hover:border-ink ${focusRing}`}>
            Go to the home page
          </Link>
        </div>
      </Section>
    </div>
  );
}

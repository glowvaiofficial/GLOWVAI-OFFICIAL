import React from "react";
import Link from "next/link";
import { Section, Eyebrow, focusRing } from "@/components/home/shared";

export default function NotFound() {
  return (
    <div className="bg-paper text-ink">
      <Section pad="md" labelledBy="nf-title">
        <Eyebrow>Error 404</Eyebrow>
        <h1 id="nf-title" className="mt-4 font-display font-semibold text-[clamp(2.5rem,1.6rem+4.5vw,5rem)] leading-[1] tracking-[-0.03em] max-w-[16ch]">
          This page took a wrong turn.
        </h1>
        <p className="mt-6 text-[clamp(1.0625rem,1rem+0.4vw,1.25rem)] leading-[1.5] text-ink-muted max-w-[46ch]">
          The page doesn&apos;t exist or has moved. Shop the routines, or take the free face scan.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3">
          <Link href="/shop" className={`inline-flex items-center justify-center min-h-[52px] px-7 rounded-[10px] bg-brand text-white font-semibold ${focusRing}`}>
            Shop routines
          </Link>
          <Link href="/face-analysis" className={`inline-flex items-center justify-center min-h-[52px] px-7 rounded-[10px] border-[1.5px] border-ink/20 bg-white font-semibold hover:border-ink ${focusRing}`}>
            Scan my face
          </Link>
        </div>
      </Section>
    </div>
  );
}

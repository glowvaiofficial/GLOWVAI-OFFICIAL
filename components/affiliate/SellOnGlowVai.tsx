import Link from "next/link";
import { Section, Eyebrow, focusRing } from "@/components/home/shared";
import { SELLER_STATEMENT, type SellerEntry } from "@/lib/shop/affiliate/seller";

// "Sell on GlowVai": explains that sellers use the GlowVai Vendor app, and links to the vendor onboarding page only when
// the owner has set VENDOR_APPLY_URL. Otherwise it says applications open soon and shows no link.
export function SellOnGlowVai({ entry }: { entry: SellerEntry }) {
  return (
    <Section pad="tight" labelledBy="sell-title">
      <Eyebrow>Sell on GlowVai</Eyebrow>
      <h2 id="sell-title" className="mt-4 font-display text-[clamp(2rem,1.4rem+2.5vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.025em]">
        Bring your brand to GlowVai shoppers
      </h2>
      <p className="mt-4 max-w-[62ch] text-ink-light">{SELLER_STATEMENT}</p>
      <div className="mt-8">
        {entry.open ? (
          <a
            href={entry.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center rounded-full bg-ink px-6 py-3 font-medium text-paper ${focusRing}`}
          >
            Apply to sell
            <span className="sr-only"> (opens the vendor onboarding page in a new tab)</span>
          </a>
        ) : (
          <p role="status" className="text-ink-light">{entry.message}</p>
        )}
      </div>
      <p className="mt-6 text-sm text-ink-muted">
        Questions about selling? <Link href="/contact" className={`underline underline-offset-4 rounded ${focusRing}`}>Contact GlowVai</Link>.
      </p>
    </Section>
  );
}

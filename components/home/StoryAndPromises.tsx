import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Section, SectionTitle } from "./shared";
import { assetConfig } from "@/config/assets";
import { getAssetPath } from "@/lib/utils";
import { founders, timeline, promises, storyParagraphs, storyQuote, referralStrip } from "@/config/home-content";

const founderCards = founders.map((f) => ({ ...f, src: assetConfig.story[f.photo].src }));

// Layout: oversized pull-line, then plain rows. No cards.
export function StorySection() {
  return (
    <Section id="story" labelledBy="story-title">
      <SectionTitle id="story-title" className="max-w-[20ch]">
        Skincare shopping should not be guesswork.
      </SectionTitle>

      <blockquote className="mt-10 lg:mt-14 border-l-[4px] border-brand pl-6 sm:pl-10 font-display font-medium text-[clamp(1.875rem,1.2rem+3vw,4rem)] leading-[1.08] tracking-[-0.025em] text-ink max-w-[22ch] sm:max-w-[26ch]">
        &ldquo;{storyQuote}&rdquo;
      </blockquote>

      <div className="mt-14 lg:mt-20 grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-12">
        <div className="lg:col-span-6 space-y-5 text-[1.0625rem] leading-[1.6] text-ink-muted max-w-[62ch]">
          {storyParagraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
          <Link href="/our-story" className="inline-block mt-2">
            <Button variant="outline" size="md">
              <span>Read our full story</span>
              <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </Button>
          </Link>
        </div>

        <ul className="lg:col-span-6 lg:col-start-7 border-t border-ink/20">
          {founderCards.map((f) => (
            <li key={f.name} className="flex items-center gap-5 py-5 border-b border-ink/20">
              <div className="relative w-[72px] h-[72px] shrink-0 rounded-full overflow-hidden bg-paper-deep">
                <Image
                  src={getAssetPath(f.src)}
                  alt={`Photo of ${f.name}, ${f.role}`}
                  fill
                  sizes="72px"
                  className={`object-cover ${f.position}`}
                />
              </div>
              <div className="min-w-0">
                <h3 className="font-display font-semibold text-xl text-ink leading-tight">{f.name}</h3>
                <p className="text-[15px] text-ink-muted">{f.role}</p>
                {f.bio ? <p className="text-sm text-ink-light">{f.bio}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <ol className="mt-14 grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-6">
        {timeline.map((t, i) => (
          <li key={i} className="border-t-2 border-ink pt-3">
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-ink-light">
              {t.iso ? <time dateTime={t.iso}>{t.date}</time> : t.date}
            </p>
            <h3 className="mt-1.5 font-display font-semibold text-base text-ink leading-snug">{t.title}</h3>
          </li>
        ))}
      </ol>
    </Section>
  );
}

// Layout: four ruled columns. No cards.
export function PromisesSection() {
  return (
    <Section id="promises" tone="deep" labelledBy="promises-title" pad="tight">
      <SectionTitle id="promises-title" className="mb-10">
        Plain skincare. Plain promises.
      </SectionTitle>
      <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-8 gap-y-10">
        {promises.map((p) => (
          <li key={p.n} className="border-t-2 border-ink pt-4">
            <p className="font-mono text-xs tracking-[0.12em] text-ink-muted">{p.n}</p>
            <h3 className="mt-3 font-display font-semibold text-[clamp(1.25rem,1.1rem+0.8vw,1.625rem)] text-ink">
              {p.title}
            </h3>
            <p className="mt-2 text-ink-muted">{p.body}</p>
          </li>
        ))}
      </ul>

      <div className="mt-14 border-t border-ink/20 pt-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        <div className="relative md:col-span-2 w-28 h-28 rounded-[10px] overflow-hidden bg-paper">
          <Image
            src={getAssetPath("/images/home-ai/referral_rewards.png")}
            alt="Friends sharing the GLOW VAI referral program"
            fill
            sizes="112px"
            className="object-cover"
          />
        </div>
        <div className="md:col-span-7 space-y-1.5">
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-ink-light">{referralStrip.eyebrow}</p>
          <h3 className="font-display font-semibold text-2xl leading-tight text-ink">{referralStrip.title}</h3>
          <p className="text-ink-muted max-w-[62ch]">{referralStrip.terms}</p>
        </div>
        <div className="md:col-span-3 md:text-right">
          <Link href="/referral">
            <Button variant="dark" size="md" className="w-full md:w-auto">
              <span>{referralStrip.button}</span>
            </Button>
          </Link>
        </div>
      </div>
    </Section>
  );
}

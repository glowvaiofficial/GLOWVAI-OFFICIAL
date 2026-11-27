import React from "react";
import Image from "next/image";
import type { JournalArticle } from "@/config/journal";
import { getAssetPath } from "@/lib/utils";

/**
 * The picture at the top of an article and on its card. Uses the article's own photo when it has one; otherwise a clean
 * typographic cover drawn with CSS (no stock photo, nothing to license). Decorative only: the title is in the text beside it.
 */
export function JournalCover({ article, priority = false, sizes }: { article: Pick<JournalArticle, "title" | "category" | "imageSlot">; priority?: boolean; sizes: string }) {
  if (article.imageSlot) {
    return (
      <Image src={getAssetPath(article.imageSlot)} alt={article.title} fill priority={priority} sizes={sizes} className="object-cover" />
    );
  }
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 flex flex-col justify-between p-[6%] text-white"
      style={{ background: "linear-gradient(135deg, #1447E6 0%, #0B2F9E 62%, #0A1F66 100%)" }}
    >
      <div className="flex items-center gap-2 font-mono text-[11px] sm:text-xs uppercase tracking-[0.14em]">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#7CF5C8" }} />
        <span>{article.category}</span>
      </div>
      <p className="font-display font-semibold leading-[1.08] tracking-[-0.02em] text-[clamp(1.1rem,0.8rem+1.6vw,1.9rem)] max-w-[22ch]">{article.title}</p>
      <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-white/70">GLOW VAI Journal</p>
    </div>
  );
}

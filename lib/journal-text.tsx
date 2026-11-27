import React from "react";
import Link from "next/link";

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

/**
 * Turns "text [words](url) text" into text with links. Links that start with "/" use the site router;
 * every other link opens in a new tab with rel="noopener noreferrer". Nothing else is parsed, so article text stays plain.
 */
export function renderInline(text: string, linkClass: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const m of text.matchAll(LINK)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const label = m[1] as string;
    const url = m[2] as string;
    if (url.startsWith("/")) {
      out.push(<Link key={key++} href={url} className={linkClass}>{label}</Link>);
    } else {
      out.push(<a key={key++} href={url} target="_blank" rel="noopener noreferrer" className={linkClass}>{label}</a>);
    }
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** The same text without the link marks, for search-engine data. */
export function stripInline(text: string): string {
  return text.replace(LINK, "$1");
}

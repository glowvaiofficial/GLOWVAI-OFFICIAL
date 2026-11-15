// Rules for the mobile-web home's chrome: header tabs, the greeting card, flash-sale countdowns and banner buttons. Pure:
// no React, no network, so the tests load it directly. Same choices as the native app (src/features/shop/home/homeChrome.ts).
//
// - Header tabs: "For You", one tab per skin concern (the shop's concern filter ids) and "All categories". A concern tab
//   tints the header in its accent and narrows the home's products to that concern.
// - Greeting card: the first name, the delivery estimate for the chosen address, and the newest order still on its way.

import { paletteAccent } from '../../../../lib/shop/accents';
import { CONCERN_KEYWORDS } from '../lib/firstVisit';

export interface HomeTab {
  /** 'for-you', 'all', or a concern id from the shop's filters. */
  id: string;
  label: string;
  /** The concern this tab narrows to, or null. */
  concern: string | null;
  accent: string;
}

/** The brand blue: the header colour for "For You". */
export const FOR_YOU_ACCENT = '#0057FB';

export const CONCERN_TABS: readonly { id: string; label: string }[] = [
  { id: 'acne', label: 'Acne care' },
  { id: 'hydration', label: 'Hydration' },
  { id: 'brightening', label: 'Glow' },
  { id: 'antiaging', label: 'Firming' },
  { id: 'barrier', label: 'Barrier repair' },
];

export const HOME_TABS: readonly HomeTab[] = [
  { id: 'for-you', label: 'For You', concern: null, accent: FOR_YOU_ACCENT },
  ...CONCERN_TABS.map((c, i) => ({ id: c.id, label: c.label, concern: c.id, accent: paletteAccent(i) })),
  { id: 'all', label: 'All categories', concern: null, accent: FOR_YOU_ACCENT },
];

/** The tab for an id; "all" and unknown ids give "For You" ("all" opens the catalogue instead of becoming a tab). */
export function homeTab(id: string | null | undefined): HomeTab {
  return HOME_TABS.find((t) => t.id === id && t.id !== 'all') ?? HOME_TABS[0];
}

/** True when the product's name, description or actives carry one of the concern's keywords (same rule as the browse filter). */
export function matchesConcern(product: { name?: string; description?: string; keyActives?: readonly string[] }, concern: string | null): boolean {
  if (!concern) return true;
  const keywords = CONCERN_KEYWORDS[concern];
  if (!keywords) return true;
  const haystack = `${product.name ?? ''} ${product.description ?? ''} ${(product.keyActives ?? []).join(' ')}`.toLowerCase();
  return keywords.some((kw) => haystack.includes(kw));
}

/** "Hi, Priya" from the profile name; "Hi there" without one. Only letters, marks, apostrophes and hyphens are kept. */
export function greetingLine(fullName: string | null | undefined): string {
  const first = (fullName ?? '').trim().split(/\s+/)[0] ?? '';
  const clean = first.replace(/[^\p{L}\p{M}'-]/gu, '').slice(0, 20);
  return clean ? `Hi, ${clean}` : 'Hi there';
}

/** "~ 15 mins" for a known estimate, else null. */
export function etaLabel(minutes: number | null | undefined): string | null {
  return typeof minutes === 'number' && Number.isFinite(minutes) && minutes > 0 ? `~ ${Math.round(minutes)} mins` : null;
}

/** The greeting card's delivery cell: the estimate when known, else the area, else nothing. */
export function deliveryCell(minutes: number | null | undefined, area: string | null | undefined): { title: string; value: string } | null {
  const eta = etaLabel(minutes);
  if (eta) return { title: 'Delivery in', value: eta };
  const place = (area ?? '').split(',')[0]?.trim() ?? '';
  return place ? { title: 'Delivering to', value: place.slice(0, 24) } : null;
}

/** Statuses of an order that is still on its way. */
export const ACTIVE_ORDER_STATUSES: readonly string[] = ['PLACED', 'VENDOR_ACCEPTED', 'PACKED', 'READY_FOR_PICKUP', 'DISPATCHED', 'OUT_FOR_DELIVERY'];

/** The newest order still on its way, or null. */
export function activeOrder<T extends { orderId: string; status: string; createdAt: number | null }>(orders: readonly T[] | null | undefined): T | null {
  if (!Array.isArray(orders)) return null;
  let best: T | null = null;
  for (const o of orders) {
    if (!o || typeof o.orderId !== 'string' || !ACTIVE_ORDER_STATUSES.includes(String(o.status).toUpperCase())) continue;
    if (best === null || (o.createdAt ?? 0) > (best.createdAt ?? 0)) best = o;
  }
  return best;
}

/** "01h : 24m" until the end. Minutes round up, so a live sale never reads 00h : 00m early; never negative. */
export function endsInText(ms: number): string {
  const totalMin = Number.isFinite(ms) ? Math.max(0, Math.ceil(ms / 60000)) : 0;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}h : ${String(m).padStart(2, '0')}m`;
}

/** The soonest-ending sale still running at `now`, or null. */
export function soonestLiveSale<T extends { endsAt: number }>(sales: readonly T[] | null | undefined, now: number): T | null {
  if (!Array.isArray(sales)) return null;
  let best: T | null = null;
  for (const s of sales) {
    if (!s || typeof s.endsAt !== 'number' || !(s.endsAt > now)) continue;
    if (best === null || s.endsAt < best.endsAt) best = s;
  }
  return best;
}

/**
 * The button text for an admin card that has no button text of its own (help and gift cards), from where it leads:
 * membership pages "Join now", help pages "Get help", gift pages "Send a gift", referral pages "Invite", else "Explore".
 */
export function ctaLabelForLink(link: string | null | undefined): string {
  const l = (link ?? '').toLowerCase();
  if (/plus|member|subscri|club|loyal/.test(l)) return 'Join now';
  if (/contact|help|support/.test(l)) return 'Get help';
  if (/gift/.test(l)) return 'Send a gift';
  if (/refer/.test(l)) return 'Invite';
  return 'Explore';
}

/** Internal links only (a path on this site); anything else falls back to the shop. */
export const safeInternalLink = (link: string | null | undefined): string | null => {
  const l = (link ?? '').trim();
  return l.startsWith('/') && !l.startsWith('//') ? l : null;
};

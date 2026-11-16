import type { SkincareProduct } from '../../../core/data/indianSkincareCatalog';
import { isSellable, LOW_STOCK_AT } from '../../../../lib/shop/variants';
import { isWarmColour } from '../../../../lib/shop/theme';
import type { BadgeName, Campaign, LookSettings } from '../../../../lib/shop/layoutStyle';
import { feedbackOn, type FeedbackKey } from '../../../../lib/shop/layoutStyle';

// Pure rules for the designer style options on the website (both homes). Nothing here reads the network or invents data:
// stock, delivery time and discounts come from the product itself; a missing value means the badge or bar is not shown.

// Units in stock for a product, or null when stock is not tracked. A product with sizes or shades adds up its variants and
// is unknown as soon as one variant is not tracked.
export function stockOf(p: Pick<SkincareProduct, 'stock' | 'variants'>): number | null {
  if (p.variants && p.variants.length > 0) {
    const sellable = p.variants.filter(isSellable);
    if (sellable.length === 0) return 0;
    let total = 0;
    for (const v of sellable) {
      if (v.stock === null) return null;
      total += v.stock;
    }
    return total;
  }
  return typeof p.stock === 'number' && Number.isFinite(p.stock) ? p.stock : null;
}

// Sold out only when stock is known and is zero.
export const isSoldOut = (p: Pick<SkincareProduct, 'stock' | 'variants'>): boolean => stockOf(p) === 0;

// "Only N left" count for the low-stock badge (1 to LOW_STOCK_AT), else null.
export function lowStockLeft(p: Pick<SkincareProduct, 'stock' | 'variants'>): number | null {
  const n = stockOf(p);
  return n !== null && n > 0 && n <= LOW_STOCK_AT ? n : null;
}

// The "Almost gone" bar: shown from real stock only, when 1 to 10 are left. Fill is the share of 10 that is left.
export const STOCK_BAR_AT = 10;
export function stockBar(p: Pick<SkincareProduct, 'stock' | 'variants'>): { left: number; pct: number } | null {
  const n = stockOf(p);
  if (n === null || n <= 0 || n > STOCK_BAR_AT) return null;
  return { left: n, pct: Math.round((n / STOCK_BAR_AT) * 100) };
}

// Product ids the "new" and "bestseller" badges apply to, from the live catalogue: the six newest listings (the catalogue
// lists new products last), and the rated products that lead the ranking (rating 4.5 or more with reviews, top eight).
export function badgeSets(catalog: readonly SkincareProduct[]): { fresh: Set<string>; best: Set<string> } {
  const fresh = new Set(catalog.slice(-6).map((p) => p.id));
  const best = new Set(
    catalog
      .filter((p) => (p.rating ?? 0) >= 4.5 && (p.reviewCount ?? 0) > 0)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0))
      .slice(0, 8)
      .map((p) => p.id)
  );
  return { fresh, best };
}

export interface BadgeView { key: BadgeName; label: string }

// The badges to draw on a product, in the order the admin chose. A badge is left out when its real data is missing.
export function badgesFor(p: SkincareProduct, wanted: readonly BadgeName[], sets: { fresh: Set<string>; best: Set<string> }, discount: number): BadgeView[] {
  const out: BadgeView[] = [];
  for (const key of wanted) {
    if (key === 'discount' && discount > 0) out.push({ key, label: `${discount}% OFF` });
    else if (key === 'new' && sets.fresh.has(p.id)) out.push({ key, label: 'New' });
    else if (key === 'bestseller' && sets.best.has(p.id)) out.push({ key, label: 'Bestseller' });
    else if (key === 'low-stock') {
      const left = lowStockLeft(p);
      if (left !== null) out.push({ key, label: `Only ${left} left` });
    } else if (key === 'delivery-time' && p.deliveryMinutes) out.push({ key, label: `${p.deliveryMinutes} mins` });
    else if (key === 'sponsored') out.push({ key, label: 'Sponsored' });
  }
  return out;
}

// "Sale ends in 2d 3h", "3h 12m", "9m": null once the end time is past or not valid.
export function countdownLabel(endsAtIso: string, now: number): string | null {
  const end = Date.parse(endsAtIso);
  if (!Number.isFinite(end) || end <= now) return null;
  const mins = Math.floor((end - now) / 60000);
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${Math.max(1, m)}m`;
}

// Campaign palettes: a page wash, a tint for section accents and an accent for banners. Cool or neutral only; the brand
// blue (buttons, links, prices) is never replaced. Any colour the warm-colour guard rejects is dropped, so a mistake in this
// table can never put a warm hue on the page.
export interface CampaignPalette { wash: string; tint: string; accent: string }
const CAMPAIGN_PALETTES: Record<Campaign, CampaignPalette | null> = {
  everyday: null,
  festival: { wash: '#f8f1fc', tint: '#efdcf8', accent: '#7a2ea8' },
  monsoon: { wash: '#eaf6f8', tint: '#cfe9ee', accent: '#0f7f8f' },
  summer: { wash: '#eaf6ff', tint: '#cdeaff', accent: '#0a8fb8' },
  winter: { wash: '#f2f5f9', tint: '#e0e6ef', accent: '#55657f' },
  sale: { wash: '#eef0ff', tint: '#d9ddff', accent: '#2b2f9e' },
  'new-season': { wash: '#f1faf6', tint: '#d6f0e5', accent: '#0b7f63' },
  minimal: { wash: '#ffffff', tint: '#eef3ff', accent: '#0057fb' },
};

export function campaignPalette(c: Campaign | undefined): CampaignPalette | null {
  const p = c ? CAMPAIGN_PALETTES[c] : null;
  if (!p) return null;
  return [p.wash, p.tint, p.accent].some(isWarmColour) ? null : p;
}
export const campaignKeys = (): Campaign[] => Object.keys(CAMPAIGN_PALETTES) as Campaign[];
export function campaignRawPalette(c: Campaign): CampaignPalette | null {
  return CAMPAIGN_PALETTES[c];
}

// Feedback switches. Feedback only runs when the admin saved a look at all (so a site with no look behaves exactly as
// before); then each missing switch takes the contract default (all on, confetti off).
export function feedbackEnabled(look: LookSettings | undefined, key: FeedbackKey): boolean {
  return look !== undefined && feedbackOn(look, key);
}

export function vibrate(look: LookSettings | undefined, ms = 12): void {
  if (!feedbackEnabled(look, 'haptics')) return;
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(ms);
  } catch {
    // Not supported: nothing happens.
  }
}

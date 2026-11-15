// Shop home rules that do not need React: category tiles and their counts, product rails with no repeats, and the footer
// link groups. Kept pure so the home tests can call them directly.

import type { SkincareProduct } from '../../../core/data/indianSkincareCatalog';
import type { ScreenName } from '../../../context/contextDefinition';
import type { HomeBlockId } from './useHomeLayout';
import { isTrialProduct } from '../shared/shopUtils';

export type HomeCategoryId = SkincareProduct['category'];

export const HOME_CATEGORY_TILES: { id: HomeCategoryId; label: string }[] = [
  { id: 'Serums', label: 'Serums' },
  { id: 'Moisturizers', label: 'Moisturizers' },
  { id: 'Suncare', label: 'Sunscreen' },
  { id: 'Cleansers', label: 'Cleansers' },
  { id: 'Treatments', label: 'Treatments' },
];

export interface HomeCategoryTile {
  id: HomeCategoryId;
  label: string;
  // Every catalogue product in the category. The category screen lists the same products, so the number matches it.
  count: number;
  // The product whose photo and colour the tile shows: the first full-size product, else any product in the category.
  sample: SkincareProduct | null;
}

export function categoryTiles(catalog: SkincareProduct[]): HomeCategoryTile[] {
  return HOME_CATEGORY_TILES.map(({ id, label }) => {
    const inCategory = catalog.filter((p) => p.category === id);
    const fullSize = inCategory.find((p) => !isTrialProduct(p));
    return { id, label, count: inCategory.length, sample: fullSize ?? inCategory[0] ?? null };
  });
}

export interface RailCandidate {
  id: string;
  title: string;
  products: SkincareProduct[];
  limit: number;
}

// Rails are filled in the order given. A product already shown in an earlier rail is skipped, so the same product never
// appears in two rails. A rail left with no products is dropped rather than shown empty.
export function dedupeRails(rails: RailCandidate[]): { id: string; title: string; products: SkincareProduct[] }[] {
  const shown = new Set<string>();
  const out: { id: string; title: string; products: SkincareProduct[] }[] = [];
  for (const rail of rails) {
    const products: SkincareProduct[] = [];
    for (const product of rail.products) {
      if (products.length >= rail.limit) break;
      if (shown.has(product.id)) continue;
      shown.add(product.id);
      products.push(product);
    }
    if (products.length > 0) out.push({ id: rail.id, title: rail.title, products });
  }
  return out;
}

const SOCIAL_LABELS: Record<string, string> = { instagram: 'Instagram', twitter: 'X', youtube: 'YouTube', linkedin: 'LinkedIn', facebook: 'Facebook' };

// Social links only for the networks that have an https address configured (an empty value is left out).
export function configuredSocials(socials: Record<string, string | undefined>): { label: string; url: string }[] {
  return Object.entries(SOCIAL_LABELS).flatMap(([key, label]) => {
    const url = socials[key]?.trim() ?? '';
    return /^https:\/\//.test(url) ? [{ label, url }] : [];
  });
}

// The social addresses to show: a footer detail the admin set takes the place of that network's configured link; an
// empty footer detail keeps the configured link, so no existing link disappears.
export function mergeFooterSocials(configured: Record<string, string | undefined>, footer: { instagramUrl: string; facebookUrl: string; youtubeUrl: string; linkedinUrl: string; xUrl: string }): Record<string, string | undefined> {
  return {
    ...configured,
    instagram: footer.instagramUrl || configured.instagram,
    facebook: footer.facebookUrl || configured.facebook,
    youtube: footer.youtubeUrl || configured.youtube,
    linkedin: footer.linkedinUrl || configured.linkedin,
    twitter: footer.xUrl || configured.twitter,
  };
}

export type FooterLink ={ label: string; screen: ScreenName; params?: Record<string, string> } | { label: string; href: string };

export interface FooterGroup {
  title: string;
  links: FooterLink[];
}

// Every link the home footer had before the redesign is kept here (see the footer test for the list it must contain).
export const HOME_FOOTER_GROUPS: FooterGroup[] = [
  {
    title: 'Shop',
    links: [
      { label: 'Skin Care', screen: 'shop-browse' },
      { label: 'Orders', screen: 'orders-list' },
      { label: 'AI Skin Scan', screen: 'scan-camera' },
    ],
  },
  {
    title: 'Help',
    links: [
      { label: 'Help & Support', screen: 'profile-support' },
      { label: 'Returns & Refunds', screen: 'profile-support' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About us', href: '/about' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Use', href: '/terms' },
    ],
  },
];

// ---- Price-point tiles, bestsellers and new launches: all from the live catalogue (full-size products only).

export const PRICE_POINTS = [299, 499, 999] as const;

export interface PricePointTile {
  max: number;
  label: string;
  count: number;
  // A product under the limit whose photo the tile shows (the best rated one).
  sample: SkincareProduct | null;
}

const fullSize = (catalog: SkincareProduct[]) => catalog.filter((p) => !isTrialProduct(p));

// One tile per price point that has at least one product under it. A price point with none is left out (nothing empty).
export function pricePointTiles(catalog: SkincareProduct[]): PricePointTile[] {
  const products = fullSize(catalog);
  return PRICE_POINTS.flatMap((max) => {
    const under = products.filter((p) => p.price > 0 && p.price < max);
    if (under.length === 0) return [];
    const best = [...under].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0];
    return [{ max, label: `Under ₹${max}`, count: under.length, sample: best ?? null }];
  });
}

// Best rated first (then most reviewed). Trial samples are left out.
export function bestsellerList(catalog: SkincareProduct[]): SkincareProduct[] {
  return fullSize(catalog).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
}

// The newest listings first (the catalogue lists new products last).
export function newLaunchList(catalog: SkincareProduct[]): SkincareProduct[] {
  return fullSize(catalog).reverse();
}

// ---- Home order: one structure for the phone and the PC home (design spec section 5).

export type HomeModuleId = HomeBlockId | 'price-points' | 'bestsellers' | 'new-launches' | 'concerns' | 'recent' | 'scan';

// The admin designer controls the order and on/off of the blocks (layout `blocks`). Each block draws one or more modules;
// modules the designer has no block for stay anchored right after their related block, so they move with it. To draw a new
// designer block, add one entry here (and its case in the homes). Unknown block ids draw nothing.
export const BLOCK_MODULES: Readonly<Record<string, readonly HomeModuleId[]>> = {
  hero: ['hero'],
  categories: ['categories'],
  offers: ['offers'],
  promos: ['promos'],
  deals: ['deals', 'price-points'],
  'product-rails': ['bestsellers', 'new-launches', 'product-rails', 'concerns'],
  brands: ['brands'],
  'mini-banners': ['mini-banners'],
  reorder: ['reorder', 'recent'],
  'help-gift': ['help-gift'],
  trust: ['trust'],
  footer: ['scan', 'footer'],
  // Blocks added by the admin designer: each draws itself where the admin put it.
  'festival-strip': ['festival-strip'],
  'bank-offers': ['bank-offers'],
  cashback: ['cashback'],
  partners: ['partners'],
  stories: ['stories'],
  sponsored: ['sponsored'],
  'recently-viewed': ['recently-viewed'],
  recommended: ['recommended'],
};


// The modules to draw, in the designer's block order. Blocks the layout leaves out stay hidden. The scan card always
// shows, before the footer (or last when the footer block is off).
export function homeSequence(layoutOrder: readonly string[]): HomeModuleId[] {
  const out: HomeModuleId[] = [];
  for (const id of layoutOrder) for (const m of BLOCK_MODULES[id] ?? []) if (!out.includes(m)) out.push(m);
  // The designer's own "Recently viewed" block replaces the built-in rail, so the customer never sees two.
  if (out.includes('recently-viewed')) {
    const r = out.indexOf('recent');
    if (r >= 0) out.splice(r, 1);
  }
  if (!out.includes('scan')) {
    const f = out.indexOf('footer');
    if (f >= 0) out.splice(f, 0, 'scan');
    else out.push('scan');
  }
  return out;
}

// ---- Recently viewed / Recommended blocks (admin designer): the number of products to show, from the block's maxItems.

export const DEFAULT_MAX_ITEMS = 8;
export const clampMaxItems = (n: unknown): number => (typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 24 ? n : DEFAULT_MAX_ITEMS);

// Catalogue products to recommend, ranked from what the customer viewed lately (most recent counts most: same category and
// same brand score) and from the concern picks (skin quiz). Products already viewed are left out. With no history and no
// concern picks the list is empty (the block then hides). recentIds is newest first.
export function recommendedProducts(
  catalog: SkincareProduct[],
  recentIds: readonly string[],
  concernPicks: readonly SkincareProduct[],
  max: number,
): SkincareProduct[] {
  const pool = fullSize(catalog);
  const byId = new Map(pool.map((p) => [p.id, p] as const));
  const viewed = recentIds.map((id) => byId.get(id)).filter((p): p is SkincareProduct => Boolean(p));
  if (viewed.length === 0 && concernPicks.length === 0) return [];
  const seen = new Set(recentIds);
  const catScore = new Map<string, number>();
  const brandScore = new Map<string, number>();
  viewed.forEach((p, i) => {
    const w = Math.max(1, 10 - i);
    catScore.set(p.category, (catScore.get(p.category) ?? 0) + w);
    brandScore.set(p.brand, (brandScore.get(p.brand) ?? 0) + w / 2);
  });
  const picked = new Set(concernPicks.map((p) => p.id));
  return pool
    .filter((p) => !seen.has(p.id))
    .map((p) => ({ p, score: (catScore.get(p.category) ?? 0) + (brandScore.get(p.brand) ?? 0) + (picked.has(p.id) ? 12 : 0) }))
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score || (b.p.rating ?? 0) - (a.p.rating ?? 0))
    .slice(0, clampMaxItems(max))
    .map((e) => e.p);
}

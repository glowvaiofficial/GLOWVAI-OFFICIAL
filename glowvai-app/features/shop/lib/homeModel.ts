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

// Each module and the admin block that switches it on: a block the admin left out of the layout hides its modules.
// Catalogue modules follow the product block. The order is fixed by the spec; the content comes from the admin and the catalogue.
const HOME_SEQUENCE: { id: HomeModuleId; needs?: HomeBlockId }[] = [
  { id: 'hero', needs: 'hero' },
  { id: 'categories', needs: 'categories' },
  { id: 'offers', needs: 'offers' },
  { id: 'promos', needs: 'promos' },
  { id: 'deals', needs: 'deals' },
  { id: 'price-points', needs: 'product-rails' },
  { id: 'bestsellers', needs: 'product-rails' },
  { id: 'new-launches', needs: 'product-rails' },
  { id: 'product-rails', needs: 'product-rails' },
  { id: 'concerns', needs: 'product-rails' },
  { id: 'brands', needs: 'brands' },
  { id: 'mini-banners', needs: 'mini-banners' },
  { id: 'reorder', needs: 'reorder' },
  { id: 'recent', needs: 'product-rails' },
  { id: 'help-gift', needs: 'help-gift' },
  { id: 'trust', needs: 'trust' },
  { id: 'scan' },
  { id: 'footer', needs: 'footer' },
];

export function homeSequence(layoutOrder: readonly HomeBlockId[]): HomeModuleId[] {
  return HOME_SEQUENCE.filter((m) => !m.needs || layoutOrder.includes(m.needs)).map((m) => m.id);
}

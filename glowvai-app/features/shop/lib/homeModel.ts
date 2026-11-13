// Shop home rules that do not need React: category tiles and their counts, product rails with no repeats, and the footer
// link groups. Kept pure so the home tests can call them directly.

import type { SkincareProduct } from '../../../core/data/indianSkincareCatalog';
import type { ScreenName } from '../../../context/contextDefinition';
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

const SOCIAL_LABELS: Record<string, string> = { instagram: 'Instagram', twitter: 'X', youtube: 'YouTube', linkedin: 'LinkedIn' };

// Social links only for the networks that have an https address configured (an empty value is left out).
export function configuredSocials(socials: Record<string, string | undefined>): { label: string; url: string }[] {
  return Object.entries(SOCIAL_LABELS).flatMap(([key, label]) => {
    const url = socials[key]?.trim() ?? '';
    return /^https:\/\//.test(url) ? [{ label, url }] : [];
  });
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

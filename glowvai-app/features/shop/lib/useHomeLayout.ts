import { useEffect, useState } from 'react';

// The homepage block order the GlowVai team published (a staff preview link shows the draft). Starts with the built-in
// order, so the page never waits for the request.
export type HomeBlockId =
  | 'hero' | 'mini-banners' | 'offers' | 'categories' | 'promos' | 'deals' | 'reorder'
  | 'product-rails' | 'brands' | 'trust' | 'help-gift' | 'footer';

export const DEFAULT_BLOCK_ORDER: HomeBlockId[] = [
  'hero', 'mini-banners', 'offers', 'categories', 'promos', 'deals', 'reorder', 'product-rails', 'brands', 'trust', 'help-gift', 'footer',
];

export interface BlockItem { label: string; sub: string; link: string; image: string }
export interface BlockSettings { title: string; background: string; textColor: string; items: BlockItem[] }
export interface ProductRowView { title: string; source: 'category' | 'brand' | 'bestsellers' | 'new'; value: string; limit: number }
export interface HeroOverride { title: string; subtitle: string; ctaLabel: string; ctaLink: string; image: string }
// The footer details the admin set: each URL is '' (hidden) or a checked https address; companyLine is '' or plain text.
export interface FooterDetails { appStoreUrl: string; playStoreUrl: string; instagramUrl: string; facebookUrl: string; youtubeUrl: string; linkedinUrl: string; xUrl: string; companyLine: string }
export const EMPTY_FOOTER_DETAILS: FooterDetails = { appStoreUrl: '', playStoreUrl: '', instagramUrl: '', facebookUrl: '', youtubeUrl: '', linkedinUrl: '', xUrl: '', companyLine: '' };
export interface HomeLayoutView { order: HomeBlockId[]; settings: Partial<Record<HomeBlockId, BlockSettings>>; rows: ProductRowView[]; hero: HeroOverride | null; footer: FooterDetails }

export function useHomeLayout(): HomeLayoutView {
  const [order, setOrder] = useState<HomeBlockId[]>(DEFAULT_BLOCK_ORDER);
  const [settings, setSettings] = useState<Partial<Record<HomeBlockId, BlockSettings>>>({});
  const [rows, setRows] = useState<ProductRowView[]>([]);
  const [hero, setHero] = useState<HeroOverride | null>(null);
  const [footer, setFooter] = useState<FooterDetails>(EMPTY_FOOTER_DETAILS);
  useEffect(() => {
    let alive = true;
    let token: string | null = null;
    try {
      token = new URLSearchParams(window.location.search).get('preview');
    } catch {
      token = null;
    }
    const url = token ? `/api/shop/layout?preview=${encodeURIComponent(token)}` : '/api/shop/layout';
    fetch(url, { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive || !data) return;
        if (Array.isArray(data.blocks)) setOrder(data.blocks as HomeBlockId[]);
        if (data.settings && typeof data.settings === 'object') setSettings(data.settings as Partial<Record<HomeBlockId, BlockSettings>>);
        if (Array.isArray(data.rows)) setRows(data.rows as ProductRowView[]);
        if (data.hero && typeof data.hero === 'object') setHero(data.hero as HeroOverride);
        if (data.footer && typeof data.footer === 'object') setFooter({ ...EMPTY_FOOTER_DETAILS, ...(data.footer as Partial<FooterDetails>) });
      })
      .catch(() => {
        // The built-in order stays.
      });
    return () => {
      alive = false;
    };
  }, []);
  return { order, settings, rows, hero, footer };
}

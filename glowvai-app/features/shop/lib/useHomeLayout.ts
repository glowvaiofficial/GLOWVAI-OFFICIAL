import { useEffect, useState } from 'react';

// The homepage block order the GlowVai team published (a staff preview link shows the draft). Starts with the built-in
// order, so the page never waits for the request.
export type HomeBlockId =
  | 'hero' | 'mini-banners' | 'offers' | 'categories' | 'promos' | 'deals' | 'reorder'
  | 'product-rails' | 'brands' | 'trust' | 'help-gift' | 'footer';

export const DEFAULT_BLOCK_ORDER: HomeBlockId[] = [
  'hero', 'mini-banners', 'offers', 'categories', 'promos', 'deals', 'reorder', 'product-rails', 'brands', 'trust', 'help-gift', 'footer',
];

export interface BlockItem { label: string; sub: string; link: string }
export interface BlockSettings { title: string; background: string; textColor: string; items: BlockItem[] }
export interface HomeLayoutView { order: HomeBlockId[]; settings: Partial<Record<HomeBlockId, BlockSettings>> }

export function useHomeLayout(): HomeLayoutView {
  const [order, setOrder] = useState<HomeBlockId[]>(DEFAULT_BLOCK_ORDER);
  const [settings, setSettings] = useState<Partial<Record<HomeBlockId, BlockSettings>>>({});
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
      })
      .catch(() => {
        // The built-in order stays.
      });
    return () => {
      alive = false;
    };
  }, []);
  return { order, settings };
}

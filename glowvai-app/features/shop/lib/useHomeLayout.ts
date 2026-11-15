import { useEffect, useState } from 'react';
import { DESKTOP_MEDIA_QUERY, forcedHomeDevice, homeLayoutUrl, pickHomeDevice, type HomeDevice } from './homeDevice';

export type { HomeDevice } from './homeDevice';

// The homepage block order the GlowVai team published (a staff preview link shows the draft). Starts with the built-in
// order, so the page never waits for the request. The desktop home asks for the desktop layout (device=desktop); the
// server answers with the mobile one when no desktop layout is saved (fallback).
export type HomeBlockId =
  | 'hero' | 'mini-banners' | 'offers' | 'categories' | 'promos' | 'deals' | 'reorder'
  | 'product-rails' | 'brands' | 'trust' | 'help-gift' | 'footer';

export const DEFAULT_BLOCK_ORDER: HomeBlockId[] = [
  'hero', 'categories', 'offers', 'promos', 'deals', 'product-rails', 'brands', 'mini-banners', 'reorder', 'help-gift', 'trust', 'footer',
];

export interface BlockItem { label: string; sub: string; link: string; image: string }
export interface BlockSettings { title: string; background: string; textColor: string; items: BlockItem[] }
export interface ProductRowView { title: string; source: 'category' | 'brand' | 'bestsellers' | 'new' | 'price-band' | 'price-drop'; value: string; limit: number }
export interface HeroOverride { title: string; subtitle: string; ctaLabel: string; ctaLink: string; image: string }
// The footer details the admin set: each URL is '' (hidden) or a checked https address; companyLine is '' or plain text.
export interface FooterDetails { appStoreUrl: string; playStoreUrl: string; instagramUrl: string; facebookUrl: string; youtubeUrl: string; linkedinUrl: string; xUrl: string; companyLine: string }
export const EMPTY_FOOTER_DETAILS: FooterDetails = { appStoreUrl: '', playStoreUrl: '', instagramUrl: '', facebookUrl: '', youtubeUrl: '', linkedinUrl: '', xUrl: '', companyLine: '' };
export interface HomeLayoutView {
  order: HomeBlockId[];
  settings: Partial<Record<HomeBlockId, BlockSettings>>;
  rows: ProductRowView[];
  hero: HeroOverride | null;
  footer: FooterDetails;
  // True when the server answered a staff preview (draft) request.
  preview: boolean;
  // True when the desktop home was given the mobile layout because no desktop layout is saved.
  fallback: boolean;
  // Each block's section accent ("#RRGGBB") the admin set, also for blocks with no items. Only the desktop home uses it.
  sectionAccents: Partial<Record<HomeBlockId, string>>;
}

// The valid section accents of a layout reply (anything that is not "#RRGGBB" is left out).
function readSectionAccents(value: unknown): Partial<Record<HomeBlockId, string>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Partial<Record<HomeBlockId, string>> = {};
  for (const [id, accent] of Object.entries(value as Record<string, unknown>)) {
    if (typeof accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(accent)) out[id as HomeBlockId] = accent;
  }
  return out;
}

export const DEFAULT_LAYOUT_VIEW: HomeLayoutView = { order: DEFAULT_BLOCK_ORDER, settings: {}, rows: [], hero: null, footer: EMPTY_FOOTER_DETAILS, preview: false, fallback: false, sectionAccents: {} };

// The page's view of a layout reply. Each field the reply gets wrong keeps its built-in value.
export function readLayoutResponse(data: unknown): HomeLayoutView {
  const d = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  return {
    order: Array.isArray(d.blocks) ? (d.blocks as HomeBlockId[]) : DEFAULT_BLOCK_ORDER,
    settings: d.settings && typeof d.settings === 'object' ? (d.settings as Partial<Record<HomeBlockId, BlockSettings>>) : {},
    rows: Array.isArray(d.rows) ? (d.rows as ProductRowView[]) : [],
    hero: d.hero && typeof d.hero === 'object' ? (d.hero as HeroOverride) : null,
    footer: d.footer && typeof d.footer === 'object' ? { ...EMPTY_FOOTER_DETAILS, ...(d.footer as Partial<FooterDetails>) } : EMPTY_FOOTER_DETAILS,
    preview: d.preview === true,
    fallback: d.fallback === true,
    sectionAccents: readSectionAccents(d.sectionAccents),
  };
}

const readPreviewToken = (): string | null => {
  try {
    return new URLSearchParams(window.location.search).get('preview');
  } catch {
    return null;
  }
};

// Layouts already loaded in this app session, by request. Switching between the desktop and mobile home (a window
// resized across 1024px) shows the layout it already has at once, then refreshes it.
const layoutCache = new Map<string, HomeLayoutView>();

export function useHomeLayout(device: HomeDevice = 'mobile'): HomeLayoutView {
  const url = homeLayoutUrl(device, readPreviewToken());
  const [view, setView] = useState<HomeLayoutView>(() => layoutCache.get(url) ?? DEFAULT_LAYOUT_VIEW);
  useEffect(() => {
    let alive = true;
    const cached = layoutCache.get(url);
    if (cached) setView(cached);
    fetch(url, { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive || !data) return;
        const next = readLayoutResponse(data);
        layoutCache.set(url, next);
        setView(next);
      })
      .catch(() => {
        // The built-in order stays.
      });
    return () => {
      alive = false;
    };
  }, [url]);
  return view;
}

// The ?device= parameter is read once, when the app opens: the shop changes the address as the customer moves between
// screens, and the choice must hold for the whole visit (the admin preview frames load the shop with it).
let forcedAtStart: HomeDevice | null | undefined;
function startForcedDevice(): HomeDevice | null {
  if (forcedAtStart === undefined) {
    try {
      forcedAtStart = forcedHomeDevice(window.location.search);
    } catch {
      forcedAtStart = null;
    }
  }
  return forcedAtStart;
}

const wideNow = (): boolean => {
  try {
    return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
  } catch {
    return false;
  }
};

// The home to show on this screen. Follows the window width live, so resizing across 1024px switches homes without a reload.
export function useHomeDevice(): HomeDevice {
  const forced = startForcedDevice();
  const [wide, setWide] = useState(wideNow);
  useEffect(() => {
    if (forced) return;
    let mq: MediaQueryList;
    try {
      mq = window.matchMedia(DESKTOP_MEDIA_QUERY);
    } catch {
      return;
    }
    const update = () => setWide(mq.matches);
    update();
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    }
    mq.addListener(update);
    return () => mq.removeListener(update);
  }, [forced]);
  return pickHomeDevice(forced, wide);
}

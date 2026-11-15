import { useEffect, useState } from 'react';
import { publishMaintenance } from './maintenance';
import { DESKTOP_MEDIA_QUERY, forcedHomeDevice, homeLayoutUrl, pickHomeDevice, type HomeDevice } from './homeDevice';

export type { HomeDevice } from './homeDevice';

// The homepage block order the GlowVai team published (a staff preview link shows the draft). Starts with the built-in
// order, so the page never waits for the request. The desktop home asks for the desktop layout (device=desktop); the
// server answers with the mobile one when no desktop layout is saved (fallback).
export type HomeBlockId =
  | 'hero' | 'mini-banners' | 'offers' | 'categories' | 'promos' | 'deals' | 'reorder'
  | 'product-rails' | 'brands' | 'trust' | 'help-gift' | 'footer'
  | 'festival-strip' | 'bank-offers' | 'cashback' | 'partners' | 'stories' | 'sponsored' | 'recently-viewed' | 'recommended';

// The blocks the admin designer added later. Item blocks draw the admin's items; the two product blocks draw catalogue products.
export const ITEM_BLOCK_IDS = ['festival-strip', 'bank-offers', 'cashback', 'partners', 'stories', 'sponsored'] as const;
export type ItemBlockId = (typeof ITEM_BLOCK_IDS)[number];
export const PRODUCT_BLOCK_IDS = ['recently-viewed', 'recommended'] as const;
export type ProductBlockId = (typeof PRODUCT_BLOCK_IDS)[number];

export const DEFAULT_BLOCK_ORDER: HomeBlockId[] = [
  'hero', 'categories', 'offers', 'promos', 'deals', 'product-rails', 'brands', 'mini-banners', 'reorder', 'help-gift', 'trust', 'footer',
];

export interface BlockItem { label: string; sub: string; link: string; image: string; accent?: string }
export interface BlockSettings { title: string; background: string; textColor: string; items: BlockItem[]; accent?: string; maxItems?: number }
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
  // Header options the admin set: search hints that replace the built-in ones, and the delivery-mode switch.
  header: HeaderSettings;
  // The maintenance switch (also read by the maintenance gate).
  maintenance: MaintenanceState;
}

export interface DeliveryMode { label: string; link: string }
export interface HeaderSettings { searchHints: string[]; deliveryModes: DeliveryMode[]; showDeliveryModes: boolean }
export const EMPTY_HEADER_SETTINGS: HeaderSettings = { searchHints: [], deliveryModes: [], showDeliveryModes: false };
export interface MaintenanceState { enabled: boolean; message: string; until: number | null }
export const NO_MAINTENANCE: MaintenanceState = { enabled: false, message: '', until: null };

const str = (v: unknown, max = 300): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const HEX = /^#[0-9a-fA-F]{6}$/;

// The header options of a layout reply. Anything malformed is dropped; a missing field keeps its default.
export function readHeaderSettings(value: unknown): HeaderSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return EMPTY_HEADER_SETTINGS;
  const v = value as Record<string, unknown>;
  const searchHints = (Array.isArray(v.searchHints) ? v.searchHints : []).map((h) => str(h, 80)).filter(Boolean).slice(0, 20);
  const deliveryModes = (Array.isArray(v.deliveryModes) ? v.deliveryModes : [])
    .flatMap((m): DeliveryMode[] => {
      if (!m || typeof m !== 'object') return [];
      const label = str((m as Record<string, unknown>).label, 24);
      const link = str((m as Record<string, unknown>).link, 500);
      return label ? [{ label, link }] : [];
    })
    .slice(0, 4);
  return { searchHints, deliveryModes, showDeliveryModes: v.showDeliveryModes === true };
}

// The maintenance state of a layout reply. `until` becomes epoch milliseconds (a number of ms or seconds, or a date string); anything else is null.
export function readMaintenance(value: unknown): MaintenanceState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return NO_MAINTENANCE;
  const v = value as Record<string, unknown>;
  let until: number | null = null;
  if (typeof v.until === 'number' && Number.isFinite(v.until) && v.until > 0) until = v.until < 1e11 ? v.until * 1000 : v.until;
  else if (typeof v.until === 'string' && v.until.trim()) {
    const t = Date.parse(v.until);
    if (Number.isFinite(t)) until = t;
  }
  return { enabled: v.enabled === true, message: str(v.message, 400), until };
}

// Block settings with every field checked: bad items are dropped, bad text becomes '', maxItems must be a whole number 1-24.
export function readSettingsMap(value: unknown): Partial<Record<HomeBlockId, BlockSettings>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Partial<Record<HomeBlockId, BlockSettings>> = {};
  for (const [id, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const r = raw as Record<string, unknown>;
    const items: BlockItem[] = (Array.isArray(r.items) ? r.items : []).flatMap((it): BlockItem[] => {
      if (!it || typeof it !== 'object') return [];
      const i = it as Record<string, unknown>;
      const item: BlockItem = { label: str(i.label), sub: str(i.sub), link: str(i.link, 500), image: str(i.image, 1000) };
      if (typeof i.accent === 'string' && HEX.test(i.accent)) item.accent = i.accent;
      return [item];
    });
    const settings: BlockSettings = { ...(r as object), title: str(r.title), background: str(r.background, 40), textColor: str(r.textColor, 40), items };
    if (!(typeof r.accent === 'string' && HEX.test(r.accent))) delete settings.accent;
    if (!(typeof r.maxItems === 'number' && Number.isInteger(r.maxItems) && r.maxItems >= 1 && r.maxItems <= 24)) delete settings.maxItems;
    out[id as HomeBlockId] = settings;
  }
  return out;
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

export const DEFAULT_LAYOUT_VIEW: HomeLayoutView = { order: DEFAULT_BLOCK_ORDER, settings: {}, rows: [], hero: null, footer: EMPTY_FOOTER_DETAILS, preview: false, fallback: false, sectionAccents: {}, header: EMPTY_HEADER_SETTINGS, maintenance: NO_MAINTENANCE };

// The page's view of a layout reply. Each field the reply gets wrong keeps its built-in value.
export function readLayoutResponse(data: unknown): HomeLayoutView {
  const d = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  return {
    order: Array.isArray(d.blocks) ? (d.blocks as HomeBlockId[]) : DEFAULT_BLOCK_ORDER,
    settings: readSettingsMap(d.settings),
    rows: Array.isArray(d.rows) ? (d.rows as ProductRowView[]) : [],
    hero: d.hero && typeof d.hero === 'object' ? (d.hero as HeroOverride) : null,
    footer: d.footer && typeof d.footer === 'object' ? { ...EMPTY_FOOTER_DETAILS, ...(d.footer as Partial<FooterDetails>) } : EMPTY_FOOTER_DETAILS,
    preview: d.preview === true,
    fallback: d.fallback === true,
    sectionAccents: readSectionAccents(d.sectionAccents),
    header: readHeaderSettings(d.headerSettings),
    maintenance: readMaintenance(d.maintenance),
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
        publishMaintenance(next.maintenance, next.preview);
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

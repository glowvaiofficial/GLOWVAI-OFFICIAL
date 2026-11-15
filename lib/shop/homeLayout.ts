// The order and on/off state of the homepage blocks (Firestore siteContent/homeLayout, field "published"). Pure.
// The admin sets this; the shop only reads it. Unknown ids are dropped, duplicates keep their first place, the footer is
// always last and always on. With nothing saved, the default order is used.

import { readAccent } from "./accents";

export const HOME_BLOCK_IDS = [
  "hero",
  "festival-strip",
  "mini-banners",
  "offers",
  "bank-offers",
  "cashback",
  "categories",
  "promos",
  "deals",
  "sponsored",
  "reorder",
  "product-rails",
  "recommended",
  "recently-viewed",
  "brands",
  "partners",
  "trust",
  "stories",
  "help-gift",
  "footer",
] as const;
export type HomeBlockId = (typeof HOME_BLOCK_IDS)[number];

export interface HomeLayoutBlock {
  id: HomeBlockId;
  enabled: boolean;
  position: number;
}

export const DEFAULT_HOME_LAYOUT: HomeLayoutBlock[] = HOME_BLOCK_IDS.map((id, i) => ({ id, enabled: true, position: i }));

const isBlockId = (v: unknown): v is HomeBlockId => typeof v === "string" && (HOME_BLOCK_IDS as readonly string[]).includes(v);

// The blocks to show, in order. Footer is always included and last.
export function readHomeLayout(raw: unknown): HomeBlockId[] {
  const stored = raw && typeof raw === "object" && Array.isArray((raw as { blocks?: unknown }).blocks) ? ((raw as { blocks: unknown[] }).blocks) : null;
  if (!stored) return orderOf(DEFAULT_HOME_LAYOUT);
  const seen = new Set<HomeBlockId>();
  const parsed: HomeLayoutBlock[] = [];
  for (const b of stored.slice(0, 40)) {
    if (!b || typeof b !== "object") continue;
    const d = b as Record<string, unknown>;
    if (!isBlockId(d.id) || seen.has(d.id)) continue;
    seen.add(d.id);
    parsed.push({ id: d.id, enabled: d.enabled === true, position: typeof d.position === "number" ? d.position : 999 });
  }
  // Blocks the stored list does not mention yet (an older layout) are added switched on, at their default place: right
  // after the nearest block before them in the default order (else at the end). Existing blocks keep their order.
  const sorted = [...parsed].sort((a, b) => a.position - b.position || HOME_BLOCK_IDS.indexOf(a.id) - HOME_BLOCK_IDS.indexOf(b.id));
  HOME_BLOCK_IDS.forEach((id, di) => {
    if (seen.has(id)) return;
    let at = sorted.length;
    for (let k = di - 1; k >= 0; k--) {
      const idx = sorted.findIndex((b) => b.id === HOME_BLOCK_IDS[k]);
      if (idx >= 0) {
        at = idx + 1;
        break;
      }
    }
    sorted.splice(at, 0, { id, enabled: true, position: 0 });
    seen.add(id);
  });
  return orderOf(sorted.map((b, i) => ({ ...b, position: i })));
}

function orderOf(blocks: HomeLayoutBlock[]): HomeBlockId[] {
  const shown = blocks
    .filter((b) => b.enabled || b.id === "footer")
    .sort((a, b) => a.position - b.position || HOME_BLOCK_IDS.indexOf(a.id) - HOME_BLOCK_IDS.indexOf(b.id))
    .map((b) => b.id)
    .filter((id) => id !== "footer");
  return [...shown, "footer"];
}

// ---- Per-block content (stage 3). The admin sets it; the shop checks it again here.
export interface BlockItem {
  label: string;
  sub: string;
  link: string;
  image: string; // a data URL picture (webp, jpeg or png), or "" for none
  // "#RRGGBB" (upper case) when the admin set a valid accent; left out otherwise (use the default palette, accents.ts).
  accent?: string;
}

export interface BlockSettings {
  title: string;
  background: string;
  textColor: string;
  items: BlockItem[];
  // The section accent (title, chips, "See all"): "#RRGGBB" (upper case), or left out for the default.
  accent?: string;
  // Only on the data-driven blocks (recently-viewed, recommended): how many products to show, 4 to 12 (default 8).
  maxItems?: number;
}

// { accent } for a valid "#RRGGBB" (any case, served upper case); nothing for "", missing or anything else.
const accentPart = (v: unknown): { accent?: string } => {
  const accent = readAccent(v);
  return accent ? { accent } : {};
};

// The most items each block can show. Blocks not listed take no items.
export const BLOCK_ITEM_LIMITS: Partial<Record<HomeBlockId, number>> = {
  "mini-banners": 3,
  offers: 3,
  brands: 12,
  trust: 3,
  "help-gift": 3,
  categories: 8,
  deals: 8,
  promos: 4,
  "festival-strip": 6,
  "bank-offers": 4,
  cashback: 3,
  partners: 12,
  stories: 8,
  sponsored: 1,
};

// Blocks the shop fills from its own data: no items. Listed in `settings` whenever they are on.
export const DATA_BLOCK_IDS = ["recently-viewed", "recommended"] as const;
const isDataBlockId = (id: HomeBlockId): boolean => (DATA_BLOCK_IDS as readonly string[]).includes(id);
export const DATA_MAX_ITEMS = { min: 4, max: 12, fallback: 8 } as const;
const readMaxItems = (v: unknown): number =>
  typeof v === "number" && Number.isInteger(v) && v >= DATA_MAX_ITEMS.min && v <= DATA_MAX_ITEMS.max ? v : DATA_MAX_ITEMS.fallback;

const HEX = /^#[0-9a-fA-F]{6}$/;

const isSafeInternal = (link: string): boolean =>
  link === "" || (link.startsWith("/") && !link.startsWith("//") && !link.includes("\\") && !/[\u0000-\u001f\s]/.test(link) && link.length <= 200);

const IMAGE_MAX = 200_000;
const IMAGE_DATA = /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/]+=*$/;

// A picture is kept only as a small base64 data URL of an allowed type. Anything else means no picture (the item stays).
const readImage = (v: unknown): string => (typeof v === "string" && v.length <= IMAGE_MAX && IMAGE_DATA.test(v) ? v : "");

// keepBadLink: a bad link is dropped alone (the item stays and opens the shop browse page). Used by the category tiles.
function readItem(raw: unknown, keepBadLink = false): BlockItem | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const label = typeof d.label === "string" && d.label.trim().length > 0 && d.label.length <= 40 ? d.label : null;
  const sub = typeof d.sub === "string" && d.sub.length <= 80 ? d.sub : null;
  const link = typeof d.link === "string" && isSafeInternal(d.link) ? d.link : keepBadLink ? "" : null;
  if (label === null || sub === null || link === null) return null;
  return { label, sub, link, image: readImage(d.image), ...accentPart(d.accent) };
}

// A deals item names a product by its id (the link). The image is not used, so it is always "".
const DEAL_PRODUCT_ID = /^[A-Za-z0-9-]{1,128}$/;

function readDealItem(raw: unknown): BlockItem | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const label = typeof d.label === "string" && d.label.trim().length > 0 && d.label.length <= 40 ? d.label : null;
  const sub = typeof d.sub === "string" && d.sub.length <= 80 ? d.sub : null;
  const link = typeof d.link === "string" && DEAL_PRODUCT_ID.test(d.link) ? d.link : null;
  if (label === null || sub === null || link === null) return null;
  return { label, sub, link, image: "", ...accentPart(d.accent) };
}

// The products the deals rail shows when the admin has chosen some: the published ones, in the admin's order, each once.
// Ids that are not in the catalogue (not published, or gone) are skipped. The caller passes the published catalogue.
export function pickDeals<T extends { id: string }>(items: readonly { link: string }[], catalog: readonly T[], limit = BLOCK_ITEM_LIMITS.deals ?? 8): T[] {
  const byId = new Map(catalog.map((p) => [p.id, p] as const));
  const out: T[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const product = byId.get(item.link);
    if (!product || seen.has(product.id)) continue;
    seen.add(product.id);
    out.push(product);
    if (out.length >= limit) break;
  }
  return out;
}

// The page a help or gift card opens when the admin set it no link.
export const HELP_CARD_DEFAULT_LINK = "/contact";

// The content of each block that has any. Blocks with no items are left out, so they keep their placeholder.
export function readBlockSettings(raw: unknown): Partial<Record<HomeBlockId, BlockSettings>> {
  const out: Partial<Record<HomeBlockId, BlockSettings>> = {};
  const blocks = raw && typeof raw === "object" && Array.isArray((raw as { blocks?: unknown }).blocks) ? (raw as { blocks: unknown[] }).blocks : [];
  for (const b of blocks.slice(0, 40)) {
    if (!b || typeof b !== "object") continue;
    const d = b as Record<string, unknown>;
    if (!(HOME_BLOCK_IDS as readonly string[]).includes(d.id as string)) continue;
    const id = d.id as HomeBlockId;
    const s = d.settings && typeof d.settings === "object" ? (d.settings as Record<string, unknown>) : null;
    if (isDataBlockId(id)) {
      // Data-driven blocks have no items. They are listed whenever they are on, with defaults for anything unset.
      if (d.enabled !== true || out[id] !== undefined) continue;
      out[id] = {
        title: s && typeof s.title === "string" && s.title.length <= 60 ? s.title : "",
        background: s && typeof s.background === "string" && HEX.test(s.background) ? s.background : "",
        textColor: s && typeof s.textColor === "string" && HEX.test(s.textColor) ? s.textColor : "",
        items: [],
        maxItems: readMaxItems(s?.maxItems),
        ...accentPart(s?.accent),
      };
      continue;
    }
    if (!s) continue;
    const limit = BLOCK_ITEM_LIMITS[id] ?? 0;
    // Bad items are dropped first, then the limit applies, so a bad item never takes a valid one's place.
    const readOne = id === "deals" ? readDealItem : (i: unknown) => readItem(i, id === "categories");
    // A help or gift card with no link opens the support page.
    const items = Array.isArray(s.items)
      ? s.items
          .map(readOne)
          .filter((x): x is BlockItem => x !== null)
          .map((it) => (id === "help-gift" && it.link === "" ? { ...it, link: HELP_CARD_DEFAULT_LINK } : it))
          .slice(0, limit)
      : [];
    if (items.length === 0) continue;
    out[id] = {
      title: typeof s.title === "string" && s.title.length <= 60 ? s.title : "",
      background: typeof s.background === "string" && HEX.test(s.background) ? s.background : "",
      textColor: typeof s.textColor === "string" && HEX.test(s.textColor) ? s.textColor : "",
      items,
      ...accentPart(s.accent),
    };
  }
  return out;
}

// The section accent of every block that has a valid one, including blocks with no items (which readBlockSettings leaves
// out so they keep their placeholder), such as product rows, built-in category tiles or deals, and the hero.
export function readSectionAccents(raw: unknown): Partial<Record<HomeBlockId, string>> {
  const out: Partial<Record<HomeBlockId, string>> = {};
  const blocks = raw && typeof raw === "object" && Array.isArray((raw as { blocks?: unknown }).blocks) ? (raw as { blocks: unknown[] }).blocks : [];
  for (const b of blocks.slice(0, 40)) {
    if (!b || typeof b !== "object") continue;
    const d = b as Record<string, unknown>;
    if (!isBlockId(d.id) || out[d.id] !== undefined) continue;
    const s = d.settings && typeof d.settings === "object" ? (d.settings as Record<string, unknown>) : null;
    const accent = s ? readAccent(s.accent) : "";
    if (accent) out[d.id] = accent;
  }
  return out;
}

// ---- The hero block (the first section of the home). Each field is optional: "" keeps the built-in content.
export interface HeroOverride {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaLink: string;
  image: string;
  // "#RRGGBB" (upper case) when the admin set a valid hero accent; left out otherwise.
  accent?: string;
}

const shortText = (v: unknown, max: number): string => (typeof v === "string" && v.length <= max ? v.trim() : "");

// The hero content the admin set, or null when no field is set (the built-in hero shows). A bad field is dropped alone.
export function readHeroOverride(raw: unknown): HeroOverride | null {
  const blocks = raw && typeof raw === "object" && Array.isArray((raw as { blocks?: unknown }).blocks) ? (raw as { blocks: unknown[] }).blocks : [];
  const block = blocks.slice(0, 40).find((b) => b && typeof b === "object" && (b as { id?: unknown }).id === "hero") as { settings?: unknown } | undefined;
  const settings = block && block.settings && typeof block.settings === "object" ? (block.settings as Record<string, unknown>) : null;
  if (!settings) return null;
  // The admin saves the hero nested under settings.hero (admin src/data/layout.ts); older data kept the fields flat.
  // Read the nested object first and fall back to the flat fields, field by field.
  const nested = settings.hero && typeof settings.hero === "object" ? (settings.hero as Record<string, unknown>) : {};
  const s: Record<string, unknown> = {
    title: nested.title ?? settings.title,
    subtitle: nested.subtitle ?? settings.subtitle,
    ctaLabel: nested.ctaLabel ?? settings.ctaLabel,
    ctaLink: nested.ctaLink ?? settings.ctaLink,
    image: nested.image ?? settings.image,
  };
  const hero: HeroOverride = {
    title: shortText(s.title, 80),
    subtitle: shortText(s.subtitle, 160),
    ctaLabel: shortText(s.ctaLabel, 30),
    ctaLink: typeof s.ctaLink === "string" && isSafeInternal(s.ctaLink) ? s.ctaLink : "",
    image: readImage(s.image),
    // The hero's own accent (settings.hero.accent), else the hero section accent (settings.accent).
    ...accentPart(readAccent(nested.accent) || settings.accent),
  };
  return Object.values(hero).some((v) => v !== "") ? hero : null;
}

// ---- Configurable product rows (the product-rails block). The admin sets them; the shop checks them again here.
export const ROW_SOURCES = ["category", "brand", "bestsellers", "new", "price-band", "price-drop"] as const;
export type RowSource = (typeof ROW_SOURCES)[number];

export interface ProductRow {
  title: string;
  source: RowSource;
  value: string;
  limit: number;
}

export const ROW_LIMITS = { maxRows: 6, minLimit: 4, maxLimit: 12, minProducts: 4 } as const;

function readRow(raw: unknown): ProductRow | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const title = typeof d.title === "string" && d.title.trim().length > 0 && d.title.length <= 40 ? d.title : null;
  const source = (ROW_SOURCES as readonly string[]).includes(d.source as string) ? (d.source as RowSource) : null;
  const needsValue = source === "category" || source === "brand";
  const value = typeof d.value === "string" ? d.value : null;
  const limit = typeof d.limit === "number" && Number.isInteger(d.limit) && d.limit >= ROW_LIMITS.minLimit && d.limit <= ROW_LIMITS.maxLimit ? d.limit : null;
  if (!title || !source || value === null || limit === null) return null;
  if (source === "price-band") {
    const band = parsePriceBand(value);
    return band ? { title, source, value: `${band.min}-${band.max}`, limit } : null;
  }
  if (needsValue && (value.trim().length === 0 || value.length > 60)) return null;
  if (!needsValue && value !== "") return null;
  return { title, source, value: needsValue ? value.trim() : "", limit };
}

// A price band value is "min-max" in whole rupees: both 0 to 50000, min less than max. Anything else is null.
export const PRICE_BAND_MIN = 0;
export const PRICE_BAND_MAX = 50000;
const PRICE_BAND = /^(\d{1,5})-(\d{1,5})$/;

export function parsePriceBand(value: string): { min: number; max: number } | null {
  const m = PRICE_BAND.exec(value.trim());
  if (!m) return null;
  const min = Number(m[1]);
  const max = Number(m[2]);
  if (min < PRICE_BAND_MIN || max > PRICE_BAND_MAX || min >= max) return null;
  return { min, max };
}

// The rows set on the product-rails block, in order. Empty when none are set: the shop then shows its default rows.
export function readProductRows(raw: unknown): ProductRow[] {
  const blocks = raw && typeof raw === "object" && Array.isArray((raw as { blocks?: unknown }).blocks) ? (raw as { blocks: unknown[] }).blocks : [];
  const block = blocks.find((b) => b && typeof b === "object" && (b as { id?: unknown }).id === "product-rails") as { enabled?: unknown; settings?: { rows?: unknown } } | undefined;
  if (!block || block.enabled !== true || !block.settings || !Array.isArray(block.settings.rows)) return [];
  return block.settings.rows.slice(0, ROW_LIMITS.maxRows).map(readRow).filter((r): r is ProductRow => r !== null);
}

// ---- The footer details (the footer block's settings.footer). The admin sets them; the shop checks them again here.
// Each URL is "" (hidden) or an https address on an allowed host (the host itself or a subdomain of it). Anything else
// is dropped and the field reads as "".
export interface FooterDetails {
  appStoreUrl: string;
  playStoreUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  youtubeUrl: string;
  linkedinUrl: string;
  xUrl: string;
  companyLine: string;
}

export const FOOTER_URL_HOSTS = ["apple.com", "google.com", "instagram.com", "facebook.com", "youtube.com", "linkedin.com", "x.com", "twitter.com"] as const;
const FOOTER_URL_MAX = 300;
const COMPANY_LINE_MAX = 160;

const allowedFooterUrl = (v: unknown): string => {
  if (typeof v !== "string") return "";
  const url = v.trim();
  if (url === "" || url.length > FOOTER_URL_MAX) return "";
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const hostOk = (FOOTER_URL_HOSTS as readonly string[]).some((h) => host === h || host.endsWith("." + h));
    if (u.protocol !== "https:" || u.username !== "" || u.password !== "" || !hostOk) return "";
    return url;
  } catch {
    return "";
  }
};

const companyLineOf = (v: unknown): string => (typeof v === "string" && v.trim().length <= COMPANY_LINE_MAX ? v.trim() : "");

const EMPTY_FOOTER: FooterDetails = {
  appStoreUrl: "",
  playStoreUrl: "",
  instagramUrl: "",
  facebookUrl: "",
  youtubeUrl: "",
  linkedinUrl: "",
  xUrl: "",
  companyLine: "",
};

// The footer details from the layout document (the whole siteContent/homeLayout data). All fields "" when missing or invalid.
export function readFooterDetails(raw: unknown): FooterDetails {
  const blocks = raw && typeof raw === "object" && Array.isArray((raw as { blocks?: unknown }).blocks) ? (raw as { blocks: unknown[] }).blocks : [];
  const block = blocks.slice(0, 40).find((b) => b && typeof b === "object" && (b as { id?: unknown }).id === "footer") as { settings?: unknown } | undefined;
  const settings = block && block.settings && typeof block.settings === "object" ? (block.settings as Record<string, unknown>) : null;
  const f = settings && settings.footer && typeof settings.footer === "object" ? (settings.footer as Record<string, unknown>) : null;
  if (!f) return { ...EMPTY_FOOTER };
  return {
    appStoreUrl: allowedFooterUrl(f.appStoreUrl),
    playStoreUrl: allowedFooterUrl(f.playStoreUrl),
    instagramUrl: allowedFooterUrl(f.instagramUrl),
    facebookUrl: allowedFooterUrl(f.facebookUrl),
    youtubeUrl: allowedFooterUrl(f.youtubeUrl),
    linkedinUrl: allowedFooterUrl(f.linkedinUrl),
    xUrl: allowedFooterUrl(f.xUrl),
    companyLine: companyLineOf(f.companyLine),
  };
}

// ---- The header settings (search hints and delivery-mode switch). Doc level on the mobile layout, shared by both devices.
// The admin sets them; the shop checks them again here. Empty arrays when unset; invalid entries are dropped.
export interface HeaderSettings {
  searchHints: string[];
  deliveryModes: { label: string; link: string }[];
  showDeliveryModes: boolean;
}

export function readHeaderSettings(raw: unknown): HeaderSettings {
  const h = raw && typeof raw === "object" ? (raw as { headerSettings?: unknown }).headerSettings : undefined;
  const o = h && typeof h === "object" && !Array.isArray(h) ? (h as Record<string, unknown>) : {};
  const searchHints = (Array.isArray(o.searchHints) ? o.searchHints.slice(0, 40) : [])
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length >= 1 && v.length <= 40 && !/[\r\n\t<>]/.test(v))
    .slice(0, 8);
  const deliveryModes = (Array.isArray(o.deliveryModes) ? o.deliveryModes.slice(0, 40) : [])
    .map((v) => {
      if (!v || typeof v !== "object") return null;
      const m = v as Record<string, unknown>;
      const label = typeof m.label === "string" ? m.label.trim() : "";
      const link = typeof m.link === "string" ? m.link : "";
      if (label.length < 1 || label.length > 16 || /[\r\n\t<>]/.test(label) || link === "" || !isSafeInternal(link)) return null;
      return { label, link };
    })
    .filter((m): m is { label: string; link: string } => m !== null)
    .slice(0, 4);
  return { searchHints, deliveryModes, showDeliveryModes: o.showDeliveryModes === true };
}

// ---- Maintenance mode. Doc level on siteContent/homeLayout (field "maintenance"), not part of draft or published, shared by
// both devices. enabled is false when unset or invalid. Never throws.
export const MAINTENANCE_DEFAULT_MESSAGE = "We are updating GlowVai. Please check back in a few minutes.";

export interface Maintenance {
  enabled: boolean;
  message: string;
  until: number | null;
}

export function readMaintenance(doc: unknown): Maintenance {
  const m = doc && typeof doc === "object" ? (doc as { maintenance?: unknown }).maintenance : undefined;
  const o = m && typeof m === "object" && !Array.isArray(m) ? (m as Record<string, unknown>) : null;
  if (!o || o.enabled !== true) return { enabled: false, message: MAINTENANCE_DEFAULT_MESSAGE, until: null };
  const message = typeof o.message === "string" && o.message.trim().length > 0 && o.message.trim().length <= 140 ? o.message.trim() : MAINTENANCE_DEFAULT_MESSAGE;
  const until = typeof o.until === "number" && Number.isInteger(o.until) && o.until > 0 ? o.until : null;
  return { enabled: true, message, until };
}

// ---- Device layouts. siteContent/homeLayout keeps draft and published as the MOBILE layout (also the default). An
// optional desktop: { draft?, published? } field holds the layout for wide screens, each with the same shape as published.
// The footer details always come from the mobile layout, so both devices share one footer.
export const LAYOUT_DEVICES = ["desktop", "mobile"] as const;
export type LayoutDevice = (typeof LAYOUT_DEVICES)[number];

// The device a request asks for. No device parameter means mobile (today's behaviour, and what the native app sends).
// Anything other than exactly one "desktop" or "mobile" is null (the route refuses it).
export function readLayoutDevice(values: readonly string[]): LayoutDevice | null {
  if (values.length === 0) return "mobile";
  if (values.length > 1) return null;
  const v = values[0];
  return v === "desktop" || v === "mobile" ? v : null;
}

// A saved layout can drive the page only when it is an object whose blocks list names at least one known block.
export function hasLayoutBlocks(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const blocks = (raw as { blocks?: unknown }).blocks;
  if (!Array.isArray(blocks)) return false;
  return blocks.slice(0, 40).some((b) => b !== null && typeof b === "object" && isBlockId((b as { id?: unknown }).id));
}

export interface LayoutSourceChoice {
  // The layout whose blocks, settings, rows and hero are served.
  source: unknown;
  // The layout the footer details are read from (always the mobile one).
  footerSource: unknown;
  // True when a desktop request has no saved desktop layout: the PC home then uses its own built-in default design.
  // The mobile design is never copied to PC (the two are designed separately).
  fallback: boolean;
}

// Which saved layout a request is served. doc is the whole siteContent/homeLayout data (undefined when missing).
// Mobile: published, or draft for a staff preview. Desktop: desktop.published (preview: desktop.draft, then
// desktop.published), else NOTHING (built-in PC default). Never the mobile layout: mobile and PC are separate designs.
export function chooseLayoutSource(doc: unknown, device: LayoutDevice, isPreview: boolean): LayoutSourceChoice {
  const d = doc && typeof doc === "object" ? (doc as Record<string, unknown>) : {};
  const mobile = isPreview ? d.draft : d.published;
  if (device === "mobile") return { source: mobile, footerSource: mobile, fallback: false };
  const desk = d.desktop && typeof d.desktop === "object" ? (d.desktop as Record<string, unknown>) : {};
  const candidates = isPreview ? [desk.draft, desk.published] : [desk.published];
  const found = candidates.find(hasLayoutBlocks);
  return found !== undefined ? { source: found, footerSource: mobile, fallback: false } : { source: undefined, footerSource: mobile, fallback: true };
}

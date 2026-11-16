// Designer style options (the contract in design-reference/STYLE-OPTIONS-CONTRACT.md): per-section `settings.style` and the
// global `look`. Pure (no Firestore, no React). Every field is optional; a missing or unknown value is dropped, so nothing
// changes visually until the admin picks something. The allow-lists are copied from the admin repo (src/data/layoutStyle.ts),
// not imported across repos. The API route and the client both use these readers, so a value is checked twice.

export const BANNER_BLOCKS = ["hero", "banners", "festival-strip", "mini-banners", "sponsored"] as const;
export const ROW_BLOCKS = ["product-rails", "deals", "recommended", "recently-viewed", "reorder", "brands", "partners", "categories", "promos", "offers", "bank-offers", "cashback", "help-gift"] as const;
export const PRODUCT_BLOCKS = ["product-rails", "deals", "recommended", "recently-viewed", "reorder"] as const;
export const NO_STYLE_BLOCKS = ["footer"] as const;

export const BANNER_LAYOUTS = ["auto-slide", "arrows", "progress-bars", "story-strip", "full-bleed", "split", "video", "peek", "stacked", "parallax"] as const;
export const ROW_LAYOUTS = ["rail", "grid", "two-column", "stacked-list", "banner-strip"] as const;
export const CARD_STYLES = ["clean", "stepper", "price-band", "compact-row", "quick-add"] as const;
export const BADGES = ["discount", "new", "bestseller", "low-stock", "delivery-time", "sponsored"] as const;
export const BADGES_MAX = 6;
export const SKELETONS = ["shimmer", "pulse"] as const;
export const MOTIONS = ["fade-in", "slide-up", "stagger", "ease-out", "none"] as const;
export const CAMPAIGNS = ["everyday", "festival", "monsoon", "summer", "winter", "sale", "new-season", "minimal"] as const;
export const SPINNERS = ["ring", "dots", "bars"] as const;
export const FEEDBACK_KEYS = ["toast", "bagBounce", "successTick", "haptics", "confetti"] as const;

export type CardStyle = (typeof CARD_STYLES)[number];
export type BadgeName = (typeof BADGES)[number];
export type SkeletonStyle = (typeof SKELETONS)[number];
export type MotionStyle = (typeof MOTIONS)[number];
export type Campaign = (typeof CAMPAIGNS)[number];
export type SpinnerStyle = (typeof SPINNERS)[number];
export type FeedbackKey = (typeof FEEDBACK_KEYS)[number];

export interface BlockStyle {
  layout?: string;
  stickyHeader?: boolean;
  card?: CardStyle;
  badges?: BadgeName[];
  skeleton?: SkeletonStyle;
  motion?: MotionStyle;
  countdownEndsAt?: string;
  stockBar?: boolean;
}

export interface LookSettings {
  campaign?: Campaign;
  spinner?: SpinnerStyle;
  feedback?: Partial<Record<FeedbackKey, boolean>>;
}

// What the shop does when a feedback switch is missing (only once the admin has saved a look at all).
export const FEEDBACK_DEFAULTS: Record<FeedbackKey, boolean> = { toast: true, bagBounce: true, successTick: true, haptics: true, confetti: false };

const has = (list: readonly string[], v: unknown): v is string => typeof v === "string" && list.includes(v);
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export type StyleFamily = "banner" | "row" | "other";
export function styleFamily(id: string): StyleFamily {
  if (has(BANNER_BLOCKS, id)) return "banner";
  if (has(ROW_BLOCKS, id)) return "row";
  return "other";
}
export const takesStyle = (id: string): boolean => !has(NO_STYLE_BLOCKS, id);
export const isProductBlock = (id: string): boolean => has(PRODUCT_BLOCKS, id);

export function layoutOptionsFor(id: string): readonly string[] {
  const f = styleFamily(id);
  return f === "banner" ? BANNER_LAYOUTS : f === "row" ? ROW_LAYOUTS : [];
}

export function isIsoDateTime(v: unknown): v is string {
  return typeof v === "string" && v.length >= 10 && v.length <= 40 && /^\d{4}-\d{2}-\d{2}/.test(v) && !Number.isNaN(Date.parse(v));
}

// The clean style of one block, or undefined when nothing valid is left. Fields that do not apply to the block are dropped.
export function sanitizeBlockStyle(id: string, raw: unknown): BlockStyle | undefined {
  if (!isObj(raw) || !takesStyle(id)) return undefined;
  const out: BlockStyle = {};
  if (has(layoutOptionsFor(id), raw.layout)) out.layout = raw.layout;
  if (typeof raw.stickyHeader === "boolean") out.stickyHeader = raw.stickyHeader;
  if (isProductBlock(id)) {
    if (has(CARD_STYLES, raw.card)) out.card = raw.card as CardStyle;
    if (Array.isArray(raw.badges)) {
      const seen: BadgeName[] = [];
      for (const b of raw.badges.slice(0, 40)) if (has(BADGES, b) && !seen.includes(b as BadgeName)) seen.push(b as BadgeName);
      if (seen.length > 0) out.badges = seen.slice(0, BADGES_MAX);
    }
    if (typeof raw.stockBar === "boolean") out.stockBar = raw.stockBar;
  }
  if (has(SKELETONS, raw.skeleton)) out.skeleton = raw.skeleton as SkeletonStyle;
  if (has(MOTIONS, raw.motion)) out.motion = raw.motion as MotionStyle;
  if (isIsoDateTime(raw.countdownEndsAt)) out.countdownEndsAt = raw.countdownEndsAt;
  return Object.keys(out).length > 0 ? out : undefined;
}

export function sanitizeLook(raw: unknown): LookSettings | undefined {
  if (!isObj(raw)) return undefined;
  const out: LookSettings = {};
  if (has(CAMPAIGNS, raw.campaign)) out.campaign = raw.campaign as Campaign;
  if (has(SPINNERS, raw.spinner)) out.spinner = raw.spinner as SpinnerStyle;
  if (isObj(raw.feedback)) {
    const fb: Partial<Record<FeedbackKey, boolean>> = {};
    for (const k of FEEDBACK_KEYS) if (typeof raw.feedback[k] === "boolean") fb[k] = raw.feedback[k] as boolean;
    if (Object.keys(fb).length > 0) out.feedback = fb;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

// The hero video: an https address of a short mp4 or webm, at most 500 characters. Anything else is dropped.
export const HERO_VIDEO_MAX = 500;
export function sanitizeVideoUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw.trim();
  if (v === "" || v.length > HERO_VIDEO_MAX || /\s/.test(v)) return undefined;
  try {
    const u = new URL(v);
    if (u.protocol !== "https:" || u.username || u.password) return undefined;
    return /\.(mp4|webm)$/i.test(u.pathname) ? v : undefined;
  } catch {
    return undefined;
  }
}

export const feedbackOn = (look: LookSettings | undefined, k: FeedbackKey): boolean => look?.feedback?.[k] ?? FEEDBACK_DEFAULTS[k];

const blocksOf = (raw: unknown): unknown[] => (isObj(raw) && Array.isArray(raw.blocks) ? raw.blocks.slice(0, 40) : []);

// Every block's clean style, keyed by block id (first entry of an id wins). Blocks with no valid style are left out.
export function readBlockStyles(raw: unknown): Record<string, BlockStyle> {
  const out: Record<string, BlockStyle> = {};
  for (const b of blocksOf(raw)) {
    if (!isObj(b) || typeof b.id !== "string" || out[b.id] !== undefined) continue;
    const s = isObj(b.settings) ? sanitizeBlockStyle(b.id, b.settings.style) : undefined;
    if (s) out[b.id] = s;
  }
  return out;
}

// The global look of a layout document (top-level `look`), or undefined.
export function readLook(raw: unknown): LookSettings | undefined {
  return isObj(raw) ? sanitizeLook(raw.look) : undefined;
}

// The hero video (settings.hero.video), or undefined when missing or not a safe https mp4/webm address.
export function readHeroVideo(raw: unknown): string | undefined {
  const hero = blocksOf(raw).find((b) => isObj(b) && b.id === "hero");
  const s = isObj(hero) && isObj(hero.settings) ? hero.settings : null;
  const nested = s && isObj(s.hero) ? s.hero : null;
  return sanitizeVideoUrl(nested ? nested.video : undefined);
}

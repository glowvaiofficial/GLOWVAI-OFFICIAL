// Accent colours for the shop home page items and sections. Pure (no React, no Firestore), so it can be tested.
//
// The contract, shared with the admin (src/data/accents.ts) and the app. Keep the palette, the name map and
// the helpers identical in both:
// - Every home item, every block's settings and the hero settings may carry `accent`: "#RRGGBB" (any case), or ""
//   (or missing) for the default palette. The admin refuses anything else; the shop drops it (falls back to the default).
// - Renderers use items[i].accent || GLOWVAI_ACCENTS[i % 8]. Category tiles look the category name up first.

export const GLOWVAI_ACCENTS = [
  "#7C3AED", // amethyst
  "#0EA5E9", // sky
  "#14B8A6", // teal
  "#84CC16", // lime
  "#F43F5E", // rose
  "#C026D3", // berry
  "#4F46E5", // indigo
  "#1E293B", // ink
] as const;

export const ACCENT_NAMES = ["Amethyst", "Sky", "Teal", "Lime", "Rose", "Berry", "Indigo", "Ink"] as const;

export const ACCENT = {
  amethyst: GLOWVAI_ACCENTS[0],
  sky: GLOWVAI_ACCENTS[1],
  teal: GLOWVAI_ACCENTS[2],
  lime: GLOWVAI_ACCENTS[3],
  rose: GLOWVAI_ACCENTS[4],
  berry: GLOWVAI_ACCENTS[5],
  indigo: GLOWVAI_ACCENTS[6],
  ink: GLOWVAI_ACCENTS[7],
} as const;

// Category (and section) names to their accent. Keys are lower case with single spaces.
export const CATEGORY_ACCENTS: Readonly<Record<string, string>> = {
  serums: ACCENT.amethyst,
  serum: ACCENT.amethyst,
  moisturizers: ACCENT.sky,
  moisturizer: ACCENT.sky,
  moisturisers: ACCENT.sky,
  moisturiser: ACCENT.sky,
  sunscreen: ACCENT.teal,
  sunscreens: ACCENT.teal,
  cleansers: ACCENT.lime,
  cleanser: ACCENT.lime,
  treatments: ACCENT.rose,
  treatment: ACCENT.rose,
  offers: ACCENT.berry,
  offer: ACCENT.berry,
  coupons: ACCENT.berry,
  coupon: ACCENT.berry,
  brands: ACCENT.indigo,
  brand: ACCENT.indigo,
  trust: ACCENT.indigo,
  all: ACCENT.ink,
  "shop all": ACCENT.ink,
};

const ACCENT_PATTERN = /^#[0-9a-fA-F]{6}$/;

// True for exactly "#" and six hex digits.
export const isAccent = (v: unknown): v is string => typeof v === "string" && ACCENT_PATTERN.test(v);

// A stored accent: the colour in upper case, or "" for anything that is not exactly "#RRGGBB".
export const readAccent = (v: unknown): string => (isAccent(v) ? v.toUpperCase() : "");

// The accent for a category (or section) name, or "" when the name is not known.
export function accentForName(name: unknown): string {
  if (typeof name !== "string") return "";
  return CATEGORY_ACCENTS[name.trim().toLowerCase().replace(/\s+/g, " ")] ?? "";
}

// The palette colour for a place in a list. A bad index counts as 0.
export function paletteAccent(index: number): string {
  const i = Number.isInteger(index) && index >= 0 ? index : 0;
  return GLOWVAI_ACCENTS[i % GLOWVAI_ACCENTS.length];
}

// The colour an item is shown in: its own accent, else its category name's accent, else the palette by its place.
export function accentFor(item: { accent?: unknown } | null | undefined, index: number, categoryName?: string): string {
  return readAccent(item?.accent) || accentForName(categoryName) || paletteAccent(index);
}

// The colour a section is shown in when staff set none: the section's own name (offers, brands, trust), else amethyst.
export function defaultSectionAccent(blockId: string): string {
  return accentForName(blockId) || ACCENT.amethyst;
}

// The plain name of a palette colour, or "" for a custom colour.
export function accentName(hex: string): string {
  const i = (GLOWVAI_ACCENTS as readonly string[]).indexOf(readAccent(hex));
  return i >= 0 ? ACCENT_NAMES[i] : "";
}


// Cool default accents for home sections when the admin has set none (the web v3 look: distinct containers, never a warm
// hue; see isWarmColour in lib/shop/theme.ts). Admin-set accents always win; callers use readAccent(...) || coolSectionAccent(id).
export const COOL_ACCENTS = [
  "#0EA5E9", // sky
  "#4F46E5", // indigo
  "#14B8A6", // teal
  "#7C3AED", // violet
  "#10B981", // emerald
  "#C026D3", // plum
  "#0057FB", // brand blue
] as const;

const SECTION_DEFAULTS: Readonly<Record<string, string>> = {
  hero: COOL_ACCENTS[0],
  scan: COOL_ACCENTS[0],
  "for-you": COOL_ACCENTS[6],
  "mini-banners": COOL_ACCENTS[2],
  offers: COOL_ACCENTS[1],
  categories: COOL_ACCENTS[3],
  promos: COOL_ACCENTS[5],
  deals: COOL_ACCENTS[0],
  reorder: COOL_ACCENTS[4],
  "product-rails": COOL_ACCENTS[6],
  brands: COOL_ACCENTS[1],
  trust: COOL_ACCENTS[1],
  "help-gift": COOL_ACCENTS[2],
  concerns: COOL_ACCENTS[2],
  prices: COOL_ACCENTS[3],
  "recently-viewed": COOL_ACCENTS[3],
  recommended: COOL_ACCENTS[5],
};

// The cool default accent of a home section (a block id, or "concerns", "scan", "prices"), brand blue when unknown.
export const coolSectionAccent = (id: string): string => SECTION_DEFAULTS[id] ?? COOL_ACCENTS[6];

// The cool palette by place in a list (rails, tiles), wrapping.
export function coolAccent(index: number): string {
  const i = Number.isInteger(index) && index >= 0 ? index : 0;
  return COOL_ACCENTS[i % COOL_ACCENTS.length];
}

// Accent colours for the shop home page items and sections. Pure (no React, no Firestore), so it can be tested.
//
// The contract, shared with the admin (src/data/accents.ts) and the app. Keep the palette, the name map and
// the helpers identical in both:
// - Every home item, every block's settings and the hero settings may carry `accent`: "#RRGGBB" (any case), or ""
//   (or missing) for the default palette. The admin refuses anything else; the shop drops it (falls back to the default).
// - Renderers use items[i].accent || GLOWVAI_ACCENTS[i % 8]. Category tiles look the category name up first.

export const GLOWVAI_ACCENTS = [
  "#8B5CF6", // amethyst
  "#4F8EF7", // sky
  "#F4A261", // peach
  "#6BAF92", // sage
  "#E85D8F", // rose
  "#F26B5B", // coral
  "#C8A96A", // champagne
  "#1F2A44", // ink
] as const;

export const ACCENT_NAMES = ["Amethyst", "Sky", "Peach", "Sage", "Rose", "Coral", "Champagne", "Ink"] as const;

export const ACCENT = {
  amethyst: GLOWVAI_ACCENTS[0],
  sky: GLOWVAI_ACCENTS[1],
  peach: GLOWVAI_ACCENTS[2],
  sage: GLOWVAI_ACCENTS[3],
  rose: GLOWVAI_ACCENTS[4],
  coral: GLOWVAI_ACCENTS[5],
  champagne: GLOWVAI_ACCENTS[6],
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
  sunscreen: ACCENT.peach,
  sunscreens: ACCENT.peach,
  cleansers: ACCENT.sage,
  cleanser: ACCENT.sage,
  treatments: ACCENT.rose,
  treatment: ACCENT.rose,
  offers: ACCENT.coral,
  offer: ACCENT.coral,
  coupons: ACCENT.coral,
  coupon: ACCENT.coral,
  brands: ACCENT.champagne,
  brand: ACCENT.champagne,
  trust: ACCENT.champagne,
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


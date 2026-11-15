// Readable colours from one admin accent, for the mobile-web home. Pure: no React, no DOM, so the tests load it directly.
//
// The accent itself comes from the admin (lib/shop/accents.ts: item.accent || palette[i % 8], categories by name first).
// The admin can pick any colour, so this file works out what reads well on it: text on an accent is white or deep ink,
// whichever has more contrast, and accent-coloured text is darkened step by step until it reaches 4.5:1.

import { ACCENT, accentFor, readAccent } from '../../../../lib/shop/accents';
import type { HomeBlockId } from '../lib/useHomeLayout';

export const ACCENT_INK = '#1E293B';
export const WHITE = '#FFFFFF';
const HEX = /^#[0-9a-fA-F]{6}$/;

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = (c: number[]) => '#' + c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase();

/** a mixed toward b by t (0 = a, 1 = b). A bad colour falls back to the other one, two bad ones to deep ink. */
export function mix(a: string, b: string, t: number): string {
  const okA = HEX.test(a);
  const okB = HEX.test(b);
  if (!okA && !okB) return ACCENT_INK;
  if (!okA) return b.toUpperCase();
  if (!okB) return a.toUpperCase();
  const k = Number.isFinite(t) ? Math.min(1, Math.max(0, t)) : 0;
  const ca = rgb(a);
  const cb = rgb(b);
  return toHex(ca.map((v, i) => v + (cb[i] - v) * k));
}

/** The colour darkened toward black by t. */
export const shade = (hex: string, t: number): string => mix(hex, '#000000', t);

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  if (!HEX.test(hex)) return 0;
  const [r, g, b] = rgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Deep ink or white, whichever reads better on bg. */
export const readableTextOn = (bg: string): string => (contrastRatio(ACCENT_INK, bg) >= contrastRatio(WHITE, bg) ? ACCENT_INK : WHITE);

/** The accent when it reads at `min` on bg, else the accent darkened until it does (deep ink if nothing does). */
export function accentTextOn(accent: string, bg: string = WHITE, min = 4.5): string {
  const base = readAccent(accent) || ACCENT_INK;
  for (let step = 0; step <= 20; step++) {
    const c = step === 0 ? base : shade(base, step * 0.05);
    if (contrastRatio(c, bg) >= min) return c;
  }
  return ACCENT_INK;
}

/** A soft tint: mostly the surface, with a little of the accent. */
export const tintOf = (accent: string, strength = 0.12, surface: string = WHITE): string => mix(surface, readAccent(accent) || ACCENT_INK, strength);

export interface AccentTheme {
  accent: string;
  /** Soft background (about 12%). */
  tint: string;
  /** Rings and borders (about 28%). */
  ring: string;
  /** Accent-coloured text that reads on the tint and on white. */
  text: string;
  /** White or deep ink, whichever reads on the solid accent (hover, press, selected). */
  on: string;
  /** Rich gradient for offer cards; white reads at 4.5:1 on both stops. */
  gradient: [string, string];
}

export function accentTheme(accent: string): AccentTheme {
  const a = readAccent(accent) || ACCENT_INK;
  const tint = tintOf(a, 0.12);
  const start = accentTextOn(a, WHITE, 4.5);
  return { accent: a, tint, ring: tintOf(a, 0.28), text: accentTextOn(a, tint), on: readableTextOn(a), gradient: [start, shade(start, 0.22)] };
}

/** CSS custom properties for an element drawn in one accent (--ac, --ac-tint, --ac-ring, --ac-text, --ac-g1, --ac-g2). */
export function accentVars(accent: string): Record<string, string> {
  const t = accentTheme(accent);
  return { '--ac': t.accent, '--ac-tint': t.tint, '--ac-ring': t.ring, '--ac-text': t.text, '--ac-on': t.on, '--ac-g1': t.gradient[0], '--ac-g2': t.gradient[1] };
}

// Each section's colour when the admin set none: one per block, stable when blocks are reordered.
const SECTION_DEFAULT: Record<HomeBlockId, string> = {
  hero: ACCENT.amethyst,
  'mini-banners': ACCENT.sky,
  offers: ACCENT.berry,
  categories: ACCENT.amethyst,
  promos: ACCENT.teal,
  deals: ACCENT.rose,
  reorder: ACCENT.lime,
  'product-rails': ACCENT.sky,
  brands: ACCENT.indigo,
  trust: ACCENT.indigo,
  'help-gift': ACCENT.lime,
  footer: ACCENT.ink,
};

/** The admin's section accent, else the block's own default. */
export const sectionAccent = (blockId: HomeBlockId, accent?: unknown): string => readAccent(accent) || SECTION_DEFAULT[blockId] || ACCENT.ink;

/** An item's accent: its own, else its label's category colour, else the palette by its place. */
export const itemAccent = (item: { accent?: unknown; label?: string } | null | undefined, index: number): string => accentFor(item, index, item?.label);

// Accent colours on the desktop home: each home section and each cosmetic category has its own accent. The rules (the
// palette, what counts as a valid accent, the category name map) are the shop's shared contract in lib/shop/accents.ts;
// this file only adds the desktop's helpers around it and the colour maths (tints and readable text). Pure, so the tests
// call it.
import { ACCENT, GLOWVAI_ACCENTS, accentForName, isAccent as isSharedAccent, paletteAccent, readAccent } from '../../../../lib/shop/accents';

export type AccentName = keyof typeof ACCENT;

// The palette with its names, in the contract's order.
export const ACCENT_PALETTE = (Object.keys(ACCENT) as AccentName[]).map((name) => ({ name, hex: ACCENT[name] as string }));

export const accentHex = (name: AccentName): string => ACCENT[name];

// A valid accent is exactly "#RRGGBB".
export const isAccent = (value: unknown): value is string => isSharedAccent(value);

// The accent of the i-th item: its own accent when valid, otherwise the palette in order (wrapping after eight).
export function effectiveAccent(accent: unknown, index: number): string {
  return readAccent(accent) || paletteAccent(Math.max(0, Math.floor(index)) % GLOWVAI_ACCENTS.length);
}

// The accent a category (or section) name maps to, or null.
export function namedAccent(name: string): string | null {
  return accentForName(name) || null;
}

// A category tile's or tab's accent: its own accent when valid, then its name, then the palette by position.
export function categoryAccent(name: string, accent: unknown, index: number): string {
  return readAccent(accent) || accentForName(name) || effectiveAccent(null, index);
}

// A section's accent: the block's own accent when valid, otherwise the section's default.
export function sectionAccent(settings: unknown, fallback: string): string {
  const accent = settings && typeof settings === 'object' ? (settings as { accent?: unknown }).accent : undefined;
  return readAccent(accent) || fallback;
}

// A block's section accent from a layout reply: the accent in the block's settings, then the reply's sectionAccents
// entry (sent also for blocks with no items), then the section's default.
export function blockAccent(settings: unknown, sectionAccents: Partial<Record<string, string>> | undefined, id: string, fallback: string): string {
  return sectionAccent(settings, sectionAccent({ accent: sectionAccents?.[id] }, fallback));
}

// The accent field of an item that may or may not carry one.
export const itemAccent = (item: unknown): unknown => (item && typeof item === 'object' ? (item as { accent?: unknown }).accent : undefined);

// ---- Colour maths: tints and readable text, so any accent the admin picks stays legible.

// The desktop page colour (shop-desktop-home.css --desk-bg); white cards are lighter still.
const PAGE = '#F5F7FD';
const INK = '#141B34';

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = (c: [number, number, number]) => '#' + c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase();

// `t` of the way from colour a to colour b.
export function mix(a: string, b: string, t: number): string {
  const x = rgb(a);
  const y = rgb(b);
  return toHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// The accent darkened just enough to read as text (4.5:1) on the page and on its own light tint.
export function accentInk(accent: string): string {
  const tint = mix(PAGE, accent, 0.16);
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const c = mix(accent, '#000000', t);
    if (contrast(c, PAGE) >= 4.5 && contrast(c, tint) >= 4.5) return c;
  }
  return INK;
}

// The text colour for words set on the solid accent: white or deep ink, whichever reads better.
export const textOn = (accent: string): string => (contrast('#FFFFFF', accent) >= contrast(INK, accent) ? '#FFFFFF' : INK);

// The accent mixed toward deep navy until white text reads on it (4.5:1).
export function accentDeep(accent: string): string {
  for (let t = 0.35; t <= 1.0001; t += 0.05) {
    const c = mix(accent, '#0B1240', t);
    if (contrast('#FFFFFF', c) >= 4.5) return c;
  }
  return '#0B1240';
}

// The CSS custom properties a section, tile or card sets so its stylesheet can use the accent.
export function accentVars(accent: string): Record<string, string> {
  return {
    '--acc': accent,
    '--acc-ink': accentInk(accent),
    '--acc-on': textOn(accent),
    '--acc-soft': mix(PAGE, accent, 0.16),
    '--acc-softer': mix(PAGE, accent, 0.07),
    '--acc-line': mix(PAGE, accent, 0.4),
    // A deep shade for dark gradients (white text reads on it) and a light one for accent text on dark navy.
    '--acc-deep': accentDeep(accent),
    '--acc-light': mix(accent, '#FFFFFF', 0.35),
  };
}

// Accent colours on the desktop home: each home section and each cosmetic category has its own accent. The admin may set
// `accent: "#RRGGBB"` on a block's settings (the section accent) and on each item (hero, mini banners, offers, categories,
// promos, brands, trust, help and gifts). An empty, missing or invalid accent falls back to the default palette.
//
// These are the same rules as lib/shop/accents.ts (being added with the admin side); this local copy keeps the desktop
// home working until then, and can be swapped for that module without changing the callers. Pure, so the tests call it.

export const ACCENT_PALETTE = [
  { name: 'amethyst', hex: '#8B5CF6' },
  { name: 'sky', hex: '#4F8EF7' },
  { name: 'peach', hex: '#F4A261' },
  { name: 'sage', hex: '#6BAF92' },
  { name: 'rose', hex: '#E85D8F' },
  { name: 'coral', hex: '#F26B5B' },
  { name: 'champagne', hex: '#C8A96A' },
  { name: 'ink', hex: '#1F2A44' },
] as const;

export type AccentName = (typeof ACCENT_PALETTE)[number]['name'];

export const accentHex = (name: AccentName): string => ACCENT_PALETTE.find((a) => a.name === name)!.hex;

// A valid accent is exactly "#RRGGBB".
export function isAccent(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

// The accent of the i-th item: its own accent when valid, otherwise the palette in order (wrapping after eight).
export function effectiveAccent(accent: unknown, index: number): string {
  if (isAccent(accent)) return accent.toUpperCase();
  const i = ((Math.floor(index) % ACCENT_PALETTE.length) + ACCENT_PALETTE.length) % ACCENT_PALETTE.length;
  return ACCENT_PALETTE[i].hex;
}

// Category (and section) names that map to a fixed accent before the palette order is used.
const NAME_ACCENTS: [RegExp, AccentName][] = [
  [/^serums?$/, 'amethyst'],
  [/^moisturi[sz]ers?$/, 'sky'],
  [/^(sunscreens?|suncare|sun care|spf)$/, 'peach'],
  [/^cleansers?$/, 'sage'],
  [/^treatments?$/, 'rose'],
  [/^(offers?|coupons?)$/, 'coral'],
  [/^(brands?|trust)$/, 'champagne'],
  [/^(all|shop all|all products)$/, 'ink'],
];

// The accent a name maps to, or null. Case, spaces and a trailing "s" do not matter.
export function namedAccent(name: string): string | null {
  const key = name.trim().toLowerCase().replace(/\s+/g, ' ');
  const hit = NAME_ACCENTS.find(([re]) => re.test(key));
  return hit ? accentHex(hit[1]) : null;
}

// A category tile's or tab's accent: its own accent when valid, then its name, then the palette by position.
export function categoryAccent(name: string, accent: unknown, index: number): string {
  if (isAccent(accent)) return accent.toUpperCase();
  return namedAccent(name) ?? effectiveAccent(null, index);
}

// A section's accent: the block's own accent when valid, otherwise the section's default.
export function sectionAccent(settings: unknown, fallback: string): string {
  const accent = settings && typeof settings === 'object' ? (settings as { accent?: unknown }).accent : undefined;
  return isAccent(accent) ? accent.toUpperCase() : fallback;
}

// A block's section accent from a layout reply: the accent in the block's settings, then the reply's sectionAccents
// entry (sent also for blocks with no items), then the section's default.
export function blockAccent(settings: unknown, sectionAccents: Partial<Record<string, string>> | undefined, id: string, fallback: string): string {
  return sectionAccent(settings, sectionAccent({ accent: sectionAccents?.[id] }, fallback));
}

// The accent field of an item that may or may not carry one (the layout types gain it with the admin change).
export const itemAccent = (item: unknown): unknown => (item && typeof item === 'object' ? (item as { accent?: unknown }).accent : undefined);

// ---- Colour maths: tints and readable text, so any accent the admin picks stays legible.

const PAGE = '#FBF8F5';
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

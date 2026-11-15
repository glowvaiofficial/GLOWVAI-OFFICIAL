// Shop colours and fonts the admin publishes (Firestore siteContent/theme, field "published"). Pure. Anything missing or
// invalid falls back to the default, so a half-saved theme never breaks the page.

export const THEME_FONTS = ["manrope", "syne"] as const;
export type ThemeFont = (typeof THEME_FONTS)[number];

export interface ShopTheme {
  brand: string;
  ink: string;
  muted: string;
  line: string;
  headingFont: ThemeFont;
  bodyFont: ThemeFont;
}

export const DEFAULT_THEME: ShopTheme = {
  brand: "#0057fb",
  ink: "#071b4d",
  muted: "#53617d",
  line: "#dce6ff",
  headingFont: "manrope",
  bodyFont: "manrope",
};

const HEX = /^#[0-9a-fA-F]{6}$/;

// The CSS font stacks for each allowed font. Only fonts the shop already serves.
// Both names map to the one system UI stack (the shop no longer loads Manrope or Syne): the owner chose the phone's own
// font, as Amazon and Flipkart use, so a saved theme font can never bring a web font back.
const SYSTEM_STACK = "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
export const FONT_STACKS: Record<ThemeFont, string> = {
  manrope: SYSTEM_STACK,
  syne: SYSTEM_STACK,
};

// True for red, orange, amber and yellow-brown (hue 0-75 or 335-360 with real saturation). The owner's rule is no orange
// anywhere and one consistent blue, so a warm brand colour saved in the admin is ignored in favour of the default blue.
export function isWarmColour(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return false;
  const n = parseInt(m[1] ?? "000000", 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d < 0.12 || max === 0 || d / max < 0.25) return false;
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return h <= 75 || h >= 335;
}

export function readTheme(raw: unknown): ShopTheme {
  const d = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const colour = (v: unknown, fallback: string) => (typeof v === "string" && HEX.test(v) ? v : fallback);
  const font = (v: unknown, fallback: ThemeFont): ThemeFont => (THEME_FONTS.find((f) => f === v) ?? fallback);
  return {
    brand: ((v: string) => (isWarmColour(v) ? DEFAULT_THEME.brand : v))(colour(d.brand, DEFAULT_THEME.brand)),
    ink: colour(d.ink, DEFAULT_THEME.ink),
    muted: colour(d.muted, DEFAULT_THEME.muted),
    line: colour(d.line, DEFAULT_THEME.line),
    headingFont: font(d.headingFont, DEFAULT_THEME.headingFont),
    bodyFont: font(d.bodyFont, DEFAULT_THEME.bodyFont),
  };
}

// The CSS variables the shop reads. Only these names are set, nothing else.
export function themeCssVariables(theme: ShopTheme): Record<string, string> {
  return {
    "--ds-brand": theme.brand,
    "--ds-ink": theme.ink,
    "--ds-muted": theme.muted,
    "--ds-line": theme.line,
    "--font-heading": FONT_STACKS[theme.headingFont],
    "--font-body": FONT_STACKS[theme.bodyFont],
  };
}

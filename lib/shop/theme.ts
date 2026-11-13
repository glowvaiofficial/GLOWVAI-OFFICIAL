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
export const FONT_STACKS: Record<ThemeFont, string> = {
  manrope: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  syne: "'Syne', 'Manrope', sans-serif",
};

export function readTheme(raw: unknown): ShopTheme {
  const d = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const colour = (v: unknown, fallback: string) => (typeof v === "string" && HEX.test(v) ? v : fallback);
  const font = (v: unknown, fallback: ThemeFont): ThemeFont => (THEME_FONTS.find((f) => f === v) ?? fallback);
  return {
    brand: colour(d.brand, DEFAULT_THEME.brand),
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

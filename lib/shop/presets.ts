// Seasonal presets (Firestore collection "homePresets"): a colour and font set, a block order, or both, that is live
// between two times. Pure. The shop uses the live preset with the latest start. Anything invalid is dropped.
import { HOME_BLOCK_IDS, type HomeBlockId } from "./homeLayout";
import { THEME_FONTS, type ShopTheme, type ThemeFont } from "./theme";

export interface HomePreset {
  id: string;
  name: string;
  startsAt: number;
  endsAt: number;
  enabled: boolean;
  theme: Partial<ShopTheme> | null;
  blockOrder: HomeBlockId[] | null;
}

const ID = /^[a-z0-9-]{8,40}$/;
const HEX = /^#[0-9a-fA-F]{6}$/;

function readThemePart(raw: unknown): Partial<ShopTheme> | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const out: Partial<ShopTheme> = {};
  for (const key of ["brand", "ink", "muted", "line"] as const) {
    if (d[key] !== undefined) {
      if (typeof d[key] !== "string" || !HEX.test(d[key] as string)) return null;
      out[key] = d[key] as string;
    }
  }
  for (const key of ["headingFont", "bodyFont"] as const) {
    if (d[key] !== undefined) {
      if (!THEME_FONTS.includes(d[key] as ThemeFont)) return null;
      out[key] = d[key] as ThemeFont;
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

function readOrder(raw: unknown): HomeBlockId[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 20) return null;
  const seen = new Set<string>();
  const out: HomeBlockId[] = [];
  for (const id of raw) {
    if (typeof id !== "string" || !(HOME_BLOCK_IDS as readonly string[]).includes(id) || id === "footer" || seen.has(id)) return null;
    seen.add(id);
    out.push(id as HomeBlockId);
  }
  return out;
}

// A stored preset, or null when anything is missing or out of range.
export function readPreset(id: string, raw: unknown): HomePreset | null {
  if (!raw || typeof raw !== "object" || !ID.test(id)) return null;
  const d = raw as Record<string, unknown>;
  const name = typeof d.name === "string" && d.name.trim().length > 0 && d.name.length <= 60 ? d.name : null;
  const startsAt = typeof d.startsAt === "number" && d.startsAt > 0 ? d.startsAt : null;
  const endsAt = typeof d.endsAt === "number" && d.endsAt > 0 ? d.endsAt : null;
  if (!name || startsAt === null || endsAt === null || endsAt <= startsAt) return null;
  const hasTheme = d.theme !== undefined && d.theme !== null;
  const hasOrder = d.blockOrder !== undefined && d.blockOrder !== null;
  const theme = hasTheme ? readThemePart(d.theme) : null;
  const blockOrder = hasOrder ? readOrder(d.blockOrder) : null;
  if ((hasTheme && theme === null) || (hasOrder && blockOrder === null)) return null;
  if (theme === null && blockOrder === null) return null;
  return { id, name, startsAt, endsAt, enabled: d.enabled === true, theme, blockOrder };
}

// The live preset: enabled, inside its window, with the latest start. Null when none is live.
export function activePreset(presets: HomePreset[], now: number): HomePreset | null {
  let best: HomePreset | null = null;
  for (const p of presets) {
    if (!p.enabled || now < p.startsAt || now >= p.endsAt) continue;
    if (!best || p.startsAt > best.startsAt) best = p;
  }
  return best;
}

// The published theme with the preset's colours and fonts laid over it (only the keys the preset sets).
export function themeWithPreset(theme: ShopTheme, preset: HomePreset | null): ShopTheme {
  if (!preset?.theme) return theme;
  return { ...theme, ...preset.theme };
}

// The block order with the preset's order in place when it has one. Footer is always last.
export function orderWithPreset(order: HomeBlockId[], preset: HomePreset | null): HomeBlockId[] {
  if (!preset?.blockOrder) return order;
  return [...preset.blockOrder.filter((id) => id !== "footer"), "footer"];
}


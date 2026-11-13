// The order and on/off state of the homepage blocks (Firestore siteContent/homeLayout, field "published"). Pure.
// The admin sets this; the shop only reads it. Unknown ids are dropped, duplicates keep their first place, the footer is
// always last and always on. With nothing saved, the default order is used.

export const HOME_BLOCK_IDS = [
  "hero",
  "mini-banners",
  "offers",
  "categories",
  "promos",
  "deals",
  "reorder",
  "product-rails",
  "brands",
  "trust",
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
  // Blocks the stored list does not mention yet are added at their default place, switched on.
  for (const def of DEFAULT_HOME_LAYOUT) if (!seen.has(def.id)) parsed.push({ ...def, position: def.position + 500 });
  return orderOf(parsed);
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
}

export interface BlockSettings {
  title: string;
  background: string;
  textColor: string;
  items: BlockItem[];
}

// The most items each block can show. Blocks not listed take no items.
export const BLOCK_ITEM_LIMITS: Partial<Record<HomeBlockId, number>> = {
  "mini-banners": 3,
  offers: 3,
  brands: 12,
  trust: 3,
  "help-gift": 3,
};

const HEX = /^#[0-9a-fA-F]{6}$/;

const isSafeInternal = (link: string): boolean =>
  link === "" || (link.startsWith("/") && !link.startsWith("//") && !link.includes("\\") && !/[\u0000-\u001f\s]/.test(link) && link.length <= 200);

const IMAGE_MAX = 200_000;
const IMAGE_DATA = /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/]+=*$/;

// A picture is kept only as a small base64 data URL of an allowed type. Anything else means no picture (the item stays).
const readImage = (v: unknown): string => (typeof v === "string" && v.length <= IMAGE_MAX && IMAGE_DATA.test(v) ? v : "");

function readItem(raw: unknown): BlockItem | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const label = typeof d.label === "string" && d.label.trim().length > 0 && d.label.length <= 40 ? d.label : null;
  const sub = typeof d.sub === "string" && d.sub.length <= 80 ? d.sub : null;
  const link = typeof d.link === "string" && isSafeInternal(d.link) ? d.link : null;
  if (label === null || sub === null || link === null) return null;
  return { label, sub, link, image: readImage(d.image) };
}

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
    if (!s) continue;
    const limit = BLOCK_ITEM_LIMITS[id] ?? 0;
    const items = Array.isArray(s.items) ? s.items.slice(0, limit).map(readItem).filter((x): x is BlockItem => x !== null) : [];
    if (items.length === 0) continue;
    out[id] = {
      title: typeof s.title === "string" && s.title.length <= 60 ? s.title : "",
      background: typeof s.background === "string" && HEX.test(s.background) ? s.background : "",
      textColor: typeof s.textColor === "string" && HEX.test(s.textColor) ? s.textColor : "",
      items,
    };
  }
  return out;
}

// ---- Configurable product rows (the product-rails block). The admin sets them; the shop checks them again here.
export const ROW_SOURCES = ["category", "brand", "bestsellers", "new"] as const;
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
  if (needsValue && (value.trim().length === 0 || value.length > 60)) return null;
  if (!needsValue && value !== "") return null;
  return { title, source, value: needsValue ? value.trim() : "", limit };
}

// The rows set on the product-rails block, in order. Empty when none are set: the shop then shows its default rows.
export function readProductRows(raw: unknown): ProductRow[] {
  const blocks = raw && typeof raw === "object" && Array.isArray((raw as { blocks?: unknown }).blocks) ? (raw as { blocks: unknown[] }).blocks : [];
  const block = blocks.find((b) => b && typeof b === "object" && (b as { id?: unknown }).id === "product-rails") as { enabled?: unknown; settings?: { rows?: unknown } } | undefined;
  if (!block || block.enabled !== true || !block.settings || !Array.isArray(block.settings.rows)) return [];
  return block.settings.rows.slice(0, ROW_LIMITS.maxRows).map(readRow).filter((r): r is ProductRow => r !== null);
}

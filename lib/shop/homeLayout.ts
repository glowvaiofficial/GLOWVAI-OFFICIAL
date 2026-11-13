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

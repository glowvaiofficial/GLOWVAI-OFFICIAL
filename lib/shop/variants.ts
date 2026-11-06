// Product variants (size, shade or pack) for the shop. A product may carry a `variants` list with its own price, MRP
// and stock. Everything here is pure, so the shop screens, the order route and the tests share one set of rules.
//
// Rules:
// - A product without variants (field missing or an empty list) behaves exactly as before: one price, product stock.
// - A product with variants is sold per variant. Every cart line names a variant; the server prices and checks it.
// - One cart line uses one stock domain: a variant line decrements variant stock only, a product line decrements
//   product stock only. A product with variants never takes a line without a variant id.
// - The browser never sends a price. The server reads the variant from the product document and prices from it.
//
// The Firestore side (transactions) lives in ./variantStockTx.ts and ./platformStockTx.ts. The admin entry point that
// uses the shop database is ./variantsServer.ts (server only); setVariants here takes the Firestore as an argument.
import type { Firestore } from "firebase-admin/firestore";
import { MAX_STOCK, planReservation, reservationFor, stockProblemMessage, trackedStock, type ProductStock, type Shortage, type StockChange, type StockLine } from "./platformStock";

export const MAX_VARIANTS = 20;
export const MAX_VARIANT_PRICE = 1_000_000;
export const VARIANT_ID_PATTERN = /^[a-z0-9-]{1,40}$/;
export const PRODUCT_ID_PATTERN = /^[A-Za-z0-9_-]{1,140}$/;
// Stock at or below this is shown as "Only N left" on the product page.
export const LOW_STOCK_AT = 5;

export const UNKNOWN_VARIANT_MESSAGE = "That option is no longer available. Remove it from your bag and try again.";
export const CHOOSE_VARIANT_MESSAGE = "Choose an option for this product, then add it to your bag again.";
export const UNAVAILABLE_PRODUCT_MESSAGE = "One of the products is no longer available. Remove it from your bag and try again.";

export interface Variant {
  id: string;
  label: string;
  price: number;
  mrp: number;
  // null = not tracked (always sellable when isAvailable); a whole number = units in stock.
  stock: number | null;
  isAvailable: boolean;
  sku?: string;
}

export type VariantCheck = { ok: true; variants: Variant[] } | { ok: false; errors: string[] };

const isPlainObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isWhole = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;

// Checks a whole variant list. Returns the cleaned list (unknown fields dropped) or every problem found, one per line.
export function validateVariants(input: unknown): VariantCheck {
  if (!Array.isArray(input)) return { ok: false, errors: ["Variants must be a list."] };
  if (input.length > MAX_VARIANTS) return { ok: false, errors: [`A product can have at most ${MAX_VARIANTS} variants.`] };
  const errors: string[] = [];
  const out: Variant[] = [];
  const ids = new Set<string>();
  const labels = new Set<string>();
  input.forEach((raw, index) => {
    const at = `Variant ${index + 1}`;
    if (!isPlainObject(raw)) {
      errors.push(`${at} must be an object.`);
      return;
    }
    const before = errors.length;
    const id = typeof raw.id === "string" ? raw.id : "";
    if (!VARIANT_ID_PATTERN.test(id)) errors.push(`${at}: id must be 1-40 characters of lowercase letters, numbers or hyphens.`);
    else if (ids.has(id)) errors.push(`${at}: id "${id}" is already used by another variant.`);

    const label = typeof raw.label === "string" ? raw.label.trim() : "";
    if (label.length < 1 || label.length > 40) errors.push(`${at}: label must be 1-40 characters.`);
    else if (labels.has(label.toLowerCase())) errors.push(`${at}: label "${label}" is already used by another variant.`);

    const price = raw.price;
    if (!isWhole(price, 1, MAX_VARIANT_PRICE)) errors.push(`${at}: price must be a whole rupee amount above 0.`);
    const mrp = raw.mrp;
    if (!isWhole(mrp, 1, MAX_VARIANT_PRICE)) errors.push(`${at}: MRP must be a whole rupee amount above 0.`);
    else if (isWhole(price, 1, MAX_VARIANT_PRICE) && mrp < price) errors.push(`${at}: MRP must be at least the price.`);

    const stock = raw.stock === null ? null : raw.stock;
    if (stock !== null && !isWhole(stock, 0, MAX_STOCK)) errors.push(`${at}: stock must be a whole number from 0, or null when not tracked.`);

    if (typeof raw.isAvailable !== "boolean") errors.push(`${at}: isAvailable must be true or false.`);

    let sku: string | undefined;
    if (raw.sku !== undefined && raw.sku !== null) {
      const s = typeof raw.sku === "string" ? raw.sku.trim() : "";
      if (s.length < 1 || s.length > 40) errors.push(`${at}: SKU must be 1-40 characters.`);
      else sku = s;
    }

    if (errors.length !== before) return;
    ids.add(id);
    labels.add(label.toLowerCase());
    out.push({
      id,
      label,
      price: price as number,
      mrp: mrp as number,
      stock: stock as number | null,
      isAvailable: raw.isAvailable as boolean,
      ...(sku ? { sku } : {}),
    });
  });
  return errors.length ? { ok: false, errors } : { ok: true, variants: out };
}

// The variants a stored product document carries. null = no variants (sold as a single product).
// ok: false = the stored list is broken; such a product is not sold until the admin fixes it.
export type ProductVariants = { ok: true; variants: Variant[] | null } | { ok: false };
export function readProductVariants(raw: unknown): ProductVariants {
  if (raw === undefined || raw === null) return { ok: true, variants: null };
  if (Array.isArray(raw) && raw.length === 0) return { ok: true, variants: null };
  const checked = validateVariants(raw);
  return checked.ok ? { ok: true, variants: checked.variants } : { ok: false };
}

// A variant can be bought now: the admin has it on sale and it is not sold out.
export const isSellable = (v: Variant): boolean => v.isAvailable && (v.stock === null || v.stock > 0);

// The variant a product opens on: the first sellable one, otherwise the first one listed.
export function defaultVariant(variants: Variant[]): Variant {
  return variants.find(isSellable) ?? variants[0];
}

// Turns a variant id from the browser into the variant it names. Unknown or malformed ids are refused, never guessed.
export type VariantPick = { ok: true; variant: Variant | null } | { ok: false; error: string };
export function resolveVariant(variants: Variant[] | null, variantId: unknown): VariantPick {
  if (variantId !== undefined && variantId !== null && variantId !== "" && typeof variantId !== "string") {
    return { ok: false, error: UNKNOWN_VARIANT_MESSAGE };
  }
  const wanted = typeof variantId === "string" && variantId !== "" ? variantId : null;
  if (!variants) return wanted ? { ok: false, error: UNKNOWN_VARIANT_MESSAGE } : { ok: true, variant: null };
  if (!wanted) return { ok: false, error: CHOOSE_VARIANT_MESSAGE };
  if (!VARIANT_ID_PATTERN.test(wanted)) return { ok: false, error: UNKNOWN_VARIANT_MESSAGE };
  const variant = variants.find((v) => v.id === wanted);
  return variant ? { ok: true, variant } : { ok: false, error: UNKNOWN_VARIANT_MESSAGE };
}

// The cart key of a line: the product id alone for a product without variants (so existing carts keep their keys),
// otherwise "productId::variantId", so one product in two sizes is two lines.
export const lineKeyOf = (productId: string, variantId?: string | null): string => (variantId ? `${productId}::${variantId}` : productId);

// ---- Browser helpers: "from" price, stock wording, cart migration. Pure, no server imports.

// Lowest price among the variants a customer can pick (sellable first; all variants when none is sellable).
export function fromPrice(variants: Variant[]): { price: number; mrp: number } {
  const pool = variants.some(isSellable) ? variants.filter(isSellable) : variants;
  const cheapest = pool.reduce((a, b) => (b.price < a.price ? b : a));
  return { price: cheapest.price, mrp: cheapest.mrp };
}

export type VariantStockState = { state: "in" | "low" | "out"; count: number | null };
export function variantStockState(v: Variant): VariantStockState {
  if (!isSellable(v)) return { state: "out", count: v.stock };
  if (v.stock !== null && v.stock <= LOW_STOCK_AT) return { state: "low", count: v.stock };
  return { state: "in", count: v.stock };
}

// A cart line still names something the shop sells. Used before checkout to drop lines that are no longer sold.
export function lineStillSold(line: { productId: string; variantId?: string | null }, product: { variants?: Variant[] | null } | undefined): boolean {
  if (!product) return false;
  const variants = product.variants ?? null;
  if (!variants || variants.length === 0) return !line.variantId;
  return !!line.variantId && variants.some((v) => v.id === line.variantId);
}

export interface CartLineLike {
  productId: string;
  variantId?: string | null;
  variantLabel?: string | null;
  price: number;
  mrp?: number;
  quantity: number;
}

// Brings saved cart lines up to date with the catalogue, without dropping any line.
// - A line saved before variants existed (no variantId) moves to the product's default variant, or stays a single-price
//   line when the product has no variants.
// - A variant line gets the variant's current label, price and MRP. A variant that no longer exists is left as it is,
//   so checkout can tell the customer it was removed.
// - Lines that now share a key are merged by quantity.
// catalog maps product id to its variants (null = no variants). Without a catalog, every line is kept as it is.
export function migrateCartLines<T extends CartLineLike>(items: Record<string, T>, catalog?: Map<string, Variant[] | null>): Record<string, T> {
  const out: Record<string, T> = {};
  for (const item of Object.values(items)) {
    if (!item || typeof item.productId !== "string" || !(item.quantity > 0)) continue;
    const variants = catalog?.get(item.productId) ?? null;
    let next: T = item;
    if (item.variantId === undefined) {
      // A legacy line for a product the catalogue does not list yet stays as it is until the catalogue arrives.
      if (catalog?.has(item.productId)) {
        if (variants && variants.length > 0) {
          const d = defaultVariant(variants);
          next = { ...item, variantId: d.id, variantLabel: d.label, price: d.price, mrp: d.mrp };
        } else {
          next = { ...item, variantId: null, variantLabel: null };
        }
      }
    } else if (item.variantId && variants) {
      const v = variants.find((x) => x.id === item.variantId);
      if (v) next = { ...item, variantLabel: v.label, price: v.price, mrp: v.mrp };
    }
    const key = lineKeyOf(next.productId, next.variantId);
    const prev = out[key];
    out[key] = prev ? { ...next, quantity: prev.quantity + next.quantity } : next;
  }
  return out;
}

// ---- Server: order lines.

export interface CartLine {
  productId: string;
  variantId: string | null;
  quantity: number;
}

// Reads the browser's cart lines. Same product and variant lines are merged; quantity is capped at maxQty.
export function parseCartLines(lines: unknown[], maxQty: number): { ok: true; lines: CartLine[] } | { ok: false; error: string } {
  const merged = new Map<string, CartLine>();
  for (const raw of lines) {
    const l: Record<string, unknown> = isPlainObject(raw) ? raw : {};
    const productId = typeof l.productId === "string" ? l.productId.trim() : "";
    const qty = Math.floor(Number(l.quantity));
    if (!PRODUCT_ID_PATTERN.test(productId) || !Number.isFinite(qty) || qty < 1) {
      return { ok: false, error: "Each item needs a product and a quantity." };
    }
    const rawVariant = l.variantId;
    if (rawVariant !== undefined && rawVariant !== null && rawVariant !== "" && typeof rawVariant !== "string") {
      return { ok: false, error: UNKNOWN_VARIANT_MESSAGE };
    }
    const variantId = typeof rawVariant === "string" && rawVariant !== "" ? rawVariant : null;
    if (variantId !== null && !VARIANT_ID_PATTERN.test(variantId)) return { ok: false, error: UNKNOWN_VARIANT_MESSAGE };
    const key = lineKeyOf(productId, variantId);
    const prev = merged.get(key);
    merged.set(key, { productId, variantId, quantity: Math.min(maxQty, (prev?.quantity ?? 0) + qty) });
  }
  return { ok: true, lines: [...merged.values()] };
}

// The product fields an order reads. Structural, so a Firestore document and a stock read both fit.
export interface ProductDoc {
  status?: unknown;
  brandPrice?: unknown;
  productName?: unknown;
  brandName?: unknown;
  pictures?: unknown;
  variants?: unknown;
}

// The order item for one cart line, priced from the product document (never from the browser).
export type OrderItemResult = { ok: true; item: Record<string, unknown> } | { ok: false; status: number; error: string };
export function orderItemFor(product: ProductDoc | undefined, line: CartLine): OrderItemResult {
  if (!product || product.status !== "PUBLISHED") return { ok: false, status: 409, error: UNAVAILABLE_PRODUCT_MESSAGE };
  const stored = readProductVariants(product.variants);
  if (!stored.ok) return { ok: false, status: 409, error: UNAVAILABLE_PRODUCT_MESSAGE };
  const pick = resolveVariant(stored.variants, line.variantId);
  if (!pick.ok) return { ok: false, status: 409, error: pick.error };
  const variant = pick.variant;
  const unitPrice = variant ? variant.price : Math.round(Number(product.brandPrice) || 0);
  const name = String(product.productName ?? "");
  if (unitPrice <= 0) return { ok: false, status: 409, error: `${name || "A product"} has no price yet.` };
  return {
    ok: true,
    item: {
      productId: line.productId,
      sku: variant?.sku || line.productId,
      title: name,
      productName: name,
      brand: String(product.brandName ?? ""),
      unitPrice,
      quantity: line.quantity,
      totalPrice: unitPrice * line.quantity,
      imageUrl: Array.isArray(product.pictures) && product.pictures[0] ? String(product.pictures[0]) : "",
      variantId: variant?.id ?? null,
      variantLabel: variant?.label ?? null,
      hasBeautyProtection: false,
      beautyProtectionFee: 0,
    },
  };
}

// The price a line should cost right now, or null when the line can no longer be bought.
export function currentUnitPrice(product: ProductDoc | undefined, variantId: string | null): number | null {
  if (!product || product.status !== "PUBLISHED") return null;
  const stored = readProductVariants(product.variants);
  if (!stored.ok) return null;
  const pick = resolveVariant(stored.variants, variantId);
  if (!pick.ok) return null;
  return pick.variant ? pick.variant.price : Math.round(Number(product.brandPrice) || 0);
}

// ---- Server: stock planning. Pure: callers read the products and write what these return.

export type StockProduct = ProductStock & { variants?: unknown };

export interface OrderStockLine {
  productId: string;
  variantId: string | null;
  quantity: number;
}

export interface VariantChange {
  productId: string;
  variantId: string;
  quantity: number;
  before: number;
  after: number;
}

// The full variant list of one product after the change, plus the changes that produced it.
export interface VariantWrite {
  productId: string;
  variants: Variant[];
  changes: VariantChange[];
}

export type OrderStockPlan = { ok: true; decrements: StockChange[]; variantWrites: VariantWrite[] } | { ok: false; message: string };

const mergeKey = (l: { productId: string; variantId: string | null }) => lineKeyOf(l.productId, l.variantId);

function mergeLines<T extends { productId: string; variantId: string | null; quantity: number }>(lines: T[]): T[] {
  const merged = new Map<string, T>();
  for (const l of lines) {
    const prev = merged.get(mergeKey(l));
    merged.set(mergeKey(l), { ...l, quantity: (prev?.quantity ?? 0) + l.quantity });
  }
  return [...merged.values()];
}

// Checks every line of an order and works out the stock to take. All lines pass or none does.
// Product lines use the platform rule (only tracked products are checked). Variant lines check and take the variant's
// own stock; a variant with stock null is not tracked. The product's own stock is never touched by a variant line.
export function planOrderStock(lines: OrderStockLine[], products: Map<string, StockProduct | undefined>): OrderStockPlan {
  const resolved: { line: OrderStockLine; product: StockProduct; variants: Variant[] | null; variant: Variant | null }[] = [];
  for (const line of mergeLines(lines)) {
    const product = products.get(line.productId);
    if (!product) return { ok: false, message: stockProblemMessage({ shortages: [], unavailable: [line.productId] }) };
    const stored = readProductVariants(product.variants);
    if (!stored.ok) return { ok: false, message: UNAVAILABLE_PRODUCT_MESSAGE };
    const pick = resolveVariant(stored.variants, line.variantId);
    if (!pick.ok) return { ok: false, message: pick.error };
    resolved.push({ line, product, variants: stored.variants, variant: pick.variant });
  }

  const productLines: StockLine[] = resolved.filter((r) => !r.variant).map((r) => ({ productId: r.line.productId, quantity: r.line.quantity }));
  const productPlan = planReservation(productLines, products);
  if (!productPlan.ok) return { ok: false, message: stockProblemMessage(productPlan) };

  const working = new Map<string, Variant[]>();
  const changes: VariantChange[] = [];
  for (const r of resolved) {
    if (!r.variant || !r.variants) continue;
    const name = String(r.product.productName ?? "") || "An item";
    const v = r.variant;
    if (!v.isAvailable) return { ok: false, message: `${name} (${v.label}) is not available right now. Remove it from your bag and try again.` };
    const copy = working.get(r.line.productId) ?? r.variants.map((x) => ({ ...x }));
    working.set(r.line.productId, copy);
    const target = copy.find((x) => x.id === v.id);
    const before = trackedStock(v.stock);
    if (!target || before === null) continue;
    if (before < r.line.quantity) {
      if (before <= 0) return { ok: false, message: `${name} (${v.label}) is sold out. Remove it from your bag and try again.` };
      return { ok: false, message: `Only ${before} of ${name} (${v.label}) left. Lower the quantity in your bag and try again.` };
    }
    target.stock = before - r.line.quantity;
    changes.push({ productId: r.line.productId, variantId: v.id, quantity: r.line.quantity, before, after: before - r.line.quantity });
  }

  const variantWrites: VariantWrite[] = [];
  for (const [productId, variants] of working) {
    const own = changes.filter((c) => c.productId === productId);
    if (own.length) variantWrites.push({ productId, variants, changes: own });
  }
  return { ok: true, decrements: productPlan.decrements, variantWrites };
}

// The reservation saved on a new order: product lines as before, plus the variant lines that were taken.
export interface ReservedVariantLine {
  productId: string;
  variantId: string;
  quantity: number;
}

export function orderReservationFor(plan: { decrements: StockChange[]; variantWrites: VariantWrite[] }) {
  const variants: ReservedVariantLine[] = plan.variantWrites.flatMap((w) => w.changes.map((c) => ({ productId: c.productId, variantId: c.variantId, quantity: c.quantity })));
  return { ...reservationFor(plan.decrements), variants };
}

// Reads the variant lines of a stored reservation defensively (the field is written by the order route only).
export function reservedVariantLinesOf(reservation: unknown): ReservedVariantLine[] {
  const r = (reservation ?? null) as { variants?: unknown } | null;
  if (!r || !Array.isArray(r.variants)) return [];
  return r.variants
    .map((x) => {
      const o = (x ?? {}) as { productId?: unknown; variantId?: unknown; quantity?: unknown };
      return { productId: String(o.productId ?? ""), variantId: String(o.variantId ?? ""), quantity: Math.floor(Number(o.quantity) || 0) };
    })
    .filter((x) => PRODUCT_ID_PATTERN.test(x.productId) && VARIANT_ID_PATTERN.test(x.variantId) && x.quantity > 0);
}

// Every product document a reservation touches (product lines and variant lines), so one read covers both.
export function reservedProductIds(reservation: unknown): string[] {
  const platform = ((reservation ?? {}) as { platform?: unknown }).platform;
  const ids = new Set<string>();
  if (Array.isArray(platform)) for (const p of platform) if (typeof (p as { productId?: unknown })?.productId === "string") ids.add((p as { productId: string }).productId);
  for (const v of reservedVariantLinesOf(reservation)) ids.add(v.productId);
  return [...ids].filter((id) => PRODUCT_ID_PATTERN.test(id));
}

// Gives back variant stock for the lines of a reservation. Empty when the reservation is already released.
export function planVariantRelease(reservation: unknown, products: Map<string, StockProduct | undefined>): VariantWrite[] {
  const r = (reservation ?? null) as { releasedAt?: unknown } | null;
  if (!r || r.releasedAt) return [];
  return adjustVariantStock(reservedVariantLinesOf(reservation), products, "give").writes;
}

// Takes variant stock again for a payment confirmed after its release. Clamped at zero; short lines are reported.
export function planVariantRetake(
  reservation: unknown,
  products: Map<string, StockProduct | undefined>,
): { writes: VariantWrite[]; short: Shortage[] } {
  const r = (reservation ?? null) as { releasedAt?: unknown } | null;
  if (!r || !r.releasedAt) return { writes: [], short: [] };
  return adjustVariantStock(reservedVariantLinesOf(reservation), products, "take");
}

function adjustVariantStock(
  lines: ReservedVariantLine[],
  products: Map<string, StockProduct | undefined>,
  mode: "give" | "take",
): { writes: VariantWrite[]; short: Shortage[] } {
  const working = new Map<string, Variant[]>();
  const changes = new Map<string, VariantChange[]>();
  const short: Shortage[] = [];
  for (const line of mergeLines(lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity })))) {
    const product = products.get(line.productId);
    if (!product) continue;
    const stored = readProductVariants(product.variants);
    if (!stored.ok || !stored.variants) continue;
    const copy = working.get(line.productId) ?? stored.variants.map((x) => ({ ...x }));
    const target = copy.find((x) => x.id === line.variantId);
    if (!target) continue;
    const before = trackedStock(target.stock);
    if (before === null) continue;
    let quantity: number;
    let after: number;
    if (mode === "give") {
      quantity = line.quantity;
      after = Math.min(MAX_STOCK, before + quantity);
    } else {
      quantity = Math.min(before, line.quantity);
      if (quantity < line.quantity) {
        short.push({ productId: line.productId, name: `${String(product.productName ?? "")} (${target.label})`.trim(), requested: line.quantity, available: before });
      }
      after = before - quantity;
    }
    working.set(line.productId, copy);
    if (quantity === 0) continue;
    target.stock = after;
    const list = changes.get(line.productId) ?? [];
    list.push({ productId: line.productId, variantId: target.id, quantity, before, after });
    changes.set(line.productId, list);
  }
  const writes: VariantWrite[] = [];
  for (const [productId, list] of changes) writes.push({ productId, variants: working.get(productId) ?? [], changes: list });
  return { writes, short };
}

// ---- Admin: the entry point for the admin team. Replaces a product's variant list after validating it.

export type SetVariantsResult = { ok: true; count: number } | { ok: false; errors: string[] };

// Saves a product's variant list (validated here, never trusted from the caller) and records who changed it.
// Stock values are set by the admin along with the list. The product's own stock field is ignored once it has variants.
// The Firestore is passed in so this file stays free of server-only imports; see ./variantsServer.ts for the wrapper.
export async function setVariants(productId: string, variants: unknown, actor: string, store: Firestore): Promise<SetVariantsResult> {
  if (!PRODUCT_ID_PATTERN.test(productId)) return { ok: false, errors: ["Product id is not valid."] };
  const who = typeof actor === "string" ? actor.trim().slice(0, 120) : "";
  if (!who) return { ok: false, errors: ["An actor is required to record the change."] };
  const checked = validateVariants(variants);
  if (!checked.ok) return { ok: false, errors: checked.errors };
  const ref = store.collection("products").doc(productId);
  const now = Date.now();
  return store.runTransaction(async (tx): Promise<SetVariantsResult> => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { ok: false, errors: ["Product not found."] };
    tx.update(ref, { variants: checked.variants, variantsUpdatedAt: now, variantsUpdatedBy: who });
    return { ok: true, count: checked.variants.length };
  });
}

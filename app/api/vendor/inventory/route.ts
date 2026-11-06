import { db } from "@/lib/shop/server";
import { readProductVariants, type Variant } from "@/lib/shop/variants";
import { VendorError, invalid } from "@/lib/vendor/errors";
import { perMinute, preflight, readJson, vendorRoute } from "@/lib/vendor/http";
import { inventoryCol, loadVendor, operatorOf } from "@/lib/vendor/store";
import { inventoryKey, parseInventory, productMrp, variantLineProblem } from "@/lib/vendor/validation";

export const dynamic = "force-dynamic";

type Doc = Record<string, unknown>;

const LIST_LIMIT = 500;

interface InventoryItem {
  productId: string;
  /** null for the product's own line; the option id for a per-option line. */
  variantId: string | null;
  stock: number;
  isAvailable: boolean;
  unitPriceOverride?: number;
  updatedAt: number;
  lastRestockedAt: number;
}

/** A product option as the GlowVai catalogue holds it. Read-only for the vendor: only stock and availability are the store's. */
export interface VariantView {
  id: string;
  label: string;
  price: number;
  mrp: number;
  stock: number | null;
  isAvailable: boolean;
  sku?: string;
}

const toVariantView = (v: Variant): VariantView => ({
  id: v.id,
  label: v.label,
  price: v.price,
  mrp: v.mrp,
  stock: v.stock,
  isAvailable: v.isAvailable,
  ...(v.sku ? { sku: v.sku } : {}),
});

function toItem(id: string, d: Doc): InventoryItem {
  const item: InventoryItem = {
    productId: String(d.productId ?? id),
    variantId: typeof d.variantId === "string" && d.variantId ? d.variantId : null,
    stock: Math.max(0, Math.floor(Number(d.stock) || 0)),
    isAvailable: d.isAvailable === true,
    updatedAt: Number(d.updatedAt) || 0,
    lastRestockedAt: Number(d.lastRestockedAt) || 0,
  };
  if (typeof d.unitPriceOverride === "number" && d.unitPriceOverride > 0) item.unitPriceOverride = d.unitPriceOverride;
  return item;
}

// An approved store (active or paused) manages its stock; suspended or unapproved stores cannot.
async function requireApproved(uid: string) {
  const vendor = operatorOf(await loadVendor(uid));
  if (!vendor.approved) throw new VendorError("NOT_APPROVED", 403);
  return vendor;
}

// My stock lines. With ?variants=1 also the options of each listed product (read-only, from the catalogue): one extra
// read per listed product, so the app asks for it only on the stock screen.
export const GET = vendorRoute({ route: "inventory-get", ip: perMinute(60), user: perMinute(30) }, async ({ req, me }) => {
  await requireApproved(me.uid);
  const snap = await inventoryCol(me.uid).limit(LIST_LIMIT).get();
  const items = snap.docs.map((d) => toItem(d.id, d.data() as Doc));
  if (req.nextUrl.searchParams.get("variants") !== "1") return { items };

  const productIds = [...new Set(items.map((i) => i.productId))];
  const variants: Record<string, VariantView[]> = {};
  if (productIds.length) {
    const store = db();
    const snaps = await store.getAll(...productIds.map((id) => store.collection("products").doc(id)));
    for (const s of snaps) {
      if (!s.exists) continue;
      const read = readProductVariants(s.get("variants"));
      if (read.ok && read.variants) variants[s.id] = read.variants.map(toVariantView);
    }
  }
  return { items, variants };
});

// Saves stock for 1-100 lines. A product line needs a published product; a per-option line (variantId) needs an option
// the product really has. A store price may not exceed MRP and is only set on a product line.
export const PUT = vendorRoute({ route: "inventory-put", ip: perMinute(30), user: perMinute(20) }, async ({ req, me }) => {
  const parsed = parseInventory(await readJson(req));
  if (!parsed.ok) throw invalid(parsed.error, { field: parsed.field });
  await requireApproved(me.uid);

  const store = db();
  const items = parsed.value;
  // One getAll for the products and my current lines (to keep lastRestockedAt when stock did not go up).
  const productRefs = items.map((it) => store.collection("products").doc(it.productId));
  const lineRefs = items.map((it) => inventoryCol(me.uid).doc(inventoryKey(it.productId, it.variantId)));
  const snaps = await store.getAll(...productRefs, ...lineRefs);
  const products = snaps.slice(0, items.length);
  const lines = snaps.slice(items.length);

  const notPublished = items.filter((_, i) => !products[i].exists || products[i].get("status") !== "PUBLISHED").map((it) => it.productId);
  if (notPublished.length) throw new VendorError("PRODUCT_NOT_PUBLISHED", 409, undefined, { productIds: notPublished });

  items.forEach((it, i) => {
    if (it.variantId === undefined) return;
    const read = readProductVariants(products[i].get("variants"));
    if (!read.ok) throw invalid("This product's options are not set up yet, so its stock cannot be set per option.", { field: "items.variantId", productId: it.productId });
    const problem = variantLineProblem(read.variants, it.variantId);
    if (problem) throw invalid(problem, { field: "items.variantId", productId: it.productId });
  });

  items.forEach((it, i) => {
    if (it.unitPriceOverride === undefined) return;
    const mrp = productMrp(products[i].data() as Doc);
    if (!(mrp > 0) || it.unitPriceOverride > mrp) {
      const label = String(products[i].get("productName") ?? it.productId);
      throw invalid(`The store price for ${label} cannot be more than its MRP (₹${mrp}).`, { field: "items.unitPriceOverride", productId: it.productId });
    }
  });

  const now = Date.now();
  const batch = store.batch();
  const saved: InventoryItem[] = items.map((it, i) => {
    const prev = lines[i].exists ? (lines[i].data() as Doc) : null;
    const prevStock = Number(prev?.stock) || 0;
    const prevRestock = Number(prev?.lastRestockedAt) || 0;
    const doc: InventoryItem & Doc = {
      productId: it.productId,
      variantId: it.variantId ?? null,
      stock: it.stock,
      isAvailable: it.isAvailable,
      updatedAt: now,
      lastRestockedAt: !prev || it.stock > prevStock || !prevRestock ? now : prevRestock,
    };
    if (it.unitPriceOverride !== undefined) doc.unitPriceOverride = it.unitPriceOverride;
    batch.set(lineRefs[i], doc);
    return doc;
  });
  await batch.commit();
  return { items: saved };
});

export const OPTIONS = preflight;

import { db } from "@/lib/shop/server";
import { VendorError, invalid } from "@/lib/vendor/errors";
import { perMinute, preflight, readJson, vendorRoute } from "@/lib/vendor/http";
import { inventoryCol, loadVendor, operatorOf } from "@/lib/vendor/store";
import { parseInventory, productMrp } from "@/lib/vendor/validation";

export const dynamic = "force-dynamic";

type Doc = Record<string, unknown>;

const LIST_LIMIT = 500;

interface InventoryItem {
  productId: string;
  stock: number;
  isAvailable: boolean;
  unitPriceOverride?: number;
  updatedAt: number;
  lastRestockedAt: number;
}

function toItem(id: string, d: Doc): InventoryItem {
  const item: InventoryItem = {
    productId: String(d.productId ?? id),
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

export const GET = vendorRoute({ route: "inventory-get", ip: perMinute(60), user: perMinute(30) }, async ({ me }) => {
  await requireApproved(me.uid);
  const snap = await inventoryCol(me.uid).limit(LIST_LIMIT).get();
  return { items: snap.docs.map((d) => toItem(d.id, d.data() as Doc)) };
});

// Saves stock for 1-100 products. Every product must be published on GlowVai, and a store price may not exceed MRP.
export const PUT = vendorRoute({ route: "inventory-put", ip: perMinute(30), user: perMinute(20) }, async ({ req, me }) => {
  const parsed = parseInventory(await readJson(req));
  if (!parsed.ok) throw invalid(parsed.error, { field: parsed.field });
  await requireApproved(me.uid);

  const store = db();
  const items = parsed.value;
  // One getAll for the products and my current lines (to keep lastRestockedAt when stock did not go up).
  const productRefs = items.map((it) => store.collection("products").doc(it.productId));
  const lineRefs = items.map((it) => inventoryCol(me.uid).doc(it.productId));
  const snaps = await store.getAll(...productRefs, ...lineRefs);
  const products = snaps.slice(0, items.length);
  const lines = snaps.slice(items.length);

  const notPublished = items.filter((_, i) => !products[i].exists || products[i].get("status") !== "PUBLISHED").map((it) => it.productId);
  if (notPublished.length) throw new VendorError("PRODUCT_NOT_PUBLISHED", 409, undefined, { productIds: notPublished });
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
    const doc: InventoryItem = {
      productId: it.productId,
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

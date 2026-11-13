// Server side of flash sales: loads the live sales, counts the units already sold and bought by this customer, and prices
// each bag line. Used by the cart quote and by the order, so both give the same price.
import "server-only";
import type { Firestore } from "firebase-admin/firestore";
import { liveSaleFor, priceFlashLine, readFlashSale, type FlashSale, type FlashLinePricing } from "./flashSales";

const CANCELLED = new Set(["CANCELLED", "VENDOR_REJECTED"]);

export interface PricedLine {
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface FlashPricedLine extends PricedLine, FlashLinePricing {
  flashSaleId: string | null;
}

export async function loadFlashSales(store: Firestore): Promise<FlashSale[]> {
  const snap = await store.collection("flashSales").where("enabled", "==", true).limit(50).get();
  const out: FlashSale[] = [];
  for (const doc of snap.docs) {
    const sale = readFlashSale(doc.id, doc.data());
    if (sale) out.push(sale);
  }
  return out;
}

// Units already sold in a sale, and units this customer already bought, from orders that were not cancelled.
export async function flashUnitsUsed(store: Firestore, saleId: string, uid: string | null): Promise<{ sold: number; forCustomer: number }> {
  const snap = await store.collection("orders").where("flashSaleIds", "array-contains", saleId).limit(2000).get();
  let sold = 0;
  let forCustomer = 0;
  for (const doc of snap.docs) {
    const d = doc.data() as { status?: unknown; userId?: unknown; items?: unknown };
    if (CANCELLED.has(String(d.status ?? ""))) continue;
    const items = Array.isArray(d.items) ? (d.items as { flashSaleId?: unknown; flashUnits?: unknown }[]) : [];
    let units = 0;
    for (const it of items) if (it.flashSaleId === saleId) units += Number(it.flashUnits) || 0;
    sold += units;
    if (uid && d.userId === uid) forCustomer += units;
  }
  return { sold, forCustomer };
}

// Prices every line with the live flash sale for its product, if there is one. Lines without a sale keep their price.
export async function applyFlashSales(store: Firestore, lines: PricedLine[], uid: string | null, now: number): Promise<FlashPricedLine[]> {
  const sales = await loadFlashSales(store);
  const used = new Map<string, { sold: number; forCustomer: number }>();
  const out: FlashPricedLine[] = [];
  for (const line of lines) {
    const sale = liveSaleFor(sales, line.productId, now);
    if (!sale) {
      out.push({ ...line, flashUnits: 0, flashUnitPrice: null, flashSaleId: null });
      continue;
    }
    if (!used.has(sale.id)) used.set(sale.id, await flashUnitsUsed(store, sale.id, uid));
    const u = used.get(sale.id)!;
    const priced = priceFlashLine({ unitPrice: line.unitPrice, quantity: line.quantity, sale, soldSoFar: u.sold, customerSoFar: u.forCustomer });
    // Units taken from this line count against the sale for the next line in the same bag.
    u.sold += priced.flashUnits;
    u.forCustomer += priced.flashUnits;
    out.push({ ...line, ...priced, flashSaleId: priced.flashUnits > 0 ? sale.id : null });
  }
  return out;
}

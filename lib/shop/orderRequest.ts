// Order request checks: the bag, the delivery address and the payment method, in the order the shop has always
// checked them. Pure (no server imports) so the node tests can run them. The order route and the subscription cron use these.
import { text, indianMobile } from "./text";
import { parseCoinsRequested } from "./growth/coins";

export const MAX_LINES = 20;
export const MAX_QTY = 10;

export interface DeliveryAddress {
  name: string;
  phone: string;
  fullAddress: string;
  city: string;
  pincode: string;
  area: string;
  landmark: string;
}

export interface ParsedOrderRequest {
  paymentMethod: "COD" | "ONLINE";
  wanted: Map<string, number>;
  address: DeliveryAddress;
  couponCode: string;
  tipRaw: unknown;
  coinsRequested: number;
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; status: number; error: string };

// Checks the order request in the order the route always has: payment method, bag, then the delivery address.
export function parseOrderRequest(body: Record<string, unknown>, options: { onlineAvailable: boolean }): ParseResult<ParsedOrderRequest> {
  const method = String(body.paymentMethod ?? "COD").toUpperCase();
  if (method !== "COD" && method !== "ONLINE") return { ok: false, status: 400, error: "Choose a payment method." };
  if (method === "ONLINE" && !options.onlineAvailable) {
    return { ok: false, status: 503, error: "Online payment is being set up. Please choose cash on delivery for now." };
  }

  const bag = parseBagLines(body.items);
  if (!bag.ok) return bag;
  const wanted = bag.value;

  const address = parseDeliveryAddress(body.address);
  if (!address.ok) return address;
  const coins = parseCoinsRequested(body.coinsToRedeem);
  if (!coins.ok) return { ok: false, status: 400, error: coins.error };
  const couponCode = text(body.couponCode, 20).toUpperCase();
  return {
    ok: true,
    value: { paymentMethod: method === "ONLINE" ? "ONLINE" : "COD", wanted, address: address.value, couponCode, tipRaw: body.tip, coinsRequested: coins.value },
  };
}

// The bag: up to MAX_LINES products, each with a quantity (the same product twice is added up, capped at MAX_QTY).
export function parseBagLines(raw: unknown): ParseResult<Map<string, number>> {
  const lines = Array.isArray(raw) ? raw : [];
  if (lines.length === 0) return { ok: false, status: 400, error: "Your bag is empty." };
  if (lines.length > MAX_LINES) return { ok: false, status: 400, error: `Up to ${MAX_LINES} different products per order.` };
  const wanted = new Map<string, number>();
  for (const item of lines) {
    const l = (item ?? {}) as Record<string, unknown>;
    const id = text(l.productId, 140);
    const qty = Math.floor(Number(l.quantity));
    if (!id || !Number.isFinite(qty) || qty < 1) return { ok: false, status: 400, error: "Each item needs a product and a quantity." };
    wanted.set(id, Math.min(MAX_QTY, (wanted.get(id) ?? 0) + qty));
  }
  return { ok: true, value: wanted };
}

export function parseDeliveryAddress(raw: unknown): ParseResult<DeliveryAddress> {
  const addr = (raw ?? {}) as Record<string, unknown>;
  const value: DeliveryAddress = {
    name: text(addr.name, 80),
    phone: indianMobile(addr.phone),
    fullAddress: text(addr.fullAddress, 300),
    city: text(addr.city, 60),
    pincode: text(addr.pincode, 6),
    area: text(addr.area, 80),
    landmark: text(addr.landmark, 120),
  };
  if (value.name.length < 2) return { ok: false, status: 400, error: "Enter the name for delivery." };
  if (!value.phone) return { ok: false, status: 400, error: "Enter a 10-digit Indian mobile number for delivery." };
  if (value.fullAddress.length < 8) return { ok: false, status: 400, error: "Enter the full delivery address." };
  if (!value.city) return { ok: false, status: 400, error: "Enter the city." };
  if (!/^\d{6}$/.test(value.pincode)) return { ok: false, status: 400, error: "Enter a 6-digit pincode." };
  return { ok: true, value };
}

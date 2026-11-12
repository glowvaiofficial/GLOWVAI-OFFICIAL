// Typed calls to the vendor operations routes. Every call goes through vendorFetch (foundation), which adds the token,
// retries once on 401 and throws VendorApiError. Nothing here polls; the provider decides when to call fetchOrders.
import { vendorFetch } from "../api";
import type { DeclineReason } from "./decline";
import type { ProductRequestPayload } from "./productRequest";
import type { AnalyticsResult, InventoryLine, OpsOrder, OrdersPage, ProductRequestView, VariantView } from "./types";
import type { SaveItem } from "./inventory";

export interface StatusResponse {
  isOnline: boolean;
  lastSeenAt: number;
}

export function setOnline(isOnline: boolean): Promise<StatusResponse> {
  return vendorFetch<StatusResponse>("/status", { method: "POST", body: { isOnline } });
}

/** since undefined = full list. Otherwise only what changed after `since`. */
export function fetchOrders(since?: number): Promise<OrdersPage & { ok?: true }> {
  const path = since === undefined ? "/orders" : `/orders?since=${Math.max(0, Math.floor(since))}`;
  return vendorFetch<OrdersPage & { ok?: true }>(path);
}

export function acceptOrder(orderId: string): Promise<{ order: OpsOrder }> {
  return vendorFetch<{ order: OpsOrder }>(`/orders/${encodeURIComponent(orderId)}/accept`, { method: "POST" });
}

export function declineOrder(orderId: string, body: { reason: DeclineReason; note?: string }): Promise<{ orderId: string }> {
  return vendorFetch<{ orderId: string }>(`/orders/${encodeURIComponent(orderId)}/decline`, { method: "POST", body });
}

export function markPacked(orderId: string, checkedProductIds: string[]): Promise<{ order: OpsOrder }> {
  return vendorFetch<{ order: OpsOrder }>(`/orders/${encodeURIComponent(orderId)}/packed`, {
    method: "POST",
    body: { checkedProductIds },
  });
}

export interface InventoryResponse {
  items: InventoryLine[];
  variants?: Record<string, VariantView[]>;
}

export function fetchInventory(): Promise<InventoryResponse> {
  return vendorFetch<InventoryResponse>("/inventory?variants=1");
}

export function saveInventory(items: SaveItem[]): Promise<{ items: InventoryLine[] }> {
  return vendorFetch<{ items: InventoryLine[] }>("/inventory", { method: "PUT", body: { items } });
}

export function fetchProductRequests(): Promise<{ requests: ProductRequestView[] }> {
  return vendorFetch<{ requests: ProductRequestView[] }>("/product-requests");
}

export function createProductRequest(body: ProductRequestPayload): Promise<{ request: ProductRequestView }> {
  return vendorFetch<{ request: ProductRequestView }>("/product-requests", { method: "POST", body });
}

export function fetchAnalytics(days: 7 | 30): Promise<AnalyticsResult> {
  return vendorFetch<AnalyticsResult>(`/analytics?days=${days}`);
}

export function registerPushToken(token: string): Promise<{ registered: boolean; devices: number }> {
  return vendorFetch<{ registered: boolean; devices: number }>("/push-token", {
    method: "POST",
    body: { token, platform: "web", tokenType: "FCM" },
  });
}

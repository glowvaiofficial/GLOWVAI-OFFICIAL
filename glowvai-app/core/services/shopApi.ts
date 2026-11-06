// Typed calls to the shop's own server routes. The server checks who the customer is (Firebase ID token), prices
// orders from the published catalogue and writes in the shape the GlowVai admin panel reads.
import { apiFetch, type ApiResult } from './customerSession';

export interface ShopProfileAddress {
  fullAddress: string;
  city: string;
  pincode: string;
  landmark?: string;
}

export interface ShopProfile {
  name: string;
  phone: string;
  email: string;
  address: ShopProfileAddress | null;
  marketingOptIn: boolean;
}

export interface ShopProfileInput {
  name: string;
  phone: string;
  email?: string;
  address: ShopProfileAddress;
  marketingOptIn?: boolean;
  analyticsOptIn?: boolean;
}

export type ShopOrderStatus = 'PLACED' | 'CANCELLED' | 'DELIVERED' | string;

export interface ShopOrderItem {
  productId: string;
  title: string;
  brand: string;
  quantity: number;
  unitPrice: number;
  imageUrl: string;
}

export interface ShopOrderPricing {
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  grandTotal: number;
}

export interface ShopOrderAddress {
  recipientName?: string;
  phoneNumber?: string;
  fullAddress?: string;
  city?: string;
  pincode?: string;
  landmark?: string;
}

export interface ShopOrder {
  orderId: string;
  status: ShopOrderStatus;
  cancellationReason: string | null;
  items: ShopOrderItem[];
  pricing: ShopOrderPricing | null;
  payment: { method: string; status: string };
  shippingAddress: ShopOrderAddress | null;
  createdAt: number | null;
}

export interface PlaceOrderInput {
  items: Array<{ productId: string; quantity: number }>;
  address: { name: string; phone: string; fullAddress: string; city: string; pincode: string; area?: string; landmark?: string };
  couponCode?: string | null;
  tip?: number;
  paymentMethod?: 'COD' | 'ONLINE';
  // A saved address (its id), re-checked by the server. When set, the typed address above is not used.
  addressId?: string | null;
  // The delivery time chosen from the offered slots (its id). Refused by the server when no longer offered.
  deliverySlot?: string | null;
}

export interface OnlinePaymentStart {
  provider: 'razorpay';
  keyId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
}

export type SavedAddressLabel = 'Home' | 'Work' | 'Other';

// A saved delivery address as the server returns it (users/{uid}/addresses). At most five, exactly one is the default.
export interface SavedAddressView {
  id: string;
  label: SavedAddressLabel;
  recipientName: string;
  phone: string;
  fullAddress: string;
  city: string;
  pincode: string;
  landmark: string;
  isDefault: boolean;
}

export interface SavedAddressInput {
  label: SavedAddressLabel;
  recipientName: string;
  phone: string;
  fullAddress: string;
  city: string;
  pincode: string;
  landmark?: string;
  makeDefault?: boolean;
}

export interface DeliverySlotView {
  id: string;
  kind: 'express' | 'window';
  day: 'today' | 'tomorrow';
  label: string;
  estimate: string;
  startsAt: number;
  endsAt: number;
}

export interface ReorderAvailableItem {
  productId: string;
  name: string;
  brand: string;
  imageUrl: string;
  unitPrice: number;
  originalPrice: number;
  previousUnitPrice: number;
  requested: number;
  quantity: number;
  limitedBy: number | null;
}

export interface ReorderUnavailableItem {
  productId: string;
  name: string;
  requested: number;
  reason: 'NOT_AVAILABLE' | 'OUT_OF_STOCK' | 'NO_PRICE';
}

export const SUPPORT_CATEGORIES = [
  { id: 'ORDER_DELAY', label: 'Order is late' },
  { id: 'MISSING_PRODUCT', label: 'Item missing from my order' },
  { id: 'WRONG_PRODUCT', label: 'Wrong item delivered' },
  { id: 'DAMAGED_PRODUCT', label: 'Item arrived damaged' },
  { id: 'DELIVERY_PROBLEM', label: 'Delivery problem' },
  { id: 'VENDOR_CANCELLATION', label: 'My order was cancelled' },
  { id: 'PAYMENT_ISSUE', label: 'Payment problem' },
  { id: 'REFUND_ISSUE', label: 'Refund problem' },
  { id: 'PRODUCT_SAFETY', label: 'Skin reaction to a product' },
  { id: 'SUSPECTED_COUNTERFEIT', label: 'Product may not be genuine' },
  { id: 'SKIN_ANALYSIS_FAILURE', label: 'Skin scan did not work' },
  { id: 'RECOMMENDATION_CONCERN', label: 'Concern about a recommendation' },
  { id: 'ACCOUNT_ISSUE', label: 'Account or something else' },
  { id: 'PRIVACY_REQUEST', label: 'Privacy or data request' },
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number]['id'];

export const supportCategoryLabel = (id: string): string =>
  SUPPORT_CATEGORIES.find((c) => c.id === id)?.label ?? id.replace(/_/g, ' ').toLowerCase();

export interface SupportTicketView {
  id: string;
  subject: string;
  category: string;
  status: string;
  orderId: string | null;
  createdAt: string;
  resolution: string | null;
  // STAFF: from the GlowVai team. CUSTOMER: written by this customer.
  messages: Array<{ at: string; kind: "STAFF" | "CUSTOMER"; text: string; evidenceRequest?: boolean }>;
}

const post = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });

export async function fetchProfile(): Promise<ApiResult<{ profile: ShopProfile | null }>> {
  return apiFetch<{ profile: ShopProfile | null }>('/api/shop/profile');
}

export async function saveProfile(input: ShopProfileInput): Promise<ApiResult<unknown>> {
  return apiFetch('/api/shop/profile', post(input));
}

export async function fetchOrders(): Promise<ApiResult<{ orders: ShopOrder[] }>> {
  return apiFetch<{ orders: ShopOrder[] }>('/api/shop/orders');
}

export async function placeOrder(input: PlaceOrderInput & { tip?: number }): Promise<ApiResult<{ orderId: string; trackingId?: string; pricing: ShopOrderPricing; status: string; payment?: OnlinePaymentStart }>> {
  return apiFetch('/api/shop/orders', post({ ...input, paymentMethod: input.paymentMethod ?? 'COD', couponCode: input.couponCode || undefined }));
}

// Confirms a Razorpay payment with the server (signature checked there).
export async function verifyOnlinePayment(input: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }): Promise<ApiResult<{ orderId: string; trackingId?: string; transactionId: string }>> {
  return apiFetch('/api/shop/payments/razorpay/verify', post(input));
}

export async function cancelOrder(orderId: string, reason: string): Promise<ApiResult<unknown>> {
  return apiFetch(`/api/shop/orders/${encodeURIComponent(orderId)}/cancel`, post({ reason }));
}

export async function fetchSupportTickets(): Promise<ApiResult<{ tickets: SupportTicketView[] }>> {
  return apiFetch<{ tickets: SupportTicketView[] }>('/api/shop/support');
}

export async function createSupportTicket(input: {
  category: SupportCategory;
  subject: string;
  description: string;
  orderId?: string | null;
}): Promise<ApiResult<{ ticketId: string }>> {
  return apiFetch('/api/shop/support', post({ ...input, orderId: input.orderId || undefined }));
}

// Adds the customer's reply to one of their own requests. Replies are refused once a request is resolved or closed.
export async function replySupportTicket(ticketId: string, text: string): Promise<ApiResult<{ message: { at: string; kind: 'CUSTOMER'; text: string } }>> {
  return apiFetch('/api/shop/support/reply', post({ ticketId, text }));
}

// Saved addresses. Every call returns the full list after the change.
export async function fetchAddresses(): Promise<ApiResult<{ addresses: SavedAddressView[]; max: number }>> {
  return apiFetch('/api/shop/addresses');
}

export async function createAddress(input: SavedAddressInput): Promise<ApiResult<{ addresses: SavedAddressView[] }>> {
  return apiFetch('/api/shop/addresses', post(input));
}

export async function updateAddress(id: string, input: Partial<SavedAddressInput>): Promise<ApiResult<{ addresses: SavedAddressView[] }>> {
  return apiFetch('/api/shop/addresses', { method: 'PATCH', body: JSON.stringify({ ...input, id }) });
}

export async function deleteAddress(id: string): Promise<ApiResult<{ addresses: SavedAddressView[] }>> {
  return apiFetch('/api/shop/addresses', { method: 'DELETE', body: JSON.stringify({ id }) });
}

// Delivery times offered right now (server clock, IST). A chosen slot is checked again when the order is placed.
export async function fetchDeliverySlots(): Promise<ApiResult<{ shopOpen: boolean; slots: DeliverySlotView[]; serverTime: number }>> {
  return apiFetch('/api/shop/slots');
}

// Buy it again: what can be bought now (live price and stock) and what cannot, for one of the customer's orders.
export async function fetchReorder(orderId: string): Promise<ApiResult<{ available: ReorderAvailableItem[]; unavailable: ReorderUnavailableItem[] }>> {
  return apiFetch(`/api/shop/orders/${encodeURIComponent(orderId)}/reorder`);
}

// Account wishlist (at most 200 product ids).
export async function fetchWishlist(): Promise<ApiResult<{ items: string[]; max: number }>> {
  return apiFetch('/api/shop/wishlist');
}

export async function addToWishlistRequest(productIds: string[]): Promise<ApiResult<{ items: string[]; full: string[] }>> {
  return apiFetch('/api/shop/wishlist', { method: 'PUT', body: JSON.stringify({ productIds }) });
}

export async function removeFromWishlistRequest(productId: string): Promise<ApiResult<{ items: string[] }>> {
  return apiFetch('/api/shop/wishlist', { method: 'DELETE', body: JSON.stringify({ productId }) });
}

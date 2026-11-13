// Typed calls to the shop's own server routes. The server checks who the customer is (Firebase ID token), prices
// orders from the published catalogue and writes in the shape the GlowVai admin panel reads.
import { apiFetch, type ApiResult } from './customerSession';
import { auth } from '../config/firebase';

export interface ShopProfileAddress {
  fullAddress: string;
  city: string;
  pincode: string;
  landmark?: string;
}

export interface ShopProfile {
  name: string;
  phone: string;
  // Always false until SMS sign-in is connected.
  phoneVerified?: boolean;
  email: string;
  address: ShopProfileAddress | null;
  marketingOptIn: boolean;
  analyticsOptIn?: boolean;
  // When each consent choice was made (epoch ms), or null when it has not been chosen.
  marketingAt?: number | null;
  analyticsAt?: number | null;
  language?: string;
}

export interface ShopProfileInput {
  name: string;
  phone: string;
  email?: string;
  // Left out (or null) keeps the address already on the account.
  address?: ShopProfileAddress | null;
  // Left out keeps the stored choice.
  marketingOptIn?: boolean;
  analyticsOptIn?: boolean;
}

export type ShopOrderStatus = 'PLACED' | 'CANCELLED' | 'DELIVERED' | string;

export interface ShopOrderItem {
  productId: string;
  variantId?: string | null;
  variantLabel?: string | null;
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
  deliveredAt?: number | null;
  // Set by GET /api/shop/orders: whether the customer has a return or replacement request on this order.
  hasReturn?: boolean;
  // Delivered orders only: the customer's own review per product id (none when not reviewed).
  reviews?: Record<string, { status: 'PENDING' | 'APPROVED' | 'REJECTED'; rating: number; canEdit: boolean }>;
}

export interface PlaceOrderInput {
  items: Array<{ productId: string; variantId?: string; quantity: number }>;
  address: { name: string; phone: string; fullAddress: string; city: string; pincode: string; area?: string; landmark?: string };
  couponCode?: string | null;
  tip?: number;
  paymentMethod?: 'COD' | 'ONLINE';
  // A saved address (its id), re-checked by the server. When set, the typed address above is not used.
  addressId?: string | null;
  // The delivery time chosen from the offered slots (its id). Refused by the server when no longer offered.
  deliverySlot?: string | null;
  // Glow coins the customer chose to use. The server caps them and debits them in the order transaction.
  coinsToRedeem?: number;
  // The customer's position, only when they chose to share it. Used for the live map; the server checks it.
  customerLocation?: { lat: number; lng: number } | null;
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
  variantId: string | null;
  variantLabel: string | null;
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
  variantId: string | null;
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

// The account language (users/{uid}.language). The server accepts only en, hi or te.
export async function saveLanguage(language: string): Promise<ApiResult<{ language: string }>> {
  return apiFetch<{ language: string }>('/api/shop/profile/language', post({ language }));
}

export interface ActivityEntry {
  id: string;
  type: string;
  message: string;
  createdAt: number;
}

export async function fetchActivity(cursor?: string | null): Promise<ApiResult<{ items: ActivityEntry[]; nextCursor: string | null }>> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return apiFetch<{ items: ActivityEntry[]; nextCursor: string | null }>(`/api/shop/activity${query}`);
}

export async function fetchOrders(): Promise<ApiResult<{ orders: ShopOrder[] }>> {
  return apiFetch<{ orders: ShopOrder[] }>('/api/shop/orders');
}

// One page of the order history (newest first). Pass the nextCursor from the previous page to get the next one.
export async function fetchOrdersPage(filter: string, cursor: string | null): Promise<ApiResult<{ orders: ShopOrder[]; nextCursor: string | null }>> {
  const params = new URLSearchParams({ filter, limit: '20' });
  if (cursor) params.set('cursor', cursor);
  return apiFetch<{ orders: ShopOrder[]; nextCursor: string | null }>(`/api/shop/orders?${params.toString()}`);
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

// ---- Notifications (in-app list, read marking, push device, preferences) ---------------------------------------------

export interface InAppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  relatedType: 'order' | 'review' | 'question' | 'account' | 'subscription';
  relatedId: string | null;
  createdAt: number;
  readAt: number | null;
}

export interface NotificationPage {
  notifications: InAppNotification[];
  nextCursor: string | null;
  unreadCount: number;
}

export interface NotificationPrefs {
  orders: boolean;
  offers: boolean;
  reviews: boolean;
  returns: boolean;
  referrals: boolean;
  subscriptions: boolean;
}

export async function fetchNotifications(cursor?: string | null): Promise<ApiResult<NotificationPage>> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return apiFetch<NotificationPage>(`/api/shop/notifications${query}`);
}

export async function markNotificationsRead(input: { ids: string[] } | { all: true }): Promise<ApiResult<{ marked: number; unreadCount: number }>> {
  return apiFetch('/api/shop/notifications/read', post(input));
}

export async function registerPushToken(token: string): Promise<ApiResult<unknown>> {
  return apiFetch('/api/shop/notifications/token', post({ token }));
}

export async function removePushToken(token: string): Promise<ApiResult<unknown>> {
  return apiFetch('/api/shop/notifications/token', { method: 'DELETE', body: JSON.stringify({ token }) });
}

export async function fetchNotificationPrefs(): Promise<ApiResult<{ prefs: NotificationPrefs; marketingConsent: boolean }>> {
  return apiFetch('/api/shop/notifications/prefs');
}

export async function saveNotificationPrefs(patch: Partial<NotificationPrefs>): Promise<ApiResult<{ prefs: NotificationPrefs }>> {
  return apiFetch('/api/shop/notifications/prefs', post(patch));
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

// Buy it again rail: products from the customer's recent orders. Only asked for a customer who is already signed in on this
// device, so a visitor with no session does not get one created just by opening the home page.
export interface ReorderRailItem { productId: string; name: string; price: number; image: string }
export async function fetchReorderItems(): Promise<ApiResult<{ items: ReorderRailItem[] }>> {
  if (typeof auth?.authStateReady === 'function') await auth.authStateReady();
  if (!auth?.currentUser) return { ok: false, status: 401, data: null, error: 'Not signed in' };
  return apiFetch('/api/shop/reorder-items');
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

// ---- Growth: referrals, GlowVai coins, subscriptions, payment options ----

export interface ReferralView {
  code: string | null;
  shareUrl: string;
  applied: boolean;
  rewardStatus: 'NONE' | 'PENDING' | 'REWARDED';
  rewardCoins: number;
  referredCount: number;
  rewardedCount: number;
  referrerCoins: number;
  refereeCoins: number;
}

export interface CoinHistoryEntry {
  id: string;
  type: 'CREDIT' | 'DEBIT' | 'EXPIRY';
  source: string;
  amount: number;
  signed: number;
  balanceAfter: number;
  reason: string;
  orderId: string | null;
  createdAt: number;
}

export interface CoinsView {
  balance: number;
  rupeesPerCoin: number;
  history: CoinHistoryEntry[];
}

export interface CoinPreview {
  itemTotal: number;
  balance: number;
  maxCoins: number;
  maxDiscount: number;
  capPercent: number;
}

export interface SubscriptionView {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  intervalWeeks: number;
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED' | string;
  nextRunAt: number | null;
  lastSkipReason: string | null;
  createdAt: number;
}

export interface SubscriptionAddressInput {
  name: string;
  phone: string;
  fullAddress: string;
  city: string;
  pincode: string;
  area?: string;
  landmark?: string;
}

export async function fetchReferral(): Promise<ApiResult<{ referral: ReferralView }>> {
  return apiFetch<{ referral: ReferralView }>('/api/shop/referral');
}

export async function applyReferralCode(code: string): Promise<ApiResult<unknown>> {
  return apiFetch('/api/shop/referral/apply', post({ code }));
}

export async function fetchCoins(): Promise<ApiResult<{ coins: CoinsView }>> {
  return apiFetch<{ coins: CoinsView }>('/api/shop/coins');
}

export async function previewCoinRedemption(items: Array<{ productId: string; quantity: number }>): Promise<ApiResult<{ preview: CoinPreview }>> {
  return apiFetch<{ preview: CoinPreview }>('/api/shop/coins/redeem-preview', post({ items }));
}

export async function fetchSubscriptions(): Promise<ApiResult<{ subscriptions: SubscriptionView[] }>> {
  return apiFetch<{ subscriptions: SubscriptionView[] }>('/api/shop/subscriptions');
}

export async function createSubscription(input: {
  productId: string;
  // The size or shade picked on the product page (required for a product sold in options).
  variantId?: string | null;
  quantity: number;
  intervalWeeks: number;
  address: SubscriptionAddressInput;
}): Promise<ApiResult<{ subscriptionId: string }>> {
  return apiFetch<{ subscriptionId: string }>('/api/shop/subscriptions', post(input));
}

export async function changeSubscription(
  id: string,
  change: { action: 'pause' | 'resume' | 'cancel' } | { action: 'quantity'; quantity: number },
): Promise<ApiResult<unknown>> {
  return apiFetch(`/api/shop/subscriptions/${encodeURIComponent(id)}`, post(change));
}

// Public settings: whether EMI is offered (RAZORPAY_EMI_ENABLED on the server).
export async function fetchShopConfig(): Promise<ApiResult<{ payments: { emi: { available: boolean } } }>> {
  return apiFetch<{ payments: { emi: { available: boolean } } }>('/api/shop/config');
}

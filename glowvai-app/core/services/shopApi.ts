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
}

export interface OnlinePaymentStart {
  provider: 'razorpay';
  keyId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
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

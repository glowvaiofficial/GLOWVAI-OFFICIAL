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
  // Glow coins the customer chose to use. The server caps them and debits them in the order transaction.
  coinsToRedeem?: number;
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

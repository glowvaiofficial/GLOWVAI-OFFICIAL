// Typed calls to the GlowVai Coins wallet routes (/api/shop/wallet/*). The server owns every amount and every balance:
// the browser sends only the rupee amount it wants to add, and the Razorpay signature and ids it got from Checkout.
import { apiFetch, type ApiResult } from './customerSession';

export interface WalletLimits {
  minRupees: number;
  maxRupees: number;
  presetsRupees: number[];
  maxBalanceCoins: number;
  dailyCapRupees: number;
  dailyCapUsedRupees: number;
  dailyCapRemainingRupees: number;
  expiryMinutes: number;
}

export interface WalletSummary {
  balance: number;
  rupeesValue: number;
  rate: { coinsPerRupee: number; line: string };
  notice: string;
  limits: WalletLimits;
  checkoutRupeesPerCoin: number;
}

export interface WalletHistoryRow {
  id: string;
  type: 'CREDIT' | 'DEBIT' | 'EXPIRY';
  label: string;
  signed: number;
  amount: number;
  reason: string;
  orderId: string | null;
  createdAt: number;
}

export interface WalletPage {
  wallet: WalletSummary;
  history: WalletHistoryRow[];
  nextCursor: string | null;
}

export interface TopupPayment {
  provider: 'razorpay';
  keyId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
}

export interface TopupStart {
  topupId: string;
  rupees: number;
  coins: number;
  payment: TopupPayment;
}

export interface TopupVerified {
  ok: true;
  status: 'PAID' | 'PENDING' | 'FAILED';
  topupId: string;
  coins?: number;
  balance?: number;
  message?: string;
}

export interface TopupStatusView {
  topupId: string;
  status: 'CREATED' | 'PAID' | 'FAILED' | 'EXPIRED';
  held: boolean;
  rupees: number;
  coins: number;
  message: string;
}

const post = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });

export async function fetchWallet(): Promise<ApiResult<WalletPage>> {
  return apiFetch<WalletPage>('/api/shop/wallet');
}

export async function fetchWalletHistory(cursor: string): Promise<ApiResult<{ history: WalletHistoryRow[]; nextCursor: string | null }>> {
  return apiFetch(`/api/shop/wallet/history?cursor=${encodeURIComponent(cursor)}`);
}

export async function startTopup(amountRupees: number): Promise<ApiResult<TopupStart>> {
  return apiFetch<TopupStart>('/api/shop/wallet/topup', post({ amountRupees }));
}

export async function verifyTopup(input: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }): Promise<ApiResult<TopupVerified>> {
  return apiFetch<TopupVerified>('/api/shop/wallet/topup/verify', post(input));
}

export async function reportTopupFailed(topupId: string): Promise<ApiResult<{ status: string }>> {
  return apiFetch('/api/shop/wallet/topup/fail', post({ topupId }));
}

export async function fetchTopupStatus(topupId: string): Promise<ApiResult<{ topup: TopupStatusView }>> {
  return apiFetch<{ topup: TopupStatusView }>(`/api/shop/wallet/topup?topupId=${encodeURIComponent(topupId)}`);
}

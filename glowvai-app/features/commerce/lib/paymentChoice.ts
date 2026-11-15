// What the customer picked on the Payment screen, and how it reaches Razorpay. Pure (no imports), so the node tests load it.
//
// Every online choice (UPI, card, netbanking, wallets and pay later) is paid in the Razorpay Checkout window opened with
// the order's server key. The choice only tells the window which method to open first (`prefill.method`, and
// `prefill.bank` for netbanking); the customer can still switch inside it. The UPI app itself is picked in the window, so
// the app tiles open the UPI method. GlowVai never sees card, bank or UPI details. Cash on delivery uses the order
// route's COD path. Same rules as the native app (src/features/checkout/paymentChoice.ts).

import type { PayMethod } from './paymentMethod';

export type UpiAppId = 'gpay' | 'phonepe' | 'paytm' | 'cred';
/** Razorpay netbanking bank codes. */
export type NetbankingBank = 'HDFC' | 'SBIN' | 'ICIC' | 'UTIB';

export type PaymentChoice =
  | { kind: 'cod' }
  | { kind: 'upi'; app: UpiAppId | null }
  | { kind: 'card' }
  | { kind: 'netbanking'; bank: NetbankingBank | null }
  /** Wallets, pay later and anything else the Razorpay account offers: the window opens on its full list. */
  | { kind: 'more' };

export type RazorpayMethod = 'upi' | 'card' | 'netbanking';

export interface MethodPrefill {
  method?: RazorpayMethod;
  bank?: NetbankingBank;
}

export const UPI_APPS: ReadonlyArray<{ id: UpiAppId; name: string }> = [
  { id: 'gpay', name: 'Google Pay' },
  { id: 'phonepe', name: 'PhonePe' },
  { id: 'paytm', name: 'Paytm' },
  { id: 'cred', name: 'CRED' },
];

export const NETBANKING_BANKS: ReadonlyArray<{ code: NetbankingBank; name: string }> = [
  { code: 'HDFC', name: 'HDFC Bank' },
  { code: 'SBIN', name: 'SBI' },
  { code: 'ICIC', name: 'ICICI Bank' },
  { code: 'UTIB', name: 'Axis Bank' },
];

/** The method the order route is told: cash on delivery, or online. */
export const payMethodFor = (choice: PaymentChoice): PayMethod => (choice.kind === 'cod' ? 'cod' : 'online');

/** The Razorpay prefill for a choice. Empty for cash on delivery and for "more". */
export function methodPrefillFor(choice: PaymentChoice): MethodPrefill {
  switch (choice.kind) {
    case 'upi':
      return { method: 'upi' };
    case 'card':
      return { method: 'card' };
    case 'netbanking':
      return choice.bank ? { method: 'netbanking', bank: choice.bank } : { method: 'netbanking' };
    default:
      return {};
  }
}

export function sameChoice(a: PaymentChoice, b: PaymentChoice): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'upi' && b.kind === 'upi') return a.app === b.app;
  if (a.kind === 'netbanking' && b.kind === 'netbanking') return a.bank === b.bank;
  return true;
}

/** A stored choice read back defensively; anything malformed is cash on delivery. */
export function readPaymentChoice(value: unknown): PaymentChoice {
  const v = (value && typeof value === 'object' ? value : {}) as { kind?: unknown; app?: unknown; bank?: unknown };
  switch (v.kind) {
    case 'upi':
      return { kind: 'upi', app: UPI_APPS.some((a) => a.id === v.app) ? (v.app as UpiAppId) : null };
    case 'card':
      return { kind: 'card' };
    case 'netbanking':
      return { kind: 'netbanking', bank: NETBANKING_BANKS.some((b) => b.code === v.bank) ? (v.bank as NetbankingBank) : null };
    case 'more':
      return { kind: 'more' };
    default:
      return { kind: 'cod' };
  }
}

/** Title and line for the payment row on Delivery Details and in the order summary. */
export function choiceSummary(choice: PaymentChoice): { title: string; subtitle: string } {
  switch (choice.kind) {
    case 'cod':
      return { title: 'Cash on Delivery', subtitle: 'Pay after you receive your order' };
    case 'upi': {
      const app = choice.app ? UPI_APPS.find((a) => a.id === choice.app)?.name : null;
      return { title: app ? `${app} (UPI)` : 'UPI', subtitle: 'Pay instantly with any UPI app' };
    }
    case 'card':
      return { title: 'Credit or debit card', subtitle: 'Visa, Mastercard, RuPay and more' };
    case 'netbanking': {
      const bank = choice.bank ? NETBANKING_BANKS.find((b) => b.code === choice.bank)?.name : null;
      return { title: bank ? `Netbanking · ${bank}` : 'Netbanking', subtitle: 'Pay securely from your bank account' };
    }
    default:
      return { title: 'Wallets & Pay Later', subtitle: 'Choose in the secure Razorpay window' };
  }
}

const rupees = (n: number): string => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

/** The Payment screen's button: pay now for online, place the order for cash on delivery. */
export const payButtonLabel = (choice: PaymentChoice, total: number): string => (choice.kind === 'cod' ? `Place order · ${rupees(total)}` : `Pay now ${rupees(total)}`);

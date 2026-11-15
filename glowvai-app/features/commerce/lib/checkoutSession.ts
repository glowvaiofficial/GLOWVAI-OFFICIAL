import { create } from 'zustand';
import type { SubstitutionPreference } from '../../../core/services/shopTracking';
import { payMethodFor, readPaymentChoice, type PaymentChoice } from './paymentChoice';
import type { OrderAttemptKey } from './orderAttemptKey';

// The current checkout attempt's Idempotency-Key, kept for this browser tab so a reload during payment still sends the
// same key. sessionStorage may be missing or blocked: then the key lives in memory only.
const ATTEMPT_KEY = 'glowvai_order_attempt';
const readAttempt = (): OrderAttemptKey | null => {
  try {
    const raw = typeof window !== 'undefined' ? window.sessionStorage.getItem(ATTEMPT_KEY) : null;
    const v = raw ? (JSON.parse(raw) as Partial<OrderAttemptKey>) : null;
    return v && typeof v.key === 'string' && typeof v.signature === 'string' ? { key: v.key, signature: v.signature, placed: v.placed === true } : null;
  } catch {
    return null;
  }
};
const writeAttempt = (attempt: OrderAttemptKey | null) => {
  try {
    if (typeof window === 'undefined') return;
    if (attempt) window.sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify(attempt));
    else window.sessionStorage.removeItem(ATTEMPT_KEY);
  } catch {
    // Memory only.
  }
};

// What the server says the bag is taken off. code is null for an automatic offer.
export interface BagQuote {
  source: 'builtin' | 'code' | 'auto' | null;
  code: string | null;
  discount: number;
  label: string;
  // What active flash sales take off the bag, from the server (0 when none).
  flashSavings: number;
}

export type PayChoice = 'gpay' | 'phonepe' | 'paytm' | 'bhim' | 'card' | 'cod';

// Where the order placement is: idle (not started), running (the processing screen owns it) or finished (it has left
// the processing screen). A finished placement is never run again, so going back cannot place the order twice.
export type PlacementState = 'idle' | 'running' | 'finished';

// Cart and checkout state shared between the review and payment steps (in memory only).
interface CheckoutSessionState {
  // A code from COUPON_VALUES in shared/pricing-rules.mjs, or null. Nothing is applied until the customer enters one.
  couponCode: string | null;
  // The server's answer for this bag: the best discount right now (a built-in code, a typed offer code or an automatic
  // offer). Null until the first answer arrives. Totals use this, never a number worked out on the phone.
  bagQuote: BagQuote | null;
  setBagQuote: (quote: BagQuote | null) => void;
  payChoice: PayChoice;
  // The customer has looked at the delivery address on the review step and confirmed it. Reset when the address changes.
  addressConfirmed: boolean;
  // How the customer pays: cash on delivery, or online through Razorpay (UPI, card, netbanking, wallet).
  // This is the source of truth for the method; navigation params only repeat it.
  payMethod: 'cod' | 'online';
  setPayMethod: (method: 'cod' | 'online') => void;
  // The exact option on the Payment screen (UPI app, card, bank, wallets, or cash on delivery). Online options open the
  // Razorpay window on that method; payMethod always follows it.
  paymentChoice: PaymentChoice;
  setPaymentChoice: (choice: PaymentChoice) => void;
  // The checkout attempt's Idempotency-Key (orderAttemptKey.ts), or null before the first order request.
  orderAttempt: OrderAttemptKey | null;
  setOrderAttempt: (attempt: OrderAttemptKey | null) => void;
  // Optional tip for the delivery partner, in rupees (0, 10, 20, 30 or a custom amount up to 500).
  tip: number;
  // The delivery time the customer chose (an id from the slots the server offered), or null. The server checks it again.
  slotId: string | null;
  setSlotId: (slotId: string | null) => void;
  placement: PlacementState;
  setPlacement: (placement: PlacementState) => void;
  setCouponCode: (code: string | null) => void;
  setPayChoice: (choice: PayChoice) => void;
  setAddressConfirmed: (confirmed: boolean) => void;
  setTip: (tip: number) => void;
  // What to do if an item cannot be supplied. Saved on the order after it is placed (see PaymentProcessingScreen).
  substitutionPreference: SubstitutionPreference;
  setSubstitutionPreference: (preference: SubstitutionPreference) => void;
  // Glow coins the customer chose to use on this order (0 when none). The server caps and debits them.
  coinsToRedeem: number;
  setCoinsToRedeem: (coins: number) => void;
  // The customer's position, only when they tapped "share my location" at checkout. Never requested on load.
  customerLocation: { lat: number; lng: number } | null;
  setCustomerLocation: (location: { lat: number; lng: number } | null) => void;
}

export const useCheckoutSession = create<CheckoutSessionState>()((set) => ({
  couponCode: null,
  bagQuote: null,
  setBagQuote: (bagQuote) => set({ bagQuote }),
  // Only cash on delivery can be placed until online payment is connected on the server.
  payChoice: 'cod',
  addressConfirmed: false,
  payMethod: 'cod',
  setPayMethod: (payMethod) =>
    set((state) => ({
      payMethod,
      paymentChoice: payMethod === 'cod' ? { kind: 'cod' } : state.paymentChoice.kind === 'cod' ? { kind: 'upi', app: null } : state.paymentChoice,
    })),
  paymentChoice: { kind: 'cod' },
  setPaymentChoice: (choice) => {
    const paymentChoice = readPaymentChoice(choice);
    set({ paymentChoice, payMethod: payMethodFor(paymentChoice) });
  },
  orderAttempt: readAttempt(),
  setOrderAttempt: (orderAttempt) => {
    writeAttempt(orderAttempt);
    set({ orderAttempt });
  },
  tip: 0,
  slotId: null,
  setSlotId: (slotId) => set({ slotId }),
  placement: 'idle',
  setPlacement: (placement) => set({ placement }),
  setCouponCode: (couponCode) => set({ couponCode }),
  setPayChoice: () => set({ payChoice: 'cod' }),
  setAddressConfirmed: (addressConfirmed) => set({ addressConfirmed }),
  setTip: (tip) => set({ tip: Math.max(0, Math.min(500, Math.round(tip) || 0)) }),
  substitutionPreference: 'CALL_ME',
  setSubstitutionPreference: (substitutionPreference) => set({ substitutionPreference }),
  coinsToRedeem: 0,
  setCoinsToRedeem: (coinsToRedeem) => set({ coinsToRedeem: Math.max(0, Math.floor(coinsToRedeem) || 0) }),
  customerLocation: null,
  setCustomerLocation: (customerLocation) => set({ customerLocation }),
}));

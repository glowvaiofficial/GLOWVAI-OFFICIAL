import { create } from 'zustand';

export type PayChoice = 'gpay' | 'phonepe' | 'paytm' | 'bhim' | 'card' | 'cod';

// Cart and checkout state shared between the review and payment steps (in memory only).
interface CheckoutSessionState {
  // A code from COUPON_VALUES in shared/pricing-rules.mjs, or null. Nothing is applied until the customer enters one.
  couponCode: string | null;
  payChoice: PayChoice;
  // The customer has looked at the delivery address on the review step and confirmed it. Reset when the address changes.
  addressConfirmed: boolean;
  // How the customer pays: cash on delivery, or online through Razorpay (UPI, card, netbanking, wallet).
  payMethod: 'cod' | 'online';
  setPayMethod: (method: 'cod' | 'online') => void;
  // Optional tip for the delivery partner, in rupees (0, 10, 20, 30 or a custom amount up to 500).
  tip: number;
  setCouponCode: (code: string | null) => void;
  setPayChoice: (choice: PayChoice) => void;
  setAddressConfirmed: (confirmed: boolean) => void;
  setTip: (tip: number) => void;
}

export const useCheckoutSession = create<CheckoutSessionState>()((set) => ({
  couponCode: null,
  // Only cash on delivery can be placed until online payment is connected on the server.
  payChoice: 'cod',
  addressConfirmed: false,
  payMethod: 'cod',
  setPayMethod: (payMethod) => set({ payMethod }),
  tip: 0,
  setCouponCode: (couponCode) => set({ couponCode }),
  setPayChoice: () => set({ payChoice: 'cod' }),
  setAddressConfirmed: (addressConfirmed) => set({ addressConfirmed }),
  setTip: (tip) => set({ tip: Math.max(0, Math.min(500, Math.round(tip) || 0)) }),
}));

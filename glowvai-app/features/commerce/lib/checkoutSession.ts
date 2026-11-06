import { create } from 'zustand';
import type { SubstitutionPreference } from '../../../core/services/shopTracking';

export type PayChoice = 'gpay' | 'phonepe' | 'paytm' | 'bhim' | 'card' | 'cod';

// Where the order placement is: idle (not started), running (the processing screen owns it) or finished (it has left
// the processing screen). A finished placement is never run again, so going back cannot place the order twice.
export type PlacementState = 'idle' | 'running' | 'finished';

// Cart and checkout state shared between the review and payment steps (in memory only).
interface CheckoutSessionState {
  // A code from COUPON_VALUES in shared/pricing-rules.mjs, or null. Nothing is applied until the customer enters one.
  couponCode: string | null;
  payChoice: PayChoice;
  // The customer has looked at the delivery address on the review step and confirmed it. Reset when the address changes.
  addressConfirmed: boolean;
  // How the customer pays: cash on delivery, or online through Razorpay (UPI, card, netbanking, wallet).
  // This is the source of truth for the method; navigation params only repeat it.
  payMethod: 'cod' | 'online';
  setPayMethod: (method: 'cod' | 'online') => void;
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
}

export const useCheckoutSession = create<CheckoutSessionState>()((set) => ({
  couponCode: null,
  // Only cash on delivery can be placed until online payment is connected on the server.
  payChoice: 'cod',
  addressConfirmed: false,
  payMethod: 'cod',
  setPayMethod: (payMethod) => set({ payMethod }),
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
}));

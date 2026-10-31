import { create } from 'zustand';
import type { PaymentMethod } from '../../../core/types';

export type PayChoice = 'gpay' | 'phonepe' | 'paytm' | 'bhim' | 'card' | 'cod';

export const PAY_CHOICES: Array<{
  id: PayChoice;
  label: string;
  sub: string;
  group: 'upi' | 'card' | 'cod';
  method: PaymentMethod;
}> = [
  { id: 'gpay', label: 'Google Pay', sub: 'Pay via linked bank account', group: 'upi', method: 'GPAY' },
  { id: 'phonepe', label: 'PhonePe UPI', sub: 'Instant 1-tap authorization', group: 'upi', method: 'PHONEPE' },
  { id: 'paytm', label: 'Paytm UPI', sub: 'Paytm wallet and UPI', group: 'upi', method: 'PAYTM' },
  { id: 'bhim', label: 'BHIM / Other UPI', sub: 'Any UPI handle or QR', group: 'upi', method: 'BHIM' },
  { id: 'card', label: 'Credit or debit card', sub: 'Visa, Mastercard, RuPay', group: 'card', method: 'CARD' },
  { id: 'cod', label: 'Cash on delivery', sub: 'Pay the rider at your doorstep', group: 'cod', method: 'COD' },
];

export const payChoiceMeta = (id: PayChoice) => PAY_CHOICES.find((c) => c.id === id) ?? PAY_CHOICES[0];

// Cart and checkout state shared between the review and payment steps (in memory only).
interface CheckoutSessionState {
  couponApplied: boolean;
  payChoice: PayChoice;
  setCouponApplied: (applied: boolean) => void;
  setPayChoice: (choice: PayChoice) => void;
}

export const useCheckoutSession = create<CheckoutSessionState>()((set) => ({
  couponApplied: true,
  payChoice: 'gpay',
  setCouponApplied: (couponApplied) => set({ couponApplied }),
  setPayChoice: (payChoice) => set({ payChoice }),
}));

export const newOrderId = (): string => `ORD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

// Opens Razorpay Checkout (UPI, cards, netbanking, wallets) for an order the server has created.
// The script comes from Razorpay's own host (allowed in the shop's script policy). Payment is confirmed on the server.
import type { OnlinePaymentStart } from '../../../core/services/shopApi';
import { checkoutMethodOptions } from '../../../shared/payment-options.mjs';

export interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

function loadScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_URL}"]`);
    const script = existing ?? document.createElement('script');
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Payment window could not load. Check your connection.'));
    if (!existing) {
      script.src = SCRIPT_URL;
      script.async = true;
      document.body.appendChild(script);
    }
  });
}

// Resolves with the payment details on success, or rejects with 'DISMISSED' when the customer closes the window.
export async function openRazorpayCheckout(
  payment: OnlinePaymentStart,
  prefill: { name: string; contact: string },
  // EMI is requested from Razorpay only when the server says it is available (RAZORPAY_EMI_ENABLED).
  options: { emi: boolean } = { emi: false },
): Promise<RazorpaySuccess> {
  await loadScript();
  return new Promise<RazorpaySuccess>((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: payment.keyId,
      amount: payment.amount,
      currency: payment.currency,
      name: 'GlowVai',
      description: 'Skincare order',
      order_id: payment.razorpayOrderId,
      prefill: { name: prefill.name, contact: prefill.contact },
      theme: { color: '#0057FB' },
      handler: (response: RazorpaySuccess) => resolve(response),
      modal: { ondismiss: () => reject(new Error('DISMISSED')) },
      ...checkoutMethodOptions(options.emi),
    });
    rzp.open();
  });
}

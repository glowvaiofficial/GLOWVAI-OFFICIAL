// Opens Razorpay Checkout for a GlowVai Coins top-up and reports how it ended. The script comes from Razorpay's host.
// Nothing here decides a payment: the outcome is sent to the server, which checks the signature and the amount.
import type { TopupPayment } from '../../core/services/walletApi';

export interface CheckoutSuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export type CheckoutOutcome = { kind: 'success'; response: CheckoutSuccess } | { kind: 'failed' } | { kind: 'dismissed' };

type RazorpayInstance = { open: () => void; on: (event: string, cb: (resp: unknown) => void) => void };
type RazorpayCtor = new (options: Record<string, unknown>) => RazorpayInstance;

const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

const razorpayGlobal = () => (window as unknown as { Razorpay?: RazorpayCtor });

function loadScript(): Promise<void> {
  if (razorpayGlobal().Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_URL}"]`);
    const script = existing ?? document.createElement('script');
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('The payment window could not load. Check your connection.'));
    if (!existing) {
      script.src = SCRIPT_URL;
      script.async = true;
      document.body.appendChild(script);
    }
  });
}

export async function openWalletCheckout(payment: TopupPayment): Promise<CheckoutOutcome> {
  await loadScript();
  const Ctor = razorpayGlobal().Razorpay;
  if (!Ctor) throw new Error('The payment window could not load. Check your connection.');
  return new Promise<CheckoutOutcome>((resolve) => {
    let settled = false;
    const finish = (outcome: CheckoutOutcome) => {
      if (settled) return;
      settled = true;
      resolve(outcome);
    };
    const rzp = new Ctor({
      key: payment.keyId,
      amount: payment.amount,
      currency: payment.currency,
      name: 'GlowVai',
      description: 'GlowVai Coins top-up',
      order_id: payment.razorpayOrderId,
      theme: { color: '#0057FB' },
      handler: (response: CheckoutSuccess) => finish({ kind: 'success', response }),
      modal: { ondismiss: () => finish({ kind: 'dismissed' }) },
    });
    // A failed attempt is reported once. Razorpay may still capture a later attempt; the server handles that.
    rzp.on('payment.failed', () => finish({ kind: 'failed' }));
    rzp.open();
  });
}

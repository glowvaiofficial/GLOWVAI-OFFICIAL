import { Address, CartItem, CustomerDetails, PaymentVerification } from '../types';

interface RazorpayOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  receipt: string;
}

interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpaySuccessResponse) => void;
  prefill?: { contact?: string; email?: string; name?: string };
  theme?: { color: string };
  modal?: { ondismiss?: () => void; confirm_close?: boolean };
  retry?: { enabled: boolean };
  config?: {
    display: {
      blocks: Record<string, { name: string; instruments: { method: 'upi' | 'card' | 'netbanking' | 'wallet' }[] }>;
      sequence: string[];
      preferences: { show_default_blocks: boolean };
    };
  };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: 'payment.failed', callback: (response: { error?: { description?: string } }) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayInstance;
  }
}

const CHECKOUT_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';
const apiBase = (process.env.NEXT_PUBLIC_PAYMENTS_API_URL || '/api').replace(/\/$/, '');

const postJson = async <T,>(path: string, body: unknown): Promise<T> => {
  const response = await fetch(`${apiBase}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || 'The secure payment service is unavailable. Choose cash on delivery or try again shortly.');
  return payload as T;
};

const loadCheckout = (): Promise<void> => new Promise((resolve, reject) => {
  if (window.Razorpay) return resolve();
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SCRIPT}"]`);
  if (existing) {
    existing.addEventListener('load', () => resolve(), { once: true });
    existing.addEventListener('error', () => reject(new Error('Razorpay Checkout could not load. Check your connection and retry.')), { once: true });
    return;
  }
  const script = document.createElement('script');
  script.src = CHECKOUT_SCRIPT;
  script.async = true;
  script.onload = () => resolve();
  script.onerror = () => reject(new Error('Razorpay Checkout could not load. Check your connection and retry.'));
  document.head.appendChild(script);
});

export const startRazorpayPayment = async ({
  items,
  address,
  couponCode,
  expectedAmount,
  customer,
}: {
  items: CartItem[];
  address: Address;
  couponCode?: string;
  expectedAmount: number;
  customer: CustomerDetails;
}): Promise<PaymentVerification> => {
  const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (!key) throw new Error('Razorpay test key ID is not configured.');

  const order = await postJson<RazorpayOrderResponse>('/payments/razorpay/order', {
    items: items.map((item) => ({ productId: item.product.id, variantId: item.variantId, quantity: item.quantity, withInsurance: item.withInsurance })),
    addressId: address.id,
    area: address.area,
    couponCode,
    expectedAmount,
  });
  await loadCheckout();

  return new Promise((resolve, reject) => {
    if (!window.Razorpay) return reject(new Error('Razorpay Checkout is unavailable.'));
    let settled = false;
    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      reject(new Error(message));
    };
    const checkout = new window.Razorpay({
      key,
      amount: order.amount,
      currency: order.currency,
      name: 'glowvai',
      description: 'Beauty essentials order',
      order_id: order.orderId,
      prefill: { contact: customer.phoneNumber.replace(/\s/g, ''), email: customer.email || undefined, name: customer.fullName },
      theme: { color: '#075cff' },
      retry: { enabled: true },
      config: {
        display: {
          blocks: {
            glowvai_methods: {
              name: 'Choose how to pay',
              instruments: [{ method: 'upi' }, { method: 'card' }, { method: 'netbanking' }, { method: 'wallet' }],
            },
          },
          sequence: ['block.glowvai_methods'],
          preferences: { show_default_blocks: false },
        },
      },
      modal: { confirm_close: true, ondismiss: () => fail('PAYMENT_CANCELLED') },
      handler: async (payment) => {
        try {
          const verified = await postJson<{ verified: boolean }>('/payments/razorpay/verify', payment);
          if (!verified.verified) return fail('Payment could not be verified. No order was created.');
          settled = true;
          resolve({ provider: 'razorpay', paymentId: payment.razorpay_payment_id, providerOrderId: payment.razorpay_order_id });
        } catch (error) {
          fail(error instanceof Error ? error.message : 'Payment verification failed.');
        }
      },
    });
    checkout.on('payment.failed', (response) => fail(`PAYMENT_FAILED:${response.error?.description || 'The selected payment method declined this attempt.'}`));
    checkout.open();
  });
};

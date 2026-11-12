// Opens Razorpay Checkout for two privacy flows: saving a card (customer id and save: 1, card entry on Razorpay's page)
// and paying for a gift card. Razorpay sends back the payment id and signature; the server verifies them. GlowVai never
// receives a card number. Resolves with the payment details, or rejects with 'DISMISSED' when the customer closes it.
export interface CheckoutSuccess {
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

export async function openCheckout(options: {
  key: string;
  orderId: string;
  amountPaise: number;
  currency: string;
  description: string;
  customerId?: string;
  save?: boolean;
}): Promise<CheckoutSuccess> {
  await loadScript();
  return new Promise<CheckoutSuccess>((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: options.key,
      amount: options.amountPaise,
      currency: options.currency,
      name: 'GlowVai',
      description: options.description,
      order_id: options.orderId,
      ...(options.customerId ? { customer_id: options.customerId } : {}),
      ...(options.save ? { save: 1 } : {}),
      theme: { color: '#0057FB' },
      handler: (response: CheckoutSuccess) => resolve(response),
      modal: { ondismiss: () => reject(new Error('DISMISSED')) },
    });
    rzp.open();
  });
}

import { useEffect } from 'react';
import { useCartStore } from '../../../core/state/cartStore';
import { useCheckoutSession, type BagQuote } from './checkoutSession';

// Asks the server what this bag is taken off. The bag goes as product id, variant id and quantity only; the server works
// out every price itself. The code is optional: with no code, automatic offers still apply.
export type QuoteResult = { ok: true; bag: BagQuote | null; subtotal: number } | { ok: false; error: string };

type CartLine = { productId: string; variantId?: string | null; quantity: number };

export async function quoteBag(code: string | null, lines: CartLine[]): Promise<QuoteResult> {
  try {
    const res = await fetch('/api/shop/offers/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        code: code ?? '',
        lines: lines.map((l) => ({ productId: l.productId, variantId: l.variantId ?? null, quantity: l.quantity })),
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) return { ok: false, error: String(data?.error || 'We could not check the offers. Try again.') };
    const c = data.chosen as { source: BagQuote['source']; code: string | null; discount: number; label: string } | null;
    const bag: BagQuote | null = c ? { source: c.source, code: c.code, discount: Number(c.discount) || 0, label: String(c.label || '') } : null;
    return { ok: true, bag, subtotal: Number(data.subtotal) || 0 };
  } catch {
    return { ok: false, error: 'We could not check the offers. Check your connection and try again.' };
  }
}

// Keeps the bag's discount in line with the bag: when the bag or the code changes, the server answers again. If the typed
// code no longer applies (for example the bag dropped below its minimum), it is removed with a short message.
export function useBagQuoteSync(onInvalidCode: (message: string) => void): void {
  const items = useCartStore((s) => s.items);
  const couponCode = useCheckoutSession((s) => s.couponCode);
  const setCouponCode = useCheckoutSession((s) => s.setCouponCode);
  const setBagQuote = useCheckoutSession((s) => s.setBagQuote);
  const lines = Object.values(items).map((i) => ({ productId: i.productId, variantId: i.variantId ?? null, quantity: i.quantity }));
  const key = JSON.stringify([couponCode, lines.map((l) => [l.productId, l.variantId, l.quantity])]);

  useEffect(() => {
    let alive = true;
    const timer = window.setTimeout(() => {
      quoteBag(couponCode, lines).then((r) => {
        if (!alive) return;
        if (r.ok) {
          setBagQuote(r.bag);
          return;
        }
        if (couponCode) {
          setCouponCode(null);
          setBagQuote(null);
          onInvalidCode(r.error);
        }
      });
    }, 300);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
    // The key holds everything the answer depends on; the handlers are stable store actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

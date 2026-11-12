// The subscribable flag on a product. The admin console writes it; the shop only reads it. Only a literal true counts,
// so a missing field, a string "true" or any other value means the product cannot be subscribed to. No server imports.

export const NOT_SUBSCRIBABLE_MESSAGE = "This product cannot be subscribed to. Only products marked for subscriptions can be.";

export const subscribableOf = (value: unknown): boolean => value === true;

// The refusal message for the subscribe route, or null when the product may be subscribed to.
export function subscriptionRefusal(product: { subscribable?: unknown } | null | undefined): string | null {
  return subscribableOf(product?.subscribable) ? null : NOT_SUBSCRIBABLE_MESSAGE;
}

// Whether the product page shows the subscribe panel: only for a product the admin marked subscribable.
export const showSubscribePanel = (product: { subscribable?: unknown } | null | undefined): boolean => subscribableOf(product?.subscribable);

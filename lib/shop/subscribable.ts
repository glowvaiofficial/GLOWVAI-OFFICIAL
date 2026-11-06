// Subscribe and save is offered only for products the admin has marked subscribable. The flag is a boolean on the product
// document; a missing, malformed or false value means "not subscribable", so no product is subscribable until the admin
// turns it on. Pure (no server imports): the product feed, the product page and the subscription route all call this.

export function readSubscribable(value: unknown): boolean {
  return value === true;
}

export function canSubscribeTo(product: { subscribable?: unknown } | null | undefined): boolean {
  return !!product && readSubscribable(product.subscribable);
}

// The expected arrival window is shown only when the server gave both ends, in order. One end on its own is not a window.
export function fullArrivalWindow(window: { from: number | null; to: number | null } | null | undefined): { from: number; to: number } | null {
  if (!window) return null;
  const { from, to } = window;
  if (typeof from !== "number" || typeof to !== "number") return null;
  if (!Number.isFinite(from) || !Number.isFinite(to) || from <= 0 || to < from) return null;
  return { from, to };
}

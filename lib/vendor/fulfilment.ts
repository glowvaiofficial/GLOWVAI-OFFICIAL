// Vendor-side order transitions after packing. Pure, so the rules are tested without Firestore.
// The route runs this inside a transaction on the freshly read order.
type Doc = Record<string, unknown>;

export type ReadyDecision =
  | { kind: "apply" }
  | { kind: "noop" }
  | { kind: "refuse"; code: "ORDER_CANCELLED" | "INVALID_STATE" };

/**
 * packed -> ready_for_pickup. Already READY_FOR_PICKUP is a no-op (idempotent retry, no second event). Every other
 * status is refused: an order that is not packed yet, or one a rider has already collected, cannot be moved back.
 */
export function decideReady(order: Doc, staffCancelled: boolean): ReadyDecision {
  if (order.status === "CANCELLED" || staffCancelled) return { kind: "refuse", code: "ORDER_CANCELLED" };
  if (order.status === "READY_FOR_PICKUP") return { kind: "noop" };
  if (order.status !== "PACKED") return { kind: "refuse", code: "INVALID_STATE" };
  return { kind: "apply" };
}

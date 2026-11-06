// The admin entry point for variants on the server: saves through the shop's Firestore. Import this from server code only.
import "server-only";
import { db } from "./server";
import { setVariants as saveVariants, type SetVariantsResult } from "./variants";

// Replaces a product's variant list. The list is validated first; the change is recorded with the actor.
export function setVariants(productId: string, variants: unknown, actor: string): Promise<SetVariantsResult> {
  return saveVariants(productId, variants, actor, db());
}

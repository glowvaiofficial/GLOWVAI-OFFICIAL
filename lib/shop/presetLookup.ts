// Server side of presets: reads the enabled presets. The live one is picked by lib/shop/presets.ts.
import "server-only";
import type { Firestore } from "firebase-admin/firestore";
import { readPreset, type HomePreset } from "./presets";

export async function loadPresets(store: Firestore): Promise<HomePreset[]> {
  const snap = await store.collection("homePresets").where("enabled", "==", true).limit(50).get();
  const out: HomePreset[] = [];
  for (const doc of snap.docs) {
    const p = readPreset(doc.id, doc.data());
    if (p) out.push(p);
  }
  return out;
}

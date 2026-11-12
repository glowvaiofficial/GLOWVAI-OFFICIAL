import { db } from "@/lib/shop/server";
import { invalid } from "@/lib/vendor/errors";
import { perMinute, preflight, readJson, vendorRoute } from "@/lib/vendor/http";
import { parseVendorPushToken } from "@/lib/vendor/pushToken";
import { PUSH_TOKEN_MAX, deviceCapAllows, deviceCapError, tokenIdOf } from "@/lib/vendor/push";

export const dynamic = "force-dynamic";

// Registers this device for vendor notifications. Body: { token, platform: ios|android|web, tokenType: EXPO|FCM }.
// Stored at vendors/{uid}/pushTokens/{sha256(token)} with the token and its type; at most PUSH_TOKEN_MAX devices per
// vendor. Re-sending a token that is already stored only refreshes it. A new device over the cap is refused (not evicted).
// Returns { registered, devices }. The token is never sent back.
export const POST = vendorRoute({ route: "push-token", ip: perMinute(10), user: perMinute(5) }, async ({ req, me }) => {
  const parsed = parseVendorPushToken(await readJson(req));
  if (!parsed.ok) throw invalid(parsed.error, { field: parsed.field });
  const { token, platform, tokenType } = parsed.value;

  const store = db();
  const col = store.collection("vendors").doc(me.uid).collection("pushTokens");
  const id = tokenIdOf(token);
  const now = Date.now();
  let devices = 0;

  await store.runTransaction(async (tx) => {
    const [mine, all] = await Promise.all([tx.get(col.doc(id)), tx.get(col.limit(PUSH_TOKEN_MAX + 1))]);
    const count = all.size;
    if (!deviceCapAllows(count, mine.exists)) throw deviceCapError();
    tx.set(
      col.doc(id),
      { token, platform, tokenType, updatedAt: now, createdAt: mine.exists ? (mine.get("createdAt") ?? now) : now },
      { merge: true },
    );
    devices = mine.exists ? count : count + 1;
  });

  return { registered: true, devices };
});

export const OPTIONS = preflight;

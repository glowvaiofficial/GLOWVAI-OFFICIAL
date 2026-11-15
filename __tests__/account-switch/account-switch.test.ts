// Sign-out leaves nothing of the old account behind, wishlist removals stick, and a referral link is applied after
// sign-in. Pure modules only: no Firebase, no network.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  cleanPending,
  confirmWishlistChange,
  EMPTY_PENDING,
  reconcileWishlist,
  recordWishlistChange,
  WISHLIST_MAX,
} from "../../lib/shop/wishlist";
import { normaliseReferralCode } from "../../lib/shop/growth/codes";
import {
  applyOutcome,
  clearPendingReferral,
  HANDLED_REFERRAL_KEY,
  PENDING_REFERRAL_KEY,
  PENDING_REFERRAL_MAX_AGE_MS,
  readPendingReferral,
  referralCodeFromLink,
  savePendingReferral,
} from "../../lib/shop/growth/pendingReferral";
import {
  ACCOUNT_LOCAL_KEYS,
  clearAccountLocalData,
  restartAfterSignOut,
  SIGNED_OUT_START,
  signOutThisDevice,
} from "../../glowvai-app/features/auth/signOutCleanup";

// A Storage stand-in backed by a Map.
function memoryStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  };
}

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

describe("wishlist: removals stick", () => {
  it("an item removed on another device does not come back from this device's copy", () => {
    const r = reconcileWishlist({ device: ["a", "b", "c"], account: ["a", "c"], pending: EMPTY_PENDING, sameOwner: true });
    assert.deepEqual(r.list, ["a", "c"]);
    assert.deepEqual(r.toAdd, []);
    assert.deepEqual(r.toRemove, []);
  });

  it("a removal that failed here stays removed and is sent again", () => {
    const pending = recordWishlistChange(EMPTY_PENDING, "b", "remove");
    const r = reconcileWishlist({ device: ["a"], account: ["a", "b"], pending, sameOwner: true });
    assert.deepEqual(r.list, ["a"]);
    assert.deepEqual(r.toRemove, ["b"]);
  });

  it("a save that did not reach the account is kept and sent again", () => {
    const pending = recordWishlistChange(EMPTY_PENDING, "n", "add");
    const r = reconcileWishlist({ device: ["a", "n"], account: ["a"], pending, sameOwner: true });
    assert.deepEqual(r.list, ["a", "n"]);
    assert.deepEqual(r.toAdd, ["n"]);
  });

  it("a guest list is merged into the account it signs in to, minus the guest's own removals", () => {
    const pending = recordWishlistChange(EMPTY_PENDING, "g2", "remove");
    const r = reconcileWishlist({ device: ["g1", "g2"], account: ["a"], pending, sameOwner: false });
    assert.deepEqual(r.list, ["a", "g1"]);
    assert.deepEqual(r.toAdd, ["g1"]);
    assert.deepEqual(r.toRemove, []);
  });

  it("the latest change to an id wins, and confirmation clears only that change", () => {
    let p = recordWishlistChange(EMPTY_PENDING, "x", "add");
    p = recordWishlistChange(p, "x", "remove");
    assert.deepEqual(p, { adds: [], removes: ["x"] });
    assert.deepEqual(confirmWishlistChange(p, "x", "add"), p, "a late add confirmation does not undo the removal");
    assert.deepEqual(confirmWishlistChange(p, "x", "remove"), { adds: [], removes: [] });
  });

  it("stored pending records are cleaned", () => {
    assert.deepEqual(cleanPending({ adds: ["a", "b c", 3], removes: ["a"] }), { adds: [], removes: ["a"] });
    assert.deepEqual(cleanPending("junk"), { adds: [], removes: [] });
  });

  it("never goes past the cap", () => {
    const account = Array.from({ length: WISHLIST_MAX }, (_, i) => `p${i}`);
    const pending = recordWishlistChange(EMPTY_PENDING, "extra", "add");
    const r = reconcileWishlist({ device: [], account, pending, sameOwner: true });
    assert.equal(r.list.length, WISHLIST_MAX);
    assert.deepEqual(r.toAdd, []);
  });

  it("the shop passes the signed-in account to the sync, so a guest list is told apart from the account's own", () => {
    assert.match(read("glowvai-app/context/AppContext.tsx"), /syncWishlistWithAccount\(wishlistRef\.current, \{ uid: signedIn\.uid, anonymous: signedIn\.isAnonymous \}\)/);
  });
});

describe("sign-out on this device", () => {
  it("removes the push token while still signed in, then signs out, then clears the account's data", async () => {
    const order: string[] = [];
    const store = memoryStorage({
      glowvai_wishlist_v1: '["a"]',
      glowvai_cart_v1: "{}",
      glowvai_saved_addresses_v2: "{}",
      "glowvai.push.token": "tok",
      "glowvai.orderNotifications.v1.uid-1": "{}",
      "glowvai:language": "hi",
      "glowvai.device.v1": "dev",
    });
    await signOutThisDevice({
      forgetPushToken: async () => {
        order.push(`forget:${store.getItem("glowvai.push.token") ? "token-present" : "token-gone"}`);
      },
      signOut: async () => void order.push("signOut"),
      stopSync: () => void order.push("stopSync"),
      resetCustomer: () => void order.push("reset"),
      store,
    });
    assert.deepEqual(order, ["forget:token-present", "signOut", "stopSync", "reset"]);
    for (const key of ["glowvai_wishlist_v1", "glowvai_cart_v1", "glowvai_saved_addresses_v2", "glowvai.push.token", "glowvai.orderNotifications.v1.uid-1"]) {
      assert.equal(store.getItem(key), null, `${key} is cleared`);
    }
    assert.equal(store.getItem("glowvai:language"), "hi", "device settings are kept");
    assert.equal(store.getItem("glowvai.device.v1"), "dev");
  });

  it("a slow or failing push removal never blocks sign-out", async () => {
    let signedOut = false;
    await signOutThisDevice({
      forgetPushToken: () => new Promise(() => undefined),
      signOut: async () => void (signedOut = true),
      resetCustomer: () => undefined,
      store: memoryStorage(),
      timeoutMs: 10,
    });
    assert.equal(signedOut, true);
    await signOutThisDevice({
      forgetPushToken: async () => {
        throw new Error("offline");
      },
      signOut: async () => undefined,
      resetCustomer: () => undefined,
      store: memoryStorage(),
    });
  });

  it("keeps the data when Firebase sign-out fails (the customer is still signed in)", async () => {
    const store = memoryStorage({ glowvai_wishlist_v1: '["a"]' });
    await assert.rejects(
      signOutThisDevice({
        forgetPushToken: async () => undefined,
        signOut: async () => {
          throw new Error("network");
        },
        resetCustomer: () => undefined,
        store,
      }),
    );
    assert.equal(store.getItem("glowvai_wishlist_v1"), '["a"]');
  });

  it("the wishlist keys used by the shop are in the cleared list", () => {
    const sync = read("glowvai-app/features/shop/lib/wishlistSync.ts");
    for (const m of sync.matchAll(/export const WISHLIST_\w*KEY = '([^']+)'/g)) assert.ok(ACCOUNT_LOCAL_KEYS.includes(m[1]), m[1]);
    assert.ok(ACCOUNT_LOCAL_KEYS.includes(PENDING_REFERRAL_KEY));
    clearAccountLocalData(null);
  });

  it("both sign-out buttons use it, and the push token removal is wired in", () => {
    for (const file of ["glowvai-app/features/settings/SettingsHubScreen.tsx", "glowvai-app/features/privacy/DevicesScreen.tsx"]) {
      const source = read(file);
      assert.match(source, /forgetPushToken: forgetDeviceToken/, file);
      assert.match(source, /stopSync: stopWishlistSync/, file);
    }
    assert.match(read("glowvai-app/core/notifications/push.ts"), /await removePushToken\(token\)/);
  });

  it("starts the page again at the shop, so the old wishlist and bag in memory are dropped", () => {
    const went: string[] = [];
    restartAfterSignOut({
      assign: (url: string | URL) => {
        went.push(String(url));
      },
    });
    assert.deepEqual(went, [SIGNED_OUT_START]);
    assert.equal(SIGNED_OUT_START, "/shop");
    restartAfterSignOut(null);
  });

  it("every sign-out button restarts the page after the cleanup, even when the Firebase sign-out failed", () => {
    const hub = read("glowvai-app/features/settings/SettingsHubScreen.tsx");
    assert.ok(hub.indexOf("await signOutThisDevice(") < hub.indexOf("restartAfterSignOut(window.location)"));

    const devices = read("glowvai-app/features/privacy/DevicesScreen.tsx");
    const start = devices.indexOf("const endLocalSession = async");
    const end = devices.indexOf("\n  };", start);
    const body = devices.slice(start, end);
    // After the try/catch, so it runs on both paths.
    const restartAt = body.indexOf("restartAfterSignOut(window.location)");
    assert.ok(restartAt > body.indexOf("} catch {"));
    assert.ok(restartAt > body.lastIndexOf("clearAccountLocalData(deviceStorage())"));
    // Both device-screen sign-outs (this device, and all others) go through it.
    const calls = devices.match(/await endLocalSession\(\)/g) ?? [];
    assert.equal(calls.length, 2);
  });
});

describe("referral links are applied after sign-in", () => {
  it("reads a customer code the same way the server does, and leaves partner ids alone", () => {
    for (const v of ["ABCD2345", "abcd-2345", " abcd 2345 "]) {
      assert.equal(referralCodeFromLink(v), normaliseReferralCode(v));
      assert.equal(referralCodeFromLink(v), "ABCD2345");
    }
    assert.equal(referralCodeFromLink("GLV-AUTO-001-ABCD"), "");
    assert.equal(referralCodeFromLink("GLV-ABCD"), "");
    assert.equal(referralCodeFromLink("ABCD0O1I"), "", "letters left out of codes are refused");
    assert.equal(referralCodeFromLink(null), "");
  });

  it("keeps the code until it is used, and drops an expired one", () => {
    const store = memoryStorage();
    const now = 1_000_000;
    assert.equal(savePendingReferral(store, "abcd-2345", now), true);
    assert.deepEqual(readPendingReferral(store, now + 1000), { code: "ABCD2345", savedAt: now });
    assert.equal(readPendingReferral(store, now + PENDING_REFERRAL_MAX_AGE_MS + 1), null);
    assert.equal(store.getItem(PENDING_REFERRAL_KEY), null, "an expired code is removed");
  });

  it("a code the server has answered for is not stored again from the same link", () => {
    const store = memoryStorage();
    savePendingReferral(store, "ABCD2345", 1);
    clearPendingReferral(store, "ABCD2345");
    assert.equal(store.getItem(HANDLED_REFERRAL_KEY), "ABCD2345");
    assert.equal(savePendingReferral(store, "ABCD2345", 2), false);
    assert.equal(savePendingReferral(store, "WXYZ6789", 3), true, "a different friend's link still counts");
  });

  it("drops a refused code but keeps it when the call failed for another reason", () => {
    assert.equal(applyOutcome({ ok: true, status: 200 }), "applied");
    assert.equal(applyOutcome({ ok: false, status: 400 }), "refused");
    for (const status of [0, 401, 429, 500, 503]) assert.equal(applyOutcome({ ok: false, status }), "retry");
  });

  it("the website stores a referral code instead of treating it as a partner id; affiliate clicks still go out", () => {
    const capture = read("components/layout/ReferralCapture.tsx");
    assert.match(capture, /savePendingReferral\(window\.localStorage, code, Date\.now\(\)\)/);
    assert.match(read("components/affiliate/AffiliateClickCapture.tsx"), /\/api\/shop\/affiliate\/click/);
    assert.match(read("app/shop/[[...slug]]/page.tsx"), /<AffiliateClickCapture \/>/);
  });

  it("the shop applies it once a phone account is signed in", () => {
    const ctx = read("glowvai-app/context/AppContext.tsx");
    assert.match(ctx, /if \(next === 'phone'\) \{[\s\S]*?applyPendingReferral\(\)/);
    assert.match(read("glowvai-app/features/profile/pendingReferral.ts"), /applyReferralCode\(pending\.code\)/);
  });
});

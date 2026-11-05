import { loadVendor, meOf } from "@/lib/vendor/store";
import { perMinute, preflight, vendorRoute } from "@/lib/vendor/http";

export const dynamic = "force-dynamic";

// The signed-in vendor account and its store state. Works before the email is verified, so the app can say so.
export const GET = vendorRoute({ route: "me", ip: perMinute(60), user: perMinute(60), allowUnverified: true }, async ({ me }) => {
  const record = await loadVendor(me.uid);
  return { account: { uid: me.uid, email: me.email, emailVerified: me.emailVerified }, vendor: meOf(record) };
});

export const OPTIONS = preflight;

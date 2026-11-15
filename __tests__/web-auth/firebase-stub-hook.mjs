// Test-only loader hook: "server-only" becomes a no-op and firebase-admin app/auth become stubs, so a route loads without
// credentials. The stub verifier is globalThis.__fakeVerifyIdToken, set by each test. Nothing here touches the network.
const URLS = {
  "server-only": new URL("../../node_modules/server-only/empty.js", import.meta.url).href,
  "firebase-admin/app": new URL("./firebase-app-stub.mjs", import.meta.url).href,
  "firebase-admin/auth": new URL("./firebase-auth-stub.mjs", import.meta.url).href,
};
export async function resolve(specifier, context, next) {
  if (URLS[specifier]) return { url: URLS[specifier], format: specifier === "server-only" ? "commonjs" : "module", shortCircuit: true };
  return next(specifier, context);
}

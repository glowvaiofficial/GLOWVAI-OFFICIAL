// Test-only loader hook, registered by internal-order-status.test.ts. It points the route's email queue and GA4
// Measurement Protocol sender at no-op stubs, so the route loads without the JSX email templates or the analytics
// config (whose type-only imports do not load under the test loader) and nothing is ever sent.
const STUBS = {
  "@/lib/email/send": new URL("../lead/email-send-stub.ts", import.meta.url).href,
  "@/lib/analytics/mp": new URL("./analytics-mp-stub.ts", import.meta.url).href,
};

export async function resolve(specifier, context, next) {
  if (STUBS[specifier]) return { url: STUBS[specifier], format: "module-typescript", shortCircuit: true };
  return next(specifier, context);
}

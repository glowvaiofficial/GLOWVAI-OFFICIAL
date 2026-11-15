// Test-only loader hook, registered by retired-form-routes.test.ts. It points "@/lib/email/send" at email-send-stub.ts so
// the form routes can load without the email templates, and "@/lib/catalog" at catalog-stub.ts (the catalog's type-only
// imports do not load under the test loader). Every other specifier goes through the normal loader chain.
const STUBS = {
  "@/lib/email/send": new URL("./email-send-stub.ts", import.meta.url).href,
  "@/lib/catalog": new URL("./catalog-stub.ts", import.meta.url).href,
};

export async function resolve(specifier, context, next) {
  if (STUBS[specifier]) return { url: STUBS[specifier], format: "module-typescript", shortCircuit: true };
  return next(specifier, context);
}

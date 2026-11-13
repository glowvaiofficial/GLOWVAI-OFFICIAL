// Test-only loader hook, registered by lead-route.test.ts. It points "@/lib/email/send" at email-send-stub.ts so the lead
// route can load without the email templates. Every other specifier goes through the normal loader chain.
const STUBS = { "@/lib/email/send": new URL("./email-send-stub.ts", import.meta.url).href };

export async function resolve(specifier, context, next) {
  if (STUBS[specifier]) return { url: STUBS[specifier], format: "module-typescript", shortCircuit: true };
  return next(specifier, context);
}

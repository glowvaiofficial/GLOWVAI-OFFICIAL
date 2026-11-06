// Lets the variant tests load the Firestore stock helpers, which import "server-only" (it throws outside a server
// build). The tests run them against FakeStore, so the marker itself is not needed.
export async function resolve(specifier, context, next) {
  if (specifier === "server-only") {
    return { url: "data:text/javascript,export default {};", format: "module", shortCircuit: true };
  }
  return next(specifier, context);
}

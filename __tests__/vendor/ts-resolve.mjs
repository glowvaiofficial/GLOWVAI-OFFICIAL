// Lets `node --test` run the vendor API's pure TypeScript modules without extra packages (Node 22.18+ strips types).
// Resolves extension-less relative imports and "@/..." paths to .ts files and loads them as ES modules.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../../", import.meta.url);

// Next's server entry points are extension-less CommonJS files, which Node's ESM resolver cannot find by bare name.
// Route handlers import them, so map those names to the real files. Only the two names used by app/api routes.
const NEXT_ENTRY_ALIASES = { "next/server": "next/server.js", "next/headers": "next/headers.js" };

export async function resolve(specifier, context, next) {
  let spec = specifier;
  if (NEXT_ENTRY_ALIASES[spec]) return next(NEXT_ENTRY_ALIASES[spec], context);
  if (spec.startsWith("@/")) spec = new URL(spec.slice(2), root).href;
  const relative = spec.startsWith("./") || spec.startsWith("../") || spec.startsWith("file:");
  if (relative && !/\.[cm]?[jt]sx?$/.test(spec)) {
    const base = spec.startsWith("file:") ? spec : new URL(spec, context.parentURL).href;
    for (const ext of [".ts", "/index.ts"]) {
      const url = base + ext;
      if (existsSync(fileURLToPath(url))) return { url, format: "module-typescript", shortCircuit: true };
    }
  }
  return next(spec, context);
}

export async function load(url, context, next) {
  // The repo has no "type": "module", so mark its .ts files as ES modules explicitly.
  if (url.startsWith(root.href) && url.endsWith(".ts") && !url.includes("/node_modules/")) {
    return next(url, { ...context, format: "module-typescript" });
  }
  return next(url, context);
}

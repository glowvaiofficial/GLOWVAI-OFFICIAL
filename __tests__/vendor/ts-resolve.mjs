// Lets `node --test` run the vendor API's pure TypeScript modules without extra packages (Node 22.18+ strips types).
// Resolves extension-less relative imports and "@/..." paths to .ts files and loads them as ES modules.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../../", import.meta.url);

export async function resolve(specifier, context, next) {
  let spec = specifier;
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

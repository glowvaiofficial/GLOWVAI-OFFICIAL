import { SITE_URL } from "@/lib/site-url";

/**
 * GLOW VAI CLI UTM Link Generator.
 * Run with: npx tsx scripts/utm-builder.ts --source=instagram --medium=bio --campaign=brand-launch
 */

function buildUtmUrl() {
  const args = process.argv.slice(2);
  const params = new URLSearchParams();

  let path = "/";

  for (const arg of args) {
    if (arg.startsWith("--path=")) {
      path = arg.replace("--path=", "").trim();
    } else if (arg.startsWith("--source=")) {
      params.set("utm_source", arg.replace("--source=", "").trim().toLowerCase());
    } else if (arg.startsWith("--medium=")) {
      params.set("utm_medium", arg.replace("--medium=", "").trim().toLowerCase());
    } else if (arg.startsWith("--campaign=")) {
      params.set("utm_campaign", arg.replace("--campaign=", "").trim().toLowerCase());
    } else if (arg.startsWith("--content=")) {
      params.set("utm_content", arg.replace("--content=", "").trim().toLowerCase());
    } else if (arg.startsWith("--ref=")) {
      params.set("ref", arg.replace("--ref=", "").trim());
    }
  }

  if (!params.has("utm_source")) {
    params.set("utm_source", "direct");
  }

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const finalUrl = `${SITE_URL}${cleanPath}?${params.toString()}`;

  console.log("\n============================================================");
  console.log("GLOW VAI UTM LINK GENERATOR");
  console.log("============================================================");
  console.log(`Generated URL:\n\n${finalUrl}\n`);
  console.log("============================================================\n");
}

buildUtmUrl();

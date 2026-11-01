import { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const isProduction = process.env.NODE_ENV === "production" && SITE_URL === "https://glowvai.in";

  if (!isProduction) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
      sitemap: `${SITE_URL}/sitemap.xml`,
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/*?*",
        "/admin/",
        "/api/",
        "/checkout/",
        "/account/",
        "/draft/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

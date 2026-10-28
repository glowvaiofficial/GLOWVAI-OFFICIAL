"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { track } from "@/lib/analytics";

/**
 * GLOW VAI SPA Route Tracker.
 * Manually dispatches page_view events on Next.js App Router navigation.
 * Strips PII from page_location (e.g. ?email= or ?phone=).
 */

export function RouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;

    // Build clean search string preserving UTMs while dropping potential PII query params
    const cleanParams = new URLSearchParams();
    if (searchParams) {
      searchParams.forEach((val, key) => {
        const lower = key.toLowerCase();
        if (
          lower.startsWith("utm_") ||
          lower === "ref" ||
          lower === "gclid"
        ) {
          cleanParams.set(key, val.substring(0, 100));
        }
      });
    }

    const cleanSearch = cleanParams.toString();
    const cleanPath = cleanSearch ? `${pathname}?${cleanSearch}` : pathname;

    track("page_view", {
      page_path: cleanPath,
      page_title: typeof document !== "undefined" ? document.title : "",
    });
  }, [pathname, searchParams]);

  return null;
}

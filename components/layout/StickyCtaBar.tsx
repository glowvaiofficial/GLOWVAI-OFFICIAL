"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { getAssetPath } from "@/lib/utils";

export function StickyCtaBar() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => {
      const scrolled = window.scrollY > 640;
      const nearEnd = window.innerHeight + window.scrollY > document.documentElement.scrollHeight - 900;
      setVisible(scrolled && !nearEnd);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [pathname]);

  if (pathname === "/face-analysis" || pathname.startsWith("/admin")) return null;

  return (
    <div
      className={`md:hidden fixed inset-x-0 bottom-0 z-[60] bg-white border-t border-ink/10 shadow-[0_-8px_24px_rgba(10,27,77,.08)] transition-transform duration-200 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-hidden={!visible}
    >
      <div className="h-[72px] px-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-full overflow-hidden bg-paper-deep shrink-0 border border-ink/15">
            <Image
              src={getAssetPath("/images/hero/face-scan-selfie.webp")}
              alt="Face scan"
              fill
              sizes="36px"
              className="object-cover"
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink leading-tight">Free 30-second scan</p>
            <p className="text-[12px] text-ink-muted">Routine in 15 min</p>
          </div>
        </div>
        <Link href="/face-analysis" tabIndex={visible ? 0 : -1} data-track="scan_cta_click" data-track-location="sticky_bar">
          <Button variant="primary" size="sm">
            <span>Scan my face</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}

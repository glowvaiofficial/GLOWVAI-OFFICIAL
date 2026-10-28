"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";

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
        <p className="text-sm font-medium text-ink">Free 30-second scan</p>
        <Link href="/face-analysis" tabIndex={visible ? 0 : -1} data-track="scan_cta_click" data-track-location="sticky_bar">
          <Button variant="primary" size="sm">
            <span>Scan my face</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}

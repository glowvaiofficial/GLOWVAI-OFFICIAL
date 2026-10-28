"use client";

import { useEffect } from "react";

export function ClientRedirect({ href, label }: { href: string; label: string }) {
  useEffect(() => {
    window.location.replace(href);
  }, [href]);

  return (
    <main className="min-h-[60vh] flex items-center justify-center p-8 text-center text-ink-muted">
      <p className="text-sm">
        This page moved. <a className="text-brand underline" href={href}>{label}</a>.
      </p>
    </main>
  );
}

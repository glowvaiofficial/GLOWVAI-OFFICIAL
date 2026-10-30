"use client";

import React from "react";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-paper text-ink flex items-center justify-center min-h-screen p-6 font-sans">
        <main className="max-w-[560px] w-full space-y-5">
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-ink-muted">Something went wrong</p>
          <h1 className="font-display font-semibold text-4xl leading-tight">The site hit a problem.</h1>
          <p className="text-ink-muted text-[17px]">Please reload the page. If it keeps happening, email contact@glowvai.in.</p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="min-h-[52px] px-7 rounded-[10px] bg-brand text-white font-semibold hover:bg-brand-dark focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Reload page
            </button>
            <a
              href="/"
              className="min-h-[52px] inline-flex items-center justify-center px-7 rounded-[10px] border-[1.5px] border-ink/20 bg-white font-semibold hover:border-ink focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Home page
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}

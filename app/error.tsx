"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AlertCircle, RotateCcw, Home } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error Caught:", error);
  }, [error]);

  return (
    <div className="bg-white py-20 sm:py-32 text-ink min-h-[70vh] flex items-center">
      <Container size="md">
        <div className="bg-blush/40 rounded-3xl p-8 sm:p-14 border border-coral/30 text-center space-y-6 max-w-2xl mx-auto shadow-sm">
          <Badge variant="coral" size="md">
            <AlertCircle className="w-3.5 h-3.5 mr-1" />
            <span>Unexpected Error</span>
          </Badge>

          <h1 className="font-display font-semibold text-3xl sm:text-4xl text-ink leading-tight">
            Something went wrong on our end.
          </h1>

          <p className="text-body-lg text-ink-muted max-w-lg mx-auto leading-relaxed">
            We encountered a temporary issue. Don&apos;t worry, your data is safe.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-4">
            <Button variant="primary" size="md" onClick={() => reset()} className="gap-2 ">
              <RotateCcw className="w-4 h-4 text-ink shrink-0" />
              <span>Try Again</span>
            </Button>
            <Link href="/">
              <Button variant="outline" size="md" className="gap-2">
                <Home className="w-4 h-4 shrink-0" />
                <span>Return to Home</span>
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}

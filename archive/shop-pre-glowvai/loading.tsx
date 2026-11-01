import React from "react";
import { Container } from "@/components/ui/Container";

export default function ShopLoading() {
  return (
    <div className="bg-white py-12 sm:py-20 text-ink min-h-screen">
      <Container>
        <div className="space-y-4 max-w-xl mb-10 animate-pulse">
          <div className="w-24 h-4 bg-skymist rounded-full" />
          <div className="w-64 h-10 bg-skymist rounded-2xl" />
          <div className="w-48 h-4 bg-skymist rounded-full" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="hidden lg:block lg:col-span-3 space-y-4 animate-pulse">
            <div className="w-full h-48 bg-skymist rounded-3xl" />
          </div>

          <div className="lg:col-span-9 grid grid-cols-2 sm:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-[4/5] bg-skymist rounded-3xl" />
            ))}
          </div>
        </div>
      </Container>
    </div>
  );
}

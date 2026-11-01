import React from "react";
import { Container } from "@/components/ui/Container";

export default function ProductLoading() {
  return (
    <div className="bg-white py-12 sm:py-20 text-ink min-h-screen">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 aspect-[4/5] bg-paper-deep rounded-[24px]" />
          <div className="lg:col-span-5 space-y-6">
            <div className="w-32 h-4 bg-paper-deep rounded-full" />
            <div className="w-full h-10 bg-paper-deep rounded-[10px]" />
            <div className="w-48 h-6 bg-paper-deep rounded-[10px]" />
            <div className="w-full h-14 bg-paper-deep rounded-[10px]" />
          </div>
        </div>
      </Container>
    </div>
  );
}

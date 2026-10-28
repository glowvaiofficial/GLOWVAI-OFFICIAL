import React from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { BRAND_NAME } from "@/config/site";
import { Camera, ShoppingBag, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="bg-white py-20 sm:py-32 text-ink min-h-[70vh] flex items-center">
      <Container size="md">
        <div className="bg-skymist/40 rounded-3xl p-8 sm:p-14 border border-brand/15 text-center space-y-6 max-w-2xl mx-auto shadow-sm">
          <Badge variant="brand" size="md">
            404 Page Not Found
          </Badge>

          <h1 className="font-display font-semibold text-3xl sm:text-5xl text-ink leading-tight">
            Looks like this page took a wrong turn.
          </h1>

          <p className="text-body-lg text-ink-muted max-w-lg mx-auto leading-relaxed">
            The page you are looking for doesn&apos;t exist or has moved. Explore our shop or take a free skin scan instead.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link href="/shop">
              <Button variant="primary" size="md" className="gap-2  gv-btn-label">
                <ShoppingBag className="w-4 h-4 text-ink shrink-0" />
                <span>Explore Shop</span>
              </Button>
            </Link>
            <Link href="/face-analysis">
              <Button variant="outline" size="md" className="gap-2 gv-btn-label">
                <Camera className="w-4 h-4 text-brand shrink-0" />
                <span>Start Free Scan</span>
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}

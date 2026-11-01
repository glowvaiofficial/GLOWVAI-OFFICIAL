import React from "react";
import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";
import { PRIVACY_SHORT } from "@/config/privacy-copy";

interface AnnouncementBarProps {
  city?: string;
}

export function AnnouncementBar({ city = "Vijayawada" }: AnnouncementBarProps) {
  return (
    <div className="bg-ink text-white text-[13px] relative z-50">
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-12 min-h-[40px] py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate">Delivering to {city}</span>
          <span aria-hidden="true" className="text-white/40">·</span>
          <a href="tel:+918977855998" className="inline-flex items-center gap-1.5 hover:underline whitespace-nowrap">
            <Phone className="w-3.5 h-3.5" aria-hidden="true" />
            <span>+91 89778 55998</span>
          </a>
        </div>

        <p className="hidden lg:block text-white/85">{PRIVACY_SHORT}</p>

        <Link
          href="/face-analysis" data-track="scan_cta_click" data-track-location="top_bar"
          className="inline-flex items-center gap-1.5 font-semibold hover:underline whitespace-nowrap shrink-0"
        >
          <span>Free skin scan</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { AnnouncementBar } from "./AnnouncementBar";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { GlowVaiBot } from "@/components/chat/GlowVaiBot";
import { ReferralCapture } from "./ReferralCapture";

interface HeaderAndFooterWrapperProps {
  children: React.ReactNode;
  city: string;
}

export function HeaderAndFooterWrapper({ children, city }: HeaderAndFooterWrapperProps) {
  return (
    <>
      {/* Capture ?ref= param on every page so QR referrals from autos/campus are credited */}
      <ReferralCapture />
      <AnnouncementBar city={city} />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <GlowVaiBot />
    </>
  );
}

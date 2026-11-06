import type { Metadata } from "next";
import { RiderApp } from "./RiderApp";

// Delivery partners only. Not for search engines, and nothing on the page is cached.
export const metadata: Metadata = {
  title: "Delivery partner",
  robots: { index: false, follow: false, nocache: true },
};

export default function RiderPage() {
  return <RiderApp />;
}

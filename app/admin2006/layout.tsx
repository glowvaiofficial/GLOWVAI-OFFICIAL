import type { Metadata } from "next";

// Internal console: never index it.
export const metadata: Metadata = {
  title: "Admin Console",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

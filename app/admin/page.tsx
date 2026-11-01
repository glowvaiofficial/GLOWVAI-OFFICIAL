import type { Metadata } from "next";
import { ClientRedirect } from "@/components/seo/ClientRedirect";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminRedirectPage() {
  return <ClientRedirect href="/admin2006" label="Open the admin console" />;
}

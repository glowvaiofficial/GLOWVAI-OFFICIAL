import React from "react";
import { ContactClient } from "./ContactClient";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildContactPageGraph } from "@/lib/seo/entity-graph";
import { SITE_URL } from "@/lib/site-url";

export const metadata = {
  title: "Contact Customer Support",
  description: "Contact GLOW VAI for customer support, skincare order inquiries, and assistance.",
  alternates: {
    canonical: `${SITE_URL}/contact`,
  },
  openGraph: {
    title: "Contact GLOW VAI Customer Support",
    description: "Reach GLOW VAI for skincare recommendations, order updates, and customer service.",
    url: `${SITE_URL}/contact`,
    siteName: "GLOW VAI",
    type: "website",
  },
};

export default function ContactPage() {
  const contactGraph = buildContactPageGraph();

  return (
    <>
      <JsonLd data={contactGraph} />
      <ContactClient />
    </>
  );
}

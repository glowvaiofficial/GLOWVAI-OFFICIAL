// Builds the head metadata for a product's share page. Pure: the caller passes the product's own values, so a missing
// picture stays missing (no site logo is put in its place).
import type { Metadata } from "next";
import { productShareUrl } from "./productShare";

export interface ShareProductInput {
  key: string;
  name: string;
  brand: string;
  description: string;
  price: number | null;
  image: string | null;
  imageAlt?: string;
}

const MAX_DESCRIPTION = 160;

function plainText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function shortDescription(input: ShareProductInput): string {
  const text = plainText(input.description);
  if (text.length > 0) {
    return text.length > MAX_DESCRIPTION ? `${text.slice(0, MAX_DESCRIPTION - 1).trimEnd()}…` : text;
  }
  return input.price && input.price > 0 ? `Price ₹${input.price}. Scan your face and shop skincare that fits, on GLOW VAI.` : "Shop skincare that fits your skin, on GLOW VAI.";
}

// Only an absolute https picture is used as the preview image.
export function isShareableImageUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.length > 0;
  } catch {
    return false;
  }
}

export function buildProductShareMetadata(input: ShareProductInput): Metadata {
  const title = plainText(`${input.brand} ${input.name}`) || "GLOW VAI product";
  const description = shortDescription(input);
  const url = productShareUrl(input.key);
  const image = isShareableImageUrl(input.image) ? input.image : null;
  const alt = plainText(input.imageAlt ?? input.name) || title;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title,
      description,
      url,
      siteName: "GLOW VAI",
      ...(image ? { images: [{ url: image, alt }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

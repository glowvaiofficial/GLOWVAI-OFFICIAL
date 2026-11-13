// Link-preview metadata for a shop product. Pure (no Firestore, no Next.js imports) so the tests can check the image
// choice, the fallback and the escaping. The product page (app/product/[slug]) passes the product it read and returns
// this object from generateMetadata, so WhatsApp, iMessage and social crawlers see the product's own picture.

export interface ShareProductInput {
  id: string;
  name: string;
  brand?: string | null;
  price?: number | null;
  description?: string | null;
  // The product's first picture (pictures[0]). Empty or missing means the logo is used instead.
  picture?: string | null;
}

export interface ShareMetaOptions {
  siteUrl: string;
  brandName: string;
  logoPath: string;
}

export interface ShareMetadata {
  title: string;
  description: string;
  canonical: string;
  imageUrl: string;
  imageIsProductPicture: boolean;
  openGraph: {
    type: "website";
    title: string;
    description: string;
    url: string;
    siteName: string;
    images: { url: string; alt: string }[];
  };
  twitter: {
    card: "summary_large_image";
    title: string;
    description: string;
    images: string[];
  };
}

const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/g;
const MARKUP_CHARS = /[<>]/g;

// Plain text for a title or description: no control characters, no markup brackets, single spaces, and a length cap.
// Next.js escapes the remaining characters when it writes the head, so a name is never read as markup.
export function cleanText(value: unknown, max: number): string {
  const text = String(value ?? "")
    .replace(CONTROL_CHARS, " ")
    .replace(MARKUP_CHARS, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

// An https picture link (absolute), or a site-relative path. Anything else (javascript:, data:, protocol-relative,
// links with spaces or quotes) is refused and the logo is used.
export function productImageUrl(picture: unknown, siteUrl: string, logoPath: string): { url: string; isProductPicture: boolean } {
  const fallback = { url: `${siteUrl}${logoPath}`, isProductPicture: false };
  if (typeof picture !== "string") return fallback;
  const value = picture.trim();
  if (!value || /[\s"'<>\\]/.test(value)) return fallback;
  if (/^https:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "https:" ? { url: parsed.toString(), isProductPicture: true } : fallback;
    } catch {
      return fallback;
    }
  }
  if (value.startsWith("/") && !value.startsWith("//")) return { url: `${siteUrl}${value}`, isProductPicture: true };
  return fallback;
}

// The rupee price as shown to customers, or "" when the product has no usable price.
export function priceLabel(price: unknown): string {
  const n = Number(price);
  return Number.isFinite(n) && n > 0 ? `₹${Math.round(n).toLocaleString("en-IN")}` : "";
}

export function buildProductShareMetadata(product: ShareProductInput, opts: ShareMetaOptions): ShareMetadata {
  const name = cleanText(product.name, 120);
  const brand = cleanText(product.brand, 60);
  const price = priceLabel(product.price);
  const label = [brand, name].filter(Boolean).join(" ");
  const titleBase = price ? `${label} - ${price}` : label;
  const title = cleanText(`${titleBase} | ${opts.brandName}`, 180);

  const detail = cleanText(product.description, 160);
  const description = cleanText(
    [`Buy ${name || "this product"}${brand ? ` from ${brand}` : ""}${price ? ` at ${price}` : ""} on ${opts.brandName}.`, detail]
      .filter(Boolean)
      .join(" "),
    300,
  );

  const canonical = `${opts.siteUrl}/product/${encodeURIComponent(product.id)}`;
  const image = productImageUrl(product.picture, opts.siteUrl, opts.logoPath);
  const alt = cleanText(label || opts.brandName, 200);

  return {
    title,
    description,
    canonical,
    imageUrl: image.url,
    imageIsProductPicture: image.isProductPicture,
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
      siteName: opts.brandName,
      images: [{ url: image.url, alt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image.url],
    },
  };
}

import type { SkincareProduct } from '../../../core/data/indianSkincareCatalog';
import { defaultVariant } from '../../../../lib/shop/variants';

export const formatRupee = (amount: number) => `₹${Math.round(amount).toLocaleString('en-IN')}`;

// Real photos of the exact catalogue item. The old catalogue images were a handful of stock photos, several
// showing other brands' products, so every other product gets a generated tile with its brand and name.
const PRODUCT_PHOTOS: Record<string, string> = {
  'prod-03': '/glowvai/assets/products/web/minimalist-salicylic-2.webp',
  'prod-07': '/glowvai/assets/products/web/minimalist-vitamin-b5.webp',
};

const TILE_COLOURS: Record<SkincareProduct['category'], { bg: string; ink: string; accent: string }> = {
  Serums: { bg: '#eef3ff', ink: '#1d3f9d', accent: '#0057fb' },
  Moisturizers: { bg: '#f2ecfa', ink: '#4a2475', accent: '#5c2a91' },
  Suncare: { bg: '#fff3e2', ink: '#7a4300', accent: '#d9822b' },
  Cleansers: { bg: '#e8f6f0', ink: '#14573d', accent: '#19734f' },
  Treatments: { bg: '#fdecea', ink: '#7a2630', accent: '#c13f4b' },
};

// A simple pack outline per category: dropper bottle, jar, tube or pump bottle.
const PACK_SHAPES: Record<SkincareProduct['category'], string> = {
  Serums:
    '<rect x="282" y="70" width="36" height="56" rx="18"/><rect x="272" y="120" width="56" height="34" rx="6"/><rect x="240" y="150" width="120" height="190" rx="22"/>',
  Moisturizers:
    '<rect x="215" y="170" width="170" height="44" rx="12"/><rect x="222" y="206" width="156" height="134" rx="24"/>',
  Suncare:
    '<rect x="236" y="70" width="128" height="18" rx="5"/><path d="M244 86h112l-6 214H250z"/><rect x="258" y="298" width="84" height="44" rx="10"/>',
  Cleansers:
    '<rect x="262" y="74" width="80" height="22" rx="7"/><rect x="288" y="94" width="26" height="44" rx="5"/><rect x="238" y="136" width="124" height="204" rx="26"/>',
  Treatments:
    '<rect x="215" y="170" width="170" height="44" rx="12"/><rect x="222" y="206" width="156" height="134" rx="24"/>',
};

const escapeXml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const wrapWords = (text: string, maxChars: number, maxLines: number): string[] => {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (line && `${line} ${word}`.length > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = `${lines[maxLines - 1]}…`;
  }
  return lines;
};

const tileCache = new Map<string, string>();

const productTile = (product: SkincareProduct): string => {
  const cached = tileCache.get(product.id);
  if (cached) return cached;
  const colours = TILE_COLOURS[product.category] ?? TILE_COLOURS.Serums;
  const shape = PACK_SHAPES[product.category] ?? PACK_SHAPES.Serums;
  // The card already prints the product name, so the tile only carries the pack outline and the brand.
  const brandLines = wrapWords(product.brand.toUpperCase(), 18, 2)
    .map(
      (line, i) =>
        `<text x="300" y="${500 + i * 34}" font-size="26" font-weight="700" letter-spacing="4" fill="${colours.ink}" opacity="0.75">${escapeXml(line)}</text>`
    )
    .join('');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" font-family="Manrope, Segoe UI, Arial, sans-serif" text-anchor="middle">` +
    `<rect width="600" height="600" fill="${colours.bg}"/>` +
    `<g fill="${colours.accent}" opacity="0.3" transform="translate(300 250) scale(1.2) translate(-300 -206)">${shape}</g>` +
    brandLines +
    '</svg>';
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  tileCache.set(product.id, url);
  return url;
};

// Cart items store a plain URL string, so this always returns one.
// A product's own photo first; otherwise the built-in photo for that id, otherwise the generated brand tile.
export const getProductImageUrl = (product: SkincareProduct): string => {
  const own = typeof product.imageSource?.uri === 'string' ? product.imageSource.uri : product.official_brand_image_url;
  return own || PRODUCT_PHOTOS[product.id] || productTile(product);
};

// Smaller image for cards and tiles: Unsplash URLs are asked for a 400px-wide rendition. Local images are returned as they are.
export const getProductThumbUrl = (product: SkincareProduct, width = 400): string => {
  const url = getProductImageUrl(product);
  if (!url.includes('images.unsplash.com')) return url;
  return /([?&])w=\d+/.test(url) ? url.replace(/([?&])w=\d+/, `$1w=${width}`) : `${url}${url.includes('?') ? '&' : '?'}w=${width}`;
};

// The ₹1 trial sample is a test product, not a full-size item, so ranking rails leave it out.
export const isTrialProduct = (product: SkincareProduct): boolean => /\b(trial|sample)\b/i.test(product.name);

export const getDiscountPercent = (product: SkincareProduct): number => {
  if (product.discountPercent) return product.discountPercent;
  if (product.originalPrice <= product.price) return 0;
  return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
};
// The cart line a catalogue product adds, the same shape the shop screens use. A product with variants adds its
// default variant; screens that let the customer choose send them to the product page instead.
export const cartLineFor = (product: SkincareProduct) => {
  const variant = product.variants?.length ? defaultVariant(product.variants) : null;
  return {
    productId: product.id,
    variantId: variant?.id ?? null,
    variantLabel: variant?.label ?? null,
    name: product.name,
    brand: product.brand,
    image: getProductImageUrl(product),
    price: variant?.price ?? product.price,
    mrp: variant?.mrp ?? product.originalPrice,
  };
};

// Products with sizes, shades or packs are chosen on the product page, not added from a card or a rail.
export const hasVariantOptions = (product: SkincareProduct): boolean => (product.variants?.length ?? 0) > 0;

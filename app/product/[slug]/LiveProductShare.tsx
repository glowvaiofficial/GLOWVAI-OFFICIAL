import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import type { LiveProductForShare } from "@/lib/shop/liveProductShare";

// The share page for a live (Firestore) product. It is server-rendered so link previews read the product's own details,
// and it hands the visitor to the shop app, which opens this product.
export function LiveProductShare({ product }: { product: LiveProductForShare }) {
  const shopHref = `/shop?product=${encodeURIComponent(product.id)}&src=share`;
  return (
    <section className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-8 sm:px-6 sm:py-12 md:grid-cols-2 md:items-center md:gap-10">
      {product.image ? (
        // Product pictures are hosted outside the site, so they are not run through next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.image} alt={product.name} className="aspect-square w-full max-w-full rounded-2xl bg-white object-contain" />
      ) : null}
      <div className="min-w-0">
        {product.brand ? <p className="text-eyebrow text-ink/70">{product.brand}</p> : null}
        <h1 className="mt-2 text-h2-section break-words">{product.name}</h1>
        {product.price ? <p className="mt-3 text-lg font-semibold">{formatPrice(product.price)}</p> : null}
        {product.description ? <p className="mt-4 break-words text-body-lg text-ink/80">{product.description}</p> : null}
        <Link
          href={shopHref}
          className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-brand px-5 text-white font-semibold sm:w-auto"
        >
          Shop this product
        </Link>
        <p className="mt-3 text-sm text-ink/60">
          <Link href="/shop" className="underline underline-offset-4">Browse all skincare</Link>
        </p>
      </div>
    </section>
  );
}

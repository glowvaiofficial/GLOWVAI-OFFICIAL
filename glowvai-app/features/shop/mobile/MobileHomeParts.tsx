import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BadgePercent, ChevronDown, Crown, Droplets, Flower2, Gift, Headset, Heart, LayoutGrid, Leaf, MapPin, Minus, Plus, RotateCcw, ScanFace, Search, ShieldCheck, Sparkles, Star, Sun, Ticket, Truck, User, Wind, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import type { SkincareProduct } from '../../../core/data/indianSkincareCatalog';
import { useCartStore } from '../../../core/state/cartStore';
import { COUPON_VALUES, FREE_DELIVERY_ABOVE } from '../../../shared/pricing-rules.mjs';
import { SearchHint } from '../shared/SearchHint';
import { VoiceSearchButton } from '../shared/VoiceSearchButton';
import { HeaderCartButton } from '../shared/HeaderCartButton';
import { formatRupee, getDiscountPercent, getProductImageUrl, getProductThumbUrl, BRAND_MARK_URL } from '../shared/shopUtils';
import { HERO_IMAGE, useHomeNavigate } from '../lib/homeCommon';
import type { PricePointTile } from '../lib/homeModel';
import type { BlockItem, BlockSettings, HeaderSettings, HeroOverride } from '../lib/useHomeLayout';
import { DeliveryModeSwitch } from '../shared/NewBlocks';
import { HOME_TABS, ctaLabelForLink, endsInText, safeInternalLink, type HomeTab } from './homeChrome';
import { BrandLogo } from '../../../shared/BrandLogo';
import { accentVars, itemAccent, readableTextOn, tintOf } from './accentTheme';

// The mobile-web home's pieces (styles in mobile-home.css, under .gvh). Content, pictures, order, on/off and accents come
// from the admin layout; built-in fallbacks are the same ones the shop showed before (no made-up offers or images).

type Accented = { accent?: string };
const accentOfItem = (item: BlockItem, i: number) => itemAccent(item as BlockItem & Accented, i);
const varsStyle = (accent: string): React.CSSProperties => accentVars(accent) as React.CSSProperties;

// Admin links: the server already checks them; same-site paths open in the app, the rest fall back to the catalogue.
export function useOpenLink() {
  const navigate = useHomeNavigate();
  return (link: string | null | undefined) => {
    const l = (link ?? '').trim();
    if (!l) navigate('shop-browse');
    else window.location.assign(l);
  };
}

// ---------- Header ----------

const TAB_ICONS: Record<string, LucideIcon> = {
  'for-you': Sparkles,
  acne: Leaf,
  hydration: Droplets,
  brightening: Sun,
  antiaging: Flower2,
  barrier: Wind,
};

export function MobileHomeHeader({
  header,
  tab,
  onTab,
  location,
  embedded,
  unread,
  initial,
}: {
  header: HeaderSettings;
  tab: HomeTab;
  onTab: (tab: HomeTab) => void;
  location: string;
  embedded: boolean;
  unread: number;
  initial: string;
}) {
  const navigate = useHomeNavigate();
  return (
    <header className="gvh-header" style={{ '--wash': tab.accent, '--wash-on': readableTextOn(tab.accent) } as React.CSSProperties}>
      <div className="gvh-top">
        <span className="gvh-logo">
          <BrandLogo height={26} white={readableTextOn(tab.accent) === '#FFFFFF'} />
        </span>
        {embedded ? (
          <span className="gvh-location is-static">
            <MapPin size={15} aria-hidden="true" />
            <span>{location}</span>
          </span>
        ) : (
          <button type="button" className="gvh-location" onClick={() => navigate('location-setup')} aria-label={`Deliver to ${location}. Change location`}>
            <MapPin size={15} aria-hidden="true" />
            <span>{location}</span>
            <ChevronDown size={14} aria-hidden="true" />
          </button>
        )}
        <div className="gvh-search">
          <button type="button" className="gvh-search-btn" onClick={() => navigate('shop-search-filters')} aria-label="Search products">
            <Search size={18} aria-hidden="true" />
            <SearchHint hints={header.searchHints} />
          </button>
          <VoiceSearchButton onResult={(text) => navigate('shop-search-filters', { q: text })} />
        </div>
        <DeliveryModeSwitch header={header} />
        <div className="gvh-actions">
          <span className="gvh-cart-slot">
            <HeaderCartButton onOpen={() => navigate('cart-tab')} />
          </span>
          <button type="button" className="gvh-scan-pill" onClick={() => navigate('scan-camera')}>
            <ScanFace size={16} aria-hidden="true" />
            Skin scan
          </button>
          <button type="button" className="gvh-avatar" onClick={() => navigate('profile-tab')} aria-label={unread > 0 ? `Your account, ${unread} unread notifications` : 'Your account'}>
            {initial ? <span aria-hidden="true">{initial}</span> : <User size={18} aria-hidden="true" />}
            {unread > 0 && <span className="gvh-dot" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div className="gvh-tabs" role="group" aria-label="Shop by concern">
        {HOME_TABS.map((t) => {
          const selected = t.id === tab.id;
          const isAll = t.id === 'all';
          const Icon = TAB_ICONS[t.id];
          return (
            <button
              key={t.id}
              type="button"
              className={`gvh-tab${selected ? ' is-on' : ''}${isAll ? ' is-all' : ''}`}
              style={varsStyle(t.accent)}
              aria-pressed={isAll ? undefined : selected}
              onClick={() => (isAll ? navigate('shop-browse') : onTab(t))}
            >
              {Icon && <Icon size={15} aria-hidden="true" />}
              {t.label}
              {isAll && <ArrowRight size={15} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </header>
  );
}

// ---------- Greeting card ----------

export function GreetingCard({ greeting, delivery, onTrack }: { greeting: string; delivery: { title: string; value: string } | null; onTrack: (() => void) | null }) {
  return (
    <section className="gvh-greet" aria-label="Welcome">
      <span className="gvh-greet-icon" aria-hidden="true">
        <Sparkles size={18} />
      </span>
      <div className="gvh-greet-copy">
        <b>{greeting}</b>
        <small>Discover. Shop. Glow.</small>
      </div>
      {delivery && (
        <div className="gvh-greet-eta">
          <Truck size={20} aria-hidden="true" />
          <span>
            <b>{delivery.title}</b>
            <small>{delivery.value}</small>
          </span>
        </div>
      )}
      {onTrack && (
        <button type="button" className="gvh-track" onClick={onTrack}>
          Track Order <ArrowRight size={15} aria-hidden="true" />
        </button>
      )}
    </section>
  );
}

// ---------- Hero carousel ----------

type HomeBanner = {
  id: string;
  kind: 'banner' | 'offer' | 'festival' | 'sponsored';
  title: string;
  subtitle: string;
  ctaLabel: string;
  link: string;
  image: string;
  background: string;
  textColor: string;
};

const SLIDE_MS = 5000;
const reducedMotion = (): boolean => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};
const previewToken = (): string | null => {
  try {
    return new URLSearchParams(window.location.search).get('preview');
  } catch {
    return null;
  }
};

// Banners the team publishes from the admin (siteContent/home, GET /api/shop/home). Empty when none is live.
function useHomeBanners() {
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [previewing, setPreviewing] = useState(false);
  useEffect(() => {
    let alive = true;
    const token = previewToken();
    fetch(token ? `/api/shop/home?preview=${encodeURIComponent(token)}` : '/api/shop/home', { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive || !data || !Array.isArray(data.sections)) return;
        setBanners(data.sections as HomeBanner[]);
        setPreviewing(Boolean(token && data.preview));
      })
      .catch(() => {
        // No banners: the hero slide alone.
      });
    return () => {
      alive = false;
    };
  }, []);
  return { banners, previewing };
}

// The hero: the admin's hero (picture, title, subtitle, button) or the built-in campaign slide, then every live admin
// banner as a further slide. Slides advance every 5 s unless paused (pointer, focus) or the customer prefers less motion.
export function HeroCarousel({ hero, deliveryEta, accent }: { hero: (HeroOverride & Accented) | null; deliveryEta: number | null; accent: string }) {
  const navigate = useHomeNavigate();
  const { banners, previewing } = useHomeBanners();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = 1 + banners.length;

  useEffect(() => {
    if (count < 2 || paused || reducedMotion()) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), SLIDE_MS);
    return () => window.clearInterval(id);
  }, [count, paused]);
  const current = Math.min(index, count - 1);

  const heroTitle = hero?.title || 'Glow your way.';
  const heroSub = hero?.subtitle || (deliveryEta ? `Skincare delivered in ${deliveryEta} mins.` : 'Skincare, delivered to your door.');
  const heroLink = hero?.ctaLink || '';

  return (
    <section
      className="shop-home-showcase gvh-hero"
      aria-roledescription="carousel"
      aria-label="Featured"
      style={varsStyle(accent)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {previewing && <p className="gvh-preview-note">Staff preview: these banners are a draft and are not live for customers yet.</p>}
      <div className="gvh-hero-track" style={{ transform: `translateX(-${current * 100}%)` }}>
        <div className="gvh-slide is-hero" aria-hidden={current !== 0} role="group" aria-roledescription="slide" aria-label={`1 of ${count}`}>
          <img src={hero?.image || HERO_IMAGE} alt={hero?.image && hero.title ? hero.title : 'GlowVAI skincare campaign'} width={1891} height={831} fetchPriority="high" decoding="async" />
          <span className="gvh-slide-shade" aria-hidden="true" />
          <div className="gvh-slide-copy">
            <span className="gvh-slide-tag">Discover. Shop. Glow.</span>
            <h1>{heroTitle}</h1>
            <p>{heroSub}</p>
            <button type="button" className="gvh-slide-btn" tabIndex={current === 0 ? 0 : -1} onClick={() => (heroLink ? window.location.assign(heroLink) : navigate('shop-browse'))}>
              {hero?.ctaLabel || 'Shop Now'} <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
        {banners.map((b, i) => {
          const shown = current === i + 1;
          const link = safeInternalLink(b.link) ?? '/shop';
          return (
            <a
              key={b.id}
              href={link}
              className={`gvh-slide is-banner${b.image ? ' has-image' : ''}`}
              data-kind={b.kind}
              aria-hidden={!shown}
              tabIndex={shown ? 0 : -1}
              aria-label={`${i + 2} of ${count}: ${b.title}`}
              style={{ background: b.background || undefined, color: b.textColor || undefined }}
            >
              {b.image && <img src={b.image} alt="" loading="lazy" decoding="async" />}
              <span className="gvh-slide-copy">
                {b.kind === 'sponsored' && <span className="gvh-slide-tag">Sponsored</span>}
                <strong>{b.title}</strong>
                {b.subtitle && <span className="gvh-slide-sub">{b.subtitle}</span>}
                {b.ctaLabel && (
                  <span className="gvh-slide-btn">
                    {b.ctaLabel} <ArrowRight size={15} aria-hidden="true" />
                  </span>
                )}
              </span>
            </a>
          );
        })}
      </div>
      {count > 1 && (
        <div className="gvh-dots" role="tablist" aria-label="Choose a slide">
          {Array.from({ length: count }, (_, i) => (
            <button key={i} type="button" role="tab" aria-selected={i === current} aria-label={`Show slide ${i + 1}`} className={i === current ? 'is-on' : ''} onClick={() => setIndex(i)} />
          ))}
        </div>
      )}
    </section>
  );
}

// ---------- Section head ----------

export function SectionHead({ id, title, sub, accent, icon, badge, onSeeAll }: { id?: string; title: string; sub?: string; accent: string; icon?: React.ReactNode; badge?: React.ReactNode; onSeeAll?: () => void }) {
  return (
    <div className="gvh-head" style={varsStyle(accent)}>
      <div className="gvh-head-titles">
        <h2 id={id}>
          {icon}
          {title}
          {badge}
        </h2>
        {sub && <p>{sub}</p>}
      </div>
      {onSeeAll && (
        <button type="button" className="gvh-see-all" onClick={onSeeAll}>
          View All <ArrowRight size={15} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

// ---------- Price points: Under ₹299 / ₹499 / ₹999 ----------

export function PricePoints({ tiles, onOpen }: { tiles: PricePointTile[]; onOpen: (max: number) => void }) {
  if (tiles.length === 0) return null;
  return (
    <section className="gvh-section gvh-prices-section" aria-label="Shop by price">
      <div className="gvh-prices" style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))` }}>
        {tiles.map((t, i) => (
          <button key={t.max} type="button" className="gvh-price" style={varsStyle(itemAccent({ label: t.label }, i + 1))} onClick={() => onOpen(t.max)} aria-label={`${t.label}, ${t.count} ${t.count === 1 ? 'product' : 'products'}`}>
            <span className="gvh-price-media">{t.sample && <img src={getProductThumbUrl(t.sample, 200)} alt="" width={96} height={96} loading="lazy" decoding="async" />}</span>
            <b>{t.label}</b>
            <small>{t.count} {t.count === 1 ? 'product' : 'products'}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

// ---------- Shop by concern: accent tiles, two across ----------

export function ConcernGrid({ concerns, onOpen, onAll }: { concerns: { id: string; label: string; Icon: LucideIcon }[]; onOpen: (id: string) => void; onAll: () => void }) {
  return (
    <section className="gvh-section" aria-labelledby="gvh-concerns-title">
      <SectionHead id="gvh-concerns-title" title="Shop by concern" accent="#7C3AED" onSeeAll={onAll} />
      <div className="gvh-concerns">
        {concerns.map(({ id, label, Icon }, i) => (
          <button key={id} type="button" className="gvh-concern-tile" style={varsStyle(itemAccent({ label }, i))} onClick={() => onOpen(id)}>
            <span className="gvh-concern-icon" aria-hidden="true">
              <Icon size={18} />
            </span>
            <span>{label}</span>
          </button>
        ))}
        <button type="button" className="gvh-concern-tile is-all" style={varsStyle('#1E293B')} onClick={onAll}>
          <span className="gvh-concern-icon" aria-hidden="true">
            <LayoutGrid size={18} />
          </span>
          <span>All concerns</span>
        </button>
      </div>
    </section>
  );
}

// ---------- Product card (deals and rails) ----------

export function HomeProductCard({ product, sale, accent }: { product: SkincareProduct; sale?: { price: number; mrp: number }; accent: string }) {
  const navigate = useHomeNavigate();
  const { wishlist, toggleWishlist } = useApp();
  const quantity = useCartStore((s) => s.items[product.id]?.quantity ?? 0);
  const addItem = useCartStore((s) => s.addItem);
  const incrementItem = useCartStore((s) => s.incrementItem);
  const decrementItem = useCartStore((s) => s.decrementItem);
  const [imageFailed, setImageFailed] = useState(false);
  const options = (product.variants?.length ?? 0) > 0;
  const price = sale?.price ?? product.price;
  const mrp = sale?.mrp ?? product.originalPrice;
  const discount = sale ? (mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0) : getDiscountPercent(product);
  const saved = wishlist.includes(product.id);
  const open = () => navigate('shop-product', { productId: product.id });

  return (
    <article className="gvh-card" style={varsStyle(accent)}>
      <div className="gvh-card-media">
        <button type="button" className="gvh-card-open" onClick={open} aria-label={`View ${product.name}`}>
          {imageFailed ? <span className="gvh-card-fallback">{product.brand}</span> : <img src={getProductThumbUrl(product)} alt="" width={400} height={400} loading="lazy" decoding="async" onError={() => setImageFailed(true)} />}
        </button>
        <button type="button" className={`gvh-heart${saved ? ' is-on' : ''}`} onClick={() => toggleWishlist(product.id)} aria-pressed={saved} aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}>
          <Heart size={15} aria-hidden="true" fill={saved ? 'currentColor' : 'none'} />
        </button>
        {discount > 0 && <span className="gvh-off">{discount}% OFF</span>}
      </div>
      <div className="gvh-card-body">
        <p className="gvh-card-price">
          <b>{options && !sale ? `from ${formatRupee(price)}` : formatRupee(price)}</b>
          {mrp > price && <s>{formatRupee(mrp)}</s>}
        </p>
        <button type="button" className="gvh-card-name" onClick={open}>
          {product.brand ? `${product.brand} ` : ''}
          {product.name}
        </button>
        <div className="gvh-card-foot">
          {!options && quantity > 0 ? (
            <span className="gvh-stepper" aria-label={`${quantity} in cart`}>
              <button type="button" onClick={() => decrementItem(product.id)} aria-label={`Remove one ${product.name}`}>
                <Minus size={14} aria-hidden="true" />
              </button>
              <b>{quantity}</b>
              <button type="button" onClick={() => incrementItem(product.id)} aria-label={`Add one ${product.name}`}>
                <Plus size={14} aria-hidden="true" />
              </button>
            </span>
          ) : (
            <button
              type="button"
              className="gvh-add"
              onClick={() => {
                // Products with sizes or shades are chosen on their page.
                if (options) {
                  open();
                  return;
                }
                addItem({ productId: product.id, name: product.name, brand: product.brand, image: getProductImageUrl(product), price: product.price, mrp: product.originalPrice });
              }}
              aria-label={options ? `Choose options for ${product.name}` : `Add ${product.name} to cart`}
            >
              {options ? 'Choose' : 'Add'} <Plus size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

// A swipe row of product cards (a grid of four from 720px). Each card is tinted in its category's accent.
export function CardRail({ products, prices }: { products: SkincareProduct[]; prices?: Map<string, { price: number; mrp: number }> }) {
  return (
    <div className="gvh-rail">
      {products.map((p, i) => (
        <HomeProductCard key={p.id} product={p} sale={prices?.get(p.id)} accent={itemAccent({ label: p.category }, i)} />
      ))}
    </div>
  );
}

export function ProductRow({ title, sub, products, accent, onSeeAll, icon, badge, id, prices }: { title: string; sub?: string; products: SkincareProduct[]; accent: string; onSeeAll?: () => void; icon?: React.ReactNode; badge?: React.ReactNode; id?: string; prices?: Map<string, { price: number; mrp: number }> }) {
  if (products.length === 0) return null;
  return (
    <section className="gvh-section" aria-labelledby={id} aria-label={id ? undefined : title}>
      <SectionHead id={id} title={title} sub={sub} accent={accent} icon={icon} badge={badge} onSeeAll={onSeeAll} />
      <CardRail products={products} prices={prices} />
    </section>
  );
}

export function SkeletonRow({ title }: { title: string }) {
  return (
    <section className="gvh-section" aria-busy="true">
      <div className="gvh-head">
        <div className="gvh-head-titles">
          <h2>{title}</h2>
        </div>
      </div>
      <div className="gvh-rail" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="gvh-card is-skel">
            <span className="gvh-card-media" />
            <span className="gvh-skel-line is-short" />
            <span className="gvh-skel-line" />
          </span>
        ))}
      </div>
      <span className="gvh-sr">Loading products</span>
    </section>
  );
}

// ---------- Flash sales ----------

export type FlashSale = {
  id: string;
  name: string;
  endsAt: number;
  discountPercent: number;
  remaining: number | null;
  items: { productId: string; name: string; price: number; salePrice: number }[];
};

// Live flash sales (GET /api/shop/flash-sales), read once when the home opens.
export function useFlashSales(): FlashSale[] {
  const [sales, setSales] = useState<FlashSale[]>([]);
  useEffect(() => {
    let alive = true;
    fetch('/api/shop/flash-sales', { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d && Array.isArray(d.sales)) setSales(d.sales as FlashSale[]);
      })
      .catch(() => {
        // No sales shown.
      });
    return () => {
      alive = false;
    };
  }, []);
  return sales;
}

/** The time now, updated every `ms` while `active` (no network). */
export function useTicker(active: boolean, ms = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [active, ms]);
  return now;
}

export function EndsInPill({ endsAt, now }: { endsAt: number; now: number }) {
  const text = endsInText(endsAt - now);
  return (
    <span className="gvh-ends" aria-label={`Ends in ${text.replace(' : ', ' ')}`}>
      Ends in {text}
    </span>
  );
}

// Each live flash sale as its own row, at the sale price from the server.
export function FlashSaleRows({ sales, catalog, now, accent }: { sales: FlashSale[]; catalog: SkincareProduct[]; now: number; accent: string }) {
  const navigate = useHomeNavigate();
  const byId = useMemo(() => new Map(catalog.map((c) => [c.id, c] as const)), [catalog]);
  const live = sales.filter((s) => s.endsAt > now);
  return (
    <>
      {live.map((sale) => {
        const products: SkincareProduct[] = [];
        const prices = new Map<string, { price: number; mrp: number }>();
        for (const item of sale.items) {
          const product = byId.get(item.productId);
          if (!product || prices.has(product.id)) continue;
          products.push(product);
          prices.set(product.id, { price: item.salePrice, mrp: item.price });
        }
        return (
          <ProductRow
            key={sale.id}
            title={sale.name}
            sub={`${sale.discountPercent}% off${sale.remaining !== null ? ` · ${sale.remaining} left at this price` : ''}`}
            products={products}
            prices={prices}
            accent={accent}
            icon={<Zap size={20} aria-hidden="true" className="gvh-zap" fill="currentColor" />}
            badge={<EndsInPill endsAt={sale.endsAt} now={now} />}
            onSeeAll={() => navigate('shop-browse')}
          />
        );
      })}
    </>
  );
}

// ---------- Categories: pastel accent tiles ----------

export function CategoryTile({ label, accent, onOpen, image, sub }: { label: string; accent: string; onOpen: () => void; image?: string | null; Icon?: LucideIcon; sub?: string | null }) {
  return (
    <button type="button" className={`gvh-cat${image ? '' : ' is-brand'}`} style={varsStyle(accent)} onClick={onOpen} aria-label={sub ? `${label}, ${sub}` : label}>
      <span className="gvh-cat-media">{image ? <img src={image} alt="" width={200} height={200} loading="lazy" decoding="async" /> : <img className="gvh-cat-mark" src={BRAND_MARK_URL} alt="" width={32} height={38} decoding="async" />}</span>
      <span className="gvh-cat-label">{label}</span>
    </button>
  );
}

export const ALL_ICON = LayoutGrid;

// ---------- Promos: two offer cards ----------

function PromoCard({ title, sub, kicker, image, accent, index, Icon, onOpen, background, textColor }: { title: string; sub?: string; kicker?: string; image?: string; accent: string; index: number; Icon: LucideIcon; onOpen: () => void; background?: string; textColor?: string }) {
  const dark = background ? readableTextOn(background) === '#FFFFFF' : index % 2 === 0;
  const style: React.CSSProperties = { ...varsStyle(accent) };
  if (background) style.background = background;
  if (textColor) style.color = textColor;
  return (
    <button type="button" className={`gvh-promo${dark ? ' is-dark' : ' is-light'}${background ? ' has-bg' : ''}`} style={style} onClick={onOpen} aria-label={sub ? `${title}, ${sub}` : title}>
      <span className="gvh-promo-orb" aria-hidden="true" />
      {image ? <img className="gvh-promo-img" src={image} alt="" loading="lazy" decoding="async" /> : <Icon className="gvh-promo-icon" size={34} strokeWidth={1.6} aria-hidden="true" />}
      {kicker && <span className="gvh-promo-kicker">{kicker}</span>}
      <span className="gvh-promo-title">{title}</span>
      {sub && <span className="gvh-promo-sub">{sub}</span>}
      <span className="gvh-promo-go" aria-hidden="true">
        <ArrowRight size={16} />
      </span>
    </button>
  );
}

export function PromosBlock({ settings, onOpenLink }: { settings?: BlockSettings & Accented; onOpenLink: (link: string) => void }) {
  const navigate = useHomeNavigate();
  const admin = settings?.items ?? [];
  if (admin.length > 0) {
    return (
      <section className="shop-home-promos gvh-promos" aria-label="Offers">
        {admin.map((item, i) => (
          <PromoCard
            key={`${i}-${item.label}`}
            title={item.label}
            sub={item.sub}
            image={item.image}
            accent={accentOfItem(item, i)}
            index={i}
            Icon={i % 2 === 0 ? Ticket : Truck}
            onOpen={() => onOpenLink(item.link)}
            background={settings?.background || undefined}
            textColor={settings?.textColor || undefined}
          />
        ))}
      </section>
    );
  }
  return (
    <section className="shop-home-promos gvh-promos" aria-label="Offers">
      <PromoCard kicker="Coupon" title={`Flat ₹${COUPON_VALUES.GLOW50} OFF`} sub="Use code GLOW50 in your cart" accent="#1E293B" index={0} Icon={Ticket} onOpen={() => navigate('cart-tab')} />
      <PromoCard title="Free Delivery" sub={`On orders above ₹${FREE_DELIVERY_ABOVE}`} accent="#0EA5E9" index={1} Icon={Truck} onOpen={() => navigate('shop-browse')} />
    </section>
  );
}

// ---------- Admin blocks ----------

export function TrendingBlock({ settings, accent, onOpenLink }: { settings: BlockSettings; accent: string; onOpenLink: (link: string) => void }) {
  return (
    <section className="gvh-section" aria-label={settings.title || 'Trending'}>
      {settings.title && <SectionHead title={settings.title} accent={accent} icon={<Star size={20} aria-hidden="true" className="gvh-star" fill="currentColor" />} />}
      <div className="gvh-trend-row">
        {settings.items.map((item, i) => (
          <button
            key={`${i}-${item.label}`}
            type="button"
            className="gvh-trend"
            style={{ ...varsStyle(accentOfItem(item, i)), background: settings.background || undefined, color: settings.textColor || undefined }}
            onClick={() => onOpenLink(item.link)}
            aria-label={item.sub ? `${item.label}, ${item.sub}` : item.label}
          >
            <span className="gvh-trend-media">{item.image ? <img src={item.image} alt="" loading="lazy" decoding="async" /> : <Sparkles size={24} aria-hidden="true" />}</span>
            <span className="gvh-trend-label">{item.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function OffersBlock({ settings, accent, onOpenLink }: { settings: BlockSettings; accent: string; onOpenLink: (link: string) => void }) {
  return (
    <section className="gvh-section" aria-label={settings.title || 'Offers for you'}>
      {settings.title && <SectionHead title={settings.title} accent={accent} />}
      <div className="gvh-offer-row">
        {settings.items.map((item, i) => (
          <button
            key={`${i}-${item.label}`}
            type="button"
            className="gvh-offer"
            style={{ ...varsStyle(accentOfItem(item, i)), background: settings.background || undefined, color: settings.textColor || undefined }}
            onClick={() => onOpenLink(item.link)}
          >
            <span className="gvh-offer-icon" aria-hidden="true">
              {item.image ? <img src={item.image} alt="" loading="lazy" decoding="async" /> : <BadgePercent size={18} />}
            </span>
            <span className="gvh-offer-copy">
              <b>{item.label}</b>
              {item.sub && <small>{item.sub}</small>}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function BrandsBlock({ settings, accent, onOpenLink }: { settings: BlockSettings; accent: string; onOpenLink: (link: string) => void }) {
  return (
    <section className="gvh-section" aria-label={settings.title || 'Top brands'}>
      <SectionHead title={settings.title || 'Top brands'} accent={accent} />
      <div className="gvh-brands">
        {settings.items.map((item, i) => (
          <button
            key={`${i}-${item.label}`}
            type="button"
            className="gvh-brand"
            style={{ ...varsStyle(accentOfItem(item, i)), background: settings.background || undefined, color: settings.textColor || undefined }}
            onClick={() => onOpenLink(item.link)}
            aria-label={item.label}
          >
            {item.image ? <img src={item.image} alt="" loading="lazy" decoding="async" /> : <span>{item.label}</span>}
          </button>
        ))}
      </div>
    </section>
  );
}

const TRUST_ICONS: LucideIcon[] = [Truck, ShieldCheck, RotateCcw];

export function TrustBlock({ settings, accent, onOpenLink }: { settings: BlockSettings; accent: string; onOpenLink: (link: string) => void }) {
  return (
    <section className="gvh-section gvh-trust" aria-label={settings.title || 'Why shop with us'} style={{ background: settings.background || undefined, color: settings.textColor || undefined }}>
      {settings.title && <SectionHead title={settings.title} accent={accent} />}
      <div className="gvh-trust-row">
        {settings.items.map((item, i) => {
          const Icon = TRUST_ICONS[i % TRUST_ICONS.length];
          const body = (
            <>
              <span className="gvh-trust-icon" style={varsStyle(accentOfItem(item, i))} aria-hidden="true">
                {item.image ? <img src={item.image} alt="" loading="lazy" decoding="async" /> : <Icon size={20} />}
              </span>
              <b>{item.label}</b>
              {item.sub && <small>{item.sub}</small>}
            </>
          );
          return item.link ? (
            <button key={`${i}-${item.label}`} type="button" className="gvh-trust-item" onClick={() => onOpenLink(item.link)}>
              {body}
            </button>
          ) : (
            <div key={`${i}-${item.label}`} className="gvh-trust-item">
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}

const HELP_ICONS: LucideIcon[] = [Crown, Gift, Headset];

// Help, gifts and membership: navy banners with a gold crown, in the reference's "Glowvai Plus" style.
export function HelpGiftBlock({ settings, accent, onOpenLink }: { settings: BlockSettings; accent: string; onOpenLink: (link: string) => void }) {
  return (
    <section className="gvh-section" aria-label={settings.title || 'Help, gifts and more'}>
      {settings.title && <SectionHead title={settings.title} accent={accent} />}
      <div className="gvh-plus-list">
        {settings.items.map((item, i) => {
          const Icon = HELP_ICONS[i % HELP_ICONS.length];
          const cta = ctaLabelForLink(item.link);
          const style: React.CSSProperties = { ...varsStyle(accentOfItem(item, i)) };
          if (settings.background) style.background = settings.background;
          if (settings.textColor) style.color = settings.textColor;
          return (
            <button key={`${i}-${item.label}`} type="button" className={`gvh-plus${settings.background ? ' has-bg' : ''}`} style={style} onClick={() => onOpenLink(item.link)} aria-label={`${item.label}. ${cta}`}>
              <span className="gvh-plus-orb" aria-hidden="true" />
              <span className="gvh-plus-icon" aria-hidden="true">
                {item.image ? <img src={item.image} alt="" loading="lazy" decoding="async" /> : <Icon size={20} fill={i === 0 ? 'currentColor' : 'none'} />}
              </span>
              <span className="gvh-plus-copy">
                <b>{item.label}</b>
                {item.sub && <small>{item.sub}</small>}
              </span>
              <span className="gvh-plus-cta">
                {cta} <ArrowRight size={14} aria-hidden="true" />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ---------- Concern picks (a tab other than For You) ----------

export function ConcernPicks({ tab, products, onSeeAll }: { tab: HomeTab; products: SkincareProduct[]; onSeeAll: () => void }) {
  if (!tab.concern) return null;
  return (
    <div className="gvh-concern" key={tab.id}>
      {products.length > 0 ? (
        <ProductRow id="gvh-concern-title" title={`Picked for ${tab.label.toLowerCase()}`} sub={`${products.length} ${products.length === 1 ? 'product' : 'products'}`} products={products.slice(0, 12)} accent={tab.accent} onSeeAll={onSeeAll} />
      ) : (
        <p className="gvh-empty">Nothing for {tab.label.toLowerCase()} yet. Everything else is below.</p>
      )}
    </div>
  );
}

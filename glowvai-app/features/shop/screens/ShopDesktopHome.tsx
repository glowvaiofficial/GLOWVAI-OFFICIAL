import React, { useEffect, useRef, useState } from 'react';
import { Instrument_Serif } from 'next/font/google';
import { ArrowRight, Bell, Boxes, ChevronDown, ChevronLeft, ChevronRight, Clock, Droplets, FlaskConical, LucideProvider, MapPin, Mars, Minus, Package, Pipette, Plus, ScanFace, Search, ShieldCheck, ShoppingCart, Sparkles, Sun, Ticket, Truck, User, Venus, Waves } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import type { SkincareProduct } from '../../../core/data/indianSkincareCatalog';
import { useCartStore } from '../../../core/state/cartStore';
import { useInbox } from '../../../core/notifications/inboxStore';
import { siteConfig } from '../../../../config/site';
import { fromPrice } from '../../../../lib/shop/variants';
import { COUPON_VALUES, FREE_DELIVERY_ABOVE } from '../../../shared/pricing-rules.mjs';
import { itemsLabel, useShellCart } from '../../../components/common/useShellCart';
import { SkinQuizBanner } from '../shared/SkinQuizBanner';
import { HomeBanners } from '../shared/HomeBanners';
import { SearchHint } from '../shared/SearchHint';
import { VoiceSearchButton } from '../shared/VoiceSearchButton';
import { MiniBannersPlaceholder, OffersStripPlaceholder, FlashDealsPlaceholder, FlashSaleStrip, BrandStripPlaceholder, TrustBlockPlaceholder, HelpGiftPlaceholder } from '../shared/HomePlaceholders';
import { useHomeLayout, type BlockItem, type HomeBlockId } from '../lib/useHomeLayout';
import { useHomeData } from '../lib/useHomeData';
import { balancedColumns } from '../lib/homeDevice';
import { CATEGORY_ACCENT, CONCERNS, HERO_IMAGE, SCAN_PRIVACY, countLabel, useHomeNavigate, useReorderProducts } from '../lib/homeCommon';
import { HOME_CATEGORY_TILES, HOME_FOOTER_GROUPS, configuredSocials, mergeFooterSocials } from '../lib/homeModel';
import type { HomeCategoryTile } from '../lib/homeModel';
import { formatRupee, getDiscountPercent, getProductImageUrl, getProductThumbUrl } from '../shared/shopUtils';
import '../styles/shop-desktop-home.css';

// One display serif for the desktop home's headings only (the hero, section titles, offer titles). The UI text keeps the
// theme's body font. Self-hosted by next/font, swapped in when it arrives, and not preloaded, so the phone home never
// downloads it.
const displayFont = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'], display: 'swap', preload: false, variable: '--desk-font-display' });

// The desktop home (screens 1024px wide and more, or ?device=desktop). It renders the desktop layout the GlowVai team
// designed in the admin (device=desktop; the mobile layout when none is saved), in the admin's order, with the same 12
// blocks as the mobile home. The look follows the big quick-commerce sites on a PC: one centred column, a compact sticky
// header (logo, delivery time and place, a wide search, account and cart) with a category tab row, a calm hero, evenly
// filled category and offer rows, and product rails of equal cards. The look is a beauty brand's: warm porcelain surfaces,
// deep ink text, an editorial serif for headings with small spaced eyebrows above them, products on soft tinted squares,
// brand blue only for the main actions. The content and the data are the mobile home's (useHomeData, homeCommon). Motion
// is CSS only, slow and smooth; it is switched off for people who ask for less motion.

const CATEGORY_ICON: Record<string, LucideIcon> = {
  Serums: Pipette,
  Moisturizers: Droplets,
  Suncare: Sun,
  Cleansers: Waves,
  Treatments: FlaskConical,
};

// Most tiles a category row holds, and most offer cards a row holds.
const CATEGORY_ROW_MAX = 6;
const PROMO_ROW_MAX = 3;
// Up to this many deals sit in a grid beside the deals card; more become a scrolling rail.
const DEAL_GRID_MAX = 4;

// The small spaced label above each rail's title.
const RAIL_EYEBROW: Record<string, string> = {
  picks: 'For your skin',
  continue: 'Recently viewed',
  top: 'Most loved',
  under500: 'Little luxuries',
};
const railEyebrow = (id: string) => RAIL_EYEBROW[id] ?? 'The edit';

type Mode = 'women' | 'men';

const prefersReducedMotion = (): boolean => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

// True once the page has scrolled past the top: the header then gets its shadow and its compact height. A small marker at
// the very top of the page is watched, so this works whether the window or an inner box scrolls.
function useScrolledPast(markerRef: React.RefObject<HTMLElement | null>): boolean {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setPast(!entry.isIntersecting));
    io.observe(marker);
    return () => io.disconnect();
  }, [markerRef]);
  return past;
}

// Sections below the fold fade and slide in once, the first time they scroll into view. Sections already on screen are
// left as they are (no flash on load), sections added later (when the catalogue arrives) are picked up too, and nothing
// is hidden at all without IntersectionObserver or for people who prefer reduced motion.
function useRevealOnScroll(rootRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined' || typeof MutationObserver === 'undefined' || prefersReducedMotion()) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.deskReveal = 'in';
          io.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.01 }
    );
    const seen = new WeakSet<Element>();
    const track = () => {
      for (const child of Array.from(root.children)) {
        if (seen.has(child) || !(child instanceof HTMLElement)) continue;
        seen.add(child);
        if (child.getBoundingClientRect().top < window.innerHeight) continue;
        child.dataset.deskReveal = 'wait';
        io.observe(child);
      }
    };
    track();
    const mo = new MutationObserver(track);
    mo.observe(root, { childList: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [rootRef]);
}

// Loading placeholders with the same boxes as the real product card, so nothing moves when the products arrive.
function skeletonCards(count: number) {
  return Array.from({ length: count }, (_, i) => (
    <span key={i} className="shop-desk-skel-card">
      <span className="shop-desk-skel-media shop-desk-shimmer" />
      <span className="shop-desk-skel-body">
        <span className="shop-desk-skel-line is-tiny shop-desk-shimmer" />
        <span className="shop-desk-skel-line shop-desk-shimmer" />
        <span className="shop-desk-skel-line is-short shop-desk-shimmer" />
        <span className="shop-desk-skel-foot">
          <span className="shop-desk-skel-line is-price shop-desk-shimmer" />
          <span className="shop-desk-skel-btn shop-desk-shimmer" />
        </span>
      </span>
    </span>
  ));
}

function SectionHead({ id, eyebrow, title, sub, action }: { id?: string; eyebrow?: string; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="shop-desk-head">
      <div className="shop-desk-head-titles">
        {eyebrow && <span className="shop-desk-eyebrow">{eyebrow}</span>}
        <h2 id={id}>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {action && <div className="shop-desk-head-actions">{action}</div>}
    </div>
  );
}

function SeeAll({ label = 'See all', onClick, name }: { label?: string; onClick: () => void; name?: string }) {
  return (
    <button type="button" className="shop-desk-see-all" onClick={onClick} aria-label={name ? `${label}: ${name}` : undefined}>
      {label}
      <ChevronRight size={16} aria-hidden="true" />
    </button>
  );
}

// A desktop product card: the photo in a fixed square on a light surface, brand, a name of at most two lines, the size
// line, then the price and the ADD button on the bottom row. Every card in a row has the same height. The name is the
// card's one link (it covers the whole card), so the card is one stop for the keyboard plus its cart button.
function DeskProductCard({ product }: { product: SkincareProduct }) {
  const navigate = useHomeNavigate();
  const [imageFailed, setImageFailed] = useState(false);
  const quantity = useCartStore((s) => s.items[product.id]?.quantity ?? 0);
  const addItem = useCartStore((s) => s.addItem);
  const incrementItem = useCartStore((s) => s.incrementItem);
  const decrementItem = useCartStore((s) => s.decrementItem);
  const discount = getDiscountPercent(product);
  // A product with sizes or shades is chosen on its page: the card shows "from" and ADD opens the page.
  const options = product.variants && product.variants.length > 0 ? product.variants : null;
  const open = () => navigate('shop-product', { productId: product.id });
  const add = () => {
    if (options) {
      open();
      return;
    }
    addItem({ productId: product.id, name: product.name, brand: product.brand, image: getProductImageUrl(product), price: product.price, mrp: product.originalPrice });
  };

  return (
    <article className="shop-desk-card">
      <div className="shop-desk-card-media">
        {imageFailed ? (
          <span className="shop-desk-card-fallback">{product.brand}</span>
        ) : (
          <img src={getProductThumbUrl(product)} alt="" width={400} height={400} loading="lazy" decoding="async" onError={() => setImageFailed(true)} />
        )}
      </div>
      <div className="shop-desk-card-body">
        <small className="shop-desk-card-brand">{product.brand}</small>
        <button type="button" className="shop-desk-card-name" onClick={open}>
          {product.name}
        </button>
        <small className="shop-desk-card-size">
          <span>{options ? `${options.length} options` : product.volume}</span>
          {product.deliveryMinutes ? (
            <span className="shop-desk-card-eta">
              <Clock size={12} aria-hidden="true" />
              {product.deliveryMinutes} mins
            </span>
          ) : null}
        </small>
        <span className="shop-desk-card-price">
          {options ? (
            <>
              <small>from</small>
              <b>{formatRupee(fromPrice(options).price)}</b>
            </>
          ) : (
            <>
              <b>{formatRupee(product.price)}</b>
              {product.originalPrice > product.price && <s aria-label={`MRP ${formatRupee(product.originalPrice)}`}>{formatRupee(product.originalPrice)}</s>}
            </>
          )}
          {discount > 0 && <span className="shop-desk-card-off">{discount}% off</span>}
        </span>
        <div className="shop-desk-card-foot">
          {!options && quantity > 0 ? (
            <span className="shop-desk-stepper" role="group" aria-label={`${product.name}: ${quantity} in bag`}>
              <button type="button" onClick={() => decrementItem(product.id)} aria-label={`Remove one ${product.name}`}>
                <Minus size={16} aria-hidden="true" />
              </button>
              <b aria-hidden="true">{quantity} in bag</b>
              <button type="button" onClick={() => incrementItem(product.id)} aria-label={`Add one more ${product.name}`}>
                <Plus size={16} aria-hidden="true" />
              </button>
            </span>
          ) : (
            <button type="button" className="shop-desk-add" onClick={add} aria-label={options ? `Add ${product.name} to bag: choose options` : `Add ${product.name} to bag`}>
              {options ? 'Choose options' : 'Add to bag'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

// A product rail: one row of equal cards (five across on a wide screen) that scrolls sideways inside itself, with arrows
// in the head. An arrow is off at its end of the row, and both are hidden when the whole row fits.
function DeskRail({ eyebrow, title, titleId, onSeeAll, children, busy = false }: { eyebrow?: string; title: string; titleId?: string; onSeeAll?: () => void; children: React.ReactNode; busy?: boolean }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ prev: false, next: false });
  const childCount = React.Children.count(children);
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const update = () => {
      const prev = rail.scrollLeft > 4;
      const next = rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 4;
      setEdges((e) => (e.prev === prev && e.next === next ? e : { prev, next }));
    };
    update();
    rail.addEventListener('scroll', update, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(rail);
    return () => {
      rail.removeEventListener('scroll', update);
      ro?.disconnect();
    };
  }, [childCount]);
  const scrollRail = (dir: 1 | -1) => {
    const rail = railRef.current;
    rail?.scrollBy({ left: dir * rail.clientWidth, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };
  const overflowing = edges.prev || edges.next;
  return (
    <section className="shop-desk-section" aria-labelledby={titleId} aria-label={titleId ? undefined : title} aria-busy={busy || undefined}>
      <SectionHead
        id={titleId}
        eyebrow={eyebrow}
        title={title}
        action={
          <>
            {overflowing && (
              <>
                <button type="button" className="shop-desk-arrow" onClick={() => scrollRail(-1)} disabled={!edges.prev} aria-label={`Scroll ${title} left`}>
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
                <button type="button" className="shop-desk-arrow" onClick={() => scrollRail(1)} disabled={!edges.next} aria-label={`Scroll ${title} right`}>
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </>
            )}
            {onSeeAll && <SeeAll onClick={onSeeAll} name={title} />}
          </>
        }
      />
      <div ref={railRef} className="shop-desk-rail">
        {children}
      </div>
    </section>
  );
}

function DeskProductRail({ eyebrow, title, products }: { eyebrow?: string; title: string; products: SkincareProduct[] }) {
  const navigate = useHomeNavigate();
  return (
    <DeskRail eyebrow={eyebrow} title={title} onSeeAll={() => navigate('shop-browse')}>
      {products.map((product) => (
        <div key={product.id} className="shop-desk-rail-item">
          <DeskProductCard product={product} />
        </div>
      ))}
    </DeskRail>
  );
}

function DeskSkeletonRail({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <section className="shop-desk-section" aria-busy="true" aria-label={title}>
      <SectionHead eyebrow={eyebrow} title={title} />
      <div className="shop-desk-rail" aria-hidden="true">
        {skeletonCards(5)}
      </div>
      <span className="shop-desk-sr">Loading products</span>
    </section>
  );
}

function DeskReorderRail({ catalog }: { catalog: SkincareProduct[] }) {
  const products = useReorderProducts(catalog);
  if (products.length === 0) return null;
  return <DeskProductRail eyebrow="Your favourites" title="Buy it again" products={products} />;
}

// The columns the deals card takes beside n deal cards: the row is five cards wide (four on smaller desktops). When the
// cards fill the row, the deals card takes a row of its own above them.
const panelSpan = (cols: number, n: number) => (n < cols ? cols - n : cols);
const dealGridStyle = (n: number) => ({ '--deal-span-5': panelSpan(5, n), '--deal-span-4': panelSpan(4, n) }) as React.CSSProperties;
// The deals grid's class: is-fills-4 when the cards alone fill a four-wide row (the deals card then lies flat above them).
const dealGridClass = (n: number) => `shop-desk-deals${n >= 4 ? ' is-fills-4' : ''}`;

function DealsPanel({ best, picked, onViewAll }: { best: number; picked: boolean; onViewAll: () => void }) {
  return (
    <div className="shop-desk-deals-panel">
      <span className="shop-desk-deals-kicker">
        <Sparkles size={14} aria-hidden="true" />
        {picked ? 'Picked by GlowVAI' : "Today's deals"}
      </span>
      <strong className="shop-desk-display">{best > 0 ? `Up to ${best}% off` : 'Handpicked offers'}</strong>
      <p>{picked ? 'Offers our team chose for you.' : 'Products priced below their listed MRP.'}</p>
      <button type="button" className="shop-desk-btn-outline" onClick={onViewAll}>
        View all deals
        <ArrowRight size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

// The category tab row. The brand underline glides to the tab under the pointer (or keyboard focus) and back to the
// current tab when the pointer leaves the row.
function CategoryTabs({ onOpenCategory, onShopAll }: { onOpenCategory: (categoryId: string) => void; onShopAll: () => void }) {
  const navRef = useRef<HTMLElement>(null);
  const [ink, setInk] = useState<{ x: number; w: number } | null>(null);
  const moveTo = (el: HTMLElement | null) => {
    if (el) setInk({ x: el.offsetLeft, w: el.offsetWidth });
  };
  const reset = () => moveTo(navRef.current?.querySelector<HTMLElement>('[aria-current="page"]') ?? null);
  useEffect(() => {
    reset();
    // The labels change width once the web font arrives, and the row can change with the window.
    let alive = true;
    document.fonts?.ready.then(() => alive && reset()).catch(() => undefined);
    window.addEventListener('resize', reset);
    return () => {
      alive = false;
      window.removeEventListener('resize', reset);
    };
  }, []);
  const hover = (e: React.SyntheticEvent<HTMLElement>) => moveTo(e.currentTarget);
  return (
    <nav
      ref={navRef}
      className="shop-desk-tabs"
      aria-label="Categories"
      onMouseLeave={reset}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) reset();
      }}
    >
      <button type="button" className="shop-desk-tab" aria-current="page" onMouseEnter={hover} onFocus={hover}>
        <Boxes size={18} aria-hidden="true" />
        <span>All</span>
      </button>
      {HOME_CATEGORY_TILES.map(({ id: categoryId, label }) => {
        const Icon = CATEGORY_ICON[categoryId] ?? Sparkles;
        return (
          <button key={categoryId} type="button" className="shop-desk-tab" onClick={() => onOpenCategory(categoryId)} onMouseEnter={hover} onFocus={hover}>
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
          </button>
        );
      })}
      <button type="button" className="shop-desk-tab" onClick={onShopAll} onMouseEnter={hover} onFocus={hover}>
        <Sparkles size={18} aria-hidden="true" />
        <span>Shop all</span>
      </button>
      <span className="shop-desk-tab-ink" aria-hidden="true" style={ink ? { width: ink.w, transform: `translateX(${ink.x}px)` } : { opacity: 0 }} />
    </nav>
  );
}

// A category tile: the category's product photo on a soft warm square, the name and the real product count below. A
// category without a photo shows its icon in the category's colour.
function DeskCategoryTile({ tile, onOpen, count, isAll = false }: { tile: HomeCategoryTile | null; onOpen: () => void; count: string | null; isAll?: boolean }) {
  const label = isAll ? 'All Products' : tile?.label ?? '';
  const accent = (tile && CATEGORY_ACCENT[tile.id]) || '#0057fb';
  const photo = tile?.sample ? getProductThumbUrl(tile.sample, 400) : null;
  const Icon = isAll ? Boxes : (tile && CATEGORY_ICON[tile.id]) || Sparkles;
  return (
    <button type="button" className="shop-desk-cat" onClick={onOpen} aria-label={count ? `${label}, ${count}` : label}>
      <span className="shop-desk-cat-media" style={{ color: accent }}>
        {photo ? <img src={photo} alt="" width={400} height={300} loading="lazy" decoding="async" /> : <Icon size={32} aria-hidden="true" />}
      </span>
      <span className="shop-desk-cat-copy">
        <strong>{label}</strong>
        {count === null ? <span className="shop-desk-cat-count is-placeholder shop-desk-shimmer" aria-hidden="true" /> : count && <small className="shop-desk-cat-count">{count}</small>}
      </span>
    </button>
  );
}

function DeskAdminCategoryTile({ item, onOpen }: { item: BlockItem; onOpen: () => void }) {
  return (
    <button type="button" className="shop-desk-cat" onClick={onOpen} aria-label={item.sub ? `${item.label}, ${item.sub}` : item.label}>
      <span className="shop-desk-cat-media">
        {item.image ? <img src={item.image} alt="" width={400} height={300} loading="lazy" decoding="async" /> : <Sparkles size={32} aria-hidden="true" />}
      </span>
      <span className="shop-desk-cat-copy">
        <strong>{item.label}</strong>
        {item.sub && <small className="shop-desk-cat-count">{item.sub}</small>}
      </span>
    </button>
  );
}

function DeskAdminPromo({ item, onOpen }: { item: BlockItem; onOpen: () => void }) {
  return (
    <button type="button" className={`shop-desk-promo${item.image ? ' has-picture' : ' is-sand'}`} onClick={onOpen}>
      {item.image && <img className="shop-desk-promo-image" src={item.image} alt="" width={600} height={300} loading="lazy" decoding="async" />}
      {item.image && <span className="shop-desk-promo-shade" aria-hidden="true" />}
      {!item.image && (
        <span className="shop-desk-promo-icon" aria-hidden="true">
          <Sparkles size={20} />
        </span>
      )}
      <span className="shop-desk-promo-copy">
        <span className="shop-desk-promo-title">{item.label}</span>
        {item.sub && <span className="shop-desk-promo-sub">{item.sub}</span>}
      </span>
      <span className="shop-desk-promo-go" aria-hidden="true">
        <ArrowRight size={18} />
      </span>
    </button>
  );
}

function Notice({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="shop-desk-notice" role="status">
      <strong>{title}</strong>
      <p>{children}</p>
      {action}
    </div>
  );
}

export const ShopDesktopHome: React.FC = () => {
  const layout = useHomeLayout('desktop');
  const { order: layoutOrder, settings: blockSettings, hero: heroOverride, footer: footerDetails } = layout;
  const { catalog, feed, loading, failed, noProducts, tiles, recentIds, skinState, rails, configuredRows, adminDeals, dealProducts } = useHomeData(layout);
  const adminCategories = blockSettings['categories']?.items ?? [];
  const adminPromos = blockSettings['promos']?.items ?? [];

  const navigate = useHomeNavigate();
  const { setShoppingPreference, shoppingPreference, currentAddress, accountSignedIn, requireSignIn } = useApp();
  const cart = useShellCart();
  const unread = useInbox((s) => s.unreadCount);
  const mode: Mode = shoppingPreference === 'men' ? 'men' : 'women';

  const topRef = useRef<HTMLSpanElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const scrolled = useScrolledPast(topRef);
  useRevealOnScroll(mainRef);

  // Location and delivery time come from the selected delivery address, so the ETA always matches the place shown.
  const userLocation = [currentAddress?.area, currentAddress?.city].filter(Boolean).join(', ') || 'Set delivery location';
  const deliveryEta = currentAddress?.serviceable && currentAddress.deliveryMinutes > 0 ? currentAddress.deliveryMinutes : null;

  const socials = configuredSocials(mergeFooterSocials(siteConfig.socials, footerDetails));
  const storeLinks = [
    { label: 'App Store', url: footerDetails.appStoreUrl },
    { label: 'Google Play', url: footerDetails.playStoreUrl },
  ].filter((s) => s.url !== '');

  const openLink = (link: string) => (link ? window.location.assign(link) : navigate('shop-browse'));

  const categoryCount = adminCategories.length > 0 ? adminCategories.length : HOME_CATEGORY_TILES.length + 1;
  const promoCount = adminPromos.length > 0 ? adminPromos.length : 2;
  const bestDeal = dealProducts.reduce((best, p) => Math.max(best, getDiscountPercent(p)), 0);

  const renderBlock = (id: HomeBlockId): React.ReactNode => {
    switch (id) {
      case 'hero':
        return (
          <>
            <section className="shop-desk-hero" aria-labelledby="shop-desk-hero-title">
              <span className="shop-desk-hero-shapes" aria-hidden="true" />
              <div className="shop-desk-hero-copy">
                <p className="shop-desk-hero-tag">Discover. Shop. Glow.</p>
                <h1 id="shop-desk-hero-title">
                  {heroOverride?.title || (
                    <>
                      Glow <em>your way.</em>
                    </>
                  )}
                </h1>
                <p className="shop-desk-hero-sub">{heroOverride?.subtitle || (deliveryEta ? `Skincare delivered in ${deliveryEta} mins.` : 'Skincare, delivered to your door.')}</p>
                <div className="shop-desk-hero-actions">
                  <button type="button" className="shop-desk-btn-light" onClick={() => (heroOverride?.ctaLink ? window.location.assign(heroOverride.ctaLink) : navigate('shop-browse'))}>
                    {heroOverride?.ctaLabel || 'Shop now'}
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                  <button type="button" className="shop-desk-btn-ghost" onClick={() => navigate('scan-camera')}>
                    <ScanFace size={16} aria-hidden="true" />
                    Skin scan
                  </button>
                </div>
              </div>
              <div className="shop-desk-hero-media">
                <img src={heroOverride?.image || HERO_IMAGE} alt={heroOverride?.image && heroOverride.title ? heroOverride.title : 'GlowVAI skincare campaign'} width={1891} height={831} fetchPriority="high" decoding="async" />
              </div>
            </section>
            <div className="shop-desk-banners">
              <HomeBanners />
            </div>
          </>
        );
      case 'mini-banners':
        return <MiniBannersPlaceholder settings={blockSettings['mini-banners']} />;
      case 'offers':
        return <OffersStripPlaceholder settings={blockSettings['offers']} />;
      case 'categories':
        return (
          <section className="shop-desk-section" aria-labelledby="shop-desk-categories-title">
            <SectionHead id="shop-desk-categories-title" eyebrow="Shop by category" title="Everything for your routine" action={<SeeAll onClick={() => navigate('shop-browse')} name="categories" />} />
            <div className="shop-desk-cats" aria-busy={loading} style={{ '--cat-cols': balancedColumns(categoryCount, CATEGORY_ROW_MAX) } as React.CSSProperties}>
              {adminCategories.length > 0 ? (
                adminCategories.map((item, i) => <DeskAdminCategoryTile key={`${i}-${item.label}`} item={item} onOpen={() => openLink(item.link)} />)
              ) : (
                <>
                  {HOME_CATEGORY_TILES.map(({ id: categoryId }) => {
                    const tile = tiles.find((t) => t.id === categoryId) ?? null;
                    return <DeskCategoryTile key={categoryId} tile={tile} count={countLabel(loading, failed, tile?.count ?? 0)} onOpen={() => navigate('shop-category', { categoryId })} />;
                  })}
                  <DeskCategoryTile tile={null} isAll count={countLabel(loading, failed, catalog.length)} onOpen={() => navigate('shop-browse')} />
                </>
              )}
            </div>
          </section>
        );
      case 'promos':
        return (
          <section className="shop-desk-promos" aria-label="Offers" style={{ '--promo-cols': balancedColumns(promoCount, PROMO_ROW_MAX) } as React.CSSProperties}>
            {adminPromos.length > 0 ? (
              adminPromos.map((item, i) => <DeskAdminPromo key={`${i}-${item.label}`} item={item} onOpen={() => openLink(item.link)} />)
            ) : (
              <>
                <button type="button" className="shop-desk-promo is-sand" onClick={() => navigate('shop-browse')}>
                  <span className="shop-desk-promo-icon" aria-hidden="true">
                    <Truck size={20} />
                  </span>
                  <span className="shop-desk-promo-copy">
                    <span className="shop-desk-promo-kicker">Delivery</span>
                    <span className="shop-desk-promo-title">Free delivery above ₹{FREE_DELIVERY_ABOVE}</span>
                    <span className="shop-desk-promo-sub">Applied automatically at checkout.</span>
                  </span>
                  <span className="shop-desk-promo-go" aria-hidden="true">
                    <ArrowRight size={18} />
                  </span>
                </button>
                <button type="button" className="shop-desk-promo is-blush" onClick={() => navigate('cart-tab')}>
                  <span className="shop-desk-promo-icon" aria-hidden="true">
                    <Ticket size={20} />
                  </span>
                  <span className="shop-desk-promo-copy">
                    <span className="shop-desk-promo-kicker">Coupon</span>
                    <span className="shop-desk-promo-title">Flat ₹{COUPON_VALUES.GLOW50} off</span>
                    <span className="shop-desk-promo-sub">
                      Enter code <b className="shop-desk-code">GLOW50</b> in your cart.
                    </span>
                  </span>
                  <span className="shop-desk-promo-go" aria-hidden="true">
                    <ArrowRight size={18} />
                  </span>
                </button>
              </>
            )}
          </section>
        );
      case 'deals':
        return (
          <>
            {!failed &&
              (!loading && dealProducts.length > DEAL_GRID_MAX ? (
                <DeskRail eyebrow="Today's offers" title="Deals" titleId="shop-desk-deals-title" onSeeAll={() => navigate('shop-browse')}>
                  {dealProducts.map((product) => (
                    <div key={product.id} className="shop-desk-rail-item">
                      <DeskProductCard product={product} />
                    </div>
                  ))}
                </DeskRail>
              ) : (
                <section className="shop-desk-section" aria-labelledby="shop-desk-deals-title">
                  <SectionHead id="shop-desk-deals-title" eyebrow="Today's offers" title="Deals" action={<SeeAll label="View all" onClick={() => navigate('shop-browse')} name="deals" />} />
                  {loading ? (
                    <div className={dealGridClass(DEAL_GRID_MAX)} style={dealGridStyle(DEAL_GRID_MAX)} aria-busy="true" aria-hidden="true">
                      <span className="shop-desk-deals-panel is-skeleton shop-desk-shimmer" />
                      {skeletonCards(DEAL_GRID_MAX)}
                    </div>
                  ) : dealProducts.length > 0 ? (
                    <div className={dealGridClass(dealProducts.length)} style={dealGridStyle(dealProducts.length)}>
                      <DealsPanel best={bestDeal} picked={adminDeals.length > 0} onViewAll={() => navigate('shop-browse')} />
                      {dealProducts.map((product) => (
                        <DeskProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  ) : (
                    <p className="shop-desk-empty">No discounted products right now.</p>
                  )}
                </section>
              ))}
            <FlashSaleStrip />
            <FlashDealsPlaceholder />
          </>
        );
      case 'reorder':
        return <DeskReorderRail catalog={catalog} />;
      case 'product-rails':
        return (
          <>
            {failed ? (
              <Notice
                title="Products could not be loaded"
                action={
                  <button type="button" className="shop-desk-retry" onClick={() => feed.retry()}>
                    Try again
                  </button>
                }
              >
                Check your connection and try again. Categories and offers above still work.
              </Notice>
            ) : noProducts ? (
              <Notice title="No products are listed yet">Check back soon, or browse the full catalogue.</Notice>
            ) : (
              <>
                {loading && skinState.recommendationsOn && <DeskSkeletonRail eyebrow={railEyebrow('picks')} title="Picked for your skin" />}
                {loading && recentIds.length > 0 && <DeskSkeletonRail eyebrow={railEyebrow('continue')} title="Continue browsing" />}
                {(configuredRows.length > 0 ? configuredRows : rails).map((rail) => (
                  <DeskProductRail key={rail.id} eyebrow={railEyebrow(rail.id)} title={rail.title} products={rail.products} />
                ))}
                {loading && <DeskSkeletonRail eyebrow={railEyebrow('top')} title="Top Rated" />}
                {loading && <DeskSkeletonRail eyebrow={railEyebrow('under500')} title="Under ₹500" />}
              </>
            )}
            <section className="shop-desk-section" aria-labelledby="shop-desk-concerns-title">
              <SectionHead id="shop-desk-concerns-title" eyebrow="Shop by concern" title="What does your skin need?" action={<SeeAll onClick={() => navigate('shop-browse')} name="concerns" />} />
              <div className="shop-desk-concerns">
                {CONCERNS.map(({ id: concernId, label, Icon }) => (
                  <button key={concernId} type="button" className="shop-desk-concern" onClick={() => navigate('shop-browse', { concern: concernId })}>
                    <span className="shop-desk-concern-icon" aria-hidden="true">
                      <Icon size={16} />
                    </span>
                    <span>{label}</span>
                    <ArrowRight size={14} aria-hidden="true" className="shop-desk-concern-go" />
                  </button>
                ))}
              </div>
            </section>
          </>
        );
      case 'brands':
        return <BrandStripPlaceholder settings={blockSettings['brands']} />;
      case 'trust':
        return <TrustBlockPlaceholder settings={blockSettings['trust']} />;
      case 'help-gift':
        return <HelpGiftPlaceholder settings={blockSettings['help-gift']} />;
      case 'footer':
        return (
          <footer className="shop-desk-footer" aria-label="Site footer">
            <div className="shop-desk-footer-inner">
              <div className="shop-desk-footer-brand">
                <span className="shop-desk-footer-logo">
                  <img src="/logo/glowvai-logo.svg" alt="" width={32} height={32} />
                  <strong>GlowVai</strong>
                </span>
                <p>Skincare, delivered.</p>
                {storeLinks.length > 0 && (
                  <ul className="shop-desk-footer-pills is-store" aria-label="Get the app">
                    {storeLinks.map((s) => (
                      <li key={s.label}>
                        <a href={s.url} target="_blank" rel="noopener noreferrer">
                          {s.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                {socials.length > 0 && (
                  <ul className="shop-desk-footer-pills" aria-label="Social media">
                    {socials.map((s) => (
                      <li key={s.label}>
                        <a href={s.url} target="_blank" rel="noopener noreferrer">
                          {s.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <nav className="shop-desk-footer-cols" aria-label="Footer links">
                {HOME_FOOTER_GROUPS.map((group) => (
                  <section key={group.title} className="shop-desk-footer-col">
                    <h3>{group.title}</h3>
                    <ul>
                      {group.links.map((link) => (
                        <li key={link.label}>
                          {'href' in link ? (
                            <a href={link.href}>{link.label}</a>
                          ) : (
                            <button type="button" onClick={() => navigate(link.screen, link.params)}>
                              {link.label}
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </nav>
            </div>
            <div className="shop-desk-footer-bottom">
              <span>© 2026 GlowVai</span>
              {footerDetails.companyLine !== '' && <p>{footerDetails.companyLine}</p>}
            </div>
          </footer>
        );
      default:
        return null;
    }
  };

  const pinnedTail = (
    <>
      <section className="shop-desk-scan" aria-labelledby="shop-desk-scan-title">
        <span className="shop-desk-scan-shapes" aria-hidden="true" />
        <div className="shop-desk-scan-copy">
          <span className="shop-desk-scan-tag">
            <ScanFace size={14} aria-hidden="true" />
            FACE SCAN
          </span>
          <h2 id="shop-desk-scan-title">
            Find the routine that <span>fits your skin</span>
          </h2>
          <p className="shop-desk-scan-body">Take or upload one clear photo in even light. The check suggests a skin type and up to five visible concerns, then matches products to them.</p>
          <p className="shop-desk-scan-note">This is a cosmetic check. It is not a medical diagnosis or a clinical test.</p>
        </div>
        <div className="shop-desk-scan-side">
          <p className="shop-desk-scan-privacy">
            <ShieldCheck size={16} aria-hidden="true" />
            <span>{SCAN_PRIVACY}</span>
          </p>
          <button type="button" className="shop-desk-scan-btn" onClick={() => navigate('scan-camera')}>
            Start skin check
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </section>
      <section className="shop-desk-end" aria-labelledby="shop-desk-end-title">
        <span className="shop-desk-end-icon" aria-hidden="true">
          <Sparkles size={22} />
        </span>
        <h2 id="shop-desk-end-title">You've seen it all!</h2>
        <p>Browse the full catalogue</p>
        <button type="button" className="shop-desk-end-btn" onClick={() => navigate('shop-browse')}>
          Explore full catalogue
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </section>
    </>
  );

  return (
    <LucideProvider strokeWidth={1.75}>
      <div className={`shop-screen shop-desk zq-mode-${mode} ${displayFont.variable}`}>
        <span ref={topRef} className="shop-desk-top" aria-hidden="true" />
        <header className={`shop-desk-header${scrolled ? ' is-scrolled' : ''}`}>
          <div className="shop-desk-header-inner">
            <button type="button" className="shop-desk-logo" onClick={() => window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })} aria-label="glowvai shop home">
              <img src="/logo/glowvai-logo.svg" alt="" width={32} height={32} />
              <span>glowvai</span>
            </button>
            <button type="button" className="shop-desk-delivery" onClick={() => navigate('location-setup')} aria-label={`Delivery location: ${userLocation}. Change`}>
              <strong>{deliveryEta ? `Delivery in ${deliveryEta} minutes` : 'Delivery in minutes'}</strong>
              <span>
                <MapPin size={14} aria-hidden="true" />
                <span className="shop-desk-delivery-place">{userLocation}</span>
                <ChevronDown size={14} aria-hidden="true" />
              </span>
            </button>
            <div className="shop-desk-search">
              <button type="button" className="shop-desk-search-input" onClick={() => navigate('shop-search-filters')} aria-label="Search products">
                <Search size={18} aria-hidden="true" />
                <SearchHint />
              </button>
              <VoiceSearchButton onResult={(text) => navigate('shop-search-filters', { q: text })} />
            </div>
            <nav className="shop-desk-actions" aria-label="Account and cart">
              <button type="button" className="shop-desk-action is-optional" onClick={() => navigate('scan-camera')}>
                <ScanFace size={20} aria-hidden="true" />
                <span>Skin scan</span>
              </button>
              <button type="button" className="shop-desk-action is-optional" onClick={() => navigate('orders-list')}>
                <Package size={20} aria-hidden="true" />
                <span>Orders</span>
              </button>
              <button type="button" className="shop-desk-action is-icon" onClick={() => navigate('notifications-list')} aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'} title="Notifications">
                <Bell size={20} aria-hidden="true" />
                {unread > 0 && <b className="shop-desk-badge" aria-hidden="true">{unread > 99 ? '99+' : unread}</b>}
              </button>
              <button type="button" className="shop-desk-action" onClick={() => (accountSignedIn ? navigate('profile-tab') : requireSignIn())}>
                <User size={20} aria-hidden="true" />
                <span>{accountSignedIn ? 'Account' : 'Login'}</span>
              </button>
              <button
                type="button"
                className="shop-desk-cart"
                onClick={() => navigate('cart-tab')}
                aria-label={cart.count > 0 ? `Cart, ${itemsLabel(cart.count)}, ${cart.totalLabel}` : 'Cart, empty'}
              >
                <ShoppingCart size={20} aria-hidden="true" />
                {cart.count > 0 ? (
                  <span className="shop-desk-cart-copy">
                    <b>{itemsLabel(cart.count)}</b>
                    <small>{cart.totalLabel}</small>
                  </span>
                ) : (
                  <span>My Cart</span>
                )}
              </button>
            </nav>
          </div>
          <div className="shop-desk-tabs-row">
            <CategoryTabs onOpenCategory={(categoryId) => navigate('shop-category', { categoryId })} onShopAll={() => navigate('shop-browse')} />
            <div className="zq-mode-toggle shop-desk-mode" data-mode={mode} role="group" aria-label="Shopping mode">
              <span className="zq-mode-thumb" aria-hidden="true" />
              <button type="button" aria-pressed={mode === 'women'} onClick={() => setShoppingPreference('women')}>
                <Venus size={16} aria-hidden="true" />
                <span>For Her</span>
              </button>
              <button type="button" aria-pressed={mode === 'men'} onClick={() => setShoppingPreference('men')}>
                <Mars size={16} aria-hidden="true" />
                <span>For Him</span>
              </button>
            </div>
          </div>
        </header>

        <div ref={mainRef} className="shop-desk-main">
          {layout.preview && (
            <p className="shop-desk-preview" role="status">
              {layout.fallback
                ? 'Staff preview: no desktop layout is saved yet, so the PC page shows the mobile layout draft.'
                : 'Staff preview: the desktop layout. Draft changes are not live for customers yet.'}
            </p>
          )}
          <SkinQuizBanner />
          {layoutOrder.filter((id) => id !== 'footer').map((id) => (
            <React.Fragment key={id}>{renderBlock(id)}</React.Fragment>
          ))}
          {pinnedTail}
        </div>
        {renderBlock('footer')}
      </div>
    </LucideProvider>
  );
};

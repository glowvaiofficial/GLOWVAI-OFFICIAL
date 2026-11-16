import { isPosterOnlyHero } from '../lib/heroPoster';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ArrowUp, BadgePercent, Bell, Boxes, ChevronDown, ChevronLeft, ChevronRight, Clock, Crown, Droplets, FlaskConical, Gem, Heart, LucideProvider, MapPin, Minus, Package, PackagePlus, Pipette, Plus, ScanFace, Search, ShieldCheck, ShoppingCart, Sparkles, Star, Sun, Tag, Ticket, Truck, User, Waves, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import type { SkincareProduct } from '../../../core/data/indianSkincareCatalog';
import { useCartStore } from '../../../core/state/cartStore';
import { useCustomerStore } from '../../../core/state/customerStore';
import { useInbox } from '../../../core/notifications/inboxStore';
import { siteConfig } from '../../../../config/site';
import { coolAccent, coolSectionAccent } from '../../../../lib/shop/accents';
import { fromPrice } from '../../../../lib/shop/variants';
import { COUPON_VALUES, FREE_DELIVERY_ABOVE } from '../../../shared/pricing-rules.mjs';
import { itemsLabel, useShellCart } from '../../../components/common/useShellCart';
import { isActiveOrder } from '../../orders/orderUtils';
import { BrandLogo } from '../../../shared/BrandLogo';
import { SkinQuizBanner } from '../shared/SkinQuizBanner';
import { SearchHint } from '../shared/SearchHint';
import { VoiceSearchButton } from '../shared/VoiceSearchButton';
import { MiniBannersPlaceholder, OffersStripPlaceholder, FlashDealsPlaceholder, BrandStripPlaceholder, TrustBlockPlaceholder, HelpGiftPlaceholder } from '../shared/HomePlaceholders';
import { ITEM_BLOCK_IDS, useHomeLayout, type BlockItem, type BlockSettings, type HomeBlockId, type ItemBlockId } from '../lib/useHomeLayout';
import { DeliveryModeSwitch, NewItemBlock } from '../shared/NewBlocks';
import { skinMatchedPicks } from '../lib/firstVisit';
import { useHomeData } from '../lib/useHomeData';
import { balancedColumns } from '../lib/homeDevice';
import { accentVars, blockAccent, isAccent, itemAccent, type AccentName } from '../lib/desktopAccents';
import { CONCERNS, HERO_IMAGE, SCAN_PRIVACY, countLabel, useHomeNavigate, useReorderProducts } from '../lib/homeCommon';
import { HOME_CATEGORY_TILES, HOME_FOOTER_GROUPS, clampMaxItems, configuredSocials, homeSequence, mergeFooterSocials, recommendedProducts, type HomeModuleId, type PricePointTile } from '../lib/homeModel';
import type { HomeCategoryTile } from '../lib/homeModel';
import { formatRupee, getDiscountPercent, getProductImageUrl, getProductThumbUrl, hasProductPhoto, BRAND_MARK_URL } from '../shared/shopUtils';
import { DesignerStyleProvider, StyledBlock } from '../shared/DesignerStyle';
import { HeroExtras, HeroVideo, useHeroDesign } from '../shared/DesignerBanner';
import { useDesignerCard } from '../shared/designerCard';
import '../styles/shop-desktop-home.css';
import '../styles/v2-home-pc.css';
import '../styles/shop-type.css';
import '../styles/v3-glass-pc.css';

// The desktop home (screens 1024px wide and more, or ?device=desktop): the PC version of the GlowVai home design. It
// renders the desktop layout the GlowVai team designed in the admin (device=desktop; the mobile layout when none is
// saved), in the admin's order, with the same blocks as the mobile home:
//   header (logo, location, wide search, bell, account, cart) and the category tabs (the selected tab tints the header
//   band in its accent and shows that category's products first), a greeting strip (name, delivery time, Track Order),
//   the hero carousel (the admin's hero and banners, crossfading), the category tiles, offer cards, Flash Deals (a live flash
//   sale with its countdown, otherwise the catalogue's deals), price-point tiles, Bestsellers and New launches, the admin's
//   rows, Shop by concern, brands, Trending Now tiles, Buy it again and Recently viewed, the membership banner and cards,
//   the trust strip, the skin scan card and the footer. The order is the phone home's (homeSequence in homeModel.ts).
// Every picture, text and colour of the admin blocks comes from the admin; an empty block shows the shared placeholder
// in a staff preview and nothing for customers. Each section and item has an accent (desktopAccents.ts). Motion is CSS
// only and short, and stops for people who ask for less motion.

const CATEGORY_ICON: Record<string, LucideIcon> = {
  Serums: Pipette,
  Moisturizers: Droplets,
  Suncare: Sun,
  Cleansers: Waves,
  Treatments: FlaskConical,
};

// Each section's accent when the admin sets none. Fixed per section, so a section keeps its colour wherever it moves.
// ONE colour at rest (design spec 2b): every section is brand blue unless the admin sets an accent on it; the bright category
// accents appear only in the selected header tab's wash.
const BRAND = '#0057FB';
const restAccent = (accent: unknown, index = -1): string => (isAccent(accent) ? accent : index < 0 ? BRAND : coolAccent(index));
const SECTION_ACCENT: Record<HomeBlockId | 'concerns' | 'scan' | 'for-you', AccentName> = {
  hero: 'sky',
  'mini-banners': 'teal',
  offers: 'berry',
  categories: 'amethyst',
  promos: 'berry',
  deals: 'rose',
  reorder: 'lime',
  'product-rails': 'sky',
  brands: 'indigo',
  trust: 'indigo',
  'help-gift': 'indigo',
  footer: 'ink',
  'festival-strip': 'indigo',
  'bank-offers': 'indigo',
  cashback: 'indigo',
  partners: 'indigo',
  stories: 'indigo',
  sponsored: 'indigo',
  'recently-viewed': 'indigo',
  recommended: 'indigo',
  concerns: 'rose',
  scan: 'sky',
  'for-you': 'sky',
};

// Most tiles a category row holds, most offer cards a row holds, and how many product cards a row shows.
const CATEGORY_ROW_MAX = 10;
const PROMO_ROW_MAX = 4;
const CARD_ROW = 7;
const SLIDE_MS = 6000;

type TabId = 'for-you' | string;

// The CSS variables (--acc, --acc-ink, --acc-soft, ...) an element sets so its styles follow an accent.
const accentStyle = (hex: string, extra?: React.CSSProperties) => ({ ...accentVars(hex), ...extra }) as React.CSSProperties;

const prefersReducedMotion = (): boolean => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

const isInternal = (link: string) => link.startsWith('/') && !link.startsWith('//');

const readPreviewToken = (): string | null => {
  try {
    return new URLSearchParams(window.location.search).get('preview');
  } catch {
    return null;
  }
};

const clock = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

// A title with its offer figure ("60% OFF", "₹250") set in the accent, like the design's hero.
function highlightOffer(title: string): React.ReactNode {
  const parts = title.split(/(\d+\s?%(?:\s?off)?|₹\s?[\d,]+)/i);
  if (parts.length === 1) return title;
  return parts.map((part, i) => (i % 2 === 1 ? <span key={i} className="shop-desk-hl">{part}</span> : <React.Fragment key={i}>{part}</React.Fragment>));
}

// ---------------------------------------------------------------- Hooks

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

// Sections below the fold fade and slide in once, the first time they scroll into view; their cards follow one after
// another (CSS). Sections already on screen are left as they are (no flash on load), sections added later (when the
// catalogue arrives) are picked up too, and nothing is hidden without IntersectionObserver or with reduced motion.
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
    // Nothing is hidden until the visitor actually scrolls: a page that is captured or read without scrolling (full-page
    // screenshot, print, link preview, an inner scroll box) must show every section, never an empty gap.
    let armed = false;
    const track = () => {
      if (!armed) return;
      for (const child of Array.from(root.children)) {
        if (seen.has(child) || !(child instanceof HTMLElement)) continue;
        seen.add(child);
        if (child.getBoundingClientRect().top < window.innerHeight) continue;
        child.dataset.deskReveal = 'wait';
        io.observe(child);
      }
    };
    const arm = () => {
      if (armed) return;
      armed = true;
      cleanupInput();
      track();
    };
    const inputs = ['wheel', 'touchmove', 'keydown', 'scroll'] as const;
    const cleanupInput = () => inputs.forEach((t) => window.removeEventListener(t, arm, true));
    inputs.forEach((t) => window.addEventListener(t, arm, { capture: true, passive: true }));
    const showAll = () => {
      io.disconnect();
      root.querySelectorAll<HTMLElement>(':scope > [data-desk-reveal="wait"]').forEach((el) => { el.dataset.deskReveal = 'in'; });
    };
    window.addEventListener('beforeprint', showAll);
    const mo = new MutationObserver(track);
    mo.observe(root, { childList: true });
    return () => {
      cleanupInput();
      window.removeEventListener('beforeprint', showAll);
      io.disconnect();
      mo.disconnect();
    };
  }, [rootRef]);
}

// The banners the GlowVai team publishes (siteContent/home, the same list the phone home shows), read once. A staff
// preview link (?preview=...) reads the draft, and says so.
type HomeBanner = { id: string; kind: string; title: string; subtitle: string; ctaLabel: string; link: string; image: string; background: string; textColor: string; accent?: unknown };
function useHomeBanners(): { banners: HomeBanner[]; previewing: boolean } {
  const [state, setState] = useState<{ banners: HomeBanner[]; previewing: boolean }>({ banners: [], previewing: false });
  useEffect(() => {
    let alive = true;
    const token = readPreviewToken();
    const url = token ? `/api/shop/home?preview=${encodeURIComponent(token)}` : '/api/shop/home';
    fetch(url, { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive || !data || !Array.isArray(data.sections)) return;
        setState({ banners: data.sections as HomeBanner[], previewing: Boolean(token && data.preview) });
      })
      .catch(() => {
        // No banners is a normal state: the hero shows on its own.
      });
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

// The flash sale running now (the one ending soonest), read once. The countdown ticks locally each second while a sale
// is live; nothing is fetched again.
type FlashSaleView = { id: string; name: string; endsAt: number; discountPercent: number; remaining: number | null; items: { productId: string; name: string; price: number; salePrice: number }[] };
function useLiveFlashSale(): { sale: FlashSaleView | null; left: number } {
  const [sales, setSales] = useState<FlashSaleView[]>([]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let alive = true;
    fetch('/api/shop/flash-sales', { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d && Array.isArray(d.sales)) setSales(d.sales as FlashSaleView[]);
      })
      .catch(() => {
        // No sale shown when the list cannot be loaded.
      });
    return () => {
      alive = false;
    };
  }, []);
  const live = sales.filter((s) => s.endsAt > now).sort((a, b) => a.endsAt - b.endsAt);
  const sale = live[0] ?? null;
  const saleId = sale?.id ?? null;
  useEffect(() => {
    if (!saleId) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [saleId]);
  return { sale, left: sale ? sale.endsAt - now : 0 };
}

// The signed-in customer's first name and active order, read once from the account (profile and orders) when the page
// opens. Nothing is polled.
function useGreeting(signedIn: boolean): { firstName: string; activeOrderId: string | null } {
  const profile = useCustomerStore((s) => s.profile);
  const orders = useCustomerStore((s) => s.orders);
  useEffect(() => {
    if (!signedIn) return;
    const store = useCustomerStore.getState();
    if (store.profileStatus === 'idle') void store.loadProfile();
    if (store.ordersStatus === 'idle') void store.loadOrders();
  }, [signedIn]);
  const firstName = signedIn ? ((profile?.name ?? '').trim().split(/\s+/)[0] ?? '') : '';
  const active = signedIn ? orders.find(isActiveOrder) : undefined;
  return { firstName, activeOrderId: active?.orderId ?? null };
}

// ---------------------------------------------------------------- Small parts

// Loading placeholders with the same boxes as the real product card, so nothing moves when the products arrive.
function skeletonCards(count: number) {
  return Array.from({ length: count }, (_, i) => (
    <span key={i} className="shop-desk-skel-card">
      <span className="shop-desk-skel-media shop-desk-shimmer" />
      <span className="shop-desk-skel-body">
        <span className="shop-desk-skel-line is-price shop-desk-shimmer" />
        <span className="shop-desk-skel-line shop-desk-shimmer" />
        <span className="shop-desk-skel-line is-short shop-desk-shimmer" />
        <span className="shop-desk-skel-foot">
          <span className="shop-desk-skel-line is-tiny shop-desk-shimmer" />
          <span className="shop-desk-skel-btn shop-desk-shimmer" />
        </span>
      </span>
    </span>
  ));
}

// Every section head: an accent icon, the title (and a short line under it), an optional pill, and "View All" on the right.
function SectionHead({ id, icon: Icon, title, sub, pill, action }: { id?: string; icon?: LucideIcon; title: string; sub?: string; pill?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="shop-desk-head">
      <div className="shop-desk-head-titles">
        <div className="shop-desk-head-line">
          {Icon && (
            <span className="shop-desk-head-icon" aria-hidden="true">
              <Icon size={18} />
            </span>
          )}
          <h2 id={id}>{title}</h2>
          {pill}
        </div>
        {sub && <p>{sub}</p>}
      </div>
      {action && <div className="shop-desk-head-actions">{action}</div>}
    </div>
  );
}

function SeeAll({ label = 'View All', onClick, name }: { label?: string; onClick: () => void; name?: string }) {
  return (
    <button type="button" className="shop-desk-see-all" onClick={onClick} aria-label={name ? `${label}: ${name}` : undefined}>
      {label}
      <ArrowRight size={16} aria-hidden="true" />
    </button>
  );
}

// A product card in the design's style: the photo on a light square with the % OFF badge and a heart, the price with the
// struck MRP, a name of at most two lines, the size, and an "Add +" pill at the bottom right (a − n + stepper once in the
// bag). Cards in a row share one height. The name is the card's link (it covers the card); the heart and Add sit above it.
// A flash sale passes its sale price and percentage; the checkout applies the same sale price.
function DeskProductCard({ product, sale }: { product: SkincareProduct; sale?: { price: number; mrp: number; percent: number } }) {
  const navigate = useHomeNavigate();
  const { wishlist, toggleWishlist } = useApp();
  const [imageFailed, setImageFailed] = useState(false);
  const quantity = useCartStore((s) => s.items[product.id]?.quantity ?? 0);
  const addItem = useCartStore((s) => s.addItem);
  const incrementItem = useCartStore((s) => s.incrementItem);
  const decrementItem = useCartStore((s) => s.decrementItem);
  const options = product.variants && product.variants.length > 0 ? product.variants : null;
  const discount = sale ? sale.percent : getDiscountPercent(product);
  const saved = wishlist.includes(product.id);
  const open = () => navigate('shop-product', { productId: product.id });
  const add = () => {
    // A product with sizes or shades is chosen on its page.
    if (options) {
      open();
      return;
    }
    addItem({ productId: product.id, name: product.name, brand: product.brand, image: getProductImageUrl(product), price: product.price, mrp: product.originalPrice });
  };
  const price = sale ? sale.price : options ? fromPrice(options).price : product.price;
  const mrp = sale ? sale.mrp : options ? 0 : product.originalPrice;
  const ds = useDesignerCard(product, { discount, hasOptions: Boolean(options), add, open, names: { add: options ? `Add ${product.name}: choose options` : `Add ${product.name} to bag` } });

  return (
    <article className={`shop-desk-card${ds.cls ? ` ${ds.cls}` : ''}`}>
      <div className="shop-desk-card-media">
        {imageFailed ? (
          <span className="shop-desk-card-fallback">{product.brand}</span>
        ) : (
          <img src={getProductThumbUrl(product)} alt="" width={400} height={400} loading="lazy" decoding="async" onError={() => setImageFailed(true)} />
        )}
        {discount > 0 && <span className="shop-desk-card-badge">{discount}% OFF</span>}
        {ds.overlay}
        <button type="button" className={`shop-desk-heart${saved ? ' is-saved' : ''}`} onClick={() => toggleWishlist(product.id)} aria-pressed={saved} aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}>
          <Heart size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="shop-desk-card-body">
        <span className="shop-desk-card-price">
          {options && !sale && <small>from</small>}
          <b>{formatRupee(price)}</b>
          {mrp > price && <s aria-label={`MRP ${formatRupee(mrp)}`}>{formatRupee(mrp)}</s>}
        </span>
        <span className="shop-desk-card-brand">{product.brand}</span>
        <button type="button" className="shop-desk-card-name" onClick={open}>
          {product.name}
        </button>
        <small className="shop-desk-card-size">{options ? `${options.length} options` : product.volume || product.brand}</small>
        {(product.rating !== null || mrp > price) && (
          <span className="shop-desk-card-meta">
            {product.rating !== null && (
              <span className="shop-desk-card-rating" aria-label={`Rated ${product.rating.toFixed(1)} out of 5`}>
                <Star size={11} aria-hidden="true" fill="currentColor" />
                {product.rating.toFixed(1)}
                {product.reviewCount ? <small>({product.reviewCount})</small> : null}
              </span>
            )}
            {mrp > price && <span className="shop-desk-card-save">Save {formatRupee(mrp - price)}</span>}
          </span>
        )}
        {ds.extra}
        <div className="shop-desk-card-foot">
          {product.deliveryMinutes ? (
            <span className="shop-desk-card-eta">
              <Clock size={12} aria-hidden="true" />
              {product.deliveryMinutes} mins
            </span>
          ) : (
            <span />
          )}
          {ds.foot ?? (!options && quantity > 0 ? (
            <span className="shop-desk-stepper" role="group" aria-label={`${product.name}: ${quantity} in bag`}>
              <button type="button" onClick={() => decrementItem(product.id)} aria-label={`Remove one ${product.name}`}>
                <Minus size={14} aria-hidden="true" />
              </button>
              <b aria-hidden="true">{quantity}</b>
              <button type="button" onClick={() => incrementItem(product.id)} aria-label={`Add one more ${product.name}`}>
                <Plus size={14} aria-hidden="true" />
              </button>
            </span>
          ) : (
            <button type="button" className="shop-desk-add" onClick={add} aria-label={options ? `Add ${product.name}: choose options` : `Add ${product.name} to bag`}>
              Add
              <Plus size={14} aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}

// A product rail: one row of equal cards (five across) that scrolls sideways inside itself, with arrows in the head. An
// arrow is off at its end of the row, and both are hidden when the whole row fits.
function DeskRail({ icon, title, titleId, sub, pill, accent, onSeeAll, children, busy = false }: { icon?: LucideIcon; title: string; titleId?: string; sub?: string; pill?: React.ReactNode; accent?: string; onSeeAll?: () => void; children: React.ReactNode; busy?: boolean }) {
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
    <section className="shop-desk-section" aria-labelledby={titleId} aria-label={titleId ? undefined : title} aria-busy={busy || undefined} style={accent ? accentStyle(accent) : undefined}>
      <SectionHead
        id={titleId}
        icon={icon}
        title={title}
        sub={sub}
        pill={pill}
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

function DeskProductRail({ icon, title, titleId, accent, products, onSeeAll }: { icon?: LucideIcon; title: string; titleId?: string; accent?: string; products: SkincareProduct[]; onSeeAll?: () => void }) {
  const navigate = useHomeNavigate();
  return (
    <DeskRail icon={icon} title={title} titleId={titleId} accent={accent} onSeeAll={onSeeAll ?? (() => navigate('shop-browse'))}>
      {products.map((product) => (
        <div key={product.id} className="shop-desk-rail-item">
          <DeskProductCard product={product} />
        </div>
      ))}
    </DeskRail>
  );
}

function DeskSkeletonRail({ title, accent }: { title: string; accent?: string }) {
  return (
    <section className="shop-desk-section" aria-busy="true" aria-label={title} style={accent ? accentStyle(accent) : undefined}>
      <SectionHead icon={Sparkles} title={title} />
      <div className="shop-desk-rail" aria-hidden="true">
        {skeletonCards(CARD_ROW)}
      </div>
      <span className="shop-desk-sr">Loading products</span>
    </section>
  );
}

function DeskReorderRail({ catalog, accent }: { catalog: SkincareProduct[]; accent: string }) {
  const products = useReorderProducts(catalog);
  if (products.length === 0) return null;
  return <DeskProductRail icon={ShoppingCart} title="Buy it again" accent={accent} products={products} />;
}

// ---------------------------------------------------------------- Header tabs

// The category tabs under the header: For You (the home) and each category, an icon over each name. The selected tab is
// underlined in its accent and tints the header band; a category tab also brings that category's products to the top
// of the page.
const TABS: { id: TabId; label: string; Icon: LucideIcon }[] = [
  { id: 'for-you', label: 'For You', Icon: Sparkles },
  ...HOME_CATEGORY_TILES.map(({ id, label }) => ({ id: id as TabId, label, Icon: CATEGORY_ICON[id] ?? Sparkles })),
];
// The in-page section links in the sticky header (they show once the page is scrolled); a link to a section not on the page does nothing.
const JUMPS = [
  { id: 'shop-desk-today-title', label: 'Deals of the day' },
  { id: 'shop-desk-deals-title', label: 'Top deals' },
  { id: 'shop-desk-bestsellers-title', label: 'Best sellers' },
  { id: 'shop-desk-new-title', label: 'New launches' },
  { id: 'shop-desk-concerns-title', label: 'Shop by concern' },
  { id: 'shop-desk-brands-title', label: 'Brands' },
];
// One accent: every tab underlines in brand blue.
const tabAccent = (_index: number) => BRAND;

function CategoryTabs({ selected, onSelect, onShopAll, tiles, onOpen }: { selected: TabId; onSelect: (id: TabId) => void; onShopAll: () => void; tiles: { id: string; count: number; sample: SkincareProduct | null }[]; onOpen: (categoryId: string) => void }) {
  return (
    <nav className="shop-desk-tabs" aria-label="Categories">
      {TABS.map(({ id, label, Icon }, i) => {
        const tile = id === 'for-you' ? null : tiles.find((t) => t.id === id) ?? null;
        return (
          <div key={id} className="shop-desk-tab-wrap">
            <button type="button" className="shop-desk-tab" aria-pressed={selected === id} onClick={() => onSelect(id)} style={accentStyle(tabAccent(i))}>
              <span className="shop-desk-tab-icon" aria-hidden="true">
                <Icon size={20} />
              </span>
              <span>{label}</span>
            </button>
            {tile && (
              <div className="shop-desk-mega">
                {tile.sample && hasProductPhoto(tile.sample) && <img src={getProductThumbUrl(tile.sample, 200)} alt="" width={88} height={88} loading="lazy" decoding="async" />}
                <span className="shop-desk-mega-copy">
                  <strong>{label}</strong>
                  <small>{tile.count} {tile.count === 1 ? 'product' : 'products'}</small>
                </span>
                <button type="button" onClick={() => onOpen(id)}>
                  Shop {label.toLowerCase()}
                  <ArrowRight size={14} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        );
      })}
      <button type="button" className="shop-desk-tab" onClick={onShopAll} style={accentStyle(BRAND)}>
        <span className="shop-desk-tab-icon" aria-hidden="true">
          <Boxes size={20} />
        </span>
        <span>Shop all</span>
      </button>
    </nav>
  );
}

// ---------------------------------------------------------------- Hero carousel

type Slide = { poster?: boolean; id: string; tag: string; title: string; subtitle: string; ctaLabel: string; image: string; cover: boolean; background: string; textColor: string; accent: string; imageAlt: string; href: string | null; onOpen: () => void };

// The hero and the admin's banners as one carousel at the full column width: one slide at a time with a slow crossfade,
// dots and arrows, moving on every few seconds, pausing while the pointer or focus is on it, and still for people who
// prefer reduced motion.
function HeroCarousel({ slides, previewing }: { slides: Slide[]; previewing: boolean }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;
  const current = count ? Math.min(index, count - 1) : 0;
  useEffect(() => {
    if (count < 2 || paused || prefersReducedMotion()) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), SLIDE_MS);
    return () => window.clearInterval(id);
  }, [count, paused]);
  const go = (dir: 1 | -1) => setIndex((i) => (i + dir + count) % count);
  const design = useHeroDesign();
  return (
    <section className="shop-desk-hero-wrap" aria-label="Featured" aria-roledescription="carousel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      {previewing && (
        <p className="shop-desk-preview" role="status">
          Staff preview: these banners are a draft and are not live for customers yet.
        </p>
      )}
      <div className="shop-desk-hero" style={{ '--gvd-i': current } as React.CSSProperties}>
        {slides.map((slide, i) => {
          const active = i === current;
          const style = accentStyle(slide.accent, {
            ...(slide.background ? { background: slide.background } : null),
            ...(slide.textColor ? { color: slide.textColor } : null),
          });
          const cta = (
            <>
              {slide.ctaLabel}
              <ArrowRight size={16} aria-hidden="true" />
            </>
          );
          return (
            <div key={slide.id} className={`shop-desk-slide${slide.cover ? ' is-cover' : ''}${slide.poster ? ' is-poster' : ''}${active ? ' is-active' : ''}`} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${count}`} aria-hidden={!active} style={style}>
              {i === 0 && design.video && <HeroVideo src={design.video} />}
              {slide.image && (
                <div className="shop-desk-slide-media">
                  <img src={slide.image} alt={slide.imageAlt} width={1891} height={831} fetchPriority={i === 0 ? 'high' : 'low'} loading={i === 0 ? 'eager' : 'lazy'} decoding="async" />
                </div>
              )}
              {!slide.poster && (
              <div className="shop-desk-slide-copy">
                {slide.tag && <p className="shop-desk-slide-tag">{slide.tag}</p>}
                {i === 0 ? <h1 id="shop-desk-hero-title">{highlightOffer(slide.title)}</h1> : <h2>{highlightOffer(slide.title)}</h2>}
                {slide.subtitle && <p className="shop-desk-slide-sub">{slide.subtitle}</p>}
                {slide.ctaLabel &&
                  (slide.href ? (
                    <a className="shop-desk-btn-dark" href={slide.href} tabIndex={active ? 0 : -1}>
                      {cta}
                    </a>
                  ) : (
                    <button type="button" className="shop-desk-btn-dark" onClick={slide.onOpen} tabIndex={active ? 0 : -1}>
                      {cta}
                    </button>
                  ))}
              </div>
              )}
            </div>
          );
        })}
        {count > 1 && (
          <>
            <button type="button" className="shop-desk-hero-arrow is-prev" onClick={() => go(-1)} aria-label="Previous slide">
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <button type="button" className="shop-desk-hero-arrow is-next" onClick={() => go(1)} aria-label="Next slide">
              <ChevronRight size={20} aria-hidden="true" />
            </button>
            <div className="shop-desk-dots" role="group" aria-label="Choose a slide">
              {slides.map((slide, i) => (
                <button key={slide.id} type="button" className="shop-desk-dot" aria-current={i === current} aria-label={`Show slide ${i + 1}: ${slide.title}`} onClick={() => setIndex(i)} />
              ))}
            </div>
          </>
        )}
      </div>
      <HeroExtras layout={design.layout} slides={slides.map((s) => ({ title: s.title, image: s.image, onOpen: () => (s.href ? window.location.assign(s.href) : s.onOpen()) }))} current={current} onGo={setIndex} ms={SLIDE_MS} nativeArrows />
    </section>
  );
}

// ---------------------------------------------------------------- Tiles and cards

// A category tile: a pastel square in the category's accent with its product photo (or icon), the name below.
function DeskCategoryTile({ label, accent, photo, Icon, count, onOpen }: { label: string; accent: string; photo: string | null; Icon: LucideIcon; count: string | null; onOpen: () => void }) {
  return (
    <button type="button" className={`shop-desk-cat${photo ? '' : ' is-brand'}`} onClick={onOpen} aria-label={count ? `${label}, ${count}` : label} style={accentStyle(accent)}>
      <span className="shop-desk-cat-media">{photo ? <img src={photo} alt="" width={400} height={400} loading="lazy" decoding="async" /> : <img className="shop-desk-cat-mark" src={BRAND_MARK_URL} alt="" width={40} height={47} decoding="async" />}</span>
      <strong>{label}</strong>
    </button>
  );
}

const tilePhoto = (tile: HomeCategoryTile | null) => (tile?.sample && hasProductPhoto(tile.sample) ? getProductThumbUrl(tile.sample, 400) : null);

// An offer card: the first of the row on a dark gradient of its accent (like the bank offer), the rest on a light tint.
// The admin's picture sits on the right; the built-in offers draw their icon there.
function DeskPromo({ dark, accent, kicker, title, sub, image, Icon, onOpen }: { dark: boolean; accent: string; kicker?: string; title: string; sub?: React.ReactNode; image?: string; Icon?: LucideIcon; onOpen: () => void }) {
  return (
    <button type="button" className={`shop-desk-promo${dark ? ' is-dark' : ''}`} onClick={onOpen} style={accentStyle(accent)}>
      <span className="shop-desk-promo-copy">
        {kicker && (
          <span className="shop-desk-promo-kicker">
            <Tag size={12} aria-hidden="true" />
            {kicker}
          </span>
        )}
        <span className="shop-desk-promo-title">{highlightOffer(title)}</span>
        {sub && <span className="shop-desk-promo-sub">{sub}</span>}
      </span>
      <span className="shop-desk-promo-art" aria-hidden="true">
        {image ? <img src={image} alt="" width={320} height={200} loading="lazy" decoding="async" /> : Icon ? <Icon size={56} strokeWidth={1.4} /> : null}
      </span>
      <span className="shop-desk-promo-go" aria-hidden="true">
        <ArrowRight size={18} />
      </span>
    </button>
  );
}

// A block the admin filled (offers strip, brands, trust, Trending Now tiles), drawn in the desktop's style: an even row,
// each item in its own accent (the admin's, or the palette in order). The admin's background and text colours, when set,
// still win. Empty blocks keep the shared placeholders (staff preview only).
type LiveKind = 'cards' | 'chips' | 'tiles' | 'promises' | 'trending';
const LIVE_ROW_MAX: Record<LiveKind, number> = { cards: 4, chips: 4, tiles: 10, promises: 4, trending: 8 };

function DeskLiveItems({ kind, settings, items }: { kind: LiveKind; settings: BlockSettings; items: BlockItem[] }) {
  const custom: React.CSSProperties = {};
  if (settings.background) custom.background = settings.background;
  if (settings.textColor) custom.color = settings.textColor;
  return (
    <div className={`shop-desk-live-grid is-${kind}`} style={{ '--live-cols': balancedColumns(items.length, LIVE_ROW_MAX[kind]) } as React.CSSProperties}>
      {items.map((item, i) => {
        const pic = item.image || '';
        const itemStyle = accentStyle(restAccent(itemAccent(item)), custom);
        const inner =
          kind === 'trending' ? (
            <span className="shop-desk-live-trend" style={itemStyle}>
              <span className="shop-desk-live-trend-media">{pic ? <img src={pic} alt="" loading="lazy" decoding="async" /> : <Sparkles size={28} aria-hidden="true" />}</span>
              <strong>{item.label}</strong>
              {item.sub && <small>{item.sub}</small>}
            </span>
          ) : kind === 'tiles' ? (
            <span className="shop-desk-live-tile" style={itemStyle}>
              {pic ? <img src={pic} alt={item.label} loading="lazy" decoding="async" /> : <strong>{item.label}</strong>}
            </span>
          ) : kind === 'chips' ? (
            <span className="shop-desk-live-chip" style={itemStyle}>
              {pic ? <img className="shop-desk-live-dot" src={pic} alt="" width={40} height={40} loading="lazy" decoding="async" /> : <span className="shop-desk-live-dot" aria-hidden="true" />}
              <span>
                <b>{item.label}</b>
                {item.sub && <small>{item.sub}</small>}
              </span>
            </span>
          ) : kind === 'promises' ? (
            <span className="shop-desk-live-card is-promise" style={itemStyle}>
              {pic ? <img className="shop-desk-live-icon" src={pic} alt="" width={40} height={40} loading="lazy" decoding="async" /> : <span className="shop-desk-live-icon" aria-hidden="true" />}
              <strong>{item.label}</strong>
              {item.sub && <span>{item.sub}</span>}
            </span>
          ) : pic ? (
            <span className="shop-desk-live-card has-picture" style={{ ...itemStyle, backgroundImage: `linear-gradient(to top, rgba(11, 18, 64, .78), rgba(11, 18, 64, .05) 65%), url("${pic}")` }}>
              <strong>{item.label}</strong>
              {item.sub && <span>{item.sub}</span>}
            </span>
          ) : (
            <span className="shop-desk-live-card" style={itemStyle}>
              <strong>{item.label}</strong>
              {item.sub && <span>{item.sub}</span>}
            </span>
          );
        return item.link ? (
          <a key={i} className="shop-desk-live-item" href={item.link}>
            {inner}
          </a>
        ) : (
          <div key={i} className="shop-desk-live-item">
            {inner}
          </div>
        );
      })}
    </div>
  );
}

function DeskLiveBlock({ kind, settings, icon, fallbackTitle, aria, accent, onSeeAll }: { kind: LiveKind; settings: BlockSettings; icon?: LucideIcon; fallbackTitle: string; aria: string; accent: string; onSeeAll?: () => void }) {
  const title = settings.title || fallbackTitle;
  return (
    <section className={`shop-desk-section shop-desk-live is-${kind}`} aria-label={title || aria} style={accentStyle(accent)}>
      {title && <SectionHead icon={icon} title={title} action={onSeeAll ? <SeeAll onClick={onSeeAll} name={title} /> : undefined} />}
      <DeskLiveItems kind={kind} settings={settings} items={settings.items} />
    </section>
  );
}

// The help and gifts block: its first item as the wide navy membership banner of the design (the admin's title, line,
// picture and link), the rest as cards below it.
function DeskHelpGift({ settings, accent }: { settings: BlockSettings; accent: string }) {
  const [first, ...rest] = settings.items;
  const own = itemAccent(first);
  const banner = (
    <span className="shop-desk-plus" style={accentStyle(isAccent(own) ? own.toUpperCase() : accent)}>
      <span className="shop-desk-plus-badge" aria-hidden="true">
        {first.image ? <img src={first.image} alt="" width={56} height={56} loading="lazy" decoding="async" /> : <Crown size={26} />}
      </span>
      <span className="shop-desk-plus-copy">
        <strong>{first.label}</strong>
        {first.sub && <span>{first.sub}</span>}
      </span>
      {first.link && (
        <span className="shop-desk-plus-cta">
          Explore
          <ArrowRight size={16} aria-hidden="true" />
        </span>
      )}
    </span>
  );
  return (
    <section className="shop-desk-section shop-desk-live is-help" aria-label={settings.title || 'Help, gifts and referrals'} style={accentStyle(accent)}>
      {settings.title && <SectionHead icon={Gem} title={settings.title} />}
      {first.link ? (
        <a className="shop-desk-live-item shop-desk-plus-link" href={first.link}>
          {banner}
        </a>
      ) : (
        <div className="shop-desk-live-item">{banner}</div>
      )}
      {rest.length > 0 && <DeskLiveItems kind="cards" settings={settings} items={rest} />}
    </section>
  );
}

// Under ₹299 / ₹499 / ₹999: one row of tiles, each linking to the browse list filtered to that price.
function DeskPricePoints({ tiles, onOpen }: { tiles: PricePointTile[]; onOpen: (max: number) => void }) {
  if (tiles.length === 0) return null;
  return (
    <section className="shop-desk-section is-tight" aria-label="Shop by price">
      <div className="shop-desk-prices" style={{ '--price-cols': tiles.length } as React.CSSProperties}>
        {tiles.map((t, i) => (
          <button key={t.max} type="button" className="shop-desk-price" style={accentStyle(coolSectionAccent('prices'))} onClick={() => onOpen(t.max)} aria-label={`${t.label}, ${t.count} ${t.count === 1 ? 'product' : 'products'}`}>
            <b>{t.label}</b>
            <small>{t.count} {t.count === 1 ? 'product' : 'products'}</small>
            <span className="shop-desk-price-media">{t.sample && <img src={getProductThumbUrl(t.sample, 200)} alt="" width={96} height={96} loading="lazy" decoding="async" />}</span>
          </button>
        ))}
      </div>
    </section>
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

// ---------------------------------------------------------------- The page

export const ShopDesktopHome: React.FC = () => {
  const layout = useHomeLayout('desktop');
  const { order: layoutOrder, settings: blockSettings, hero: heroOverride, footer: footerDetails, sectionAccents } = layout;
  const { styles: designerStyles, look: designerLook, heroVideo } = layout;
  const { catalog, feed, loading, failed, noProducts, tiles, todayDeals, extraTiles, recentIds, skinState, bestsellers, newLaunches, picks, pricePoints, recentProducts, configuredRows, adminDeals, dealProducts } = useHomeData(layout);
  const headerSettings = layout.header;
  // Recently viewed and Recommended (designer blocks): both hide when empty and honour the block's maxItems (default 8).
  const recentList = useMemo(() => {
    const byId = new Map(catalog.map((p) => [p.id, p] as const));
    return recentIds.map((id) => byId.get(id)).filter((p): p is SkincareProduct => Boolean(p)).slice(0, clampMaxItems(blockSettings['recently-viewed']?.maxItems));
  }, [catalog, recentIds, blockSettings]);
  const recommendedList = useMemo(
    () => recommendedProducts(catalog, recentIds, skinState.recommendationsOn ? skinMatchedPicks(catalog, skinState.concerns, 12) : [], clampMaxItems(blockSettings['recommended']?.maxItems)),
    [catalog, recentIds, skinState, blockSettings]
  );
  const adminCategories = blockSettings['categories']?.items ?? [];
  const adminPromos = blockSettings['promos']?.items ?? [];

  const navigate = useHomeNavigate();
  const { currentAddress, accountSignedIn, requireSignIn, wishlist: wishlistIds } = useApp();
  const wishlistCount = wishlistIds.length;
  const cart = useShellCart();
  const unread = useInbox((s) => s.unreadCount);
  const { banners, previewing } = useHomeBanners();
  const { sale, left } = useLiveFlashSale();
  const { firstName, activeOrderId } = useGreeting(accountSignedIn);
  const [tab, setTab] = useState<TabId>('for-you');
  const suggestions = useMemo(() => {
    const own = (headerSettings.searchHints ?? []).map((h) => String(h).replace(/^search (for )?/i, '').replace(/["\u2026]|\.\.\./g, '').trim()).filter(Boolean);
    return Array.from(new Set(own)).slice(0, 6);
  }, [headerSettings.searchHints]);

  const topRef = useRef<HTMLSpanElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const scrolled = useScrolledPast(topRef);
  useRevealOnScroll(mainRef);

  // Location and delivery time come from the selected delivery address, so the ETA always matches the place shown.
  const userLocation = [currentAddress?.area, currentAddress?.city].filter(Boolean).join(', ') || 'Set delivery location';
  const userCity = currentAddress?.city || currentAddress?.area || 'Set location';
  const deliveryEta = currentAddress?.serviceable && currentAddress.deliveryMinutes > 0 ? currentAddress.deliveryMinutes : null;

  const socials = configuredSocials(mergeFooterSocials(siteConfig.socials, footerDetails));
  const storeLinks = [
    { label: 'App Store', url: footerDetails.appStoreUrl },
    { label: 'Google Play', url: footerDetails.playStoreUrl },
  ].filter((s) => s.url !== '');

  const openLink = (link: string) => (link ? window.location.assign(link) : navigate('shop-browse'));

  // A section's accent: the admin's (block settings, then the reply's sectionAccents), otherwise the section's default.
  const secAccent = (id: keyof typeof SECTION_ACCENT) => blockAccent(blockSettings[id as HomeBlockId], sectionAccents, id, coolSectionAccent(id));
  const railsAccentSet = blockAccent(blockSettings['product-rails'], sectionAccents, 'product-rails', '') !== '';
  // Each product rail has its own accent (the palette in order) unless the admin set one for the whole block.
  const railAccent = (i: number) => (railsAccentSet ? secAccent('product-rails') : coolAccent(i + 2));
  // The hero's accent: the hero's own (from the admin), then the hero block's.
  const heroOwn = itemAccent(heroOverride);
  const heroAccent = isAccent(heroOwn) ? heroOwn.toUpperCase() : secAccent('hero');

  const tabIndex = Math.max(0, TABS.findIndex((t) => t.id === tab));
  const selectedTab = TABS[tabIndex];
  const headerAccent = tabAccent(tabIndex);
  const spotlight = useMemo(() => (tab === 'for-you' ? [] : catalog.filter((p) => p.category === tab).slice(0, 10)), [tab, catalog]);

  // The hero slide (the admin's hero, or the built-in one) first, then the admin's banners.
  const slides: Slide[] = [
    {
      id: 'hero',
      poster: isPosterOnlyHero(heroOverride),
      tag: 'Discover. Shop. Glow.',
      title: heroOverride?.title || 'Glow your way.',
      subtitle: heroOverride?.subtitle || (deliveryEta ? `Skincare delivered in ${deliveryEta} mins.` : 'Skincare, delivered to your door.'),
      ctaLabel: heroOverride?.ctaLabel || 'Shop now',
      image: heroOverride?.image || HERO_IMAGE,
      imageAlt: heroOverride?.image && heroOverride.title ? heroOverride.title : 'GlowVAI skincare campaign',
      cover: false,
      background: '',
      textColor: '',
      accent: heroAccent,
      href: null,
      onOpen: () => (heroOverride?.ctaLink ? window.location.assign(heroOverride.ctaLink) : navigate('shop-browse')),
    },
    ...banners.map((b, i) => ({
      id: `banner-${b.id}`,
      tag: b.kind === 'sponsored' ? 'Sponsored' : '',
      title: b.title,
      subtitle: b.subtitle,
      ctaLabel: b.ctaLabel,
      image: b.image,
      imageAlt: '',
      cover: Boolean(b.image),
      background: b.background,
      textColor: b.textColor,
      accent: restAccent(b.accent),
      href: isInternal(b.link) ? b.link : '/shop',
      onOpen: () => undefined,
    })),
  ];

  // The live flash sale's products, at their sale price (the checkout applies the same price).
  const byId = useMemo(() => new Map(catalog.map((p) => [p.id, p] as const)), [catalog]);
  const saleCards = sale
    ? sale.items.flatMap((it) => {
        const product = byId.get(it.productId);
        return product ? [{ product, price: { price: it.salePrice, mrp: it.price, percent: sale.discountPercent } }] : [];
      })
    : [];

  const liveBlock = (id: 'offers' | 'brands' | 'trust', kind: LiveKind, fallbackTitle: string, aria: string, icon?: LucideIcon) => {
    const settings = blockSettings[id];
    return settings && settings.items.length > 0 ? <DeskLiveBlock kind={kind} settings={settings} icon={icon} fallbackTitle={fallbackTitle} aria={aria} accent={secAccent(id)} /> : null;
  };

  // Scrolls to a rail of this page (the Best sellers and New launches category tiles).
  const jumpTo = (elementId: string, block: 'center' | 'start' = 'center') => {
    const el = document.getElementById(elementId);
    if (!el) return block === 'start' ? undefined : navigate('shop-browse');
    el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block });
  };

  const renderBlock = (id: HomeModuleId): React.ReactNode => {
    switch (id) {
      case 'hero':
        return (
          <>
            <div className="shop-desk-hero-row">
              <HeroCarousel slides={slides} previewing={previewing} />
              <aside className="shop-desk-side" aria-label="Quick offers">
                <button type="button" className="shop-desk-side-tile is-scan" onClick={() => navigate('scan-camera')}>
                  <span className="shop-desk-side-kicker">
                    <ScanFace size={14} aria-hidden="true" />
                    Face scan
                  </span>
                  <strong>Find the routine that fits your skin</strong>
                  <span className="shop-desk-side-go">
                    Start skin check
                    <ArrowRight size={14} aria-hidden="true" />
                  </span>
                </button>
                <button type="button" className="shop-desk-side-tile" onClick={() => navigate('cart-tab')}>
                  <span className="shop-desk-side-kicker">
                    <Ticket size={14} aria-hidden="true" />
                    Coupon
                  </span>
                  <strong>Flat ₹{COUPON_VALUES.GLOW50} off with GLOW50</strong>
                  <span className="shop-desk-side-go">
                    Apply in your cart
                    <ArrowRight size={14} aria-hidden="true" />
                  </span>
                </button>
              </aside>
            </div>
            {!failed && tab === 'for-you' && (loading ? <DeskSkeletonRail title="Deals of the day" /> : todayDeals.length > 0 ? <DeskProductRail icon={Zap} title="Deals of the day" titleId="shop-desk-today-title" accent={secAccent('deals')} products={todayDeals} /> : null)}
          </>
        );
      case 'mini-banners': {
        // Trending Now: the admin's mini banners as pastel tiles.
        const settings = blockSettings['mini-banners'];
        return settings && settings.items.length > 0 ? (
          <DeskLiveBlock kind="trending" settings={settings} icon={Star} fallbackTitle="Trending Now" aria="Trending now" accent={secAccent('mini-banners')} onSeeAll={() => navigate('shop-browse')} />
        ) : (
          <MiniBannersPlaceholder settings={settings} />
        );
      }
      case 'offers':
        return liveBlock('offers', 'chips', '', 'Offers', Ticket) ?? <OffersStripPlaceholder settings={blockSettings['offers']} />;
      case 'categories':
        return (
          <section className="shop-desk-section is-tight" aria-label="Shop by category" style={accentStyle(secAccent('categories'))}>
            <SectionHead title={blockSettings['categories']?.title || 'Shop by category'} action={<SeeAll label="All categories" onClick={() => navigate('shop-browse')} name="categories" />} />
            <div className="shop-desk-cats" aria-busy={loading} style={{ '--cat-cols': balancedColumns(adminCategories.length > 0 ? adminCategories.length : HOME_CATEGORY_TILES.length + 2 + (bestsellers.length > 0 ? 1 : 0) + (newLaunches.length > 0 ? 1 : 0) + (dealProducts.length > 0 ? 1 : 0), CATEGORY_ROW_MAX) } as React.CSSProperties}>
              {adminCategories.length > 0 ? (
                adminCategories.map((item, i) => <DeskCategoryTile key={`${i}-${item.label}`} label={item.label} accent={restAccent(itemAccent(item), i)} photo={item.image || null} Icon={Sparkles} count={item.sub || null} onOpen={() => openLink(item.link)} />)
              ) : (
                <>
                  {HOME_CATEGORY_TILES.map(({ id: categoryId, label }, i) => {
                    const tile = tiles.find((t) => t.id === categoryId) ?? null;
                    return <DeskCategoryTile key={categoryId} label={label} accent={restAccent(null, i)} photo={tilePhoto(tile)} Icon={CATEGORY_ICON[categoryId] ?? Sparkles} count={countLabel(loading, failed, tile?.count ?? 0)} onOpen={() => navigate('shop-category', { categoryId })} />;
                  })}
                  {bestsellers.length > 0 && <DeskCategoryTile label="Best sellers" accent={restAccent(null, 5)} photo={extraTiles.best ? getProductThumbUrl(extraTiles.best, 400) : null} Icon={Star} count={null} onOpen={() => jumpTo('shop-desk-bestsellers-title')} />}
                  {newLaunches.length > 0 && <DeskCategoryTile label="New launches" accent={restAccent(null, 6)} photo={extraTiles.fresh ? getProductThumbUrl(extraTiles.fresh, 400) : null} Icon={PackagePlus} count={null} onOpen={() => jumpTo('shop-desk-new-title')} />}
                  {dealProducts.length > 0 && <DeskCategoryTile label="Top deals" accent={restAccent(null, 3)} photo={getProductThumbUrl(dealProducts[0], 400)} Icon={Zap} count={null} onOpen={() => jumpTo('shop-desk-deals-title')} />}
                  <DeskCategoryTile label="Skin scan" accent={restAccent(null, 4)} photo={null} Icon={ScanFace} count={null} onOpen={() => navigate('scan-camera')} />
                  <DeskCategoryTile label="All Products" accent={restAccent(null, 1)} photo={extraTiles.all ? getProductThumbUrl(extraTiles.all, 400) : null} Icon={Boxes} count={countLabel(loading, failed, catalog.length)} onOpen={() => navigate('shop-browse')} />
                </>
              )}
            </div>
          </section>
        );
      case 'promos':
        return (
          <section className="shop-desk-promos" aria-label="Offers" style={{ '--promo-cols': balancedColumns(adminPromos.length > 0 ? adminPromos.length : 2, PROMO_ROW_MAX) } as React.CSSProperties}>
            {adminPromos.length > 0 ? (
              adminPromos.map((item, i) => <DeskPromo key={`${i}-${item.label}`} dark={i === 0} accent={restAccent(itemAccent(item), i + 4)} title={item.label} sub={item.sub} image={item.image || undefined} onOpen={() => openLink(item.link)} />)
            ) : (
              <>
                <DeskPromo
                  dark
                  accent={BRAND}
                  kicker="Coupon"
                  title={`Flat ₹${COUPON_VALUES.GLOW50} OFF`}
                  sub={
                    <>
                      Use code <b className="shop-desk-code">GLOW50</b> in your cart
                    </>
                  }
                  Icon={Ticket}
                  onOpen={() => navigate('cart-tab')}
                />
                <DeskPromo dark={false} accent={BRAND} kicker="Delivery" title="Free Delivery" sub={`On orders above ₹${FREE_DELIVERY_ABOVE}`} Icon={Truck} onOpen={() => navigate('shop-browse')} />
              </>
            )}
          </section>
        );
      case 'deals': {
        const accent = secAccent('deals');
        const dealsTitle = blockSettings['deals']?.title || 'Top Deals';
        if (sale && saleCards.length > 0) {
          return (
            <DeskRail
              icon={Zap}
              title={sale.name}
              titleId="shop-desk-deals-title"
              sub={sale.remaining !== null ? `${sale.remaining} left at this price` : undefined}
              pill={<span className="shop-desk-pill"><Clock size={14} aria-hidden="true" />Ends in {clock(left)}</span>}
              accent={accent}
              onSeeAll={() => navigate('shop-browse')}
            >
              {saleCards.map(({ product, price }) => (
                <div key={product.id} className="shop-desk-rail-item">
                  <DeskProductCard product={product} sale={price} />
                </div>
              ))}
            </DeskRail>
          );
        }
        if (failed) return <FlashDealsPlaceholder />;
        if (loading) return <DeskSkeletonRail title={dealsTitle} accent={accent} />;
        return dealProducts.length > 0 ? (
          <DeskRail icon={Zap} title={dealsTitle} titleId="shop-desk-deals-title" sub={adminDeals.length > 0 ? 'Picked by GlowVAI' : 'Priced below their listed MRP'} accent={accent} onSeeAll={() => navigate('shop-browse')}>
            {dealProducts.map((product) => (
              <div key={product.id} className="shop-desk-rail-item">
                <DeskProductCard product={product} />
              </div>
            ))}
          </DeskRail>
        ) : previewing ? (
          // Staff preview only: say why the section is empty. Customers never see an empty deals section.
          <section className="shop-desk-section" aria-labelledby="shop-desk-deals-title" style={accentStyle(accent)}>
            <SectionHead id="shop-desk-deals-title" icon={Zap} title={dealsTitle} />
            <p className="shop-desk-empty">No discounted products right now. This section is hidden for customers until there are deals.</p>
          </section>
        ) : null;
      }
      case 'reorder':
        return <DeskReorderRail catalog={catalog} accent={secAccent('reorder')} />;
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
                {loading && skinState.recommendationsOn && <DeskSkeletonRail title="Picked for your skin" accent={railAccent(0)} />}
                {configuredRows.map((rail, i) => (
                  <DeskProductRail key={rail.id} icon={Sparkles} title={rail.title} accent={railAccent(i)} products={rail.products} />
                ))}
                {picks.length > 0 && <DeskProductRail icon={Sparkles} title="Picked for your skin" accent={railAccent(configuredRows.length)} products={picks} />}
              </>
            )}
          </>
        );
      case 'price-points':
        return <DeskPricePoints tiles={pricePoints} onOpen={(max) => navigate('shop-browse', { maxPrice: String(max) })} />;
      case 'bestsellers':
        return loading ? <DeskSkeletonRail title="Bestsellers" accent={railAccent(1)} /> : bestsellers.length > 0 ? <DeskProductRail icon={Star} title="Bestsellers" titleId="shop-desk-bestsellers-title" accent={railAccent(1)} products={bestsellers} /> : null;
      case 'new-launches':
        return !loading && newLaunches.length > 0 ? <DeskProductRail icon={PackagePlus} title="New launches" titleId="shop-desk-new-title" accent={railAccent(2)} products={newLaunches} /> : null;
      case 'concerns':
        return (
        <section className="shop-desk-section" aria-labelledby="shop-desk-concerns-title" style={accentStyle(secAccent('concerns'))}>
          <SectionHead id="shop-desk-concerns-title" icon={Droplets} title="Shop by Concern" action={<SeeAll onClick={() => navigate('shop-browse')} name="concerns" />} />
          <div className="shop-desk-concerns">
            {CONCERNS.map(({ id: concernId, label, Icon }, i) => (
              <button key={concernId} type="button" className="shop-desk-concern" onClick={() => navigate('shop-browse', { concern: concernId })} style={accentStyle(secAccent('concerns'))}>
                <span className="shop-desk-concern-icon" aria-hidden="true">
                  <Icon size={18} />
                </span>
                <span>{label}</span>
                <ArrowRight size={14} aria-hidden="true" className="shop-desk-concern-go" />
              </button>
            ))}
            <button type="button" className="shop-desk-concern" onClick={() => navigate('shop-browse')} style={accentStyle(BRAND)}>
              <span className="shop-desk-concern-icon" aria-hidden="true">
                <Boxes size={18} />
              </span>
              <span>All concerns</span>
              <ArrowRight size={14} aria-hidden="true" className="shop-desk-concern-go" />
            </button>
          </div>
        </section>
        );
      case 'recent':
        return recentProducts.length > 0 ? <DeskProductRail icon={Clock} title="Recently viewed" accent={railAccent(3)} products={recentProducts} /> : null;
      case 'recently-viewed':
        return recentList.length > 0 ? <DeskProductRail icon={Clock} title={blockSettings['recently-viewed']?.title || 'Recently viewed'} accent={secAccent('recently-viewed')} products={recentList} /> : null;
      case 'recommended':
        return recommendedList.length > 0 ? <DeskProductRail icon={Sparkles} title={blockSettings['recommended']?.title || 'Recommended for you'} accent={secAccent('recommended')} products={recommendedList} /> : null;
      case 'scan':
        return scanCard;
      case 'brands':
        return liveBlock('brands', 'tiles', 'Top brands', 'Top brands', Gem) ?? (layout.preview || catalogBrands.length === 0 ? <BrandStripPlaceholder settings={blockSettings['brands']} /> : brandStrip);
      case 'trust':
        return liveBlock('trust', 'promises', '', 'Why shop with us', ShieldCheck) ?? (layout.preview ? <TrustBlockPlaceholder settings={blockSettings['trust']} /> : trustStrip);
      case 'help-gift': {
        const settings = blockSettings['help-gift'];
        return settings && settings.items.length > 0 ? <DeskHelpGift settings={settings} accent={secAccent('help-gift')} /> : <HelpGiftPlaceholder settings={settings} />;
      }
      case 'footer':
        return (
          <footer className="shop-desk-footer" aria-label="Site footer">
            <button type="button" className="shop-desk-totop" onClick={() => window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })}>
              <ArrowUp size={16} aria-hidden="true" />
              Back to top
            </button>
            <div className="shop-desk-footer-inner">
              <div className="shop-desk-footer-brand">
                <span className="shop-desk-footer-logo">
                  <BrandLogo height={34} white />
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
                <section className="shop-desk-footer-col">
                  <h3>Categories</h3>
                  <ul>
                    {HOME_CATEGORY_TILES.map(({ id: categoryId, label }) => (
                      <li key={categoryId}>
                        <button type="button" onClick={() => navigate('shop-category', { categoryId })}>
                          {label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
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
        if ((ITEM_BLOCK_IDS as readonly string[]).includes(id)) return <NewItemBlock id={id as ItemBlockId} settings={blockSettings[id as ItemBlockId]} wide onOpenLink={openLink} />;
        return null;
    }
  };

  // Shown to customers while the admin has set no brands: the brands in the live catalogue, most products first.
  const catalogBrands = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of catalog) if (p.brand) counts.set(p.brand, (counts.get(p.brand) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 12);
  }, [catalog]);
  const brandStrip = (
    <section className="shop-desk-section" aria-labelledby="shop-desk-brands-title" style={accentStyle(secAccent('brands'))}>
      <SectionHead id="shop-desk-brands-title" icon={Gem} title={blockSettings['brands']?.title || 'Shop by brand'} action={<SeeAll onClick={() => navigate('shop-browse')} name="brands" />} />
      <div className="shop-desk-brand-row">
        {catalogBrands.map(([brand, count]) => (
          <button key={brand} type="button" className="shop-desk-brand" onClick={() => navigate('shop-browse', { brand })}>
            <span className="shop-desk-brand-mark" aria-hidden="true">{brand.charAt(0).toUpperCase()}</span>
            <strong>{brand}</strong>
            <small>{count} {count === 1 ? 'product' : 'products'}</small>
          </button>
        ))}
      </div>
    </section>
  );
  // Facts only: the delivery rule, the coupon, the delivery time of the chosen address and the scan's own limits.
  const trustStrip = (
    <section className="shop-desk-trust" aria-label="Why shop with GlowVAI">
      <div>
        <Truck size={22} aria-hidden="true" />
        <span>
          <strong>Free delivery</strong>
          <small>On orders above ₹{FREE_DELIVERY_ABOVE}</small>
        </span>
      </div>
      <div>
        <Clock size={22} aria-hidden="true" />
        <span>
          <strong>{deliveryEta ? `Delivery in ${deliveryEta} mins` : 'Delivery to your door'}</strong>
          <small>{deliveryEta ? 'To your selected address' : 'Set your location for the time'}</small>
        </span>
      </div>
      <div>
        <BadgePercent size={22} aria-hidden="true" />
        <span>
          <strong>Flat ₹{COUPON_VALUES.GLOW50} off</strong>
          <small>Use code GLOW50 in your cart</small>
        </span>
      </div>
      <div>
        <ShieldCheck size={22} aria-hidden="true" />
        <span>
          <strong>Private skin check</strong>
          <small>A cosmetic check, not a diagnosis</small>
        </span>
      </div>
    </section>
  );

  const scanCard = (
  <section className="shop-desk-scan" aria-labelledby="shop-desk-scan-title" style={accentStyle(secAccent('scan'))}>
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
      <button type="button" className="shop-desk-btn-primary" onClick={() => navigate('scan-camera')}>
        Start skin check
        <ArrowRight size={16} aria-hidden="true" />
      </button>
    </div>
  </section>
  );

  const pinnedTail = (
    <>
      <section className="shop-desk-end" aria-labelledby="shop-desk-end-title">
        <h2 id="shop-desk-end-title">You've seen it all!</h2>
        <p>Browse the full catalogue</p>
        <button type="button" className="shop-desk-btn-outline" onClick={() => navigate('shop-browse')}>
          Explore full catalogue
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </section>
    </>
  );

  return (
    <DesignerStyleProvider styles={designerStyles} look={designerLook} heroVideo={heroVideo}>
    <LucideProvider strokeWidth={1.75}>
      <div className="shop-screen shop-desk">
        <span ref={topRef} className="shop-desk-top" aria-hidden="true" />
        <header className={`shop-desk-header${scrolled ? ' is-scrolled' : ''}`} style={accentStyle(BRAND)}>
          <div className="shop-desk-header-inner">
            <button type="button" className="shop-desk-logo" onClick={() => window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })} aria-label="glowvai shop home">
              <BrandLogo height={34} />
            </button>
            <button type="button" className="shop-desk-delivery" onClick={() => navigate('location-setup')} aria-label={`Delivery location: ${userLocation}. Change`}>
              <MapPin size={22} aria-hidden="true" />
              <span className="shop-desk-delivery-copy">
                <small>{deliveryEta ? `Delivery in ${deliveryEta} mins` : 'Delivery to'}</small>
                <span className="shop-desk-delivery-place">{userCity}</span>
              </span>
              <ChevronDown size={16} aria-hidden="true" />
            </button>
            <div className="shop-desk-search">
              <button type="button" className="shop-desk-search-input" onClick={() => navigate('shop-search-filters')} aria-label="Search products">
                <Search size={18} aria-hidden="true" />
                <SearchHint hints={headerSettings.searchHints} />
              </button>
              <VoiceSearchButton onResult={(text) => navigate('shop-search-filters', { q: text })} />
              <div className="shop-desk-suggest" role="region" aria-label="Search suggestions">
                {suggestions.length > 0 && <p className="shop-desk-suggest-title">Popular searches</p>}
                <div className="shop-desk-suggest-list">
                  {suggestions.map((q) => (
                    <button key={q} type="button" onClick={() => navigate('shop-search-filters', { q })}>
                      <Search size={14} aria-hidden="true" />
                      {q}
                    </button>
                  ))}
                </div>
                <p className="shop-desk-suggest-title">Shop by concern</p>
                <div className="shop-desk-suggest-list">
                  {CONCERNS.map(({ id: concernId, label, Icon }) => (
                    <button key={concernId} type="button" onClick={() => navigate('shop-browse', { concern: concernId })}>
                      <Icon size={14} aria-hidden="true" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DeliveryModeSwitch header={headerSettings} wide />
            <nav className="shop-desk-actions" aria-label="Account and cart">
              <button type="button" className="shop-desk-scan-pill" onClick={() => navigate('scan-camera')}>
                <ScanFace size={18} aria-hidden="true" />
                Skin scan
              </button>
              <button type="button" className="shop-desk-action" aria-label="Orders" onClick={() => (accountSignedIn ? navigate('orders-list') : requireSignIn())}>
                <Package size={20} aria-hidden="true" />
                <span>Orders</span>
              </button>
              <button type="button" className="shop-desk-action is-icon" aria-label={wishlistCount > 0 ? `Wishlist, ${wishlistCount} saved` : 'Wishlist'} onClick={() => (accountSignedIn ? navigate('shop-wishlist') : requireSignIn())}>
                <Heart size={20} aria-hidden="true" />
                {wishlistCount > 0 && <b className="shop-desk-badge" aria-hidden="true">{wishlistCount > 99 ? '99+' : wishlistCount}</b>}
              </button>
              <button type="button" className="shop-desk-action is-icon" aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'} onClick={() => (accountSignedIn ? navigate('notifications-list') : requireSignIn())}>
                <Bell size={20} aria-hidden="true" />
                {unread > 0 && <b className="shop-desk-badge" aria-hidden="true">{unread > 99 ? '99+' : unread}</b>}
              </button>
              <button type="button" className="shop-desk-action is-account" aria-label={accountSignedIn ? 'Account' : 'Log in'} onClick={() => (accountSignedIn ? navigate('profile-tab') : requireSignIn())}>
                <span className="shop-desk-avatar" aria-hidden="true">
                  {accountSignedIn && firstName ? firstName.charAt(0).toUpperCase() : <User size={18} />}
                </span>
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
                {cart.count > 0 && <b className="shop-desk-cart-count" aria-hidden="true">{cart.count > 99 ? '99+' : cart.count}</b>}
              </button>
            </nav>
          </div>
          <div className="shop-desk-tabs-row">
            <CategoryTabs selected={tab} onSelect={setTab} onShopAll={() => navigate('shop-browse')} tiles={tiles} onOpen={(categoryId) => navigate('shop-category', { categoryId })} />
          </div>
          <nav className="shop-desk-jump" aria-label="Jump to a section">
            <div className="shop-desk-jump-inner">
              {JUMPS.map((j) => (
                <button key={j.id} type="button" onClick={() => jumpTo(j.id, 'start')}>
                  {j.label}
                </button>
              ))}
            </div>
          </nav>
        </header>

        <div ref={mainRef} className="shop-desk-main">
          {layout.preview && (
            <p className="shop-desk-preview" role="status">
              {layout.fallback
                ? 'Staff preview: no desktop layout is saved yet, so the PC page shows the mobile layout draft.'
                : 'Staff preview: the desktop layout. Draft changes are not live for customers yet.'}
            </p>
          )}
          <section className="shop-desk-greet" aria-label="Welcome">
            <span className="shop-desk-greet-icon" aria-hidden="true">
              <Gem size={20} />
            </span>
            <span className="shop-desk-greet-copy">
              <strong>{firstName ? `Hi, ${firstName}` : 'Welcome to GlowVai'}</strong>
              <span>Discover. Shop. Glow.</span>
            </span>
            <span className="shop-desk-greet-sep" aria-hidden="true" />
            <button type="button" className="shop-desk-greet-eta" onClick={() => navigate('location-setup')}>
              <span className="shop-desk-greet-icon is-soft" aria-hidden="true">
                <Truck size={18} />
              </span>
              <span className="shop-desk-greet-copy">
                <strong>{deliveryEta ? 'Delivery in' : 'Delivery'}</strong>
                <span>{deliveryEta ? `~ ${deliveryEta} mins` : 'Set your location'}</span>
              </span>
            </button>
            {activeOrderId && (
              <button type="button" className="shop-desk-btn-primary shop-desk-greet-track" onClick={() => navigate('orders-tracking', { orderId: activeOrderId })}>
                Track Order
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            )}
          </section>
          <SkinQuizBanner />
          {tab !== 'for-you' && (
            <div className="shop-desk-spotlight">
              {spotlight.length > 0 ? (
                <DeskProductRail icon={selectedTab.Icon} title={`${selectedTab.label} for you`} accent={headerAccent} products={spotlight} onSeeAll={() => navigate('shop-category', { categoryId: tab })} />
              ) : loading ? (
                <DeskSkeletonRail title={selectedTab.label} accent={headerAccent} />
              ) : (
                <section className="shop-desk-section" aria-label={selectedTab.label} style={accentStyle(headerAccent)}>
                  <SectionHead icon={selectedTab.Icon} title={selectedTab.label} action={<SeeAll onClick={() => navigate('shop-category', { categoryId: tab })} name={selectedTab.label} />} />
                  <p className="shop-desk-empty">No products in this category yet.</p>
                </section>
              )}
            </div>
          )}
          {homeSequence(layoutOrder).filter((id) => id !== 'footer').map((id) => (
            <React.Fragment key={id}><StyledBlock id={id}>{renderBlock(id)}</StyledBlock></React.Fragment>
          ))}
          {pinnedTail}
        </div>
        {renderBlock('footer')}
      </div>
    </LucideProvider>
    </DesignerStyleProvider>
  );
};

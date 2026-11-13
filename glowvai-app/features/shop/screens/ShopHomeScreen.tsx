import React, { useMemo, useRef, useState } from 'react';
import { ArrowRight, Boxes, ChevronLeft, ChevronRight, Droplets, Flower2, Leaf, Mars, RotateCcw, ScanFace, Search, ShieldCheck, ShoppingBag, Sparkles, Sun, Ticket, Truck, User, Venus, Wind, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import { useCatalogReady, useLiveCatalog } from '../../../core/data/indianSkincareCatalog';
import type { SkincareProduct } from '../../../core/data/indianSkincareCatalog';
import { useProductFeedStatus } from '../../../core/services/productFeed';
import { ON_DEVICE_INFERENCE_ENABLED } from '../../../core/services/skinModelService';
import { useCartStore } from '../../../core/state/cartStore';
import { siteConfig } from '../../../../config/site';
import { COUPON_VALUES, FREE_DELIVERY_ABOVE } from '../../../shared/pricing-rules.mjs';
import { ShopProductCard } from '../shared/ShopProductCard';
import { SkinQuizBanner } from '../shared/SkinQuizBanner';
import { HomeBanners } from '../shared/HomeBanners';
import { browserStore, firstVisitState, skinMatchedPicks } from '../lib/firstVisit';
import { readRecentlyViewed } from '../lib/recentlyViewed';
import { rememberScroll } from '../../../context/scrollMemory';
import { HOME_CATEGORY_TILES, HOME_FOOTER_GROUPS, categoryTiles, configuredSocials, dedupeRails } from '../lib/homeModel';
import type { HomeCategoryTile, RailCandidate } from '../lib/homeModel';
import { formatRupee, getDiscountPercent, getProductImageUrl, getProductThumbUrl, isTrialProduct } from '../shared/shopUtils';
import type { ScreenName } from '../../../context/contextDefinition';
import '../styles/shop-home.css';

// Sorted and filtered lists from the live catalogue. Trial samples are left out so they don't top the rankings.
function buildCatalogLists(catalog: SkincareProduct[]) {
  const FULL_SIZE_PRODUCTS = catalog.filter((p) => !isTrialProduct(p));
  const TOP_RATED = [...FULL_SIZE_PRODUCTS].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
  const UNDER_500 = FULL_SIZE_PRODUCTS.filter((p) => p.price < 500);
  // Deals are real catalogue products with a discount from their own MRP.
  const DEAL_PRODUCTS = FULL_SIZE_PRODUCTS.filter((p) => getDiscountPercent(p) > 0)
    .sort((a, b) => getDiscountPercent(b) - getDiscountPercent(a))
    .slice(0, 4);
  return { FULL_SIZE_PRODUCTS, TOP_RATED, UNDER_500, DEAL_PRODUCTS };
}

const HERO_IMAGE = '/glowvai/assets/home/glowvai-shopping-hero.png';

const QUICK_LINKS: { label: string; Icon: LucideIcon; screen: ScreenName; params?: Record<string, string> }[] = [
  { label: 'All Categories', Icon: Boxes, screen: 'shop-browse' },
  { label: 'Skin scan', Icon: ScanFace, screen: 'scan-camera' },
  { label: 'Orders', Icon: RotateCcw, screen: 'orders-list' },
  { label: 'Account', Icon: User, screen: 'profile-tab' },
];

// Concern ids match the filter ids on the browse screen.
const CONCERNS: { id: string; label: string; Icon: LucideIcon }[] = [
  { id: 'acne', label: 'Acne & Blemishes', Icon: Leaf },
  { id: 'hydration', label: 'Hydration & Dryness', Icon: Droplets },
  { id: 'brightening', label: 'Glow & Dark Spots', Icon: Sun },
  { id: 'antiaging', label: 'Firming & Lines', Icon: Flower2 },
  { id: 'barrier', label: 'Barrier Repair', Icon: Wind },
];

// Accent colour for a category tile when it has no product photo to show.
const CATEGORY_ACCENT: Record<string, string> = {
  Serums: '#3b6cf5',
  Moisturizers: '#2a9d8f',
  Suncare: '#e9a23b',
  Cleansers: '#5b8def',
  Treatments: '#8e5bd6',
};

// Quiet placeholder cards with the same size as the real cards (see the skel rules in shop-home.css), so the page does not
// move when the products arrive.
function skeletonCards(count: number, deal = false) {
  return Array.from({ length: count }, (_, i) => (
    <span key={i} className={deal ? 'shop-home-skel-card is-deal' : 'shop-home-skel-card'}>
      <span className="shop-home-skel-media" />
      <span className="shop-home-skel-line is-short" />
      <span className="shop-home-skel-line" />
      <span className="shop-home-skel-line is-short" />
    </span>
  ));
}

// How far the home is scrolled. On a phone the screen scrolls inside .screen-content; on a desktop the window does.
function homeScrollY(): number {
  const screen = document.querySelector<HTMLElement>('.glowvai-root .screen-content');
  return Math.max(screen ? screen.scrollTop : 0, window.scrollY);
}

// Opens a screen from the home and records where the home was left, so Back returns to the same place. The app's own
// save reads only the inner screen scroller, which is still at the top on a desktop, so the home saves its real position.
function useHomeNavigate() {
  const { navigate, currentScreen, activeParams } = useApp();
  return (screen: ScreenName, params?: Record<string, string>) => {
    const y = homeScrollY();
    navigate(screen, params);
    rememberScroll(currentScreen, activeParams, y);
  };
}

function Notice({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="shop-home-notice" role="status">
      <strong>{title}</strong>
      <p>{children}</p>
      {action}
    </div>
  );
}

function Rail({
  title,
  onSeeAll,
  children,
}: {
  title: string;
  onSeeAll?: () => void;
  children: React.ReactNode;
}) {
  const railRef = useRef<HTMLDivElement>(null);

  const scrollRail = (dir: 1 | -1) => {
    const rail = railRef.current;
    rail?.scrollBy({ left: dir * rail.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <section className="shop-home-section">
      <div className="shop-home-section-head">
        <h2>{title}</h2>
        <div className="shop-home-section-actions">
          <button type="button" className="shop-home-arrow" onClick={() => scrollRail(-1)} aria-label={`Scroll ${title} left`}>
            <ChevronLeft size={14} />
          </button>
          <button type="button" className="shop-home-arrow" onClick={() => scrollRail(1)} aria-label={`Scroll ${title} right`}>
            <ChevronRight size={14} />
          </button>
          {onSeeAll && (
            <button type="button" className="shop-home-see-all" onClick={onSeeAll}>
              See All
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
      <div ref={railRef} className="shop-home-rail">
        {children}
      </div>
    </section>
  );
}

function ProductRail({ title, products }: { title: string; products: SkincareProduct[] }) {
  const navigate = useHomeNavigate();

  return (
    <Rail title={title} onSeeAll={() => navigate('shop-browse')}>
      {products.map((product) => (
        <div key={product.id} className="shop-home-rail-item">
          <ShopProductCard product={product} onOpen={(p) => navigate('shop-product', { productId: p.id })} />
        </div>
      ))}
    </Rail>
  );
}

function SkeletonRail({ title }: { title: string }) {
  return (
    <section className="shop-home-section" aria-busy="true">
      <div className="shop-home-section-head">
        <h2>{title}</h2>
      </div>
      <div className="shop-home-rail" aria-hidden="true">
        {skeletonCards(4)}
      </div>
      <span className="shop-home-sr">Loading products</span>
    </section>
  );
}

function DealCard({ product }: { product: SkincareProduct }) {
  const navigate = useHomeNavigate();
  const quantity = useCartStore((s) => s.items[product.id]?.quantity ?? 0);
  const addItem = useCartStore((s) => s.addItem);
  const discount = getDiscountPercent(product);

  return (
    <article className="shop-home-deal">
      {discount > 0 && <span className="shop-home-deal-badge">{discount}% OFF</span>}
      <button type="button" className="shop-home-deal-open" onClick={() => navigate('shop-product', { productId: product.id })}>
        <span className="shop-home-deal-media">
          <img src={getProductThumbUrl(product)} alt={product.name} width={400} height={400} loading="lazy" decoding="async" />
        </span>
        <small className="shop-home-deal-brand">{product.brand}</small>
        <span className="shop-home-deal-name">{product.name}</span>
        <span className="shop-home-deal-price">
          <b>{formatRupee(product.price)}</b>
          {product.originalPrice > product.price && <s>{formatRupee(product.originalPrice)}</s>}
        </span>
      </button>
      <button
        type="button"
        className="shop-home-deal-add"
        onClick={() => {
          // Products with sizes or shades are chosen on their page.
          if (product.variants?.length) {
            navigate('shop-product', { productId: product.id });
            return;
          }
          addItem({
            productId: product.id,
            name: product.name,
            brand: product.brand,
            image: getProductImageUrl(product),
            price: product.price,
            mrp: product.originalPrice,
          });
        }}
      >
        {product.variants?.length ? 'Choose +' : quantity > 0 ? `In cart · ${quantity}` : 'Add +'}
      </button>
    </article>
  );
}

// A category tile: the category's own product photo under a colour fade, with its real product count. Before the catalogue
// loads the count line is a placeholder of the same height; if the catalogue fails, the tile still opens the category.
// null: a placeholder while the catalogue loads. '': no count when the catalogue failed. Otherwise the real count.
function countLabel(loading: boolean, failed: boolean, n: number): string | null {
  if (loading) return null;
  if (failed) return '';
  return `${n} ${n === 1 ? 'product' : 'products'}`;
}

function CategoryCard({ tile, onOpen, count, isAll = false }: { tile: HomeCategoryTile | null; onOpen: () => void; count: string | null; isAll?: boolean }) {
  const label = isAll ? 'All Products' : tile?.label ?? '';
  const accent = (tile && CATEGORY_ACCENT[tile.id]) || '#1447e6';
  const photo = tile?.sample ? getProductThumbUrl(tile.sample, 600) : null;
  return (
    <button type="button" className="shop-home-category" onClick={onOpen} aria-label={count ? `${label}, ${count}` : label}>
      <span className="shop-home-category-tile" style={{ '--tile-accent': accent } as React.CSSProperties}>
        {photo ? <img src={photo} alt="" width={400} height={400} loading="lazy" decoding="async" /> : <span className="shop-home-category-fallback" aria-hidden="true">{isAll ? <Boxes size={28} /> : <Sparkles size={28} />}</span>}
        <span className="shop-home-category-shade" aria-hidden="true" />
        <span className="shop-home-category-meta">
          <strong className="shop-home-category-label">{label}</strong>
          {count === null ? <span className="shop-home-category-count is-placeholder" aria-hidden="true" /> : count && <span className="shop-home-category-count">{count}</span>}
        </span>
      </span>
    </button>
  );
}

// For Her / For Him drives the shared shoppingPreference state (same as the legacy home).
type Mode = 'women' | 'men';
type ShopHomeScreenProps = { embedded?: boolean };
type FestivalContent = {
  heroCopy: string;
  heroImage: string;
  categoryAtlas: string;
  categories: string[];
  promoTitle: string;
  promoCopy: string;
};

// The Navratri block is off until a festival is scheduled. Set to true to show it again.
const SHOW_FESTIVAL = false;

// Navratri copy and images carried over from the legacy home.
const FESTIVAL: Record<Mode, FestivalContent> = {
  women: {
    heroCopy: 'Beauty · Gifting · Festive Picks',
    heroImage: '/glowvai/assets/home/navratri-her-hero.png',
    categoryAtlas: '/glowvai/assets/home/navratri-her-categories.png',
    categories: ['Pooja Essentials', 'Skincare & Haircare', 'Makeup Essentials', 'Fragrances', 'Personal Care', 'Festive Gifts'],
    promoTitle: 'Navratri Specials · Shop the edit',
    promoCopy: 'Beauty · Skincare · Makeup · More',
  },
  men: {
    heroCopy: 'Style · Grooming · Festive Picks',
    heroImage: '/glowvai/assets/home/navratri-him-hero.png',
    categoryAtlas: '/glowvai/assets/home/navratri-him-categories.png',
    categories: ['Grooming & Skincare', 'Haircare', 'Fragrances', 'Shaving & Beard', 'Men’s Essentials', 'Festive Gifts'],
    promoTitle: 'Navratri Specials · Shop the edit',
    promoCopy: 'Grooming · Fragrances · More',
  },
};

// The scan card says only what the scan does in this build: on-device when that switch is on, otherwise sent to the analysis service.
const SCAN_PRIVACY = ON_DEVICE_INFERENCE_ENABLED
  ? 'Your photo is analysed on this device.'
  : 'Your photo is sent to GlowVai’s analysis service only to run this check.';

let sessionRecent: string[] | null = null;
function readSessionRecent(): string[] {
  if (sessionRecent === null) sessionRecent = readRecentlyViewed();
  return sessionRecent;
}

export const ShopHomeScreen: React.FC<ShopHomeScreenProps> = ({ embedded = false }) => {
  const catalog = useLiveCatalog();
  const ready = useCatalogReady();
  const feed = useProductFeedStatus();
  const loading = !ready && !feed.error;
  const failed = !ready && feed.error;
  const noProducts = ready && catalog.length === 0;

  const lists = useMemo(() => buildCatalogLists(catalog), [catalog]);
  const tiles = useMemo(() => categoryTiles(catalog), [catalog]);

  // The customer's history and quiz answers are read once per app session, not on every visit to the home. A product
  // opened from here would otherwise add a "Continue browsing" rail on Back and move the page under the customer.
  const [recentIds] = useState(() => readSessionRecent());
  const [skinState] = useState(() => firstVisitState(browserStore()));

  const continueCandidates = useMemo(() => {
    const byId = new Map(lists.FULL_SIZE_PRODUCTS.map((p) => [p.id, p] as const));
    return recentIds.map((id) => byId.get(id)).filter((p): p is SkincareProduct => Boolean(p)).slice(0, 10);
  }, [recentIds, lists.FULL_SIZE_PRODUCTS]);

  const picksCandidates = useMemo(
    () => (skinState.recommendationsOn ? skinMatchedPicks(lists.FULL_SIZE_PRODUCTS, skinState.concerns) : []),
    [skinState, lists.FULL_SIZE_PRODUCTS]
  );

  // Each product appears in one rail only, in this order.
  const rails = useMemo(() => {
    const candidates: RailCandidate[] = [
      { id: 'picks', title: 'Picked for your skin', products: picksCandidates, limit: 6 },
      { id: 'continue', title: 'Continue browsing', products: continueCandidates, limit: 10 },
      { id: 'top', title: 'Top Rated', products: lists.TOP_RATED, limit: 6 },
      { id: 'under500', title: 'Under ₹500', products: lists.UNDER_500, limit: 6 },
    ];
    return dedupeRails(candidates);
  }, [picksCandidates, continueCandidates, lists.TOP_RATED, lists.UNDER_500]);

  const navigate = useHomeNavigate();
  const { setShoppingPreference, shoppingPreference, currentAddress } = useApp();
  const totalCount = useCartStore((s) => s.totalCount);
  const mode: Mode = shoppingPreference === 'men' ? 'men' : 'women';
  const festival = FESTIVAL[mode];
  const [festivalSwitched, setFestivalSwitched] = useState(false);

  // Location and delivery time come from the selected delivery address, so the ETA always matches the place shown.
  const userLocation = [currentAddress?.area, currentAddress?.city].filter(Boolean).join(', ') || 'Set delivery location';
  const deliveryEta = currentAddress?.serviceable && currentAddress.deliveryMinutes > 0 ? currentAddress.deliveryMinutes : null;

  const switchMode = (next: Mode) => {
    if (next !== mode) {
      setFestivalSwitched(true);
      setShoppingPreference(next);
    }
  };

  const socials = configuredSocials(siteConfig.socials);

  return (
    <div className={`shop-screen shop-home zq-mode-${mode}`}>
      <header className="shop-home-top">
        <div className="shop-home-topbar">
          <div className="shop-home-location">
            <span className="shop-home-eta">
              <Zap size={16} fill="currentColor" />
              {deliveryEta ? `${deliveryEta} MINS` : 'DELIVER TO'}
            </span>
            {embedded ? (
              <span className="shop-home-location-btn is-static">
                <span>{userLocation}</span>
              </span>
            ) : (
              <button type="button" className="shop-home-location-btn" onClick={() => navigate('location-setup')}>
                <span>{userLocation}</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>
          <button type="button" className="shop-home-profile" onClick={() => navigate('profile-tab')} aria-label="Profile">
            <User size={18} />
          </button>
        </div>

        <div className="shop-home-search">
          <button type="button" className="shop-home-search-input" onClick={() => navigate('shop-search-filters')} aria-label="Search products">
            <Search size={18} />
            <span>Search "Niacinamide, Sunscreen & more"</span>
          </button>
          <button type="button" className="shop-home-ai-btn" onClick={() => navigate('scan-camera')} aria-label="Open skin scan">
            <ScanFace size={14} />
            Skin scan
          </button>
        </div>

        <div className="shop-home-chips" role="group" aria-label="Quick links">
          {QUICK_LINKS.map(({ label, Icon, screen, params }) => (
            <button key={label} type="button" className="shop-home-chip" onClick={() => navigate(screen, params)}>
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        <div className="shop-home-mode">
          <div className="zq-mode-toggle" data-mode={mode} role="group" aria-label="Shopping mode">
            <span className="zq-mode-thumb" aria-hidden="true" />
            <button type="button" aria-pressed={mode === 'women'} onClick={() => switchMode('women')}>
              <Venus size={17} />
              <span>For Her</span>
            </button>
            <button type="button" aria-pressed={mode === 'men'} onClick={() => switchMode('men')}>
              <Mars size={17} />
              <span>For Him</span>
            </button>
          </div>
        </div>
      </header>

      <SkinQuizBanner />

      <section className="shop-home-showcase">
        <img src={HERO_IMAGE} alt="GlowVAI skincare campaign" width={1891} height={831} fetchPriority="high" decoding="async" />
        <div className="shop-home-showcase-copy">
          <p className="shop-home-showcase-tag">Discover. Shop. Glow.</p>
          <h1>Glow your way.</h1>
          <p className="shop-home-showcase-sub">
            {deliveryEta ? `Skincare delivered in ${deliveryEta} mins.` : 'Skincare, delivered to your door.'}
          </p>
          <div className="shop-home-showcase-actions">
            <button type="button" className="shop-home-btn-dark" onClick={() => navigate('shop-browse')}>
              Shop now
              <ArrowRight size={16} />
            </button>
            <button type="button" className="shop-home-btn-light" onClick={() => navigate('scan-camera')}>
              <ScanFace size={16} />
              Skin scan
            </button>
          </div>
        </div>
      </section>

      {SHOW_FESTIVAL && <div key={mode} className={`shop-home-festival${festivalSwitched ? ' is-switched' : ''}`}>
        <section className="zq-festival" aria-label={`Navratri ${festival.heroCopy}`}>
          <button type="button" className="zq-festival-hero" onClick={() => navigate('shop-browse')}>
            <img src={festival.heroImage} alt="" />
            <span className="zq-festival-copy">
              <small>Celebrate</small>
              <strong>NAVRATRI</strong>
              <em>{festival.heroCopy}</em>
            </span>
          </button>
          <div className="zq-festival-grid">
            {festival.categories.map((title, index) => (
              <button key={title} type="button" onClick={() => navigate('shop-browse')}>
                <span className="zq-category-photo" style={{ backgroundImage: `url(${festival.categoryAtlas})`, '--category-index': index } as React.CSSProperties} />
                <b>{title}</b>
                <ChevronRight size={14} />
              </button>
            ))}
          </div>
          <button type="button" className="zq-festival-promo" onClick={() => navigate('shop-browse')}>
            <img src={festival.heroImage} alt="" width={1200} height={545} loading="lazy" decoding="async" />
            <span>
              <b>{festival.promoTitle}</b>
              <small>{festival.promoCopy}</small>
            </span>
            <ChevronRight size={19} />
          </button>
        </section>
      </div>}

      <HomeBanners />

      <section className="shop-home-categories-section" aria-labelledby="shop-home-categories-title">
        <div className="shop-home-section-head">
          <h2 id="shop-home-categories-title">Shop by category</h2>
        </div>
        <div className="shop-home-categories" aria-busy={loading}>
          {HOME_CATEGORY_TILES.map(({ id }) => {
            const tile = tiles.find((t) => t.id === id) ?? null;
            return <CategoryCard key={id} tile={tile} count={countLabel(loading, failed, tile?.count ?? 0)} onOpen={() => navigate('shop-category', { categoryId: id })} />;
          })}
          <CategoryCard tile={null} isAll count={countLabel(loading, failed, catalog.length)} onOpen={() => navigate('shop-browse')} />
        </div>
      </section>

      <section className="shop-home-promos" aria-label="Offers">
        <button type="button" className="shop-home-promo is-dark" onClick={() => navigate('shop-browse')}>
          <span className="shop-home-promo-kicker">Delivery</span>
          <span className="shop-home-promo-title">Free delivery above ₹{FREE_DELIVERY_ABOVE}</span>
          <span className="shop-home-promo-sub">Applied automatically at checkout.</span>
          <span className="shop-home-promo-icon">
            <Truck size={18} />
          </span>
        </button>
        <button type="button" className="shop-home-promo is-light" onClick={() => navigate('cart-tab')}>
          <span className="shop-home-promo-kicker">Coupon</span>
          <span className="shop-home-promo-title">Flat ₹{COUPON_VALUES.GLOW50} off</span>
          <span className="shop-home-promo-sub">Enter code GLOW50 in your cart.</span>
          <span className="shop-home-promo-icon">
            <Ticket size={18} />
          </span>
        </button>
      </section>

      {!failed && (
        <section className="shop-home-section" aria-labelledby="shop-home-deals-title">
          <div className="shop-home-section-head">
            <div className="shop-home-section-titles">
              <h2 id="shop-home-deals-title">Deals</h2>
              <p>Products priced below their listed MRP</p>
            </div>
            <button type="button" className="shop-home-see-all" onClick={() => navigate('shop-browse')}>
              View all
              <ChevronRight size={14} />
            </button>
          </div>
          {loading ? (
            <div className="shop-home-deals" aria-busy="true" aria-hidden="true">
              {skeletonCards(4, true)}
            </div>
          ) : lists.DEAL_PRODUCTS.length > 0 ? (
            <div className="shop-home-deals">
              {lists.DEAL_PRODUCTS.map((product) => (
                <DealCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <p className="shop-home-empty">No discounted products right now.</p>
          )}
        </section>
      )}

      {failed ? (
        <Notice
          title="Products could not be loaded"
          action={
            <button type="button" className="shop-home-retry" onClick={() => feed.retry()}>
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
          {loading && skinState.recommendationsOn && <SkeletonRail title="Picked for your skin" />}
          {loading && recentIds.length > 0 && <SkeletonRail title="Continue browsing" />}
          {rails.map((rail) => (
            <ProductRail key={rail.id} title={rail.title} products={rail.products} />
          ))}
          {loading && <SkeletonRail title="Top Rated" />}
          {loading && <SkeletonRail title="Under ₹500" />}
        </>
      )}

      <section className="shop-home-section" aria-labelledby="shop-home-concerns-title">
        <div className="shop-home-section-head">
          <h2 id="shop-home-concerns-title">Shop by Concern</h2>
          <button type="button" className="shop-home-see-all" onClick={() => navigate('shop-browse')}>
            See All
            <ChevronRight size={14} />
          </button>
        </div>
        <div className="shop-home-concerns">
          {CONCERNS.map(({ id, label, Icon }) => (
            <button key={id} type="button" className="shop-home-concern" onClick={() => navigate('shop-browse', { concern: id })}>
              <span className="shop-home-concern-icon">
                <Icon size={14} />
              </span>
              <strong>{label}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="shop-home-scan" aria-labelledby="shop-home-scan-title">
        <span className="shop-home-scan-tag">
          <ScanFace size={12} />
          FACE SCAN
        </span>
        <h2 id="shop-home-scan-title">
          Find the routine that
          <br />
          <span>fits your skin</span>
        </h2>
        <p className="shop-home-scan-body">Take or upload one clear photo in even light. The check suggests a skin type and up to five visible concerns, then matches products to them.</p>
        <p className="shop-home-scan-privacy">
          <ShieldCheck size={15} aria-hidden="true" />
          <span>{SCAN_PRIVACY}</span>
        </p>
        <p className="shop-home-scan-note">This is a cosmetic check. It is not a medical diagnosis or a clinical test.</p>
        <button type="button" className="shop-home-scan-btn" onClick={() => navigate('scan-camera')}>
          Start skin check
          <ArrowRight size={16} />
        </button>
      </section>

      <section className="shop-home-end">
        <Sparkles size={32} />
        <h2>You've seen it all!</h2>
        <p>Browse the full catalogue</p>
        <button type="button" className="shop-home-end-btn" onClick={() => navigate('shop-browse')}>
          Explore full catalogue
          <ArrowRight size={16} />
        </button>
      </section>

      <footer className="shop-home-footer" aria-label="Site footer">
        <div className="shop-home-footer-inner">
          <div className="shop-home-footer-brand">
            <span className="shop-home-footer-logo">
              <Sparkles size={16} aria-hidden="true" />
              <strong>GlowVai</strong>
            </span>
            <p>Skincare, delivered.</p>
            {socials.length > 0 && (
              <ul className="shop-home-footer-social" aria-label="Social media">
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
          <nav className="shop-home-footer-cols" aria-label="Footer links">
            {HOME_FOOTER_GROUPS.map((group) => (
              <section key={group.title} className="shop-home-footer-col">
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
        <div className="shop-home-footer-bottom">
          <span>© 2026 GlowVai</span>
        </div>
      </footer>

      {totalCount > 0 && (
        <button type="button" className="shop-home-cart-pill" onClick={() => navigate('cart-tab')}>
          <ShoppingBag size={16} />
          <span>
            {totalCount} item{totalCount > 1 ? 's' : ''}
          </span>
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
};

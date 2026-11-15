import React, { useRef } from 'react';
import { ArrowRight, Bell, Boxes, ChevronDown, ChevronLeft, ChevronRight, Droplets, FlaskConical, MapPin, Mars, Package, Pipette, ScanFace, Search, ShieldCheck, ShoppingCart, Sparkles, Sun, Ticket, Truck, User, Venus, Waves } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import type { SkincareProduct } from '../../../core/data/indianSkincareCatalog';
import { useCartStore } from '../../../core/state/cartStore';
import { useInbox } from '../../../core/notifications/inboxStore';
import { siteConfig } from '../../../../config/site';
import { COUPON_VALUES, FREE_DELIVERY_ABOVE } from '../../../shared/pricing-rules.mjs';
import { itemsLabel, useShellCart } from '../../../components/common/useShellCart';
import { ShopProductCard } from '../shared/ShopProductCard';
import { SkinQuizBanner } from '../shared/SkinQuizBanner';
import { HomeBanners } from '../shared/HomeBanners';
import { SearchHint } from '../shared/SearchHint';
import { VoiceSearchButton } from '../shared/VoiceSearchButton';
import { MiniBannersPlaceholder, OffersStripPlaceholder, FlashDealsPlaceholder, FlashSaleStrip, BrandStripPlaceholder, TrustBlockPlaceholder, HelpGiftPlaceholder } from '../shared/HomePlaceholders';
import { useHomeLayout, type BlockItem, type HomeBlockId } from '../lib/useHomeLayout';
import { useHomeData } from '../lib/useHomeData';
import { CATEGORY_ACCENT, CONCERNS, HERO_IMAGE, SCAN_PRIVACY, countLabel, useHomeNavigate, useReorderProducts } from '../lib/homeCommon';
import { HOME_CATEGORY_TILES, HOME_FOOTER_GROUPS, configuredSocials, mergeFooterSocials } from '../lib/homeModel';
import type { HomeCategoryTile } from '../lib/homeModel';
import { formatRupee, getDiscountPercent, getProductImageUrl, getProductThumbUrl } from '../shared/shopUtils';
import '../styles/shop-desktop-home.css';

// The desktop home (screens 1024px wide and more, or ?device=desktop). It renders the desktop layout the GlowVai team
// designed in the admin (device=desktop; the mobile layout when none is saved), in the admin's order, with the same 12
// blocks as the mobile home. The look follows the big quick-commerce sites on a PC: one wide header (logo, delivery time
// and place, a wide search, account and cart), a row of category tabs, a wide hero, a wide category grid and product rails
// that show many cards at once. The content and the data are the mobile home's (useHomeData, homeCommon).

const CATEGORY_ICON: Record<string, LucideIcon> = {
  Serums: Pipette,
  Moisturizers: Droplets,
  Suncare: Sun,
  Cleansers: Waves,
  Treatments: FlaskConical,
};

// A light tint of a tile's accent colour (a #rrggbb colour with a low alpha).
const tint = (hex: string) => `${hex}1f`;

type Mode = 'women' | 'men';

function skeletonCards(count: number) {
  return Array.from({ length: count }, (_, i) => (
    <span key={i} className="shop-desk-skel-card">
      <span className="shop-desk-skel-media" />
      <span className="shop-desk-skel-line is-short" />
      <span className="shop-desk-skel-line" />
      <span className="shop-desk-skel-line is-short" />
    </span>
  ));
}

function SectionHead({ id, title, sub, action }: { id?: string; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="shop-desk-head">
      <div className="shop-desk-head-titles">
        <h2 id={id}>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {action && <div className="shop-desk-head-actions">{action}</div>}
    </div>
  );
}

function SeeAll({ label = 'See all', onClick }: { label?: string; onClick: () => void }) {
  return (
    <button type="button" className="shop-desk-see-all" onClick={onClick}>
      {label}
      <ChevronRight size={16} />
    </button>
  );
}

// A product rail: one row of cards that scrolls sideways inside itself, with arrows in the head.
function DeskRail({ title, onSeeAll, children, busy = false }: { title: string; onSeeAll?: () => void; children: React.ReactNode; busy?: boolean }) {
  const railRef = useRef<HTMLDivElement>(null);
  const scrollRail = (dir: 1 | -1) => {
    const rail = railRef.current;
    rail?.scrollBy({ left: dir * rail.clientWidth * 0.85, behavior: 'smooth' });
  };
  return (
    <section className="shop-desk-section" aria-busy={busy || undefined}>
      <SectionHead
        title={title}
        action={
          <>
            <button type="button" className="shop-desk-arrow" onClick={() => scrollRail(-1)} aria-label={`Scroll ${title} left`}>
              <ChevronLeft size={18} />
            </button>
            <button type="button" className="shop-desk-arrow" onClick={() => scrollRail(1)} aria-label={`Scroll ${title} right`}>
              <ChevronRight size={18} />
            </button>
            {onSeeAll && <SeeAll onClick={onSeeAll} />}
          </>
        }
      />
      <div ref={railRef} className="shop-desk-rail">
        {children}
      </div>
    </section>
  );
}

function DeskProductRail({ title, products }: { title: string; products: SkincareProduct[] }) {
  const navigate = useHomeNavigate();
  return (
    <DeskRail title={title} onSeeAll={() => navigate('shop-browse')}>
      {products.map((product) => (
        <div key={product.id} className="shop-desk-rail-item">
          <ShopProductCard product={product} onOpen={(p) => navigate('shop-product', { productId: p.id })} />
        </div>
      ))}
    </DeskRail>
  );
}

function DeskSkeletonRail({ title }: { title: string }) {
  return (
    <section className="shop-desk-section" aria-busy="true">
      <SectionHead title={title} />
      <div className="shop-desk-rail" aria-hidden="true">
        {skeletonCards(7)}
      </div>
      <span className="shop-desk-sr">Loading products</span>
    </section>
  );
}

function DeskReorderRail({ catalog }: { catalog: SkincareProduct[] }) {
  const products = useReorderProducts(catalog);
  if (products.length === 0) return null;
  return <DeskProductRail title="Buy it again" products={products} />;
}

function DeskDealCard({ product }: { product: SkincareProduct }) {
  const navigate = useHomeNavigate();
  const quantity = useCartStore((s) => s.items[product.id]?.quantity ?? 0);
  const addItem = useCartStore((s) => s.addItem);
  const discount = getDiscountPercent(product);
  return (
    <article className="shop-desk-deal">
      {discount > 0 && <span className="shop-desk-deal-badge">{discount}% OFF</span>}
      <button type="button" className="shop-desk-deal-open" onClick={() => navigate('shop-product', { productId: product.id })}>
        <span className="shop-desk-deal-media">
          <img src={getProductThumbUrl(product)} alt={product.name} width={400} height={400} loading="lazy" decoding="async" />
        </span>
        <small className="shop-desk-deal-brand">{product.brand}</small>
        <span className="shop-desk-deal-name">{product.name}</span>
      </button>
      <div className="shop-desk-deal-foot">
        <span className="shop-desk-deal-price">
          <b>{formatRupee(product.price)}</b>
          {product.originalPrice > product.price && <s>{formatRupee(product.originalPrice)}</s>}
        </span>
        <button
          type="button"
          className={`shop-desk-deal-add${quantity > 0 ? ' is-in-cart' : ''}`}
          onClick={() => {
            // Products with sizes or shades are chosen on their page.
            if (product.variants?.length) {
              navigate('shop-product', { productId: product.id });
              return;
            }
            addItem({ productId: product.id, name: product.name, brand: product.brand, image: getProductImageUrl(product), price: product.price, mrp: product.originalPrice });
          }}
        >
          {product.variants?.length ? 'CHOOSE' : quantity > 0 ? `IN CART · ${quantity}` : 'ADD'}
        </button>
      </div>
    </article>
  );
}

// A category tile: the category's product photo on a light tint of its colour, the name and the real product count below.
function DeskCategoryTile({ tile, onOpen, count, isAll = false }: { tile: HomeCategoryTile | null; onOpen: () => void; count: string | null; isAll?: boolean }) {
  const label = isAll ? 'All Products' : tile?.label ?? '';
  const accent = (tile && CATEGORY_ACCENT[tile.id]) || '#0057fb';
  const photo = tile?.sample ? getProductThumbUrl(tile.sample, 400) : null;
  const Icon = isAll ? Boxes : (tile && CATEGORY_ICON[tile.id]) || Sparkles;
  return (
    <button type="button" className="shop-desk-cat" onClick={onOpen} aria-label={count ? `${label}, ${count}` : label}>
      <span className="shop-desk-cat-media" style={{ background: tint(accent), color: accent }}>
        {photo ? <img src={photo} alt="" width={240} height={240} loading="lazy" decoding="async" /> : <Icon size={34} aria-hidden="true" />}
      </span>
      <strong>{label}</strong>
      {count === null ? <span className="shop-desk-cat-count is-placeholder" aria-hidden="true" /> : count && <small className="shop-desk-cat-count">{count}</small>}
    </button>
  );
}

function DeskAdminCategoryTile({ item, onOpen }: { item: BlockItem; onOpen: () => void }) {
  return (
    <button type="button" className="shop-desk-cat" onClick={onOpen} aria-label={item.sub ? `${item.label}, ${item.sub}` : item.label}>
      <span className="shop-desk-cat-media" style={{ background: tint('#0057fb'), color: '#0057fb' }}>
        {item.image ? <img src={item.image} alt="" width={240} height={240} loading="lazy" decoding="async" /> : <Sparkles size={34} aria-hidden="true" />}
      </span>
      <strong>{item.label}</strong>
      {item.sub && <small className="shop-desk-cat-count">{item.sub}</small>}
    </button>
  );
}

function DeskAdminPromo({ item, onOpen }: { item: BlockItem; onOpen: () => void }) {
  return (
    <button type="button" className={`shop-desk-promo is-dark${item.image ? ' has-picture' : ''}`} onClick={onOpen}>
      {item.image && <img className="shop-desk-promo-image" src={item.image} alt="" width={600} height={300} loading="lazy" decoding="async" />}
      {item.image && <span className="shop-desk-promo-shade" aria-hidden="true" />}
      <span className="shop-desk-promo-title">{item.label}</span>
      {item.sub && <span className="shop-desk-promo-sub">{item.sub}</span>}
      <span className="shop-desk-promo-icon">
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

  // Location and delivery time come from the selected delivery address, so the ETA always matches the place shown.
  const userLocation = [currentAddress?.area, currentAddress?.city].filter(Boolean).join(', ') || 'Set delivery location';
  const deliveryEta = currentAddress?.serviceable && currentAddress.deliveryMinutes > 0 ? currentAddress.deliveryMinutes : null;

  const socials = configuredSocials(mergeFooterSocials(siteConfig.socials, footerDetails));
  const storeLinks = [
    { label: 'App Store', url: footerDetails.appStoreUrl },
    { label: 'Google Play', url: footerDetails.playStoreUrl },
  ].filter((s) => s.url !== '');

  const openLink = (link: string) => (link ? window.location.assign(link) : navigate('shop-browse'));

  const renderBlock = (id: HomeBlockId): React.ReactNode => {
    switch (id) {
      case 'hero':
        return (
          <>
            <section className="shop-desk-hero" aria-labelledby="shop-desk-hero-title">
              <img src={heroOverride?.image || HERO_IMAGE} alt={heroOverride?.image && heroOverride.title ? heroOverride.title : 'GlowVAI skincare campaign'} width={1891} height={831} fetchPriority="high" decoding="async" />
              <div className="shop-desk-hero-copy">
                <p className="shop-desk-hero-tag">Discover. Shop. Glow.</p>
                <h1 id="shop-desk-hero-title">{heroOverride?.title || 'Glow your way.'}</h1>
                <p className="shop-desk-hero-sub">{heroOverride?.subtitle || (deliveryEta ? `Skincare delivered in ${deliveryEta} mins.` : 'Skincare, delivered to your door.')}</p>
                <div className="shop-desk-hero-actions">
                  <button type="button" className="shop-desk-btn-light" onClick={() => (heroOverride?.ctaLink ? window.location.assign(heroOverride.ctaLink) : navigate('shop-browse'))}>
                    {heroOverride?.ctaLabel || 'Shop now'}
                    <ArrowRight size={16} />
                  </button>
                  <button type="button" className="shop-desk-btn-ghost" onClick={() => navigate('scan-camera')}>
                    <ScanFace size={16} />
                    Skin scan
                  </button>
                </div>
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
            <SectionHead id="shop-desk-categories-title" title="Shop by Category" action={<SeeAll onClick={() => navigate('shop-browse')} />} />
            <div className="shop-desk-cats" aria-busy={loading}>
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
          <section className="shop-desk-promos" aria-label="Offers">
            {adminPromos.length > 0 ? (
              adminPromos.map((item, i) => <DeskAdminPromo key={`${i}-${item.label}`} item={item} onOpen={() => openLink(item.link)} />)
            ) : (
              <>
                <button type="button" className="shop-desk-promo is-dark" onClick={() => navigate('shop-browse')}>
                  <span className="shop-desk-promo-kicker">Delivery</span>
                  <span className="shop-desk-promo-title">Free delivery above ₹{FREE_DELIVERY_ABOVE}</span>
                  <span className="shop-desk-promo-sub">Applied automatically at checkout.</span>
                  <span className="shop-desk-promo-icon">
                    <Truck size={18} />
                  </span>
                </button>
                <button type="button" className="shop-desk-promo is-light" onClick={() => navigate('cart-tab')}>
                  <span className="shop-desk-promo-kicker">Coupon</span>
                  <span className="shop-desk-promo-title">Flat ₹{COUPON_VALUES.GLOW50} off</span>
                  <span className="shop-desk-promo-sub">Enter code GLOW50 in your cart.</span>
                  <span className="shop-desk-promo-icon">
                    <Ticket size={18} />
                  </span>
                </button>
              </>
            )}
          </section>
        );
      case 'deals':
        return (
          <>
            {!failed && (
              <section className="shop-desk-section" aria-labelledby="shop-desk-deals-title">
                <SectionHead
                  id="shop-desk-deals-title"
                  title="Deals"
                  sub={adminDeals.length > 0 ? 'Picked by GlowVAI' : 'Products priced below their listed MRP'}
                  action={<SeeAll label="View all" onClick={() => navigate('shop-browse')} />}
                />
                {loading ? (
                  <div className="shop-desk-deals" aria-busy="true" aria-hidden="true">
                    {skeletonCards(4)}
                  </div>
                ) : dealProducts.length > 0 ? (
                  <div className="shop-desk-deals">
                    {dealProducts.map((product) => (
                      <DeskDealCard key={product.id} product={product} />
                    ))}
                  </div>
                ) : (
                  <p className="shop-desk-empty">No discounted products right now.</p>
                )}
              </section>
            )}
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
                {loading && skinState.recommendationsOn && <DeskSkeletonRail title="Picked for your skin" />}
                {loading && recentIds.length > 0 && <DeskSkeletonRail title="Continue browsing" />}
                {(configuredRows.length > 0 ? configuredRows : rails).map((rail) => (
                  <DeskProductRail key={rail.id} title={rail.title} products={rail.products} />
                ))}
                {loading && <DeskSkeletonRail title="Top Rated" />}
                {loading && <DeskSkeletonRail title="Under ₹500" />}
              </>
            )}
            <section className="shop-desk-section" aria-labelledby="shop-desk-concerns-title">
              <SectionHead id="shop-desk-concerns-title" title="Shop by Concern" action={<SeeAll onClick={() => navigate('shop-browse')} />} />
              <div className="shop-desk-concerns">
                {CONCERNS.map(({ id: concernId, label, Icon }) => (
                  <button key={concernId} type="button" className="shop-desk-concern" onClick={() => navigate('shop-browse', { concern: concernId })}>
                    <span className="shop-desk-concern-icon">
                      <Icon size={18} />
                    </span>
                    <strong>{label}</strong>
                    <ChevronRight size={16} aria-hidden="true" />
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
        <div className="shop-desk-scan-copy">
          <span className="shop-desk-scan-tag">
            <ScanFace size={14} />
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
            <ArrowRight size={16} />
          </button>
        </div>
      </section>
      <section className="shop-desk-end">
        <Sparkles size={28} />
        <h2>You've seen it all!</h2>
        <p>Browse the full catalogue</p>
        <button type="button" className="shop-desk-end-btn" onClick={() => navigate('shop-browse')}>
          Explore full catalogue
          <ArrowRight size={16} />
        </button>
      </section>
    </>
  );

  return (
    <div className={`shop-screen shop-desk zq-mode-${mode}`}>
      <header className="shop-desk-header">
        <div className="shop-desk-header-inner">
          <button type="button" className="shop-desk-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="glowvai shop home">
            <img src="/logo/glowvai-logo.svg" alt="" width={36} height={36} />
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
              <Search size={18} />
              <SearchHint />
            </button>
            <VoiceSearchButton onResult={(text) => navigate('shop-search-filters', { q: text })} />
          </div>
          <nav className="shop-desk-actions" aria-label="Account and cart">
            <button type="button" className="shop-desk-action is-optional" onClick={() => navigate('scan-camera')} title="Skin scan">
              <ScanFace size={20} aria-hidden="true" />
              <span>Skin scan</span>
            </button>
            <button type="button" className="shop-desk-action is-optional" onClick={() => navigate('orders-list')} title="Orders">
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
          <nav className="shop-desk-tabs" aria-label="Categories">
            <button type="button" className="shop-desk-tab" aria-current="page">
              <Boxes size={20} aria-hidden="true" />
              <span>All</span>
            </button>
            {HOME_CATEGORY_TILES.map(({ id: categoryId, label }) => {
              const Icon = CATEGORY_ICON[categoryId] ?? Sparkles;
              return (
                <button key={categoryId} type="button" className="shop-desk-tab" onClick={() => navigate('shop-category', { categoryId })}>
                  <Icon size={20} aria-hidden="true" />
                  <span>{label}</span>
                </button>
              );
            })}
            <button type="button" className="shop-desk-tab" onClick={() => navigate('shop-browse')}>
              <Sparkles size={20} aria-hidden="true" />
              <span>Shop all</span>
            </button>
          </nav>
          <div className="zq-mode-toggle shop-desk-mode" data-mode={mode} role="group" aria-label="Shopping mode">
            <span className="zq-mode-thumb" aria-hidden="true" />
            <button type="button" aria-pressed={mode === 'women'} onClick={() => setShoppingPreference('women')}>
              <Venus size={16} />
              <span>For Her</span>
            </button>
            <button type="button" aria-pressed={mode === 'men'} onClick={() => setShoppingPreference('men')}>
              <Mars size={16} />
              <span>For Him</span>
            </button>
          </div>
        </div>
      </header>

      <div className="shop-desk-main">
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
  );
};

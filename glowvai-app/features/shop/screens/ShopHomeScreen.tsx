import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Boxes, ChevronRight, ScanFace, ShieldCheck, ShoppingBag, PackagePlus, Star, Zap } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import type { SkincareProduct } from '../../../core/data/indianSkincareCatalog';
import { useCartStore } from '../../../core/state/cartStore';
import { useCustomerStore } from '../../../core/state/customerStore';
import { useInbox } from '../../../core/notifications/inboxStore';
import { siteConfig } from '../../../../config/site';
import { BrandLogo } from '../../../shared/BrandLogo';
import { SkinQuizBanner } from '../shared/SkinQuizBanner';
import { ITEM_BLOCK_IDS, useHomeDevice, useHomeLayout, type BlockItem, type BlockSettings, type HeroOverride, type HomeBlockId, type ItemBlockId } from '../lib/useHomeLayout';
import { NewItemBlock } from '../shared/NewBlocks';
import { useHomeData } from '../lib/useHomeData';
import { skinMatchedPicks } from '../lib/firstVisit';
import { CONCERNS, SCAN_PRIVACY, useHomeNavigate, useReorderProducts } from '../lib/homeCommon';
import { ShopDesktopHome } from './ShopDesktopHome';
import { MiniBannersPlaceholder, OffersStripPlaceholder, FlashDealsPlaceholder, BrandStripPlaceholder, TrustBlockPlaceholder, HelpGiftPlaceholder } from '../shared/HomePlaceholders';
import { HOME_CATEGORY_TILES, HOME_FOOTER_GROUPS, clampMaxItems, configuredSocials, homeSequence, mergeFooterSocials, recommendedProducts, type HomeModuleId } from '../lib/homeModel';
import { getProductThumbUrl } from '../shared/shopUtils';
import { activeOrder, deliveryCell, greetingLine, homeTab, matchesConcern, soonestLiveSale, type HomeTab } from '../mobile/homeChrome';
import { itemAccent, sectionAccent } from '../mobile/accentTheme';
import {
  ALL_ICON,
  BrandsBlock,
  CardRail,
  CategoryTile,
  ConcernGrid,
  ConcernPicks,
  EndsInPill,
  FlashSaleRows,
  GreetingCard,
  HelpGiftBlock,
  HeroCarousel,
  MobileHomeHeader,
  OffersBlock,
  PricePoints,
  ProductRow,
  PromosBlock,
  SectionHead,
  SkeletonRow,
  TrendingBlock,
  TrustBlock,
  useFlashSales,
  useOpenLink,
  useTicker,
} from '../mobile/MobileHomeParts';
import '../styles/shop-home.css';
import '../mobile/mobile-home.css';
import '../styles/shop-type.css';

// Admin settings and items may carry an accent ("#RRGGBB", lib/shop/accents.ts); the layout types do not list it.
type Accented = { accent?: string };

function Notice({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="shop-home-notice gvh-notice" role="status">
      <strong>{title}</strong>
      <p>{children}</p>
      {action}
    </div>
  );
}

// "Buy it again": the customer's recent products, from the live catalogue. Shows nothing when the customer is not signed in,
// has no orders, or the request fails.
function ReorderRail({ catalog, accent }: { catalog: SkincareProduct[]; accent: string }) {
  const products = useReorderProducts(catalog);
  return <ProductRow title="Buy it again" sub="From your recent orders" products={products} accent={accent} />;
}

type ShopHomeScreenProps = { embedded?: boolean };

// The mobile-web home (screens under 1024px, and the home inside the skin report), drawn to the premium reference: a
// header with the wordmark, location, search, notifications and account, concern tabs that tint the header in their
// accent, a greeting card with the delivery estimate and Track Order, then the blocks in the order the admin published.
// Content, pictures, on/off and accents come from the admin layout; empty admin slots show nothing (placeholders only in
// a staff preview), as before.
export const ShopMobileHome: React.FC<ShopHomeScreenProps> = ({ embedded = false }) => {
  const { order: layoutOrder, settings: blockSettings, rows: layoutRows, hero: heroOverride, footer: footerDetails, header: headerSettings } = useHomeLayout('mobile');
  const { catalog, feed, loading, failed, noProducts, tiles, recentIds, skinState, bestsellers, newLaunches, picks, pricePoints, recentProducts, configuredRows, adminDeals, dealProducts } = useHomeData({ settings: blockSettings, rows: layoutRows });
  // The category tiles the admin published. None published means the built-in tiles.
  const adminCategories = blockSettings['categories']?.items ?? [];

  const navigate = useHomeNavigate();
  const openLink = useOpenLink();
  const { currentAddress, customerDetails, user, accountSignedIn } = useApp();
  const totalCount = useCartStore((s) => s.totalCount);
  const unread = useInbox((s) => s.unreadCount);
  const orders = useCustomerStore((s) => s.orders);
  const [tab, setTab] = useState<HomeTab>(() => homeTab('for-you'));

  // "Track Order" needs the signed-in customer's orders; the list is loaded once if no screen has loaded it yet.
  useEffect(() => {
    if (accountSignedIn && useCustomerStore.getState().ordersStatus === 'idle') void useCustomerStore.getState().loadOrders();
  }, [accountSignedIn]);

  // Location and delivery time come from the selected delivery address, so the ETA always matches the place shown.
  const area = [currentAddress?.area, currentAddress?.city].filter(Boolean).join(', ');
  const userLocation = (currentAddress?.area || currentAddress?.city || '').trim() || 'Set location';
  const deliveryEta = currentAddress?.serviceable && currentAddress.deliveryMinutes > 0 ? currentAddress.deliveryMinutes : null;
  const name = customerDetails?.fullName || user?.name || '';
  const initial = (name.trim().match(/\p{L}/u)?.[0] ?? '').toUpperCase();
  const onTheWay = useMemo(() => activeOrder(orders), [orders]);

  // Flash sales: the soonest-ending live sale puts its countdown on the deals title; each sale also gets its own row.
  const sales = useFlashSales();
  const now = useTicker(sales.length > 0, 30_000);
  const soonest = soonestLiveSale(sales, now);

  // A concern tab narrows the picks shown under the greeting.
  const concernProducts = useMemo(() => (tab.concern ? catalog.filter((p) => matchesConcern(p, tab.concern)) : []), [catalog, tab.concern]);

  // Recently viewed and Recommended (designer blocks): both hide when empty and honour the block's maxItems (default 8).
  const recentMax = clampMaxItems(blockSettings['recently-viewed']?.maxItems);
  const recommendedMax = clampMaxItems(blockSettings['recommended']?.maxItems);
  const recentList = useMemo(() => {
    const byId = new Map(catalog.map((p) => [p.id, p] as const));
    return recentIds.map((id) => byId.get(id)).filter((p): p is SkincareProduct => Boolean(p)).slice(0, recentMax);
  }, [catalog, recentIds, recentMax]);
  const recommendedList = useMemo(
    () => recommendedProducts(catalog, recentIds, skinState.recommendationsOn ? skinMatchedPicks(catalog, skinState.concerns, 12) : [], recommendedMax),
    [catalog, recentIds, skinState, recommendedMax]
  );

  const accentOf = (id: HomeBlockId) => sectionAccent(id, (blockSettings[id] as (BlockSettings & Accented) | undefined)?.accent);
  const settingsOf = (id: HomeBlockId) => blockSettings[id] as (BlockSettings & Accented) | undefined;
  const hasItems = (id: HomeBlockId) => (blockSettings[id]?.items.length ?? 0) > 0;

  const socials = configuredSocials(mergeFooterSocials(siteConfig.socials, footerDetails));
  const storeLinks = [
    { label: 'App Store', url: footerDetails.appStoreUrl },
    { label: 'Google Play', url: footerDetails.playStoreUrl },
  ].filter((s) => s.url !== '');

  // Each homepage block. The order comes from the admin layout (useHomeLayout).
  // Scrolls to a rail of this page (the Best sellers and New launches category tiles).
  const jumpTo = (elementId: string) => {
    const el = document.getElementById(elementId);
    if (!el) return navigate('shop-browse');
    let reduce = false;
    try {
      reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      // Smooth scrolling stays on.
    }
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };

  const renderBlock = (id: HomeModuleId): React.ReactNode => {
    switch (id) {
      case 'hero':
        return <HeroCarousel hero={heroOverride as (HeroOverride & Accented) | null} deliveryEta={deliveryEta} accent={(heroOverride as (HeroOverride & Accented) | null)?.accent || accentOf('hero')} />;
      case 'mini-banners':
        // Shown as "Trending" tiles once the admin publishes items; a placeholder only in a staff preview.
        return hasItems('mini-banners') ? <TrendingBlock settings={settingsOf('mini-banners')!} accent={accentOf('mini-banners')} onOpenLink={openLink} /> : <MiniBannersPlaceholder settings={blockSettings['mini-banners']} />;
      case 'offers':
        return hasItems('offers') ? <OffersBlock settings={settingsOf('offers')!} accent={accentOf('offers')} onOpenLink={openLink} /> : <OffersStripPlaceholder settings={blockSettings['offers']} />;
      case 'categories':
        return (
          <section className="gvh-section gvh-cats-section" aria-labelledby="shop-home-categories-title">
            <SectionHead id="shop-home-categories-title" title={blockSettings['categories']?.title || 'Shop by category'} accent={accentOf('categories')} onSeeAll={() => navigate('shop-browse')} />
            <div className="gvh-cats" aria-busy={loading}>
              {adminCategories.length > 0
                ? adminCategories.map((item: BlockItem, i) => (
                    <CategoryTile key={`${i}-${item.label}`} label={item.label} sub={item.sub} image={item.image} accent={itemAccent(item as BlockItem & Accented, i)} onOpen={() => openLink(item.link)} />
                  ))
                : (
                  <>
                    {HOME_CATEGORY_TILES.map(({ id: categoryId, label }, i) => {
                      const tile = tiles.find((t) => t.id === categoryId) ?? null;
                      const count = loading || failed ? null : `${tile?.count ?? 0} ${tile?.count === 1 ? 'product' : 'products'}`;
                      return (
                        <CategoryTile
                          key={categoryId}
                          label={label}
                          sub={count}
                          image={tile?.sample ? getProductThumbUrl(tile.sample, 300) : null}
                          accent={itemAccent({ label }, i)}
                          onOpen={() => navigate('shop-category', { categoryId })}
                        />
                      );
                    })}
                    {bestsellers.length > 0 && <CategoryTile label="Best sellers" Icon={Star} accent={itemAccent({ label: 'Best sellers' }, 5)} onOpen={() => jumpTo('gvh-bestsellers-title')} />}
                    {newLaunches.length > 0 && <CategoryTile label="New launches" Icon={PackagePlus} accent={itemAccent({ label: 'New launches' }, 6)} onOpen={() => jumpTo('gvh-new-title')} />}
                    <CategoryTile label="Shop all" Icon={ALL_ICON} accent={itemAccent({ label: 'Shop all' }, 7)} onOpen={() => navigate('shop-browse')} />
                  </>
                )}
            </div>
          </section>
        );
      case 'promos':
        return <PromosBlock settings={settingsOf('promos')} onOpenLink={openLink} />;
      case 'deals':
        return (
          <>
            {!failed && (
              <section className="gvh-section" aria-labelledby="shop-home-deals-title">
                <SectionHead
                  id="shop-home-deals-title"
                  title={blockSettings['deals']?.title || 'Flash Deals'}
                  sub={adminDeals.length > 0 ? 'Picked by GlowVai' : 'Priced below their listed MRP'}
                  accent={accentOf('deals')}
                  icon={<Zap size={20} aria-hidden="true" className="gvh-zap" fill="currentColor" />}
                  badge={soonest && dealProducts.length > 0 ? <EndsInPill endsAt={soonest.endsAt} now={now} /> : undefined}
                  onSeeAll={() => navigate('shop-browse')}
                />
                {loading ? (
                  <div className="gvh-rail" aria-busy="true">
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className="gvh-card is-skel" aria-hidden="true">
                        <span className="gvh-card-media" />
                        <span className="gvh-skel-line is-short" />
                        <span className="gvh-skel-line" />
                      </span>
                    ))}
                    <span className="gvh-sr">Loading products</span>
                  </div>
                ) : dealProducts.length > 0 ? (
                  <CardRail products={dealProducts} />
                ) : (
                  <p className="gvh-empty">No discounted products right now.</p>
                )}
              </section>
            )}
            <FlashSaleRows sales={sales} catalog={catalog} now={now} accent={accentOf('deals')} />
            <FlashDealsPlaceholder />
          </>
        );
      case 'reorder':
        return <ReorderRail catalog={catalog} accent={accentOf('reorder')} />;
      case 'product-rails':
        return failed ? (
          <Notice
            title="Products could not be loaded"
            action={
              <button type="button" className="shop-home-retry gvh-retry" onClick={() => feed.retry()}>
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
            {loading && skinState.recommendationsOn && <SkeletonRow title="Picked for your skin" />}
            {configuredRows.map((rail, i) => (
              <ProductRow key={rail.id} title={rail.title} products={rail.products} accent={i === 0 ? accentOf('product-rails') : itemAccent(null, i + 1)} onSeeAll={() => navigate('shop-browse')} />
            ))}
            <ProductRow title="Picked for your skin" products={picks} accent={itemAccent(null, 4)} onSeeAll={() => navigate('shop-browse')} />
          </>
        );
      case 'price-points':
        return <PricePoints tiles={pricePoints} onOpen={(max) => navigate('shop-browse', { maxPrice: String(max) })} />;
      case 'bestsellers':
        return loading ? <SkeletonRow title="Bestsellers" /> : <ProductRow id="gvh-bestsellers-title" title="Bestsellers" sub="Best rated by customers" products={bestsellers} accent={itemAccent(null, 1)} onSeeAll={() => navigate('shop-browse')} />;
      case 'new-launches':
        return loading ? null : <ProductRow id="gvh-new-title" title="New launches" products={newLaunches} accent={itemAccent(null, 2)} onSeeAll={() => navigate('shop-browse')} />;
      case 'concerns':
        return <ConcernGrid concerns={CONCERNS} onOpen={(concern) => navigate('shop-browse', { concern })} onAll={() => navigate('shop-browse')} />;
      case 'recent':
        return loading && recentIds.length > 0 ? <SkeletonRow title="Recently viewed" /> : <ProductRow title="Recently viewed" products={recentProducts} accent={itemAccent(null, 3)} />;
      case 'recently-viewed':
        return <ProductRow title={blockSettings['recently-viewed']?.title || 'Recently viewed'} products={recentList} accent={accentOf('recently-viewed')} />;
      case 'recommended':
        return <ProductRow title={blockSettings['recommended']?.title || 'Recommended for you'} products={recommendedList} accent={accentOf('recommended')} />;
      case 'scan':
        return scanCard;
      case 'brands':
        return hasItems('brands') ? <BrandsBlock settings={settingsOf('brands')!} accent={accentOf('brands')} onOpenLink={openLink} /> : <BrandStripPlaceholder settings={blockSettings['brands']} />;
      case 'trust':
        return hasItems('trust') ? <TrustBlock settings={settingsOf('trust')!} accent={accentOf('trust')} onOpenLink={openLink} /> : <TrustBlockPlaceholder settings={blockSettings['trust']} />;
      case 'help-gift':
        return hasItems('help-gift') ? <HelpGiftBlock settings={settingsOf('help-gift')!} accent={accentOf('help-gift')} onOpenLink={openLink} /> : <HelpGiftPlaceholder settings={blockSettings['help-gift']} />;
      case 'footer':
        return (
          <>
            <footer className="shop-home-footer" aria-label="Site footer">
              <div className="shop-home-footer-inner">
                <div className="shop-home-footer-brand">
                  <span className="shop-home-footer-logo">
                    <BrandLogo height={28} white />
                  </span>
                  <p>Skincare, delivered.</p>
                  {storeLinks.length > 0 && (
                    <ul className="shop-home-footer-store" aria-label="Get the app">
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
                {footerDetails.companyLine !== '' && <p className="shop-home-footer-company">{footerDetails.companyLine}</p>}
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
          </>
        );
      default:
        if ((ITEM_BLOCK_IDS as readonly string[]).includes(id)) return <NewItemBlock id={id as ItemBlockId} settings={blockSettings[id as ItemBlockId]} wide={false} onOpenLink={openLink} />;
        return null;
    }
  };

  const scanCard = (
  <section className="shop-home-scan gvh-scan" aria-labelledby="shop-home-scan-title">
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
  );

  const pinnedTail = (
    <>
      <section className="shop-home-end gvh-end">
        <Boxes size={28} aria-hidden="true" />
        <h2>You've seen it all!</h2>
        <p>Browse the full catalogue</p>
        <button type="button" className="shop-home-end-btn" onClick={() => navigate('shop-browse')}>
          Explore full catalogue
          <ArrowRight size={16} />
        </button>
      </section>
    </>
  );

  return (
    <div className="shop-screen shop-home gvh">
      <MobileHomeHeader header={headerSettings} tab={tab} onTab={setTab} location={userLocation} embedded={embedded} unread={unread} initial={initial} />

      <SkinQuizBanner />

      <GreetingCard
        greeting={greetingLine(name)}
        delivery={deliveryCell(deliveryEta, area)}
        onTrack={onTheWay ? () => navigate('orders-tracking', { orderId: onTheWay.orderId }) : null}
      />

      <ConcernPicks tab={tab} products={concernProducts} onSeeAll={() => navigate('shop-browse', tab.concern ? { concern: tab.concern } : undefined)} />

      {homeSequence(layoutOrder).filter((id) => id !== 'footer').map((id) => (
        <React.Fragment key={id}>{renderBlock(id)}</React.Fragment>
      ))}
      {pinnedTail}
      {renderBlock('footer')}
    </div>
  );
};

// The shop home. Screens 1024px wide and more get the desktop home with its own admin layout; narrower screens, and the home
// shown inside the skin report, get the mobile home. ?device=desktop|mobile forces one (the admin preview frames use it).
// Resizing across 1024px switches between them without a reload.
export const ShopHomeScreen: React.FC<ShopHomeScreenProps> = ({ embedded = false }) => {
  const device = useHomeDevice();
  if (device === 'desktop' && !embedded) return <ShopDesktopHome />;
  return <ShopMobileHome embedded={embedded} />;
};

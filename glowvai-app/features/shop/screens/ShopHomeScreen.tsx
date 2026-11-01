import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Boxes, ChevronLeft, ChevronRight, Droplets, Flower2, Leaf, RotateCcw, ScanFace, Search, ShoppingBag, Sparkles, Sun, Ticket, Truck, User, Wind, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import type { ScreenName } from '../../../context/contextDefinition';
import { INDIAN_SKINCARE_CATALOG } from '../../../core/data/indianSkincareCatalog';
import type { SkincareProduct } from '../../../core/data/indianSkincareCatalog';
import { getDeviceCurrentLocation } from '../../../core/services/locationService';
import { useCartStore } from '../../../core/state/cartStore';
import { COUPON_VALUES, FREE_DELIVERY_ABOVE } from '../../../shared/pricing-rules.mjs';
import { ShopProductCard } from '../shared/ShopProductCard';
import { formatRupee, getDiscountPercent, getProductImageUrl } from '../shared/shopUtils';
import '../styles/shop-home.css';

const DELIVERY_ETA = 10;
const HERO_IMAGE = '/glowvai/assets/home/glowvai-shopping-hero.png';

// Real shop subcategories. Each tile image is the first catalogue product in that category.
const CATEGORY_TILES: { id: SkincareProduct['category']; label: string }[] = [
  { id: 'Serums', label: 'Serums' },
  { id: 'Moisturizers', label: 'Moisturizers' },
  { id: 'Suncare', label: 'Sunscreen' },
  { id: 'Cleansers', label: 'Cleansers' },
  { id: 'Treatments', label: 'Treatments' },
];

const QUICK_LINKS: { label: string; Icon: LucideIcon; screen: ScreenName; params?: Record<string, string> }[] = [
  { label: 'All Categories', Icon: Boxes, screen: 'shop-browse' },
  { label: 'Skin scan', Icon: ScanFace, screen: 'scan-camera' },
  { label: 'Orders', Icon: RotateCcw, screen: 'orders-list' },
  { label: 'Account', Icon: User, screen: 'profile-tab' },
];

const FOOTER_LINKS: { label: string; screen: ScreenName; params?: Record<string, string> }[] = [
  { label: 'Skin Care', screen: 'shop-browse' },
  { label: 'Orders', screen: 'orders-list' },
  { label: 'AI Skin Scan', screen: 'scan-camera' },
  { label: 'Returns & Refunds', screen: 'profile-support' },
  { label: 'Help & Support', screen: 'profile-support' },
];

// Concern ids match the filter ids on the browse screen.
const CONCERNS: { id: string; label: string; Icon: LucideIcon }[] = [
  { id: 'acne', label: 'Acne & Blemishes', Icon: Leaf },
  { id: 'hydration', label: 'Hydration & Dryness', Icon: Droplets },
  { id: 'brightening', label: 'Glow & Dark Spots', Icon: Sun },
  { id: 'antiaging', label: 'Firming & Lines', Icon: Flower2 },
  { id: 'barrier', label: 'Barrier Repair', Icon: Wind },
];

// Catalogue rails: sorted or filtered from the real product data.
const TOP_RATED = [...INDIAN_SKINCARE_CATALOG].sort((a, b) => b.rating - a.rating).slice(0, 6);
const UNDER_500 = INDIAN_SKINCARE_CATALOG.filter((p) => p.price < 500).slice(0, 6);

// Deals are real catalogue products with a discount from their own MRP.
const DEAL_PRODUCTS = INDIAN_SKINCARE_CATALOG.filter((p) => getDiscountPercent(p) > 0)
  .sort((a, b) => getDiscountPercent(b) - getDiscountPercent(a))
  .slice(0, 4);

const firstProductIn = (category: SkincareProduct['category']) => INDIAN_SKINCARE_CATALOG.find((p) => p.category === category);

function Rail({
  title,
  className = '',
  arrows = true,
  onSeeAll,
  children,
}: {
  title: string;
  className?: string;
  arrows?: boolean;
  onSeeAll?: () => void;
  children: React.ReactNode;
}) {
  const railRef = useRef<HTMLDivElement>(null);

  const scrollRail = (dir: 1 | -1) => {
    const rail = railRef.current;
    rail?.scrollBy({ left: dir * rail.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <section className={`shop-home-section ${className}`}>
      <div className="shop-home-section-head">
        <h2>{title}</h2>
        <div className="shop-home-section-actions">
          {arrows && (
            <>
              <button type="button" className="shop-home-arrow" onClick={() => scrollRail(-1)} aria-label={`Scroll ${title} left`}>
                <ChevronLeft size={14} />
              </button>
              <button type="button" className="shop-home-arrow" onClick={() => scrollRail(1)} aria-label={`Scroll ${title} right`}>
                <ChevronRight size={14} />
              </button>
            </>
          )}
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
  const { navigate } = useApp();

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

function DealCard({ product }: { product: SkincareProduct }) {
  const { navigate } = useApp();
  const quantity = useCartStore((s) => s.items[product.id]?.quantity ?? 0);
  const addItem = useCartStore((s) => s.addItem);
  const discount = getDiscountPercent(product);

  return (
    <article className="shop-home-deal">
      {discount > 0 && <span className="shop-home-deal-badge">{discount}% OFF</span>}
      <button type="button" className="shop-home-deal-open" onClick={() => navigate('shop-product', { productId: product.id })}>
        <span className="shop-home-deal-media">
          <img src={getProductImageUrl(product)} alt={product.name} loading="lazy" />
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
        onClick={() =>
          addItem({
            productId: product.id,
            name: product.name,
            brand: product.brand,
            image: getProductImageUrl(product),
            price: product.price,
            mrp: product.originalPrice,
          })
        }
      >
        {quantity > 0 ? `In cart · ${quantity}` : 'Add +'}
      </button>
    </article>
  );
}

export const ShopHomeScreen: React.FC = () => {
  const { navigate } = useApp();
  const totalCount = useCartStore((s) => s.totalCount);
  const [userLocation, setUserLocation] = useState('Payikapuram, Vijayawada');

  useEffect(() => {
    let active = true;
    getDeviceCurrentLocation()
      .then((loc) => {
        if (active && loc?.formattedAddress) setUserLocation(loc.formattedAddress);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="shop-screen shop-home">
      <header className="shop-home-top">
        <div className="shop-home-topbar">
          <div className="shop-home-location">
            <span className="shop-home-eta">
              <Zap size={16} fill="currentColor" />
              {DELIVERY_ETA} MINS
            </span>
            <button type="button" className="shop-home-location-btn" onClick={() => navigate('location-setup')}>
              <span>{userLocation}</span>
              <ChevronRight size={14} />
            </button>
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
      </header>

      <section className="shop-home-showcase">
        <img src={HERO_IMAGE} alt="GlowVAI skincare campaign" />
        <div className="shop-home-showcase-copy">
          <p className="shop-home-showcase-tag">Discover. Shop. Glow.</p>
          <h1>Glow your way.</h1>
          <p className="shop-home-showcase-sub">Skincare delivered in {DELIVERY_ETA} mins.</p>
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

      <section className="shop-home-categories" aria-label="Shop by category">
        {CATEGORY_TILES.map((cat) => {
          const sample = firstProductIn(cat.id);
          return (
            <button key={cat.id} type="button" className="shop-home-category" onClick={() => navigate('shop-category', { categoryId: cat.id })}>
              <span className="shop-home-category-tile">{sample && <img src={getProductImageUrl(sample)} alt="" loading="lazy" />}</span>
              <span className="shop-home-category-label">{cat.label}</span>
            </button>
          );
        })}
        <button type="button" className="shop-home-category" onClick={() => navigate('shop-browse')}>
          <span className="shop-home-category-tile is-all">
            <Boxes size={22} />
          </span>
          <span className="shop-home-category-label">All Products</span>
        </button>
      </section>

      <section className="shop-home-promos" aria-label="Offers">
        <button type="button" className="shop-home-promo is-dark" onClick={() => navigate('shop-browse')}>
          <span className="shop-home-promo-kicker">Delivery</span>
          <span className="shop-home-promo-title">Free delivery above ₹{FREE_DELIVERY_ABOVE}</span>
          <span className="shop-home-promo-sub">On orders above ₹{FREE_DELIVERY_ABOVE}</span>
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

      {DEAL_PRODUCTS.length > 0 && (
        <section className="shop-home-section">
          <div className="shop-home-section-head">
            <div className="shop-home-section-titles">
              <h2>Deals</h2>
              <p>Products priced below their listed MRP</p>
            </div>
            <button type="button" className="shop-home-see-all" onClick={() => navigate('shop-browse')}>
              View all
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="shop-home-deals">
            {DEAL_PRODUCTS.map((product) => (
              <DealCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      <ProductRail title="Top Rated" products={TOP_RATED} />
      <ProductRail title="Under ₹500" products={UNDER_500} />

      <section className="shop-home-section">
        <div className="shop-home-section-head">
          <h2>Shop by Concern</h2>
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

      <section className="shop-home-scan">
        <span className="shop-home-scan-tag">
          <ScanFace size={12} />
          SKIN SCAN
        </span>
        <h2>
          Know your skin's
          <br />
          <span>true needs</span>
        </h2>
        <p>Open the skin scan to get started.</p>
        <button type="button" className="shop-home-scan-btn" onClick={() => navigate('scan-camera')}>
          Start skin scan
          <ArrowRight size={16} />
        </button>
      </section>

      <footer className="shop-home-footer">
        <div className="shop-home-footer-brand">
          <Sparkles size={16} />
          <strong>GlowVAI</strong>
        </div>
        <p>Skincare delivered in {DELIVERY_ETA} minutes.</p>
        <div className="shop-home-footer-links-wrap">
          <span>Quick Links</span>
          <div className="shop-home-footer-links">
            {FOOTER_LINKS.map((link) => (
              <button key={link.label} type="button" onClick={() => navigate(link.screen, link.params)}>
                {link.label}
              </button>
            ))}
          </div>
        </div>
        <div className="shop-home-footer-legal">
          <span>© 2026 GlowVAI Technologies Pvt. Ltd. All rights reserved.</span>
          <span>Privacy Policy · Terms of Use · Disclaimer</span>
        </div>
      </footer>

      <section className="shop-home-end">
        <Sparkles size={36} />
        <h2>You've seen it all!</h2>
        <p>Browse the full catalogue</p>
        <button type="button" className="shop-home-end-btn" onClick={() => navigate('shop-browse')}>
          Explore Full Catalog →
        </button>
      </section>

      <div className="shop-home-watermark" aria-hidden="true">
        GlowVAI
      </div>

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

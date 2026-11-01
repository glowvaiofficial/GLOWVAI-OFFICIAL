import React, { useRef } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Moon, ScanFace, Search, Sun, User, Zap } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import type { SkincareProduct } from '../../../core/data/indianSkincareCatalog';
import { INDIAN_SKINCARE_CATALOG } from '../../../core/data/indianSkincareCatalog';
import { useCartStore } from '../../../core/state/cartStore';
import { ShopProductCard } from '../shared/ShopProductCard';
import {
  BIGGEST_DISCOUNTS,
  SHOP_BRANDS,
  SHOP_CATEGORIES,
  SHOP_CONCERNS,
  TRIAL_PRODUCT,
  categoryCount,
  categoryFromPrice,
  concernCount,
  productsInCategory,
} from '../shared/shopCatalog';
import { formatRupee, getProductImageUrl } from '../shared/shopUtils';
import '../styles/shop-home.css';

// Every number on this page (counts, prices, discounts, delivery time) comes from the local
// catalogue or the app's delivery address. Nothing is personalised, so nothing says "for you".

const plural = (n: number) => `${n} ${n === 1 ? 'product' : 'products'}`;

const firstImage = (categoryId: string) => {
  const product = productsInCategory(categoryId).find((p) => p.price > 1) ?? productsInCategory(categoryId)[0];
  return product ? getProductImageUrl(product) : '';
};

const UNDER_500 = INDIAN_SKINCARE_CATALOG.filter((p) => p.price > 1 && p.price < 500).sort((a, b) => a.price - b.price);

interface GlowDrop {
  id: string;
  kicker: string;
  title: string;
  categoryId: string;
  tone: 'coral' | 'plum' | 'cream';
}

// Editorial cards: copy is ours, the "from" price and count are read from the catalogue.
const GLOW_DROPS: GlowDrop[] = [
  { id: 'spf', kicker: 'Sun season', title: 'SPF you will actually wear', categoryId: 'Suncare', tone: 'coral' },
  { id: 'serum', kicker: 'The actives edit', title: 'Niacinamide, kojic and BHA serums', categoryId: 'Serums', tone: 'plum' },
  { id: 'barrier', kicker: 'Barrier care', title: 'Ceramide and B5 moisturisers', categoryId: 'Moisturizers', tone: 'cream' },
];

const ROUTINES: { id: string; label: string; note: string; Icon: typeof Sun; steps: { label: string; categoryId: string }[] }[] = [
  {
    id: 'am',
    label: 'Morning routine',
    note: 'Cleanse, treat, hydrate, protect.',
    Icon: Sun,
    steps: [
      { label: 'Cleanser', categoryId: 'Cleansers' },
      { label: 'Serum', categoryId: 'Serums' },
      { label: 'Moisturiser', categoryId: 'Moisturizers' },
      { label: 'Sunscreen', categoryId: 'Suncare' },
    ],
  },
  {
    id: 'pm',
    label: 'Night routine',
    note: 'Cleanse, treat, then seal in moisture.',
    Icon: Moon,
    steps: [
      { label: 'Cleanser', categoryId: 'Cleansers' },
      { label: 'Treatment serum', categoryId: 'Serums' },
      { label: 'Moisturiser', categoryId: 'Moisturizers' },
    ],
  },
];

function Rail({
  title,
  subtitle,
  onSeeAll,
  children,
}: {
  title: string;
  subtitle?: string;
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
        <div className="shop-home-section-title">
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="shop-home-section-actions">
          <button type="button" className="shop-home-arrow" onClick={() => scrollRail(-1)} aria-label={`Scroll ${title} left`}>
            <ChevronLeft size={16} />
          </button>
          <button type="button" className="shop-home-arrow" onClick={() => scrollRail(1)} aria-label={`Scroll ${title} right`}>
            <ChevronRight size={16} />
          </button>
          {onSeeAll && (
            <button type="button" className="shop-home-see-all" onClick={onSeeAll}>
              See all
              <ChevronRight size={15} />
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

function ProductRail({ title, subtitle, products, onSeeAll }: { title: string; subtitle?: string; products: SkincareProduct[]; onSeeAll: () => void }) {
  const { navigate } = useApp();
  return (
    <Rail title={title} subtitle={subtitle} onSeeAll={onSeeAll}>
      {products.map((product) => (
        <div key={product.id} className="shop-home-rail-item">
          <ShopProductCard product={product} onOpen={(p) => navigate('shop-product', { productId: p.id })} />
        </div>
      ))}
    </Rail>
  );
}

function TrialCard() {
  const { navigate } = useApp();
  const quantity = useCartStore((s) => (TRIAL_PRODUCT ? s.items[TRIAL_PRODUCT.id]?.quantity ?? 0 : 0));
  const addItem = useCartStore((s) => s.addItem);
  if (!TRIAL_PRODUCT) return null;
  const product = TRIAL_PRODUCT;

  return (
    <div className="shop-home-trial">
      <button type="button" className="shop-home-trial-media" onClick={() => navigate('shop-product', { productId: product.id })} aria-label={`View ${product.name}`}>
        <img src={getProductImageUrl(product)} alt="" />
      </button>
      <div className="shop-home-trial-copy">
        <span className="shop-home-trial-kicker">Trial size · {product.volume}</span>
        <button type="button" className="shop-home-trial-name" onClick={() => navigate('shop-product', { productId: product.id })}>
          {product.name}
        </button>
        <div className="shop-home-trial-foot">
          <span className="shop-home-trial-price">
            <b>{formatRupee(product.price)}</b>
            <s>{formatRupee(product.originalPrice)}</s>
          </span>
          {quantity > 0 ? (
            <button type="button" className="shop-home-trial-add is-added" onClick={() => navigate('cart-tab')}>
              In bag · {quantity}
            </button>
          ) : (
            <button
              type="button"
              className="shop-home-trial-add"
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
              ADD
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export const ShopHomeScreen: React.FC = () => {
  const { navigate, currentAddress } = useApp();
  const cartCount = useCartStore((s) => s.totalCount);
  const openCategory = (categoryId: string) => navigate('shop-category', { categoryId });

  const eta = currentAddress?.serviceable ? currentAddress.deliveryMinutes : null;
  const hasAddress = Boolean(currentAddress?.pincode);
  const addressLine = hasAddress ? [currentAddress.area, currentAddress.city].filter(Boolean).join(', ') : 'Set delivery address';
  const concerns = SHOP_CONCERNS.map((c) => ({ ...c, count: concernCount(c.id) })).filter((c) => c.count > 0);
  const quickTiles = SHOP_CATEGORIES.filter((c) => c.id !== 'Treatments').slice(0, 4);

  return (
    <div className="shop-screen shop-home">
      <header className="shop-home-hero">
        <div className="shop-home-topbar">
          <button type="button" className="shop-home-location" onClick={() => navigate('location-setup')} aria-label={`Delivery address: ${addressLine}. Change`}>
            <span className="shop-home-eta">
              <Zap size={15} fill="currentColor" />
              {eta ? `Delivery in ${eta} mins` : 'Delivery'}
            </span>
            <span className="shop-home-address">
              <span>
                {hasAddress && currentAddress.label ? `${currentAddress.label} · ` : ''}
                {addressLine}
              </span>
              <ChevronRight size={14} />
            </span>
          </button>
          <button type="button" className="shop-home-profile" onClick={() => navigate('profile-tab')} aria-label="Account">
            <User size={18} />
          </button>
        </div>

        <div className="shop-home-search">
          <button type="button" className="shop-home-search-input" onClick={() => navigate('shop-search-filters')}>
            <Search size={18} />
            <span>Search niacinamide, sunscreen, brands…</span>
          </button>
          <button type="button" className="shop-home-ai-btn" onClick={() => navigate('scan-tab')} aria-label="Start a skin scan">
            <ScanFace size={16} />
            <span>Skin scan</span>
          </button>
        </div>

        <div className="shop-home-hero-grid">
          <TrialCard />
          <div className="shop-home-quick">
            {quickTiles.map((cat) => (
              <button key={cat.id} type="button" className="shop-home-quick-tile" onClick={() => openCategory(cat.id)}>
                <img src={firstImage(cat.id)} alt="" />
                <span className="shop-home-quick-shade" />
                <span className="shop-home-quick-label">
                  <b>{cat.short}</b>
                  <small>{plural(categoryCount(cat.id))}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className="shop-home-section shop-home-categories">
        <div className="shop-home-section-head">
          <div className="shop-home-section-title">
            <h2>Shop by category</h2>
          </div>
          <button type="button" className="shop-home-see-all" onClick={() => navigate('shop-browse')}>
            All products
            <ChevronRight size={15} />
          </button>
        </div>
        <div className="shop-home-category-rail">
          <div className="shop-home-rail">
            {SHOP_CATEGORIES.map(({ id, label, Icon }) => (
              <button key={id} type="button" className="shop-home-category-card" onClick={() => openCategory(id)}>
                <span className="shop-home-category-media">
                  <img src={firstImage(id)} alt="" loading="lazy" />
                </span>
                <span className="shop-home-category-foot">
                  <span className="shop-home-category-icon">
                    <Icon size={14} />
                  </span>
                  <span className="shop-home-category-text">
                    <b>{label}</b>
                    <small>{plural(categoryCount(id))}</small>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="shop-home-section" aria-label="The glow drop">
        <div className="shop-home-section-head">
          <div className="shop-home-section-title">
            <h2>The glow drop</h2>
            <p>Edits from the shelf, with real prices</p>
          </div>
        </div>
        <div className="shop-home-scroller shop-home-drops">
          {GLOW_DROPS.map((drop) => {
            const from = categoryFromPrice(drop.categoryId);
            return (
              <button key={drop.id} type="button" className={`shop-home-drop is-${drop.tone}`} onClick={() => openCategory(drop.categoryId)}>
                <span className="shop-home-drop-copy">
                  <small>{drop.kicker}</small>
                  <b>{drop.title}</b>
                  <span className="shop-home-drop-meta">
                    {plural(categoryCount(drop.categoryId))}{from !== null ? ` · from ${formatRupee(from)}` : ''}
                  </span>
                  <span className="shop-home-drop-cta">
                    Shop the edit <ArrowRight size={14} />
                  </span>
                </span>
                <span className="shop-home-drop-media">
                  <img src={firstImage(drop.categoryId)} alt="" loading="lazy" />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <ProductRail
        title="Biggest discounts"
        subtitle="Sorted by % off the MRP"
        products={BIGGEST_DISCOUNTS.slice(0, 8)}
        onSeeAll={() => navigate('shop-search-filters', { sort: 'discount' })}
      />

      <ProductRail title="Serums & actives" products={productsInCategory('Serums')} onSeeAll={() => openCategory('Serums')} />

      <section className="shop-home-scan">
        <div className="shop-home-scan-copy">
          <span className="shop-home-scan-tag">
            <ScanFace size={14} />
            Free skin scan
          </span>
          <h2>Not sure what your skin needs?</h2>
          <p>Take a selfie and get a cosmetic skin report in about a minute. It is not a medical diagnosis.</p>
          <button type="button" className="shop-home-scan-btn" onClick={() => navigate('scan-tab')}>
            Start skin scan
            <ArrowRight size={16} />
          </button>
        </div>
        <ol className="shop-home-scan-steps">
          <li>
            <b>1</b>
            <span>Take a well-lit selfie</span>
          </li>
          <li>
            <b>2</b>
            <span>Read your skin report</span>
          </li>
          <li>
            <b>3</b>
            <span>Shop the routine it suggests</span>
          </li>
        </ol>
      </section>

      <ProductRail title="Sunscreen & SPF" products={productsInCategory('Suncare')} onSeeAll={() => openCategory('Suncare')} />

      {concerns.length > 0 && (
        <section className="shop-home-section">
          <div className="shop-home-section-head">
            <div className="shop-home-section-title">
              <h2>Shop by concern</h2>
            </div>
          </div>
          <div className="shop-home-concerns">
            {concerns.map((c) => (
              <button key={c.id} type="button" className="shop-home-concern" onClick={() => navigate('shop-browse', { concern: c.id })}>
                <span className="shop-home-concern-icon">
                  <c.Icon size={16} />
                </span>
                <span className="shop-home-concern-text">
                  <b>{c.label}</b>
                  <small>{c.count} {c.count === 1 ? 'product' : 'products'}</small>
                </span>
                <ChevronRight size={16} className="shop-home-concern-chev" />
              </button>
            ))}
          </div>
        </section>
      )}

      <ProductRail title="Moisturisers & creams" products={productsInCategory('Moisturizers')} onSeeAll={() => openCategory('Moisturizers')} />

      <section className="shop-home-section">
        <div className="shop-home-section-head">
          <div className="shop-home-section-title">
            <h2>Shop by brand</h2>
          </div>
        </div>
        <div className="shop-home-scroller shop-home-brands">
          {SHOP_BRANDS.map((b) => (
            <button key={b.brand} type="button" className="shop-home-brand" onClick={() => navigate('shop-browse', { brand: b.brand })}>
              <span className="shop-home-brand-media">
                <img src={getProductImageUrl(b.image)} alt="" loading="lazy" />
              </span>
              <b>{b.brand}</b>
              <small>
                {plural(b.count)} · from {formatRupee(b.fromPrice)}
              </small>
              {b.bestDiscount > 0 && <span className="shop-home-brand-off">Up to {b.bestDiscount}% off</span>}
            </button>
          ))}
        </div>
      </section>

      <section className="shop-home-section">
        <div className="shop-home-section-head">
          <div className="shop-home-section-title">
            <h2>Build a simple routine</h2>
            <p>Tap a step to see the products for it</p>
          </div>
        </div>
        <div className="shop-home-routines">
          {ROUTINES.map((r) => (
            <div key={r.id} className={`shop-home-routine is-${r.id}`}>
              <div className="shop-home-routine-head">
                <span className="shop-home-routine-icon">
                  <r.Icon size={18} />
                </span>
                <div>
                  <h3>{r.label}</h3>
                  <small>{r.note}</small>
                </div>
              </div>
              <ol className="shop-home-routine-steps">
                {r.steps.map((step, i) => (
                  <li key={step.label}>
                    <button type="button" onClick={() => openCategory(step.categoryId)}>
                      <span className="shop-home-routine-num">{i + 1}</span>
                      <span className="shop-home-routine-label">{step.label}</span>
                      <small>{plural(categoryCount(step.categoryId))}</small>
                      <ChevronRight size={15} />
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      <ProductRail title="Under ₹500" subtitle="Lowest price first" products={UNDER_500} onSeeAll={() => navigate('shop-search-filters', { sort: 'price_low' })} />

      <section className="shop-home-end">
        <span className="shop-home-end-mark brand-wordmark" aria-hidden="true">
          glowvai
        </span>
        <h2>You have reached the end of the shelf</h2>
        <p>
          {INDIAN_SKINCARE_CATALOG.length} products across {SHOP_CATEGORIES.length} categories
          {cartCount > 0 ? ` · ${cartCount} in your bag` : ''}
        </p>
        <div className="shop-home-end-actions">
          <button type="button" className="shop-btn-primary" onClick={() => navigate('shop-browse')}>
            Browse all products
          </button>
          {cartCount > 0 && (
            <button type="button" className="shop-btn-secondary" onClick={() => navigate('cart-tab')}>
              Go to bag
            </button>
          )}
        </div>
      </section>
    </div>
  );
};

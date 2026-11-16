import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, FlaskConical, Heart, Minus, Plus, RotateCcw, Share2, ShieldCheck, ShoppingBag, Star, Truck, Zap, MapPin, Check } from 'lucide-react';
import type { ReactNode } from 'react';
import type { SkincareProduct } from '../../../core/data/indianSkincareCatalog';
import { ShopProductCard } from '../shared/ShopProductCard';
import { formatRupee } from '../shared/shopUtils';
import { isServiceablePincode } from '../../commerce/lib/addressStore';
import { ProductReviews } from '../../reviews/ProductReviews';
import { ProductQuestions } from '../../reviews/ProductQuestions';
import { readRecentlyViewed } from '../lib/recentlyViewed';
import '../styles/shop-pc-browse.css';
import '../styles/v3-glass-pc.css';

type TabId = 'description' | 'how' | 'ingredients' | 'reviews' | 'qa';

// General guidance by product type. It is not product-specific claims: the pack's own instructions always come first.
const HOW_TO_USE: Record<string, string[]> = {
  Serums: ['Cleanse your face and pat it dry.', 'Apply a few drops to your face and neck.', 'Let it absorb, then follow with moisturiser.', 'Use sunscreen in the morning.'],
  Cleansers: ['Wet your face with lukewarm water.', 'Massage a small amount over your face for about 30 seconds.', 'Rinse well and pat dry.'],
  Moisturizers: ['Apply to clean skin, morning and night.', 'Use a pea to coin-sized amount for your face and neck.', 'Massage in until absorbed.'],
  Suncare: ['Apply generously as the last step of your morning routine.', 'Use about two finger-lengths for face and neck.', 'Reapply every two to three hours in the sun.'],
  Treatments: ['Cleanse and dry your skin.', 'Dab a small amount only on the area you are treating.', 'Start slowly, every other night, and build up.'],
};

export interface PcProductProps {
  product: SkincareProduct;
  catalog: SkincareProduct[];
  categoryLabel: string;
  heroImage: string;
  price: number;
  mrp: number;
  discount: number;
  optionNoun: string;
  hasOptions: boolean;
  stockState: { state: 'in' | 'low' | 'out'; count: number | null } | null;
  canBuy: boolean;
  qty: number;
  maxQty: number;
  setQuantity: (fn: (q: number) => number) => void;
  inCartCount: number;
  cartTotalCount: number;
  isWishlisted: boolean;
  deliverTo: string;
  variantsNode: ReactNode;
  subscribeNode: ReactNode;
  navigate: (screen: any, params?: any) => void;
  onToggleWishlist: () => void;
  onShare: () => void;
  onAdd: () => void;
  onBuyNow: () => void;
}

export const PcProduct: React.FC<PcProductProps> = (p) => {
  const { product, catalog, navigate } = p;
  const [tab, setTab] = useState<TabId>('description');
  const [recent, setRecent] = useState<SkincareProduct[]>([]);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');
  const [imgFailed, setImgFailed] = useState(false);
  const [pin, setPin] = useState('');
  const [pinState, setPinState] = useState<'idle' | 'ok' | 'bad' | 'invalid'>('idle');

  const similar = useMemo(() => {
    const same = catalog.filter((c) => c.id !== product.id && c.category === product.category);
    const other = catalog.filter((c) => c.id !== product.id && c.category !== product.category);
    return [...same, ...other].slice(0, 12);
  }, [catalog, product.id, product.category]);

  // Products looked at before this one (ids only on the device), shown from the live catalogue.
  useEffect(() => {
    const byId = new Map(catalog.map((c) => [c.id, c]));
    setRecent(readRecentlyViewed().filter((id) => id !== product.id).map((id) => byId.get(id)).filter((c): c is SkincareProduct => !!c).slice(0, 12));
  }, [catalog, product.id]);

  // The section tabs follow the scroll: the section under the sticky tab bar is the active one.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const ids: TabId[] = ['description', 'how', 'ingredients', 'reviews', 'qa'];
    const seen = new Map<string, number>();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => seen.set(e.target.id, e.isIntersecting ? e.boundingClientRect.top : Infinity));
      const open = ids.filter((id) => (seen.get(`pcp-sec-${id}`) ?? Infinity) !== Infinity);
      if (open.length > 0) setTab(open[0]);
    }, { rootMargin: '-150px 0px -55% 0px' });
    ids.forEach((id) => { const el = document.getElementById(`pcp-sec-${id}`); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);

  const goTo = (id: TabId) => {
    setTab(id);
    document.getElementById(`pcp-sec-${id}`)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  };

  const checkPin = (e: React.FormEvent) => {
    e.preventDefault();
    const v = pin.trim();
    if (!/^\d{6}$/.test(v)) setPinState('invalid');
    else setPinState(isServiceablePincode(v) ? 'ok' : 'bad');
  };

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
  };

  const steps = HOW_TO_USE[product.category] ?? [];
  const tabs: { id: TabId; label: string }[] = [
    { id: 'description', label: 'Description' },
    { id: 'how', label: 'How to use' },
    { id: 'ingredients', label: 'Ingredients' },
    { id: 'reviews', label: `Reviews${product.reviewCount ? ` (${product.reviewCount.toLocaleString('en-IN')})` : ''}` },
    { id: 'qa', label: 'Questions & answers' },
  ];
  const openReviews = () => navigate('shop-product-reviews', { productId: product.id });
  const save = p.mrp - p.price;

  return (
    <div className="shop-screen pcp">
      <div className="pcp-wrap">
        <nav className="pc-crumbs" aria-label="Breadcrumb">
          <button type="button" onClick={() => navigate('shop-home')}>Home</button>
          <ChevronRight size={13} aria-hidden="true" />
          <button type="button" onClick={() => navigate('shop-browse')}>All Categories</button>
          <ChevronRight size={13} aria-hidden="true" />
          <button type="button" onClick={() => navigate('shop-category', { categoryId: product.category })}>{p.categoryLabel}</button>
          <ChevronRight size={13} aria-hidden="true" />
          <span aria-current="page">{product.name}</span>
        </nav>

        <div className="pcp-main">
          <section className="pcp-gallery" aria-label="Product images">
            <div className="pcp-thumbs">
              <button type="button" className="pcp-thumb is-on" aria-label="Product image 1" aria-pressed="true">
                {p.heroImage && !imgFailed ? <img src={p.heroImage} alt="" width={76} height={76} /> : <span className="shop-product-hero-fallback" style={{ fontSize: 10 }}>{product.brand}</span>}
              </button>
            </div>
            <div
              className={`pcp-stage${zoom ? ' is-zoom' : ''}`}
              onMouseEnter={() => setZoom(true)}
              onMouseLeave={() => setZoom(false)}
              onMouseMove={onMove}
            >
              {p.discount > 0 && <span className="shop-product-hero-off">{p.discount}% OFF</span>}
              {p.heroImage && !imgFailed ? (
                <img src={p.heroImage} alt={product.name} width={800} height={800} decoding="async" style={{ transformOrigin: origin }} onError={() => setImgFailed(true)} />
              ) : (
                <span className="shop-product-hero-fallback">{product.brand}</span>
              )}
              <span className="pcp-zoom-hint">Hover to zoom</span>
            </div>
          </section>

          <section className="pcp-info">
            <button type="button" className="pcp-brand" onClick={() => navigate('shop-browse', { brand: product.brand })}>{product.brand}</button>
            <h1 className="pcp-title">{product.name}</h1>
            {product.rating !== null && product.reviewCount !== null && (
              <div className="pcp-rate">
                <span className="shop-product-rating"><Star size={12} fill="currentColor" />{product.rating.toFixed(1)}</span>
                <button type="button" className="shop-product-reviews-link" onClick={() => goTo('reviews')}>
                  {product.reviewCount.toLocaleString('en-IN')} reviews
                </button>
              </div>
            )}

            <div className="pcp-price">
              <span className="shop-product-price-now">{formatRupee(p.price)}</span>
              {p.mrp > p.price && <span className="shop-product-price-mrp">MRP {formatRupee(p.mrp)}</span>}
              {p.discount > 0 && <span className="shop-product-off">{p.discount}% OFF</span>}
            </div>
            {save > 0 && <p className="pcp-save">You save {formatRupee(save)}</p>}
            <p className="shop-product-tax">Inclusive of all taxes · {p.optionNoun}</p>

            {p.variantsNode}

            <ul className="pcp-highlights">
              {product.deliveryMinutes !== null && <li><Zap size={16} /> Delivered in {product.deliveryMinutes} minutes{p.deliverTo ? ` to ${p.deliverTo}` : ''}</li>}
              <li><ShieldCheck size={16} /> Sold and shipped by GlowVai</li>
              <li><RotateCcw size={16} /> Easy returns on eligible items</li>
            </ul>

            {product.keyActives.length > 0 && (
              <>
                <h2 className="shop-product-section-title" style={{ marginTop: 22 }}>Key actives</h2>
                <ul className="shop-product-actives">
                  {product.keyActives.slice(0, 8).map((a) => (
                    <li key={a}><FlaskConical size={14} />{a}</li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <aside className="pcp-buybox" aria-label="Buy">
            <div>
              <div className="pcp-price" style={{ margin: 0, padding: 0, border: 0 }}>
                <span className="shop-product-price-now">{formatRupee(p.price)}</span>
                {p.mrp > p.price && <span className="shop-product-price-mrp">{formatRupee(p.mrp)}</span>}
              </div>
              {save > 0 && <p className="pcp-save">Save {formatRupee(save)} ({p.discount}% off)</p>}
            </div>
            {save > 0 && (
              <dl className="pcp-offer" aria-label="Offer">
                <div><dt>MRP</dt><dd><s>{formatRupee(p.mrp)}</s></dd></div>
                <div><dt>Discount</dt><dd>{p.discount}% off</dd></div>
                <div><dt>You save</dt><dd>{formatRupee(save)} on this order</dd></div>
              </dl>
            )}
            {p.stockState && (
              <p className={`shop-product-stock is-${p.stockState.state}`} role="status" aria-live="polite" style={{ margin: 0 }}>
                {p.stockState.state === 'out' ? 'Out of stock' : p.stockState.state === 'low' ? `Only ${p.stockState.count} left` : 'In stock'}
              </p>
            )}

            <form className="pcp-deliver" onSubmit={checkPin}>
              <h3><MapPin size={15} /> Check delivery</h3>
              <div className="pcp-pin">
                <input inputMode="numeric" maxLength={6} value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setPinState('idle'); }} placeholder="Enter 6-digit pincode" aria-label="Delivery pincode" />
                <button type="submit">Check</button>
              </div>
              {pinState === 'ok' && <span className="pcp-pin-msg is-ok"><Check size={13} style={{ verticalAlign: '-2px' }} /> Delivery available{product.deliveryMinutes ? ` in ${product.deliveryMinutes} minutes` : ''}</span>}
              {pinState === 'bad' && <span className="pcp-pin-msg is-bad">Not delivering to this pincode yet.</span>}
              {pinState === 'invalid' && <span className="pcp-pin-msg is-bad">Enter a valid 6-digit pincode.</span>}
              {pinState === 'idle' && p.deliverTo && <span className="pcp-pin-msg" style={{ color: 'var(--ds-muted)', fontWeight: 600 }}>Delivering to {p.deliverTo}</span>}
            </form>

            <div className="shop-product-qty-row">
              <span className="shop-product-qty-label">Quantity</span>
              <div className="shop-product-qty">
                <button type="button" onClick={() => p.setQuantity((q) => Math.max(1, Math.min(q, p.maxQty) - 1))} disabled={p.qty <= 1} aria-label="Decrease quantity"><Minus size={14} /></button>
                <span aria-live="polite">{p.qty}</span>
                <button type="button" onClick={() => p.setQuantity((q) => Math.min(q, p.maxQty) + 1)} disabled={p.qty >= p.maxQty} aria-label="Increase quantity"><Plus size={14} /></button>
              </div>
            </div>

            <div className="shop-product-actions">
              <button type="button" className="shop-btn-primary shop-product-add-btn" style={{ border: 0, background: 'var(--ds-brand)', color: '#fff', borderRadius: 999, minHeight: 48 }} onClick={p.onAdd} disabled={!p.canBuy}>
                <ShoppingBag size={18} />
                {p.canBuy ? `Add to cart · ${formatRupee(p.price * p.qty)}` : 'Out of stock'}
              </button>
              <button type="button" className="shop-btn-secondary shop-product-buynow" onClick={p.onBuyNow} disabled={!p.canBuy}>Buy now</button>
            </div>
            {p.inCartCount > 0 && (
              <button type="button" className="shop-product-incart" style={{ marginTop: 0 }} onClick={() => navigate('cart-tab')}>
                {p.inCartCount} in your cart
                <span>View cart ({p.cartTotalCount})<ChevronRight size={14} /></span>
              </button>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className={`shop-btn-secondary${p.isWishlisted ? ' is-saved' : ''}`} style={{ minHeight: 42 }} onClick={p.onToggleWishlist} aria-pressed={p.isWishlisted}>
                <Heart size={16} fill={p.isWishlisted ? 'currentColor' : 'none'} /> {p.isWishlisted ? 'Saved' : 'Wishlist'}
              </button>
              <button type="button" className="shop-btn-secondary" style={{ minHeight: 42 }} onClick={p.onShare}><Share2 size={16} /> Share</button>
            </div>
            <div className="pcp-trust">
              <span><Truck size={18} />Fast delivery</span>
              <span><ShieldCheck size={18} />Genuine products</span>
              <span><RotateCcw size={18} />Easy returns</span>
            </div>
          </aside>
        </div>

        {p.subscribeNode && <div className="pcp-extra">{p.subscribeNode}</div>}

        <nav className="pcp-tabs" aria-label="Product sections">
          <div className="pcp-tablist">
            {tabs.map((t) => (
              <button key={t.id} type="button" aria-current={tab === t.id ? 'true' : undefined} className={`pcp-tab${tab === t.id ? ' is-on' : ''}`} onClick={() => goTo(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="pcp-sections">
          <section className="pcp-sec" id="pcp-sec-description" aria-labelledby="pcp-h-description">
            <h2 id="pcp-h-description">Description</h2>
            {product.description ? <p>{product.description}</p> : <p className="pcp-muted">No description has been added for this product yet.</p>}
            <dl className="shop-product-specs">
              <div><dt>Brand</dt><dd>{product.brand}</dd></div>
              <div><dt>Category</dt><dd><button type="button" onClick={() => navigate('shop-category', { categoryId: product.category })}>{p.categoryLabel}</button></dd></div>
              <div><dt>{p.hasOptions ? 'Option' : 'Size'}</dt><dd>{p.optionNoun}</dd></div>
            </dl>
          </section>
          <section className="pcp-sec" id="pcp-sec-how" aria-labelledby="pcp-h-how">
            <h2 id="pcp-h-how">How to use</h2>
            {steps.length > 0 ? (
              <>
                <ol className="pcp-steps">{steps.map((s) => <li key={s}>{s}</li>)}</ol>
                <p className="pcp-muted" style={{ marginTop: 16 }}>General guidance for this type of product. Always follow the instructions on the pack, and do a patch test first.</p>
              </>
            ) : <p className="pcp-muted">Follow the instructions on the pack.</p>}
          </section>
          <section className="pcp-sec" id="pcp-sec-ingredients" aria-labelledby="pcp-h-ingredients">
            <h2 id="pcp-h-ingredients">Ingredients</h2>
            {product.keyActives.length > 0 ? (
              <ul className="shop-product-actives">
                {product.keyActives.map((a) => <li key={a}><FlaskConical size={14} />{a}</li>)}
              </ul>
            ) : <p className="pcp-muted">The ingredient list has not been added for this product yet.</p>}
          </section>
          <section className="pcp-sec" id="pcp-sec-reviews" aria-label="Ratings and reviews">
            <ProductReviews productId={product.id} />
            <button type="button" className="shop-btn-secondary" style={{ width: 'auto', marginTop: 16 }} onClick={openReviews}>See all ratings and reviews</button>
          </section>
          <section className="pcp-sec" id="pcp-sec-qa" aria-label="Questions and answers">
            <ProductQuestions productId={product.id} />
          </section>
        </div>

        {similar.length > 0 && (
          <section className="pcp-rail" aria-label="Similar products">
            <h2>Similar products</h2>
            <div className="pcp-rail-row">
              {similar.map((s) => (
                <ShopProductCard key={s.id} product={s} rich onOpen={(x) => navigate('shop-product', { productId: x.id })} />
              ))}
            </div>
          </section>
        )}
        {recent.length > 0 && (
          <section className="pcp-rail" aria-label="Recently viewed">
            <h2>Recently viewed</h2>
            <div className="pcp-rail-row">
              {recent.map((s) => (
                <ShopProductCard key={s.id} product={s} rich onOpen={(x) => navigate('shop-product', { productId: x.id })} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

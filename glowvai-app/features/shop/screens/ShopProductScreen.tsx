import React, { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, FlaskConical, Heart, Minus, PackageSearch, Plus, Share2, ShoppingBag, Star, Zap } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import { useLiveCatalog } from '../../../core/data/indianSkincareCatalog';
import { useCartStore } from '../../../core/state/cartStore';
import { formatRupee, getDiscountPercent, getProductImageUrl } from '../shared/shopUtils';
import { defaultVariant, isSellable, variantStockState, type Variant } from '../../../../lib/shop/variants';
import { rememberProductViewed } from '../lib/recentlyViewed';

// Most units one customer can add in one go (the server enforces the same cap).
const MAX_QTY = 10;
import '../styles/shop-product.css';

// Shop category ids mapped to the names used on the browse screen.
const CATEGORY_LABELS: Record<string, string> = {
  Serums: 'Serums & Actives',
  Cleansers: 'Cleansers & Washes',
  Moisturizers: 'Moisturizers & Creams',
  Suncare: 'Sunscreen & SPF',
  Treatments: 'Spot Treatments',
};

// Everything on this screen comes from the product's own catalogue entry. Sections without data are not shown.
export const ShopProductScreen: React.FC = () => {
  const catalog = useLiveCatalog();
  const { navigate, goBack, activeParams, currentAddress, wishlist, toggleWishlist, showToast } = useApp();
  const rawId = activeParams?.productId ?? activeParams?.id;
  const productId = typeof rawId === 'string' ? rawId : undefined;
  const product = catalog.find((p) => p.id === productId);

  const cartTotalCount = useCartStore((state) => state.totalCount);
  // Units of this product in the bag, across its sizes or shades.
  const inCartCount = useCartStore((state) => (product ? Object.values(state.items).filter((i) => i.productId === product.id).reduce((n, i) => n + i.quantity, 0) : 0));
  const addItem = useCartStore((state) => state.addItem);

  const [quantity, setQuantity] = useState(1);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);

  // Open each product at the top, not at the scroll position of the list it was opened from.
  useEffect(() => {
    document.querySelector('.glowvai-root .screen-content')?.scrollTo?.(0, 0);
    window.scrollTo(0, 0);
    setQuantity(1);
    setVariantId(null);
    setImageFailed(false);
  }, [productId]);

  // Remembered for "Continue browsing" (ids only, on this device).
  useEffect(() => {
    if (product) rememberProductViewed(product.id);
  }, [product?.id]);

  if (!product) {
    return (
      <div className="shop-screen shop-product">
        <header className="shop-header">
          <button type="button" className="shop-icon-btn" onClick={goBack} aria-label="Go back">
            <ArrowLeft size={18} />
          </button>
        </header>
        <div className="shop-empty">
          <span className="shop-empty-icon">
            <PackageSearch size={24} />
          </span>
          <h3>Product not found</h3>
          <p>This product is unavailable right now.</p>
          <button type="button" className="shop-btn-primary" onClick={goBack}>
            Go back
          </button>
        </div>
      </div>
    );
  }

  // Products with sizes, shades or packs: the selected option drives price, MRP, stock and the cart line.
  const options: Variant[] | null = product.variants && product.variants.length > 0 ? product.variants : null;
  const selected: Variant | null = options ? options.find((v) => v.id === variantId) ?? defaultVariant(options) : null;
  const price = selected ? selected.price : product.price;
  const mrp = selected ? selected.mrp : product.originalPrice;
  const discount = selected ? (mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0) : getDiscountPercent(product);
  const stockState = selected ? variantStockState(selected) : null;
  const canBuy = selected ? isSellable(selected) : true;
  const maxQty = selected && selected.stock !== null ? Math.max(1, Math.min(MAX_QTY, selected.stock)) : MAX_QTY;
  const qty = Math.min(quantity, maxQty);
  const optionNoun = selected ? selected.label : product.volume;

  const heroImage = getProductImageUrl(product);
  const isWishlisted = wishlist.includes(product.id);
  const deliverTo = [currentAddress?.area, currentAddress?.city].filter(Boolean).join(', ');
  const categoryLabel = CATEGORY_LABELS[product.category] ?? product.category;

  const handleShare = async () => {
    // A link to this product itself, so anyone who opens it lands on the same product.
    const url = typeof window !== 'undefined' ? `${window.location.origin}/shop?product=${encodeURIComponent(product.id)}` : '';
    const text = `${product.brand} ${product.name} on GlowVAI`;
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, text, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url ? `${text}: ${url}` : text);
        showToast('Link copied');
      } else {
        showToast("Sharing isn't available in this browser");
      }
    } catch (error) {
      if ((error as { name?: string })?.name !== 'AbortError') showToast("Couldn't share this product");
    }
  };

  const handleAddToCart = () => {
    if (!canBuy) return;
    const line = selected
      ? { productId: product.id, variantId: selected.id, variantLabel: selected.label, price: selected.price, mrp: selected.mrp }
      : { productId: product.id, price: product.price, mrp: product.originalPrice };
    for (let i = 0; i < qty; i++) {
      addItem({ name: product.name, brand: product.brand, image: heroImage, ...line });
    }
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('cart-tab');
  };

  const openReviews = () => navigate('shop-product-reviews', { productId: product.id });

  return (
    <div className="shop-screen shop-product">
      <header className="shop-header">
        <button type="button" className="shop-icon-btn" onClick={goBack} aria-label="Go back">
          <ArrowLeft size={18} />
        </button>

        <span className="shop-product-crumb">{categoryLabel}</span>

        <div className="shop-header-actions">
          <button type="button" className="shop-icon-btn" onClick={handleShare} aria-label="Share product">
            <Share2 size={18} />
          </button>
          <button
            type="button"
            className={`shop-icon-btn shop-product-save${isWishlisted ? ' is-saved' : ''}`}
            onClick={() => toggleWishlist(product.id)}
            aria-pressed={isWishlisted}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart size={18} fill={isWishlisted ? 'currentColor' : 'none'} />
          </button>
          <button
            type="button"
            className="shop-icon-btn shop-product-cart"
            onClick={() => navigate('cart-tab')}
            aria-label={`Cart, ${cartTotalCount} items`}
          >
            <ShoppingBag size={18} />
            {cartTotalCount > 0 && <span className="shop-icon-count">{cartTotalCount}</span>}
          </button>
        </div>
      </header>

      <div className="shop-product-layout">
        <section className="shop-product-gallery">
          <div className="shop-product-hero">
            {discount > 0 && <span className="shop-product-hero-off">{discount}% OFF</span>}
            {heroImage && !imageFailed ? (
              <img src={heroImage} alt={product.name} width={800} height={800} decoding="async" onError={() => setImageFailed(true)} />
            ) : (
              <span className="shop-product-hero-fallback">{product.brand}</span>
            )}
          </div>
        </section>

        <aside className="shop-product-buy" aria-label="Buy">
          <div className="shop-product-panel">
            <span className="shop-product-maker">{product.brand}</span>
            <h1 className="shop-product-title">{product.name}</h1>
            <p className="shop-product-desc">{product.description}</p>

            <div className="shop-product-rating-row">
              <span className="shop-product-rating">
                <Star size={12} fill="currentColor" />
                {product.rating.toFixed(1)}
              </span>
              <button type="button" className="shop-product-reviews-link" onClick={openReviews}>
                {product.reviewCount.toLocaleString('en-IN')} reviews
                <ChevronRight size={14} />
              </button>
            </div>

            {options && selected && (
              <fieldset className="shop-product-variants">
                <legend className="shop-variants-legend">Choose an option</legend>
                <div className="shop-variants-grid">
                  {options.map((v) => {
                    const sellable = isSellable(v);
                    const checked = v.id === selected.id;
                    return (
                      <label key={v.id} className={`shop-variant${checked ? ' is-selected' : ''}${sellable ? '' : ' is-out'}`}>
                        <input
                          type="radio"
                          name={`variant-${product.id}`}
                          value={v.id}
                          checked={checked}
                          disabled={!sellable}
                          onChange={() => setVariantId(v.id)}
                        />
                        <span className="shop-variant-label">{v.label}</span>
                        <span className="shop-variant-price">{formatRupee(v.price)}</span>
                        {!sellable && <span className="shop-variant-out">Out of stock</span>}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <div className="shop-product-pricebar">
              <span className="shop-product-price-now">{formatRupee(price)}</span>
              {mrp > price && <span className="shop-product-price-mrp">MRP {formatRupee(mrp)}</span>}
              {discount > 0 && <span className="shop-product-off">{discount}% OFF</span>}
            </div>
            <p className="shop-product-tax">Inclusive of all taxes · {optionNoun}</p>
            {stockState && (
              <p className={`shop-product-stock is-${stockState.state}`} role="status" aria-live="polite">
                {stockState.state === 'out' ? 'Out of stock' : stockState.state === 'low' ? `Only ${stockState.count} left` : 'In stock'}
              </p>
            )}

            <div className="shop-product-qty-row">
              <span className="shop-product-qty-label">Quantity</span>
              <div className="shop-product-qty">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, Math.min(q, maxQty) - 1))}
                  disabled={qty <= 1}
                  aria-label="Decrease quantity"
                >
                  <Minus size={14} />
                </button>
                <span aria-live="polite">{qty}</span>
                <button type="button" onClick={() => setQuantity((q) => Math.min(q, maxQty) + 1)} disabled={qty >= maxQty} aria-label="Increase quantity">
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="shop-product-actions">
              <button type="button" className="shop-btn-primary shop-product-add-btn" onClick={handleAddToCart} disabled={!canBuy}>
                <ShoppingBag size={18} />
                {canBuy ? `Add to cart · ${formatRupee(price * qty)}` : 'Out of stock'}
              </button>
              <button type="button" className="shop-btn-secondary shop-product-buynow" onClick={handleBuyNow} disabled={!canBuy}>
                Buy now
              </button>
            </div>

            {inCartCount > 0 && (
              <button type="button" className="shop-product-incart" onClick={() => navigate('cart-tab')}>
                {inCartCount} in your cart
                <span>
                  View cart
                  <ChevronRight size={14} />
                </span>
              </button>
            )}
          </div>

          <div className="shop-product-eta">
            <span className="shop-product-eta-icon">
              <Zap size={18} fill="currentColor" />
            </span>
            <div>
              <p className="shop-product-eta-title">Delivered in {product.deliveryMinutes} minutes</p>
              {deliverTo && <p className="shop-product-eta-sub">to {deliverTo}</p>}
            </div>
          </div>
        </aside>

        {product.keyActives.length > 0 && (
          <section className="shop-product-panel shop-product-more">
            <h2 className="shop-product-section-title">Key actives</h2>
            <ul className="shop-product-actives">
              {product.keyActives.map((active) => (
                <li key={active}>
                  <FlaskConical size={14} />
                  {active}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="shop-product-panel shop-product-more">
          <h2 className="shop-product-section-title">Product details</h2>
          <dl className="shop-product-specs">
            <div>
              <dt>Brand</dt>
              <dd>{product.brand}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>
                <button type="button" onClick={() => navigate('shop-category', { categoryId: product.category })}>
                  {categoryLabel}
                </button>
              </dd>
            </div>
            <div>
              <dt>{options ? 'Option' : 'Size'}</dt>
              <dd>{optionNoun}</dd>
            </div>
          </dl>
          <div className="shop-product-acc-divider" />
          <button type="button" className="shop-product-acc-btn" onClick={openReviews}>
            <span>Ratings &amp; reviews ({product.reviewCount.toLocaleString('en-IN')})</span>
            <ChevronRight size={18} />
          </button>
        </section>
      </div>

      <div className="shop-product-buybar">
        <div className="shop-product-buybar-price">
          <div>
            <span className="shop-product-price-now">{formatRupee(price)}</span>
            {mrp > price && <span className="shop-product-price-mrp">{formatRupee(mrp)}</span>}
          </div>
          <small>
            {inCartCount > 0
              ? `${inCartCount} in your cart`
              : `${discount > 0 ? `${discount}% OFF · ` : ''}Delivered in ${product.deliveryMinutes} mins`}
          </small>
        </div>
        <button type="button" className="shop-btn-primary shop-product-buybar-btn" onClick={handleAddToCart} disabled={!canBuy}>
          {canBuy ? 'Add to cart' : 'Out of stock'}
        </button>
      </div>
    </div>
  );
};

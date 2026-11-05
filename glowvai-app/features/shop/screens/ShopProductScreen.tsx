import React, { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, FlaskConical, Heart, Minus, PackageSearch, Plus, Share2, ShoppingBag, Star, Zap } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import { useLiveCatalog } from '../../../core/data/indianSkincareCatalog';
import { useCartStore } from '../../../core/state/cartStore';
import { formatRupee, getDiscountPercent, getProductImageUrl } from '../shared/shopUtils';
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
  const inCartCount = useCartStore((state) => (product ? state.items[product.id]?.quantity ?? 0 : 0));
  const addItem = useCartStore((state) => state.addItem);

  const [quantity, setQuantity] = useState(1);
  const [imageFailed, setImageFailed] = useState(false);

  // Open each product at the top, not at the scroll position of the list it was opened from.
  useEffect(() => {
    document.querySelector('.glowvai-root .screen-content')?.scrollTo?.(0, 0);
    window.scrollTo(0, 0);
    setQuantity(1);
    setImageFailed(false);
  }, [productId]);

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

  const heroImage = getProductImageUrl(product);
  const discount = getDiscountPercent(product);
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
    for (let i = 0; i < quantity; i++) {
      addItem({
        productId: product.id,
        name: product.name,
        brand: product.brand,
        price: product.price,
        mrp: product.originalPrice,
        image: heroImage,
      });
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

            <div className="shop-product-pricebar">
              <span className="shop-product-price-now">{formatRupee(product.price)}</span>
              {product.originalPrice > product.price && (
                <span className="shop-product-price-mrp">MRP {formatRupee(product.originalPrice)}</span>
              )}
              {discount > 0 && <span className="shop-product-off">{discount}% OFF</span>}
            </div>
            <p className="shop-product-tax">Inclusive of all taxes · {product.volume}</p>

            <div className="shop-product-qty-row">
              <span className="shop-product-qty-label">Quantity</span>
              <div className="shop-product-qty">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                >
                  <Minus size={14} />
                </button>
                <span aria-live="polite">{quantity}</span>
                <button type="button" onClick={() => setQuantity((q) => q + 1)} aria-label="Increase quantity">
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="shop-product-actions">
              <button type="button" className="shop-btn-primary shop-product-add-btn" onClick={handleAddToCart}>
                <ShoppingBag size={18} />
                Add to cart · {formatRupee(product.price * quantity)}
              </button>
              <button type="button" className="shop-btn-secondary shop-product-buynow" onClick={handleBuyNow}>
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
              <dt>Size</dt>
              <dd>{product.volume}</dd>
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
            <span className="shop-product-price-now">{formatRupee(product.price)}</span>
            {product.originalPrice > product.price && (
              <span className="shop-product-price-mrp">{formatRupee(product.originalPrice)}</span>
            )}
          </div>
          <small>
            {inCartCount > 0
              ? `${inCartCount} in your cart`
              : `${discount > 0 ? `${discount}% OFF · ` : ''}Delivered in ${product.deliveryMinutes} mins`}
          </small>
        </div>
        <button type="button" className="shop-btn-primary shop-product-buybar-btn" onClick={handleAddToCart}>
          Add to cart
        </button>
      </div>
    </div>
  );
};

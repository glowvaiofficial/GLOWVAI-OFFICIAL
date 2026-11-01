import React, { useState } from 'react';
import { ArrowLeft, Check, ChevronRight, Clock, Heart, Info, MapPin, Minus, Plus, Share2, ShoppingBag } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import { useCatalog, useCatalogLoading } from '../../../core/state/catalogStore';
import { useCartStore } from '../../../core/state/cartStore';
import { ShopProductCard } from '../shared/ShopProductCard';
import { getCategoryMeta, productsInCategory, useScrollTopOn } from '../shared/shopCatalog';
import { cartLineFor, formatRupee, getDiscountPercent, getProductImageUrl } from '../shared/shopUtils';
import '../styles/shop-product.css';

// General, category-level directions. Product-specific directions are on the pack, and the page says so.
const HOW_TO_USE: Record<string, string> = {
  Serums: 'Apply a few drops to clean, dry skin before moisturiser. If you are new to actives, start every other evening, and wear sunscreen during the day.',
  Moisturizers: 'Smooth over face and neck after cleansing and serum, morning and night.',
  Suncare: 'Apply generously as the last step of your morning routine. Reapply every two to three hours when you are outdoors.',
  Cleansers: 'Massage onto damp skin for 30 to 60 seconds, rinse with lukewarm water and pat dry.',
  Treatments: 'Use as directed on the pack.',
};

export const ShopProductScreen: React.FC = () => {
  const { navigate, goBack, activeParams, currentAddress, wishlist, toggleWishlist, showToast } = useApp();
  const rawId = activeParams?.productId ?? activeParams?.id;
  const productId = typeof rawId === 'string' ? rawId : undefined;
  const catalog = useCatalog();
  const catalogLoading = useCatalogLoading();
  const product = catalog.find((p) => p.id === productId);
  const topRef = useScrollTopOn(productId);

  const cartCount = useCartStore((state) => state.totalCount);
  const inBag = useCartStore((state) => (productId ? state.items[productId]?.quantity ?? 0 : 0));
  const addItem = useCartStore((state) => state.addItem);

  const [quantity, setQuantity] = useState(1);
  const [imageFailed, setImageFailed] = useState(false);

  if (!product) {
    // A vendor product opened by link is not in the list until vendor products load.
    const waiting = catalogLoading && Boolean(productId);
    return (
      <div ref={topRef} className="shop-screen shop-product">
        <header className="shop-header">
          <button type="button" className="shop-icon-btn" onClick={goBack} aria-label="Go back">
            <ArrowLeft size={18} />
          </button>
          <h1>Product</h1>
        </header>
        {waiting ? (
          <div className="shop-empty" aria-busy="true">
            <p>Loading product…</p>
          </div>
        ) : (
          <div className="shop-empty">
            <span className="shop-empty-icon">
              <Info size={26} />
            </span>
            <h3>Product not found</h3>
            <p>This product is not in the shop right now.</p>
            <button type="button" className="shop-btn-primary" onClick={() => navigate('shop-browse')}>
              Browse products
            </button>
          </div>
        )}
      </div>
    );
  }

  const image = getProductImageUrl(product);
  const discount = getDiscountPercent(product);
  const saved = wishlist.includes(product.id);
  const category = getCategoryMeta(product.category);
  const similar = productsInCategory(product.category).filter((p) => p.id !== product.id);
  const eta = currentAddress?.serviceable ? currentAddress.deliveryMinutes : product.deliveryMinutes;
  const area = currentAddress ? [currentAddress.area, currentAddress.city].filter(Boolean).join(', ') : '';

  const handleShare = async () => {
    const text = `${product.brand} ${product.name} on glowvai`;
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        showToast('Product name copied');
      }
    } catch {
      /* The share sheet was dismissed. */
    }
  };

  const handleAddToCart = () => {
    const line = cartLineFor(product);
    for (let i = 0; i < quantity; i++) addItem(line);
    setQuantity(1);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('cart-tab');
  };

  const openReviews = () => navigate('shop-product-reviews', { productId: product.id });

  return (
    <div ref={topRef} className="shop-screen shop-product">
      <header className="shop-header shop-product-header">
        <button type="button" className="shop-icon-btn" onClick={goBack} aria-label="Go back">
          <ArrowLeft size={18} />
        </button>
        <nav className="shop-product-crumbs" aria-label="Breadcrumb">
          <button type="button" onClick={() => navigate('shop-home')}>
            Home
          </button>
          <ChevronRight size={13} />
          <button type="button" onClick={() => navigate('shop-category', { categoryId: product.category })}>
            {category?.label ?? product.category}
          </button>
        </nav>
        <div className="shop-product-header-actions">
          <button type="button" className="shop-icon-btn" onClick={handleShare} aria-label="Share product">
            <Share2 size={18} />
          </button>
          <button
            type="button"
            className={`shop-icon-btn shop-product-save-btn${saved ? ' is-saved' : ''}`}
            onClick={() => toggleWishlist(product.id)}
            aria-pressed={saved}
            aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
          >
            <Heart size={18} fill={saved ? 'currentColor' : 'none'} />
          </button>
          <button type="button" className="shop-icon-btn shop-header-cart" onClick={() => navigate('cart-tab')} aria-label={`Open bag, ${cartCount} items`}>
            <ShoppingBag size={18} />
            {cartCount > 0 && <span className="shop-icon-count">{cartCount}</span>}
          </button>
        </div>
      </header>

      <div className="shop-product-layout">
        <section className="shop-product-gallery" aria-label="Product image">
          <div className="shop-product-hero">
            {imageFailed || !image ? (
              <span className="shop-product-hero-fallback">{product.brand}</span>
            ) : (
              <img src={image} alt={`${product.brand} ${product.name}`} onError={() => setImageFailed(true)} />
            )}
            {discount > 0 && <span className="shop-product-hero-badge">{discount}% OFF</span>}
          </div>
        </section>

        <section className="shop-product-info">
          <div className="shop-product-panel shop-product-buybox">
            <button type="button" className="shop-product-maker" onClick={() => navigate('shop-browse', { brand: product.brand })}>
              {product.brand}
              <ChevronRight size={14} />
            </button>
            <h1 className="shop-product-title">{product.name}</h1>
            {product.volume && <p className="shop-product-size">{product.volume}</p>}
            {product.storeName && <p className="shop-product-seller">Sold by {product.storeName}</p>}

            <div className="shop-product-pricebar">
              <span className="shop-product-price-now">{formatRupee(product.price)}</span>
              {product.originalPrice > product.price && (
                <span className="shop-product-price-mrp">
                  MRP <s>{formatRupee(product.originalPrice)}</s>
                </span>
              )}
              {discount > 0 && <span className="shop-product-off">{discount}% OFF</span>}
            </div>
            <p className="shop-product-tax">Inclusive of all taxes</p>

            <div className="shop-product-eta">
              <span className="shop-product-eta-icon">
                <Clock size={16} />
              </span>
              <div>
                <p className="shop-product-eta-title">Delivery in about {eta} mins</p>
                {area && (
                  <button type="button" className="shop-product-eta-sub" onClick={() => navigate('location-setup')}>
                    <MapPin size={12} />
                    {area}
                    <ChevronRight size={12} />
                  </button>
                )}
              </div>
            </div>

            <div className="shop-product-actions">
              <div className="shop-product-qty" role="group" aria-label="Quantity">
                <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1} aria-label="Decrease quantity">
                  <Minus size={16} />
                </button>
                <span aria-live="polite">{quantity}</span>
                <button type="button" onClick={() => setQuantity((q) => Math.min(10, q + 1))} disabled={quantity >= 10} aria-label="Increase quantity">
                  <Plus size={16} />
                </button>
              </div>
              <button type="button" className="shop-btn-primary shop-product-add-btn" onClick={handleAddToCart}>
                <ShoppingBag size={18} />
                Add to bag<span className="shop-product-add-price"> · {formatRupee(product.price * quantity)}</span>
              </button>
              <button type="button" className="shop-btn-secondary shop-product-buy-now" onClick={handleBuyNow}>
                Buy now
              </button>
            </div>

            {inBag > 0 && (
              <button type="button" className="shop-product-inbag" onClick={() => navigate('cart-tab')}>
                <Check size={15} />
                {inBag} in your bag
                <span>View bag</span>
              </button>
            )}
          </div>

          {product.description && (
            <div className="shop-product-panel">
              <h2 className="shop-product-section-title">About this product</h2>
              <p className="shop-product-desc">{product.description}</p>
            </div>
          )}

          {product.keyActives.length > 0 && (
            <div className="shop-product-panel">
              <h2 className="shop-product-section-title">Key actives</h2>
              <ul className="shop-product-actives">
                {product.keyActives.map((active) => (
                  <li key={active}>{active}</li>
                ))}
              </ul>
              <p className="shop-product-note">Listed by the brand. Check the pack for the full ingredient list.</p>
            </div>
          )}

          <div className="shop-product-panel">
            <h2 className="shop-product-section-title">How to use</h2>
            <p className="shop-product-desc">{HOW_TO_USE[product.category] ?? HOW_TO_USE.Treatments}</p>
            <p className="shop-product-note">General guidance for {category?.short.toLowerCase() ?? 'this category'}. Follow the directions on the pack and patch test new products.</p>
          </div>

          <button type="button" className="shop-product-panel shop-product-reviews-row" onClick={openReviews}>
            <span>
              <b>Reviews</b>
              <small>No reviews yet</small>
            </span>
            <ChevronRight size={18} />
          </button>
        </section>
      </div>

      {similar.length > 0 && (
        <section className="shop-product-similar" aria-label={`More ${category?.short.toLowerCase() ?? 'products'}`}>
          <div className="shop-product-similar-head">
            <h2>More in {category?.label ?? product.category}</h2>
            <button type="button" onClick={() => navigate('shop-category', { categoryId: product.category })}>
              See all
              <ChevronRight size={15} />
            </button>
          </div>
          <div className="shop-product-similar-rail">
            {similar.slice(0, 5).map((p) => (
              <div key={p.id} className="shop-product-similar-item">
                <ShopProductCard product={p} onOpen={(next) => navigate('shop-product', { productId: next.id })} />
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="shop-product-buybar">
        <div className="shop-product-buybar-price">
          <span>
            <b>{formatRupee(product.price)}</b>
            {product.originalPrice > product.price && <s>{formatRupee(product.originalPrice)}</s>}
          </span>
          <small>{inBag > 0 ? `${inBag} in your bag` : discount > 0 ? `${discount}% off · incl. taxes` : 'Inclusive of all taxes'}</small>
        </div>
        {inBag > 0 ? (
          <button type="button" className="shop-btn-secondary shop-product-buybar-alt" onClick={() => navigate('cart-tab')}>
            View bag
          </button>
        ) : null}
        <button type="button" className="shop-btn-primary shop-product-buybar-btn" onClick={handleAddToCart}>
          {inBag > 0 ? 'Add one more' : 'Add to bag'}
        </button>
      </div>
    </div>
  );
};

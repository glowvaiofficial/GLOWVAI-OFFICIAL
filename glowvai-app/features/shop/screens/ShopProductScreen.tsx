import React, { useState } from 'react';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Droplet,
  Heart,
  Minus,
  Plus,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import { INDIAN_SKINCARE_CATALOG } from '../../../core/data/indianSkincareCatalog';
import { useCartStore } from '../../../core/state/cartStore';
import { formatRupee, getDiscountPercent, getProductImageUrl } from '../shared/shopUtils';
import '../styles/shop-product.css';

const STOCK_IMAGES = [
  'https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80',
];

const BENEFITS = ['Repairs skin barrier', 'Deep hydration', 'Boosts natural glow', 'Gentle & non-irritating'];

const KEY_INGREDIENTS: { name: string; desc: string; Icon: LucideIcon }[] = [
  { name: 'Ceramides (3%)', desc: 'Helps maintain and reinforce skin barrier integrity', Icon: ShieldCheck },
  { name: 'Panthenol (B5)', desc: 'Provides deep cosmetic hydration and soothing feel', Icon: Droplet },
  { name: 'Niacinamide (5%)', desc: 'Promotes smooth texture and radiant, even tone', Icon: Award },
];

export const ShopProductScreen: React.FC = () => {
  const { navigate, goBack, activeParams } = useApp();
  const rawId = activeParams?.productId ?? activeParams?.id;
  const productId = typeof rawId === 'string' ? rawId : undefined;
  const product = INDIAN_SKINCARE_CATALOG.find((p) => p.id === productId);

  const cartTotalCount = useCartStore((state) => state.totalCount);
  const addItem = useCartStore((state) => state.addItem);

  const [quantity, setQuantity] = useState(1);
  const [howToUseOpen, setHowToUseOpen] = useState(true);
  const [ingredientsOpen, setIngredientsOpen] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  if (!product) {
    return (
      <div className="shop-screen shop-product">
        <header className="shop-header">
          <button type="button" className="shop-icon-btn" onClick={goBack} aria-label="Go back">
            <ArrowLeft size={18} />
          </button>
          <div className="shop-product-logo">
            <Sparkles size={16} />
            <span>GlowVAI</span>
          </div>
        </header>
        <div className="shop-empty">
          <h3>Product not found</h3>
          <p>This product is unavailable right now.</p>
          <button type="button" className="shop-btn-secondary shop-product-empty-btn" onClick={goBack}>
            Go back
          </button>
        </div>
      </div>
    );
  }

  const heroImage = getProductImageUrl(product) || STOCK_IMAGES[0];
  const images = [heroImage, ...STOCK_IMAGES];
  const discount = getDiscountPercent(product);
  const fullIngredientsText = product.keyActives.length
    ? product.keyActives.join(', ')
    : 'Ceramides, Panthenol, Niacinamide, Glycerin, Hyaluronic Acid';

  const prevImage = () => setActiveImageIdx((i) => (i > 0 ? i - 1 : images.length - 1));
  const nextImage = () => setActiveImageIdx((i) => (i + 1) % images.length);

  const handleShare = async () => {
    const text = `Check out ${product.brand} ${product.name} delivered in ${product.deliveryMinutes} mins on GlowVAI!`;
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard?.writeText(text);
    } catch {}
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

        <div className="shop-product-logo">
          <Sparkles size={16} />
          <span>GlowVAI</span>
        </div>

        <div className="shop-product-header-actions">
          <button type="button" className="shop-icon-btn" onClick={handleShare} aria-label="Share product">
            <Share2 size={18} />
          </button>
          <button
            type="button"
            className="shop-icon-btn"
            onClick={() => setIsWishlisted((v) => !v)}
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
            {cartTotalCount > 0 && <span className="shop-product-cart-count">{cartTotalCount}</span>}
          </button>
        </div>
      </header>

      <div className="shop-product-layout">
        <section className="shop-product-gallery">
          <div className="shop-product-hero">
            <span className="shop-product-express">
              <Zap size={10} fill="currentColor" />
              10 MIN EXPRESS
            </span>

            <img src={images[activeImageIdx]} alt={product.name} />

            <button type="button" className="shop-product-arrow is-prev" onClick={prevImage} aria-label="Previous image">
              <ChevronLeft size={16} />
            </button>
            <button type="button" className="shop-product-arrow is-next" onClick={nextImage} aria-label="Next image">
              <ChevronRight size={16} />
            </button>

            <div className="shop-product-dots" aria-hidden="true">
              {images.map((_, i) => (
                <span key={i} className={i === activeImageIdx ? 'is-active' : undefined} />
              ))}
            </div>
          </div>

          <div className="shop-product-thumbs">
            {images.map((src, idx) => (
              <button
                key={idx}
                type="button"
                className={`shop-product-thumb${activeImageIdx === idx ? ' is-active' : ''}`}
                onClick={() => setActiveImageIdx(idx)}
                aria-label={`Show image ${idx + 1}`}
              >
                <img src={src} alt="" />
              </button>
            ))}
          </div>
        </section>

        <section className="shop-product-info">
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
                {product.reviewCount.toLocaleString('en-IN')} verified reviews →
              </button>
            </div>

            <div className="shop-product-pricebar">
              <span className="shop-product-price-now">{formatRupee(product.price)}</span>
              {product.originalPrice > product.price && (
                <span className="shop-product-price-mrp">{formatRupee(product.originalPrice)}</span>
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
                  aria-label="Decrease quantity"
                >
                  <Minus size={14} />
                </button>
                <span>{quantity}</span>
                <button type="button" onClick={() => setQuantity((q) => q + 1)} aria-label="Increase quantity">
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="shop-product-actions">
              <button type="button" className="shop-btn-primary" onClick={handleAddToCart}>
                <ShoppingBag size={18} />
                ADD TO CART — {formatRupee(product.price * quantity)}
              </button>
              <button type="button" className="shop-product-buynow" onClick={handleBuyNow}>
                INSTANT BUY NOW
              </button>
            </div>
          </div>

          <div className="shop-product-eta">
            <Zap size={20} fill="currentColor" />
            <div>
              <p className="shop-product-eta-title">Delivered in {product.deliveryMinutes} minutes</p>
              <p className="shop-product-eta-sub">to Vijayawada · Order now for instant dispatch</p>
            </div>
          </div>

          <div className="shop-product-panel">
            <h2 className="shop-product-section-title">Why You'll Love It</h2>
            <div className="shop-product-benefits">
              {BENEFITS.map((benefit) => (
                <span key={benefit} className="shop-product-benefit">
                  <CheckCircle2 size={14} />
                  {benefit}
                </span>
              ))}
            </div>
          </div>

          <div className="shop-product-panel">
            <h2 className="shop-product-section-title">Key Ingredients</h2>
            {KEY_INGREDIENTS.map(({ name, desc, Icon }) => (
              <div key={name} className="shop-product-ingredient">
                <span className="shop-product-ingredient-icon">
                  <Icon size={16} />
                </span>
                <div>
                  <p className="shop-product-ingredient-name">{name}</p>
                  <p className="shop-product-ingredient-desc">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="shop-product-panel shop-product-accordions">
            <button
              type="button"
              className="shop-product-acc-btn"
              aria-expanded={howToUseOpen}
              onClick={() => setHowToUseOpen((v) => !v)}
            >
              <span>How to Use</span>
              <ChevronDown size={18} className={howToUseOpen ? 'is-open' : undefined} />
            </button>
            {howToUseOpen && (
              <p className="shop-product-acc-body">
                Apply 3-4 drops to cleansed face morning and night. Gently pat into skin before moisturizer.
              </p>
            )}

            <div className="shop-product-acc-divider" />

            <button
              type="button"
              className="shop-product-acc-btn"
              aria-expanded={ingredientsOpen}
              onClick={() => setIngredientsOpen((v) => !v)}
            >
              <span>Full Ingredients List</span>
              <ChevronDown size={18} className={ingredientsOpen ? 'is-open' : undefined} />
            </button>
            {ingredientsOpen && <p className="shop-product-acc-body">{fullIngredientsText}</p>}

            <div className="shop-product-acc-divider" />

            <button type="button" className="shop-product-acc-btn" onClick={openReviews}>
              <span>Customer Reviews ({product.reviewCount.toLocaleString('en-IN')})</span>
              <ChevronRight size={18} />
            </button>
          </div>
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
            {discount > 0 && `${discount}% OFF · `}Delivered in {product.deliveryMinutes} mins
          </small>
        </div>
        <button type="button" className="shop-btn-primary shop-product-buybar-btn" onClick={handleAddToCart}>
          ADD TO CART
        </button>
      </div>
    </div>
  );
};

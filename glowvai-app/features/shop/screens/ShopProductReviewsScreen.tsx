import React from 'react';
import { ArrowLeft, MessageSquareText, PackageSearch, Star } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import { INDIAN_SKINCARE_CATALOG } from '../../../core/data/indianSkincareCatalog';
import { useCartStore } from '../../../core/state/cartStore';
import { formatRupee, getProductImageUrl, getProductThumbUrl } from '../shared/shopUtils';
import '../styles/shop-product-reviews.css';

// Stars rounded to the nearest half for display. The number shown next to them is the catalogue rating itself.
const Stars: React.FC<{ value: number; size: number; className: string }> = ({ value, size, className }) => {
  const rounded = Math.round(value);
  return (
    <span className={className} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={size} fill={s <= rounded ? 'currentColor' : 'none'} className={s <= rounded ? 'is-on' : undefined} />
      ))}
    </span>
  );
};

// There is no review service yet, so this screen shows only the catalogue's rating summary and says so plainly.
export const ShopProductReviewsScreen: React.FC = () => {
  const { goBack, navigate, activeParams } = useApp();
  const addItem = useCartStore((state) => state.addItem);

  const rawId = activeParams?.productId ?? activeParams?.id;
  const product = INDIAN_SKINCARE_CATALOG.find((p) => p.id === rawId);

  if (!product) {
    return (
      <div className="shop-screen shop-reviews">
        <header className="shop-header">
          <button type="button" className="shop-icon-btn" onClick={goBack} aria-label="Go back">
            <ArrowLeft size={18} />
          </button>
          <h1>Reviews &amp; Ratings</h1>
        </header>
        <div className="shop-empty">
          <span className="shop-empty-icon">
            <PackageSearch size={24} />
          </span>
          <h3>Product not found</h3>
          <p>Open a product from the shop to see its ratings.</p>
          <button type="button" className="shop-btn-primary" onClick={() => navigate('shop-browse')}>
            Browse products
          </button>
        </div>
      </div>
    );
  }

  const image = getProductThumbUrl(product);
  const reviewCount = product.reviewCount.toLocaleString('en-IN');

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      mrp: product.originalPrice,
      image: getProductImageUrl(product),
    });
  };

  return (
    <div className="shop-screen shop-reviews">
      <header className="shop-header">
        <button type="button" className="shop-icon-btn" onClick={goBack} aria-label="Go back">
          <ArrowLeft size={18} />
        </button>
        <div className="shop-header-titles">
          <h1>Reviews &amp; Ratings</h1>
          <p className="shop-header-sub">{product.name}</p>
        </div>
      </header>

      <div className="shop-reviews-body">
        <aside className="shop-reviews-side">
          <section className="shop-reviews-summary" aria-label="Rating summary">
            <span className="shop-reviews-score-value">{product.rating.toFixed(1)}</span>
            <div className="shop-reviews-score-meta">
              <Stars value={product.rating} size={16} className="shop-reviews-stars" />
              <span className="shop-reviews-total">
                {product.rating.toFixed(1)} out of 5 · {reviewCount} reviews
              </span>
            </div>
          </section>

          <section className="shop-reviews-buybar" aria-label="Product">
            {image && <img className="shop-reviews-buybar-thumb" src={image} alt="" width={96} height={96} />}
            <button type="button" className="shop-reviews-buybar-info" onClick={() => navigate('shop-product', { productId: product.id })}>
              <span className="shop-reviews-buybar-brand">{product.brand}</span>
              <span className="shop-reviews-buybar-title">{product.name}</span>
              <span className="shop-reviews-buybar-price">
                {formatRupee(product.price)}
                {product.originalPrice > product.price && <s>{formatRupee(product.originalPrice)}</s>}
              </span>
            </button>
            <button type="button" className="shop-btn-primary shop-reviews-add" onClick={handleAddToCart}>
              Add to cart
            </button>
          </section>
        </aside>

        <section className="shop-reviews-none">
          <span className="shop-reviews-none-icon">
            <MessageSquareText size={22} />
          </span>
          <h2>No written reviews yet</h2>
          <p>
            The rating shown here is the product's catalogue rating. Written reviews from GlowVAI customers will appear here once
            they are available.
          </p>
          <button type="button" className="shop-btn-primary shop-reviews-empty-btn" onClick={() => navigate('shop-product', { productId: product.id })}>
            Back to product
          </button>
        </section>
      </div>
    </div>
  );
};

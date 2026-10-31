import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, ChevronDown, Star, ThumbsUp } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import { INDIAN_SKINCARE_CATALOG } from '../../../core/data/indianSkincareCatalog';
import { useCartStore } from '../../../core/state/cartStore';
import { formatRupee, getProductImageUrl } from '../shared/shopUtils';
import '../styles/shop-product-reviews.css';

const THUMB_IMAGE = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=200&q=80';

const FILTER_CHIPS = ['All', 'My Skin Type', 'Combination', 'Dry', 'Oily', 'With Photos'];

const RATING_BARS = [
  { stars: '5★', pct: 82, count: '1,023' },
  { stars: '4★', pct: 12, count: '150' },
  { stars: '3★', pct: 4, count: '50' },
  { stars: '2★', pct: 1, count: '12' },
  { stars: '1★', pct: 1, count: '13' },
];

const REVIEWS: {
  id: string;
  author: string;
  skinType: string;
  rating: number;
  date: string;
  verified: boolean;
  comment: string;
  helpful: number;
  photo?: string;
}[] = [
  {
    id: 'r1',
    author: 'Sneha P.',
    skinType: 'Combination Skin',
    rating: 5,
    date: '2 days ago',
    verified: true,
    comment:
      'Feels lightweight on application. My skin feels softer and absorbs quickly without leaving any sticky residue. Perfect under daily sunscreen.',
    helpful: 14,
    photo: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 'r2',
    author: 'Ananya R.',
    skinType: 'Dry Skin',
    rating: 5,
    date: '1 week ago',
    verified: true,
    comment:
      'Gives a comfortable hydrated feel throughout the day. Works well in my routine and helps maintain a smooth, fresh-looking complexion.',
    helpful: 9,
  },
  {
    id: 'r3',
    author: 'Kavya T.',
    skinType: 'Oily Skin',
    rating: 4,
    date: '2 weeks ago',
    verified: true,
    comment:
      'Absorbs quickly and fits right into my morning routine. Gives a nice subtle glow without clogging pores.',
    helpful: 6,
  },
];

const Stars: React.FC<{ value: number; size: number; className: string }> = ({ value, size, className }) => (
  <span className={className} aria-label={`${value} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((s) => (
      <Star key={s} size={size} fill={s <= value ? 'currentColor' : 'none'} className={s <= value ? 'is-on' : undefined} />
    ))}
  </span>
);

export const ShopProductReviewsScreen: React.FC = () => {
  const { goBack, activeParams } = useApp();
  const addItem = useCartStore((state) => state.addItem);

  const rawId = activeParams?.productId;
  const product = INDIAN_SKINCARE_CATALOG.find((p) => p.id === rawId);

  const displayName = product?.name ?? 'GlowVAI Barrier Repair Serum';
  const displayBrand = product?.brand ?? 'GlowVAI';
  const displayPrice = product?.price ?? 699;
  const displayMrp = product?.originalPrice ?? 999;
  const displayImage = (product && getProductImageUrl(product)) || THUMB_IMAGE;

  const [activeFilter, setActiveFilter] = useState('All');
  const [helpfulCounts, setHelpfulCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(REVIEWS.map((r) => [r.id, r.helpful]))
  );

  const handleHelpful = (id: string) => {
    setHelpfulCounts((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  };

  const handleAddToCart = () => {
    addItem({
      productId: product?.id ?? 'p-barrier-repair',
      name: displayName,
      brand: displayBrand,
      price: displayPrice,
      mrp: displayMrp,
      image: displayImage,
    });
  };

  return (
    <div className="shop-screen shop-reviews">
      <header className="shop-header">
        <button type="button" className="shop-icon-btn" onClick={goBack} aria-label="Go back">
          <ArrowLeft size={18} />
        </button>
        <div className="shop-reviews-product">
          <img className="shop-reviews-thumb" src={displayImage} alt="" />
          <div className="shop-reviews-titles">
            <h1>Reviews &amp; Ratings</h1>
            <p>{displayName}</p>
          </div>
        </div>
      </header>

      <div className="shop-reviews-body">
        <section className="shop-reviews-summary">
          <div className="shop-reviews-score">
            <span className="shop-reviews-score-value">4.8</span>
            <Stars value={5} size={14} className="shop-reviews-stars" />
            <span className="shop-reviews-total">1,248 reviews</span>
            <span className="shop-reviews-verified-all">
              <CheckCircle2 size={10} />
              100% Verified Buyers
            </span>
          </div>

          <div className="shop-reviews-bars">
            {RATING_BARS.map((bar) => (
              <div key={bar.stars} className="shop-reviews-bar-row">
                <span className="shop-reviews-bar-label">{bar.stars}</span>
                <div className="shop-reviews-bar-track">
                  <div className="shop-reviews-bar-fill" style={{ width: `${bar.pct}%` }} />
                </div>
                <span className="shop-reviews-bar-pct">{bar.pct}%</span>
              </div>
            ))}
          </div>
        </section>

        <section className="shop-reviews-filters">
          <div className="shop-chip-row">
            {FILTER_CHIPS.map((chip) => {
              const isActive = activeFilter === chip;
              return (
                <button
                  key={chip}
                  type="button"
                  className={`shop-chip${isActive ? ' is-active' : ''}`}
                  aria-pressed={isActive}
                  onClick={() => setActiveFilter(chip)}
                >
                  {chip}
                </button>
              );
            })}
          </div>

          <div className="shop-reviews-sort">
            <span>Sort by:</span>
            <span className="shop-reviews-sort-pill">
              Most Helpful
              <ChevronDown size={14} />
            </span>
          </div>
        </section>

        {REVIEWS.map((rev) => (
          <article key={rev.id} className="shop-reviews-card">
            <div className="shop-reviews-card-top">
              <span className="shop-reviews-avatar">{rev.author.substring(0, 2)}</span>
              <div className="shop-reviews-author">
                <div className="shop-reviews-author-row">
                  <span className="shop-reviews-name">{rev.author}</span>
                  {rev.verified && (
                    <span className="shop-reviews-verified">
                      <CheckCircle2 size={10} />
                      Verified
                    </span>
                  )}
                </div>
                <span className="shop-reviews-skin">{rev.skinType}</span>
              </div>
              <span className="shop-reviews-date">{rev.date}</span>
            </div>

            <Stars value={rev.rating} size={12} className="shop-reviews-stars-compact" />

            <p className="shop-reviews-comment">{rev.comment}</p>

            {rev.photo && <img className="shop-reviews-photo" src={rev.photo} alt="" />}

            <div className="shop-reviews-footer">
              <button type="button" className="shop-reviews-helpful" onClick={() => handleHelpful(rev.id)}>
                <ThumbsUp size={12} />
                Helpful ({helpfulCounts[rev.id] ?? rev.helpful})
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="shop-reviews-buybar">
        <img className="shop-reviews-buybar-thumb" src={displayImage} alt="" />
        <div className="shop-reviews-buybar-info">
          <span className="shop-reviews-buybar-title">{displayName}</span>
          <span className="shop-reviews-buybar-price">
            {formatRupee(displayPrice)} <s>{formatRupee(displayMrp)}</s>
          </span>
        </div>
        <button type="button" className="shop-reviews-add" onClick={handleAddToCart}>
          ADD TO CART
        </button>
      </div>
    </div>
  );
};

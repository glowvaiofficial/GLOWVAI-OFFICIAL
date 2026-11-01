import React from 'react';
import { ArrowLeft, MessageSquareText } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import { useCatalog } from '../../../core/state/catalogStore';
import { useScrollTopOn } from '../shared/shopCatalog';
import { formatRupee, getProductImageUrl } from '../shared/shopUtils';
import '../styles/shop-reviews.css';

// Product reviews are not collected by the shop yet. The page used to show invented reviews and a
// verified-buyer claim, so it now says there are none instead.
export const ShopReviewsEmptyScreen: React.FC = () => {
  const { goBack, navigate, activeParams } = useApp();
  const productId = typeof activeParams?.productId === 'string' ? activeParams.productId : undefined;
  const product = useCatalog().find((p) => p.id === productId);
  const topRef = useScrollTopOn(productId);

  return (
    <div ref={topRef} className="shop-screen shop-reviews-empty">
      <header className="shop-header">
        <button type="button" className="shop-icon-btn" onClick={goBack} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <h1>Reviews</h1>
      </header>

      <div className="shop-reviews-empty-body">
        {product && (
          <button type="button" className="shop-reviews-product" onClick={() => navigate('shop-product', { productId: product.id })}>
            <span className="shop-reviews-product-media">
              <img src={getProductImageUrl(product)} alt="" />
            </span>
            <span className="shop-reviews-product-copy">
              <small>{product.brand}</small>
              <b>{product.name}</b>
              <span>
                {formatRupee(product.price)} · {product.volume}
              </span>
            </span>
          </button>
        )}

        <div className="shop-reviews-empty-card">
          <span className="shop-empty-icon">
            <MessageSquareText size={26} />
          </span>
          <h2>No reviews yet</h2>
          <p>Reviews from customers who bought this product will appear here once we start collecting them.</p>
          <button type="button" className="shop-btn-primary" onClick={goBack}>
            {product ? 'Back to product' : 'Go back'}
          </button>
        </div>
      </div>
    </div>
  );
};

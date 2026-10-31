import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../../../context/useApp';

// Product reviews are not collected by the shop yet. The page used to show invented reviews and a
// verified-buyer claim, so it now says there are none instead.
export const ShopReviewsEmptyScreen: React.FC = () => {
  const { goBack } = useApp();

  return (
    <div className="shop-screen shop-reviews-empty">
      <header className="shop-header">
        <button type="button" className="shop-icon-btn" onClick={goBack} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1>Reviews</h1>
        </div>
      </header>

      <div className="shop-reviews-empty-body">
        <h2>No reviews yet</h2>
        <p>Reviews from customers will appear here once they are collected for this product.</p>
        <button type="button" className="shop-btn-primary" onClick={goBack}>
          Back to product
        </button>
      </div>
    </div>
  );
};

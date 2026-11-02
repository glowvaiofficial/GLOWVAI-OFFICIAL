import React from 'react';
import { ArrowLeft, Heart, ShoppingBag } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import { INDIAN_SKINCARE_CATALOG } from '../../../core/data/indianSkincareCatalog';
import { useCartStore } from '../../../core/state/cartStore';
import { ShopProductCard } from '../shared/ShopProductCard';
import '../styles/shop-wishlist.css';

// Shows only the products the shopper saved (app wishlist state), matched to the catalogue for live prices.
export const ShopWishlistScreen: React.FC = () => {
  const { navigate, goBack, wishlist, toggleWishlist } = useApp();
  const cartTotalCount = useCartStore((state) => state.totalCount);

  const savedProducts = wishlist
    .map((id) => INDIAN_SKINCARE_CATALOG.find((p) => p.id === id))
    .filter((p): p is (typeof INDIAN_SKINCARE_CATALOG)[number] => Boolean(p));

  return (
    <div className="shop-screen shop-wishlist">
      <header className="shop-header shop-wishlist-header">
        <button type="button" className="shop-icon-btn" onClick={goBack} aria-label="Go back">
          <ArrowLeft size={18} />
        </button>
        <h1 className="shop-wishlist-title">
          <Heart size={18} fill="var(--primary)" color="var(--primary)" />
          My Wishlist
          {savedProducts.length > 0 && <span className="shop-wishlist-count">{savedProducts.length}</span>}
        </h1>
        <button type="button" className="shop-icon-btn shop-wishlist-cart" onClick={() => navigate('cart-tab')} aria-label={`Cart, ${cartTotalCount} items`}>
          <ShoppingBag size={18} />
          {cartTotalCount > 0 && <span className="shop-wishlist-badge">{cartTotalCount}</span>}
        </button>
      </header>

      <main className="shop-wishlist-main">
        {savedProducts.length === 0 ? (
          <div className="shop-empty shop-wishlist-empty">
            <span className="shop-wishlist-empty-icon">
              <Heart size={26} />
            </span>
            <h3>Your wishlist is empty</h3>
            <p>Tap the heart on any product page to save it here.</p>
            <button type="button" className="shop-btn-primary shop-wishlist-empty-btn" onClick={() => navigate('shop-browse')}>
              Browse products
            </button>
          </div>
        ) : (
          <div className="shop-product-grid shop-wishlist-grid">
            {savedProducts.map((product) => (
              <div key={product.id} className="shop-wishlist-item">
                <ShopProductCard product={product} onOpen={(p) => navigate('shop-product', { productId: p.id })} />
                <button
                  type="button"
                  className="shop-wishlist-heart"
                  onClick={() => toggleWishlist(product.id)}
                  aria-label={`Remove ${product.name} from wishlist`}
                >
                  <Heart size={16} fill="currentColor" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

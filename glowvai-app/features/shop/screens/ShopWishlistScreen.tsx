import React from 'react';
import { ArrowLeft, Heart, ShoppingBag } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import type { SkincareProduct } from '../../../core/data/indianSkincareCatalog';
import { useCatalog } from '../../../core/state/catalogStore';
import { useCartStore } from '../../../core/state/cartStore';
import { ShopProductCard } from '../shared/ShopProductCard';
import { useScrollTopOn } from '../shared/shopCatalog';
import { cartLineFor, formatRupee } from '../shared/shopUtils';
import '../styles/shop-wishlist.css';

// Saved products come from the app wishlist (the heart on every product card and product page).
// Ids that are not in the shop catalogue cannot be shown or bought here, so they are left out.
export const ShopWishlistScreen: React.FC = () => {
  const { navigate, goBack, wishlist } = useApp();
  const topRef = useScrollTopOn('wishlist');
  const cartCount = useCartStore((s) => s.totalCount);
  const cartItems = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const catalog = useCatalog();

  const saved = wishlist
    .map((id) => catalog.find((p) => p.id === id))
    .filter((p): p is SkincareProduct => Boolean(p));
  const notInBag = saved.filter((p) => !cartItems[p.id]);
  const notInBagTotal = notInBag.reduce((sum, p) => sum + p.price, 0);

  const addAllToBag = () => {
    for (const p of notInBag) {
      addItem(cartLineFor(p));
    }
  };

  return (
    <div ref={topRef} className="shop-screen shop-wishlist">
      <header className="shop-header shop-wishlist-header">
        <button type="button" className="shop-icon-btn" onClick={goBack} aria-label="Go back">
          <ArrowLeft size={18} />
        </button>
        <div className="shop-wishlist-heading">
          <h1>Wishlist</h1>
          {saved.length > 0 && (
            <small>
              {saved.length} saved {saved.length === 1 ? 'product' : 'products'}
            </small>
          )}
        </div>
        <button type="button" className="shop-icon-btn shop-header-cart" onClick={() => navigate('cart-tab')} aria-label={`Open bag, ${cartCount} items`}>
          <ShoppingBag size={18} />
          {cartCount > 0 && <span className="shop-icon-count">{cartCount}</span>}
        </button>
      </header>

      {saved.length === 0 ? (
        <div className="shop-empty shop-wishlist-empty">
          <span className="shop-empty-icon">
            <Heart size={26} />
          </span>
          <h3>Nothing saved yet</h3>
          <p>Tap the heart on any product to keep it here for later.</p>
          <button type="button" className="shop-btn-primary" onClick={() => navigate('shop-home')}>
            Start shopping
          </button>
        </div>
      ) : (
        <main className="shop-wishlist-main">
          {notInBag.length > 0 && (
            <div className="shop-wishlist-summary">
              <div>
                <b>
                  {notInBag.length} {notInBag.length === 1 ? 'item is' : 'items are'} not in your bag
                </b>
                <small>Total {formatRupee(notInBagTotal)} at today's prices</small>
              </div>
              <button type="button" className="shop-btn-primary" onClick={addAllToBag}>
                <ShoppingBag size={16} />
                Add all to bag
              </button>
            </div>
          )}
          <div className="shop-product-grid shop-wishlist-grid">
            {saved.map((product) => (
              <ShopProductCard key={product.id} product={product} onOpen={(p) => navigate('shop-product', { productId: p.id })} />
            ))}
          </div>
        </main>
      )}
    </div>
  );
};

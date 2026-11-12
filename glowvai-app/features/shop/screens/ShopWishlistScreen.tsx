import React from 'react';
import { ArrowLeft, Heart, ShoppingBag } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import { useLiveCatalog, type SkincareProduct } from '../../../core/data/indianSkincareCatalog';
import { useCartStore } from '../../../core/state/cartStore';
import { formatRupee, getProductThumbUrl } from '../shared/shopUtils';
import { fromPrice, isSellable } from '../../../../lib/shop/variants';
import '../styles/shop-wishlist.css';

// The shopper's saved products (device copy, synced to the account; see features/shop/lib/wishlistSync). Prices and
// availability come from the live catalogue only. A saved product that is no longer in the catalogue is labelled as
// such, and nothing about price drops or restocks is shown, because no price or stock history is kept.
export const ShopWishlistScreen: React.FC = () => {
  const catalog = useLiveCatalog();
  const { navigate, goBack, wishlist, toggleWishlist, showToast } = useApp();
  const cartTotalCount = useCartStore((state) => state.totalCount);
  const addItem = useCartStore((state) => state.addItem);

  const rows = wishlist.map((id) => ({ id, product: catalog.find((p) => p.id === id) }));
  const catalogReady = catalog.length > 0;

  const addToBag = (product: SkincareProduct) => {
    if (product.variants && product.variants.length > 0) {
      navigate('shop-product', { productId: product.id });
      return;
    }
    addItem({
      productId: product.id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      mrp: product.originalPrice,
      image: getProductThumbUrl(product),
    });
    showToast('Added to your bag');
  };

  return (
    <div className="shop-screen shop-wishlist">
      <header className="shop-header shop-wishlist-header">
        <button type="button" className="shop-icon-btn" onClick={goBack} aria-label="Go back">
          <ArrowLeft size={18} />
        </button>
        <h1 className="shop-wishlist-title">
          My Wishlist
          {rows.length > 0 && <span className="shop-wishlist-count">{rows.length}</span>}
        </h1>
        <button type="button" className="shop-icon-btn shop-wishlist-cart" onClick={() => navigate('cart-tab')} aria-label={`Cart, ${cartTotalCount} items`}>
          <ShoppingBag size={18} />
          {cartTotalCount > 0 && <span className="shop-icon-count">{cartTotalCount}</span>}
        </button>
      </header>

      <main className="shop-wishlist-main">
        {rows.length === 0 ? (
          <div className="shop-empty">
            <span className="shop-empty-icon">
              <Heart size={24} />
            </span>
            <h3>Your wishlist is empty</h3>
            <p>Tap the heart on any product to save it here. Your saved products stay with your account.</p>
            <button type="button" className="shop-btn-primary" onClick={() => navigate('shop-browse')}>
              Browse products
            </button>
          </div>
        ) : (
          <ul className="shop-wishlist-list" aria-label="Saved products">
            {rows.map(({ id, product }) => {
              if (!product) {
                return (
                  <li key={id} className="shop-wishlist-row">
                    <div className="shop-wishlist-info">
                      <span className="shop-wishlist-name">{catalogReady ? 'No longer available' : 'Loading saved product…'}</span>
                      {catalogReady && <span className="shop-wishlist-note">This product is not in the shop right now.</span>}
                    </div>
                    <button type="button" className="shop-wishlist-remove" onClick={() => toggleWishlist(id)} aria-label={`Remove saved product ${id} from wishlist`}>
                      Remove
                    </button>
                  </li>
                );
              }
              const variants = product.variants && product.variants.length > 0 ? product.variants : null;
              const inStock = variants ? variants.filter(isSellable).length : null;
              const price = variants ? fromPrice(variants).price : product.price;
              const mrp = variants ? fromPrice(variants).mrp : product.originalPrice;
              const canAdd = variants ? (inStock ?? 0) > 0 : true;
              return (
                <li key={id} className="shop-wishlist-row">
                  <button type="button" className="shop-wishlist-thumb" onClick={() => navigate('shop-product', { productId: product.id })} aria-label={`View ${product.name}`}>
                    <img src={getProductThumbUrl(product)} alt="" width={72} height={72} loading="lazy" />
                  </button>
                  <div className="shop-wishlist-info">
                    <span className="shop-wishlist-brand">{product.brand}</span>
                    <button type="button" className="shop-wishlist-name shop-wishlist-name-btn" onClick={() => navigate('shop-product', { productId: product.id })}>
                      {product.name}
                    </button>
                    <span className="shop-wishlist-volume">{variants ? `${variants.length} options` : product.volume}</span>
                    <span className="shop-wishlist-price">
                      {variants ? 'from ' : ''}
                      {formatRupee(price)}
                      {mrp > price && <s>{formatRupee(mrp)}</s>}
                    </span>
                    {inStock !== null && (
                      <span className={`shop-wishlist-stock${inStock > 0 ? '' : ' is-out'}`}>
                        {inStock > 0 ? `${inStock} ${inStock === 1 ? 'option' : 'options'} in stock` : 'Out of stock'}
                      </span>
                    )}
                  </div>
                  <div className="shop-wishlist-actions">
                    <button type="button" className="shop-btn-primary shop-wishlist-add" onClick={() => addToBag(product)} disabled={!canAdd}>
                      {!canAdd ? 'Out of stock' : variants ? 'Choose option' : 'Add to bag'}
                    </button>
                    <button type="button" className="shop-wishlist-remove" onClick={() => toggleWishlist(product.id)} aria-label={`Remove ${product.name} from wishlist`}>
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
};

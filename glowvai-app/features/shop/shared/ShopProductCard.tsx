import React, { useState } from 'react';
import { Clock, Heart, Minus, Plus } from 'lucide-react';
import type { SkincareProduct } from '../../../core/data/indianSkincareCatalog';
import { useApp } from '../../../context/useApp';
import { useCartStore } from '../../../core/state/cartStore';
import { cartLineFor, formatRupee, getDiscountPercent, getProductImageUrl } from './shopUtils';

interface ShopProductCardProps {
  product: SkincareProduct;
  onOpen: (product: SkincareProduct) => void;
}

// Grid card shared by shop screens. Reads and writes the shop cart, and the app wishlist.
export const ShopProductCard: React.FC<ShopProductCardProps> = ({ product, onOpen }) => {
  const { wishlist, toggleWishlist } = useApp();
  const [imageFailed, setImageFailed] = useState(false);
  const quantity = useCartStore((state) => state.items[product.id]?.quantity ?? 0);
  const addItem = useCartStore((state) => state.addItem);
  const incrementItem = useCartStore((state) => state.incrementItem);
  const decrementItem = useCartStore((state) => state.decrementItem);
  const discount = getDiscountPercent(product);
  const saved = wishlist.includes(product.id);
  const imageUrl = getProductImageUrl(product);

  const addToCart = () => addItem(cartLineFor(product));

  return (
    <article className="shop-product-card">
      <div className="shop-product-media">
        <button type="button" className="shop-product-open" onClick={() => onOpen(product)} aria-label={`View ${product.name}`}>
          {imageFailed || !imageUrl ? (
            <span className="shop-product-fallback">{product.brand}</span>
          ) : (
            <img src={imageUrl} alt="" loading="lazy" onError={() => setImageFailed(true)} />
          )}
        </button>
        {discount > 0 && <span className="shop-product-badge">{discount}% OFF</span>}
        <button
          type="button"
          className={`shop-product-save${saved ? ' is-saved' : ''}`}
          onClick={() => toggleWishlist(product.id)}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
        >
          <Heart size={15} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="shop-product-copy">
        <small className="shop-product-delivery">
          <Clock size={11} /> {product.deliveryMinutes} mins
        </small>
        <small className="shop-product-brand">{product.brand}</small>
        <button type="button" className="shop-product-name" onClick={() => onOpen(product)}>
          <span>{product.name}</span>
        </button>
        <small className="shop-product-volume">{product.volume}</small>

        <div className="shop-product-foot">
          <div className="shop-product-price">
            <b>{formatRupee(product.price)}</b>
            {product.originalPrice > product.price && <s>{formatRupee(product.originalPrice)}</s>}
          </div>
          {quantity > 0 ? (
            <span className="shop-stepper" role="group" aria-label={`${quantity} in cart`}>
              <button type="button" onClick={() => decrementItem(product.id)} aria-label={`Remove one ${product.name}`}>
                <Minus size={14} />
              </button>
              <b>{quantity}</b>
              <button type="button" onClick={() => incrementItem(product.id)} aria-label={`Add one more ${product.name}`}>
                <Plus size={14} />
              </button>
            </span>
          ) : (
            <button type="button" className="shop-product-add" onClick={addToCart} aria-label={`Add ${product.name} to cart`}>
              ADD
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

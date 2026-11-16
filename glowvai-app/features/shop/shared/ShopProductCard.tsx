import React, { useState } from 'react';
import { Clock, Heart, Minus, Plus, Star } from 'lucide-react';
import type { SkincareProduct } from '../../../core/data/indianSkincareCatalog';
import { useApp } from '../../../context/useApp';
import { useCartStore } from '../../../core/state/cartStore';
import { fromPrice } from '../../../../lib/shop/variants';
import { formatRupee, getDiscountPercent, getProductImageUrl, getProductThumbUrl, PRODUCT_FALLBACK_URL } from './shopUtils';

interface ShopProductCardProps {
  product: SkincareProduct;
  onOpen: (product: SkincareProduct) => void;
  // PC browse pages: adds rating, wishlist heart, savings line and a labelled Add button. 'list' lays the card out as a row.
  rich?: boolean;
  layout?: 'grid' | 'list';
}

// Grid card shared by shop screens. Reads and writes the mobile zustand cart.
export const ShopProductCard: React.FC<ShopProductCardProps> = ({ product, onOpen, rich = false, layout = 'grid' }) => {
  const { wishlist, toggleWishlist } = useApp();
  const isSaved = wishlist.includes(product.id);
  const [imageFailed, setImageFailed] = useState(false);
  const quantity = useCartStore((state) => state.items[product.id]?.quantity ?? 0);
  const addItem = useCartStore((state) => state.addItem);
  const incrementItem = useCartStore((state) => state.incrementItem);
  const decrementItem = useCartStore((state) => state.decrementItem);
  const discount = getDiscountPercent(product);
  // A product with sizes or shades is chosen on its page: the card shows "from" and opens the page.
  const options = product.variants && product.variants.length > 0 ? product.variants : null;

  const addToCart = () => {
    if (options) {
      onOpen(product);
      return;
    }
    addItem({
      productId: product.id,
      name: product.name,
      brand: product.brand,
      image: getProductImageUrl(product),
      price: product.price,
      mrp: product.originalPrice,
    });
  };

  return (
    <article className={`shop-product-card${rich ? ` is-rich is-${layout}` : ''}`}>
      <div className="shop-product-media">
        <button className="shop-product-open" onClick={() => onOpen(product)} aria-label={`View ${product.name}`}>
          {imageFailed ? (
            <img src={PRODUCT_FALLBACK_URL} alt={product.name} width={400} height={400} />
          ) : (
            <img
              src={getProductThumbUrl(product)}
              alt={product.name}
              width={400}
              height={400}
              loading="lazy"
              decoding="async"
              onError={() => setImageFailed(true)}
            />
          )}
        </button>
        {discount > 0 && <span className="shop-product-badge">{discount}% OFF</span>}
        {rich && (
          <button
            type="button"
            className={`shop-product-heart${isSaved ? ' is-saved' : ''}`}
            onClick={() => toggleWishlist(product.id)}
            aria-pressed={isSaved}
            aria-label={isSaved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          >
            <Heart size={16} fill={isSaved ? 'currentColor' : 'none'} />
          </button>
        )}
        {rich ? null : !options && quantity > 0 ? (
          <span className="shop-stepper" aria-label={`${quantity} in cart`}>
            <button onClick={() => decrementItem(product.id)} aria-label={`Remove one ${product.name}`}>
              <Minus size={14} />
            </button>
            <b>{quantity}</b>
            <button onClick={() => incrementItem(product.id)} aria-label={`Add one ${product.name}`}>
              <Plus size={14} />
            </button>
          </span>
        ) : (
          <button className="shop-product-add" onClick={addToCart} aria-label={options ? `Choose options for ${product.name}` : `Add ${product.name} to cart`}>
            Add <Plus size={16} />
          </button>
        )}
      </div>

      <div className="shop-product-copy">
        <small className="shop-product-brand">{product.brand}</small>
        <button className="shop-product-name" onClick={() => onOpen(product)}>
          {product.name}
        </button>
        <small className="shop-product-volume">{options ? `${options.length} options` : product.volume}</small>
        <div className="shop-product-price">
          {options ? (
            <>
              <small>from</small>
              <b>{formatRupee(fromPrice(options).price)}</b>
            </>
          ) : (
            <>
              <b>{formatRupee(product.price)}</b>
              {product.originalPrice > product.price && <s>{formatRupee(product.originalPrice)}</s>}
            </>
          )}
        </div>
        {product.rating !== null && (
          <span className="shop-product-rate">
            <b><Star size={11} fill="currentColor" /> {product.rating.toFixed(1)}</b>
            {product.reviewCount ? <small>({product.reviewCount.toLocaleString('en-IN')})</small> : null}
          </span>
        )}
        {!options && product.originalPrice > product.price && (
          <small className="shop-product-save">You save {formatRupee(product.originalPrice - product.price)}</small>
        )}
        {product.deliveryMinutes ? (
          <small className="shop-product-delivery">
            <Clock size={11} /> {product.deliveryMinutes} mins
          </small>
        ) : null}
        {rich && (
          <div className="shop-product-cta">
            {!options && quantity > 0 ? (
              <span className="shop-stepper is-inline" aria-label={`${quantity} in cart`}>
                <button onClick={() => decrementItem(product.id)} aria-label={`Remove one ${product.name}`}>
                  <Minus size={14} />
                </button>
                <b>{quantity}</b>
                <button onClick={() => incrementItem(product.id)} aria-label={`Add one ${product.name}`}>
                  <Plus size={14} />
                </button>
              </span>
            ) : (
              <button type="button" className="shop-product-add-btn" onClick={addToCart} aria-label={options ? `Choose options for ${product.name}` : `Add ${product.name} to cart`}>
                {options ? 'Choose options' : 'Add to cart'}
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

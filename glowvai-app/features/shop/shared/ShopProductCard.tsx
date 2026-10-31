import React, { useState } from 'react';
import { Clock, Minus, Plus } from 'lucide-react';
import type { SkincareProduct } from '../../../core/data/indianSkincareCatalog';
import { useCartStore } from '../../../core/state/cartStore';
import { formatRupee, getDiscountPercent, getProductImageUrl } from './shopUtils';

interface ShopProductCardProps {
  product: SkincareProduct;
  onOpen: (product: SkincareProduct) => void;
}

// Grid card shared by shop screens. Reads and writes the mobile zustand cart.
export const ShopProductCard: React.FC<ShopProductCardProps> = ({ product, onOpen }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const quantity = useCartStore((state) => state.items[product.id]?.quantity ?? 0);
  const addItem = useCartStore((state) => state.addItem);
  const incrementItem = useCartStore((state) => state.incrementItem);
  const decrementItem = useCartStore((state) => state.decrementItem);
  const discount = getDiscountPercent(product);

  const addToCart = () =>
    addItem({
      productId: product.id,
      name: product.name,
      brand: product.brand,
      image: getProductImageUrl(product),
      price: product.price,
      mrp: product.originalPrice,
    });

  return (
    <article className="shop-product-card">
      <div className="shop-product-media">
        <button className="shop-product-open" onClick={() => onOpen(product)} aria-label={`View ${product.name}`}>
          {imageFailed ? (
            <span className="shop-product-fallback">{product.brand}</span>
          ) : (
            <img src={getProductImageUrl(product)} alt={product.name} loading="lazy" onError={() => setImageFailed(true)} />
          )}
        </button>
        {discount > 0 && <span className="shop-product-badge">{discount}% OFF</span>}
        {quantity > 0 ? (
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
          <button className="shop-product-add" onClick={addToCart} aria-label={`Add ${product.name} to cart`}>
            <Plus size={18} />
          </button>
        )}
      </div>

      <div className="shop-product-copy">
        <small className="shop-product-brand">{product.brand}</small>
        <button className="shop-product-name" onClick={() => onOpen(product)}>
          {product.name}
        </button>
        <small className="shop-product-volume">{product.volume}</small>
        <div className="shop-product-price">
          <b>{formatRupee(product.price)}</b>
          {product.originalPrice > product.price && <s>{formatRupee(product.originalPrice)}</s>}
        </div>
        <small className="shop-product-delivery">
          <Clock size={11} /> {product.deliveryMinutes} mins
        </small>
      </div>
    </article>
  );
};

import React, { useState } from 'react';
import { Heart, Minus, PackageOpen, Plus, Zap } from 'lucide-react';
import { Product } from '../../types';
import { useApp } from '../../context/AppContext';

interface ProductCardProps {
  product: Product;
  compact?: boolean;
  className?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, compact = false, className = '' }) => {
  const { navigate, cart, addToCart, updateQuantity, wishlist, toggleWishlist } = useApp();
  const [imageFailed, setImageFailed] = useState(false);
  const variant = product.variants.find((entry) => entry.id === product.currentVariantId) || product.variants[0];
  const cartItem = cart.find((item) => item.product.id === product.id && item.variantId === variant.id);
  const saved = wishlist.includes(product.id);
  const saving = Math.max(0, variant.mrp - variant.price);
  const unavailable = !variant.inStock || product.availability === 'out_of_stock';

  return (
    <article className={`commerce-product-card${compact ? ' is-compact' : ''}${className ? ` ${className}` : ''}`}>
      <div className="commerce-product-media">
        <button className="commerce-product-open" onClick={() => navigate('product-detail', { productId: product.id })} aria-label={`View ${product.name}`}>
          {imageFailed ? <span className="commerce-product-fallback"><PackageOpen size={28} /><b>{product.brand}</b></span> : <img src={product.images[0]} alt={product.name} loading="lazy" onError={() => setImageFailed(true)} />}
        </button>
        {variant.discountPercent > 0 && <span className="commerce-product-discount">{variant.discountPercent}% OFF</span>}
        <button className={`commerce-product-heart${saved ? ' is-saved' : ''}`} onClick={() => toggleWishlist(product.id)} aria-label={saved ? 'Remove from saved' : 'Save product'}>
          <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
        </button>
        {unavailable ? (
          <button className="commerce-product-notify" disabled aria-label={`${product.name} is currently unavailable`}>Unavailable</button>
        ) : cartItem ? (
          <span className="commerce-product-stepper" aria-label={`${cartItem.quantity} in cart`}>
            <button onClick={() => updateQuantity(cartItem.id, -1)} aria-label={`Remove one ${product.name}`}><Minus size={14} /></button>
            <b>{cartItem.quantity}</b>
            <button onClick={() => updateQuantity(cartItem.id, 1)} aria-label={`Add one ${product.name}`}><Plus size={14} /></button>
          </span>
        ) : (
          <button className="commerce-product-add" onClick={() => addToCart(product, variant.id, false)} aria-label={`Add ${product.name} to cart`}><Plus size={22} /></button>
        )}
      </div>

      <div className="commerce-product-copy">
        <small className="commerce-product-delivery"><Zap size={11} fill="currentColor" /> {product.deliveryMinutes} mins</small>
        <button className="commerce-product-name" onClick={() => navigate('product-detail', { productId: product.id })}>
          <b className="line-clamp-2">{product.name}</b>
          <span>{variant.size}</span>
        </button>
        <div className="commerce-product-price">
          <b>₹{variant.price}</b>
          {variant.mrp > variant.price && <s>₹{variant.mrp}</s>}
        </div>
        {saving > 0 && <small className="commerce-product-saving">Save ₹{saving}</small>}
      </div>
    </article>
  );
};

import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useCartStore } from '../core/state/cartStore';
import { CartScreen as ShopCartScreen } from '../features/commerce/CartScreen';
import '../features/commerce/commerce.css';
import '../responsive/commerce-ported.css';
import '../responsive/cart-tracking.css';

// The development starter bag in AppContext. It was never added by the customer, so it is not carried over.
const STARTER_ITEM_ID = 'cart-init-1';
// Item ids already moved, so a repeated effect run (React strict mode) cannot add them twice.
const movedIds = new Set<string>();

// The 'cart' route shows the shop cart, the one every shop screen adds to and checkout reads.
// Items added through the older product pages (or "order again") are moved into it, so there is one cart to check out.
export const CartScreen: React.FC = () => {
  const { cart, clearCart } = useApp();

  useEffect(() => {
    if (!cart.length) return;
    const { addItem, incrementItem } = useCartStore.getState();
    cart.forEach((item) => {
      if (item.id === STARTER_ITEM_ID || movedIds.has(item.id)) return;
      movedIds.add(item.id);
      const variant = item.product.variants.find((entry) => entry.id === item.variantId) || item.product.variants[0];
      if (!variant || !variant.inStock) return;
      const productId = `${item.product.id}:${variant.id}`;
      addItem({
        productId,
        name: item.product.variants.length > 1 ? `${item.product.name} (${variant.size})` : item.product.name,
        brand: item.product.brand,
        image: item.product.images[0] || '',
        price: variant.price,
        mrp: variant.mrp,
      });
      for (let i = 1; i < item.quantity; i += 1) incrementItem(productId);
    });
    clearCart();
  }, [cart, clearCart]);

  return <ShopCartScreen />;
};

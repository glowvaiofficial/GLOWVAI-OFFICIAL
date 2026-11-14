import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { useCartStore } from '../../../core/state/cartStore';
import { cartBadgeLabel } from './cartBadge';

// Cart icon for the home top bar, with the same item count the web header and bottom bar use. Renders nothing when empty.
export function HeaderCartButton({ onOpen }: { onOpen: () => void }) {
  const count = useCartStore((s) => s.totalCount);
  const badge = cartBadgeLabel(count);
  if (badge === null) return null;
  const itemsText = `${count} ${count === 1 ? 'item' : 'items'}`;
  return (
    <button type="button" className="shop-icon-btn shop-home-cart" onClick={onOpen} aria-label={`Cart, ${itemsText}`}>
      <ShoppingBag size={18} aria-hidden="true" />
      <span className="shop-icon-count" aria-hidden="true">
        {badge}
      </span>
    </button>
  );
}

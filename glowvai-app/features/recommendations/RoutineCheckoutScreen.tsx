import React from 'react';
import { Info, ShoppingBag } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { useCatalog } from '../../core/state/catalogStore';
import { useCartStore } from '../../core/state/cartStore';
import { cartLineFor, formatRupee, getProductImageUrl } from '../shop/shared/shopUtils';
import { RecHeader } from './RecHeader';

// The three routine steps, as real catalogue products. Prices and stock come from the catalogue, not from this file.
const ROUTINE_STEPS = [
  { id: 'prod-17', step: 'Cleanse' },
  { id: 'prod-01', step: 'Treat' },
  { id: 'prod-12', step: 'Protect' },
];

export const RoutineCheckoutScreen: React.FC = () => {
  const { navigate } = useApp();
  const addItem = useCartStore((state) => state.addItem);
  const catalog = useCatalog();
  const rows = ROUTINE_STEPS.flatMap(({ id, step }) => {
    const product = catalog.find((p) => p.id === id);
    return product ? [{ product, step }] : [];
  });
  const products = rows.map((row) => row.product);
  const total = products.reduce((sum, product) => sum + product.price, 0);

  const addRoutineToCart = () => {
    products.forEach((product) => addItem(cartLineFor(product)));
    navigate('cart-tab');
  };

  return (
    <main className="rec-screen rec-checkout">
      <RecHeader title="Shop the morning routine" eyebrow="Routine guide" />

      <div className="rec-body">
        <p className="rec-note">
          <Info size={16} />
          Three products from the shop that match the general morning steps. They are not chosen for your skin.
        </p>

        <ol className="rec-card rec-checkout-list" aria-label="Routine products">
          {rows.map(({ product, step }, index) => (
            <li key={product.id} className="rec-checkout-item">
              <span className="rec-checkout-thumb">
                <img src={getProductImageUrl(product)} alt="" />
              </span>
              <div>
                <small>Step {index + 1} · {step} · {product.brand}</small>
                <b>{product.name}</b>
                {product.volume && <p>{product.volume}</p>}
              </div>
              <strong>{formatRupee(product.price)}</strong>
            </li>
          ))}
        </ol>

        <section className="rec-card rec-checkout-total">
          <div>
            <span>Routine total</span>
            <b>{formatRupee(total)}</b>
          </div>
          <p>Delivery and any offers are worked out in your cart before you pay.</p>
          <button type="button" className="rec-primary" onClick={addRoutineToCart} disabled={products.length === 0}>
            <ShoppingBag size={18} />
            Add all three to cart
          </button>
        </section>
      </div>
    </main>
  );
};

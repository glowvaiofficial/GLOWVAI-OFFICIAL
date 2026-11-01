import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import { getRecommendedRoutine } from '../../../core/services/recommendationService';
import type { SkincareProduct } from '../../../core/data/indianSkincareCatalog';
import { useCatalog } from '../../../core/state/catalogStore';
import { useCartStore } from '../../../core/state/cartStore';
import { cartLineFor, getProductImageUrl } from '../../shop/shared/shopUtils';

const formatPrice = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

// The routine names products as "Name (size)". Match them to the shop catalogue by brand and the start of the name,
// so the price shown and the item added to the bag are the ones the shop actually sells.
const normalise = (name: string) => name.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
const findInShop = (catalog: SkincareProduct[], brand: string, name: string) => {
  const wanted = normalise(name);
  const prefix = wanted.split(' ').slice(0, 3).join(' ');
  return catalog.find((p) => p.brand === brand && normalise(p.name).startsWith(prefix));
};

/** Routine steps from the shared catalogue, shown with the scan result. */
export const RoutineSection: React.FC = () => {
  const { navigate, showToast } = useApp();
  const addItem = useCartStore((state) => state.addItem);
  const catalog = useCatalog();
  const steps = getRecommendedRoutine().map((step) => ({ step, product: findInShop(catalog, step.brand, step.name) }));
  const available = steps.filter((row) => row.product);

  const handleShop = () => {
    available.forEach(({ product }) => {
      if (!product) return;
      addItem(cartLineFor(product));
    });
    const missing = steps.length - available.length;
    showToast(
      missing > 0
        ? `Added ${available.length} routine products to your bag. ${missing} ${missing === 1 ? 'is' : 'are'} not in the shop yet.`
        : `Added ${available.length} routine products to your bag`
    );
    navigate('cart-tab');
  };

  return (
    <section className="scan-section">
      <h2 className="scan-section-title">Your simple routine</h2>
      <ol className="scan-routine-list">
        {steps.map(({ step, product }) => (
          <li key={step.id} className="scan-routine-item">
            <span className="scan-routine-step">{step.stepNumber}</span>
            <div className="scan-routine-copy">
              <span className="scan-routine-name">{step.stepName}</span>
              <span className="scan-routine-product">
                {step.brand} · {step.name}
              </span>
            </div>
            {product ? (
              <span className="scan-routine-price">
                {formatPrice(product.price)}
                {(product.originalPrice ?? 0) > product.price && (
                  <s className="scan-routine-mrp">{formatPrice(product.originalPrice as number)}</s>
                )}
              </span>
            ) : (
              <span className="scan-routine-price">
                <span className="scan-routine-mrp">Not in the shop yet</span>
              </span>
            )}
          </li>
        ))}
      </ol>
      {available.length > 0 ? (
        <button type="button" className="scan-primary-button" onClick={handleShop}>
          <ShoppingBag size={18} />
          Add routine to bag
        </button>
      ) : (
        <button type="button" className="scan-primary-button" onClick={() => navigate('shop-browse')}>
          <ShoppingBag size={18} />
          Browse the shop
        </button>
      )}
    </section>
  );
};

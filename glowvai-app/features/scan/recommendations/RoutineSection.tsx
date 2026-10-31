import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import { getRecommendedRoutine } from '../../../core/services/recommendationService';

const formatPrice = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

/** Routine steps from the shared catalogue, shown with the scan result. */
export const RoutineSection: React.FC = () => {
  const { navigate, showToast } = useApp();
  const steps = getRecommendedRoutine();

  const handleShop = () => {
    showToast('Routine products are available in the shop.');
    navigate('home');
  };

  return (
    <section className="scan-section">
      <h2 className="scan-section-title">Your simple routine</h2>
      <ol className="scan-routine-list">
        {steps.map((step) => (
          <li key={step.id} className="scan-routine-item">
            <span className="scan-routine-step">{step.stepNumber}</span>
            <div className="scan-routine-copy">
              <span className="scan-routine-name">{step.stepName}</span>
              <span className="scan-routine-product">
                {step.brand} · {step.name}
              </span>
            </div>
            <span className="scan-routine-price">
              {formatPrice(step.price)}
              {step.originalPrice > step.price && (
                <s className="scan-routine-mrp">{formatPrice(step.originalPrice)}</s>
              )}
            </span>
          </li>
        ))}
      </ol>
      <button type="button" className="scan-primary-button" onClick={handleShop}>
        <ShoppingBag size={18} />
        Shop this routine
      </button>
    </section>
  );
};

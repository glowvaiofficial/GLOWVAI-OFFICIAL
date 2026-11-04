import React, { useMemo, useState } from 'react';
import { ChevronRight, Package, ShoppingBag } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import { useLiveCatalog, type SkincareProduct } from '../../../core/data/indianSkincareCatalog';
import type { ConcernKey, SkinAnalysisResult } from '../../../core/services/skinModelService';
import { formatRupee, getProductImageUrl } from '../../shop/shared/shopUtils';

// Routine steps are picked from the shop catalogue, so every name and price shown is a real listing.
const STEPS: { label: string; category: SkincareProduct['category'] }[] = [
  { label: 'Cleanse', category: 'Cleansers' },
  { label: 'Treat', category: 'Serums' },
  { label: 'Moisturise', category: 'Moisturizers' },
  { label: 'Protect', category: 'Suncare' },
];

// Ingredients commonly used for each visible concern (cosmetic guidance, not medical advice).
const CONCERN_ACTIVES: Record<ConcernKey, string[]> = {
  oiliness: ['niacinamide', 'zinc', 'salicylic'],
  dryness: ['hyaluronic', 'ceramide', 'glycerin', 'panthenol', 'squalane'],
  redness: ['centella', 'cica', 'oat', 'panthenol', 'ceramide'],
  uneven_tone: ['vitamin c', 'kojic', 'arbutin', 'niacinamide'],
  visible_blemishes: ['salicylic', 'niacinamide', 'tea tree', 'zinc'],
};

const pickProduct = (catalog: SkincareProduct[], category: SkincareProduct['category'], keywords: string[]): SkincareProduct | undefined => {
  const candidates = catalog.filter((product) => product.category === category && product.price > 1);
  let best: SkincareProduct | undefined;
  let bestScore = -1;
  candidates.forEach((product) => {
    const actives = product.keyActives.join(' ').toLowerCase();
    const score = keywords.reduce((sum, word) => sum + (actives.includes(word) ? 1 : 0), 0);
    if (score > bestScore) {
      best = product;
      bestScore = score;
    }
  });
  return best;
};

const RoutineImage: React.FC<{ product: SkincareProduct }> = ({ product }) => {
  const [failed, setFailed] = useState(false);
  const src = getProductImageUrl(product);
  if (!src || failed) {
    return (
      <span className="scan-routine-image is-fallback" aria-hidden="true">
        <Package size={20} />
      </span>
    );
  }
  return <img className="scan-routine-image" src={src} alt="" loading="lazy" onError={() => setFailed(true)} />;
};

interface RoutineSectionProps {
  result?: SkinAnalysisResult | null;
}

/** Four-step routine matched to the concerns the scan found, using live shop listings. */
export const RoutineSection: React.FC<RoutineSectionProps> = ({ result }) => {
  const { navigate } = useApp();
  const catalog = useLiveCatalog();
  const present = result?.concerns.filter((concern) => concern.present).map((concern) => concern.key) ?? [];

  const steps = useMemo(() => {
    const keywords = Array.from(new Set(present.flatMap((key) => CONCERN_ACTIVES[key] ?? [])));
    return STEPS.map((step) => ({ ...step, product: pickProduct(catalog, step.category, keywords) })).filter(
      (step): step is typeof step & { product: SkincareProduct } => Boolean(step.product)
    );
  }, [present.join('|')]);

  if (!steps.length) return null;

  return (
    <section className="scan-section scan-routine">
      <div>
        <h2 className="scan-section-title">Your simple routine</h2>
        <p className="scan-section-note">
          {present.length ? 'Picked from our shop for the concerns your scan found.' : 'A gentle everyday routine from our shop.'}
        </p>
      </div>
      <ol className="scan-routine-list">
        {steps.map((step, index) => (
          <li key={step.category}>
            <button type="button" className="scan-routine-item" onClick={() => navigate('shop-product', { productId: step.product.id })}>
              <span className="scan-routine-step">{index + 1}</span>
              <RoutineImage product={step.product} />
              <span className="scan-routine-copy">
                <span className="scan-routine-name">{step.label}</span>
                <span className="scan-routine-product">
                  {step.product.brand} · {step.product.name}
                </span>
              </span>
              <span className="scan-routine-price">{formatRupee(step.product.price)}</span>
              <ChevronRight size={18} className="scan-routine-chevron" />
            </button>
          </li>
        ))}
      </ol>
      <button type="button" className="scan-primary-button" onClick={() => navigate('shop-browse')}>
        <ShoppingBag size={18} />
        Browse all skincare
      </button>
    </section>
  );
};

import { AlertCircle, Clock, ShoppingBag } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { useCartStore } from '../../core/state/cartStore';
import { RecHeader } from './RecHeader';

const STEPS = [
  {
    title: 'Apply a small amount',
    desc: 'Dab a pea-sized amount on clean skin on your inner forearm or behind your ear.',
  },
  {
    title: 'Leave it for 24 hours',
    desc: 'Do not wash the area or put other products over it.',
  },
  {
    title: 'Check the area',
    desc: 'Look for redness, itching, burning, swelling or small bumps.',
  },
  {
    title: 'No reaction?',
    desc: 'You can start using the product as directed on the pack. A patch test cannot rule out every reaction.',
  },
];

export const PatchTestGuideScreen = () => {
  const { navigate } = useApp();
  // The bag the cart screen shows.
  const hasCart = useCartStore((state) => state.totalCount > 0);

  return (
    <main className="rec-screen">
      <RecHeader title="Patch test guide" eyebrow="Skincare guides" />

      <div className="rec-body">
        <section className="rec-hero">
          <span className="rec-kicker">
            <Clock size={12} />
            Takes 24 hours
          </span>
          <h2 className="rec-headline">How to do a patch test</h2>
          <p className="rec-subtext">
            Before using a new product with active ingredients on your face, try a small amount on a small patch of skin first.
          </p>
        </section>

        <h3 className="rec-label">Four steps</h3>
        <ol className="rec-steps-list is-four">
          {STEPS.map((step, index) => (
            <li key={step.title} className="rec-card">
              <span className="rec-step-badge">{index + 1}</span>
              <div className="rec-card-copy">
                <h4 className="rec-card-title">{step.title}</h4>
                <p className="rec-card-desc">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="rec-card is-warning" role="note">
          <span className="rec-card-icon is-error">
            <AlertCircle size={18} />
          </span>
          <div className="rec-card-copy">
            <h4 className="rec-card-title">If you notice a reaction</h4>
            <p className="rec-card-desc">
              Wash the area with cool water and stop using the product. If it does not settle, speak to a doctor or pharmacist.
            </p>
          </div>
        </div>

        <div className="rec-cta">
          <p className="rec-cta-text">
            {hasCart ? 'Your cart is ready when you are.' : 'Find products for your routine in the shop.'}
          </p>
          <button
            type="button"
            className="rec-primary rec-cta-btn"
            onClick={() => navigate(hasCart ? 'cart-tab' : 'shop-browse')}
          >
            <ShoppingBag size={18} />
            {hasCart ? 'Go to cart' : 'Browse products'}
          </button>
        </div>
      </div>
    </main>
  );
};

import { ArrowLeft, Info, ShoppingBag, Sparkles } from 'lucide-react';
import { useApp } from '../../context/useApp';

// General example routine. It is not computed from the user's skin profile, and no product prices or catalogue items are attached.
const EXAMPLE_STEPS = [
  {
    tag: 'STEP 01 · CLEANSE',
    name: 'Gentle cleanser',
    desc: 'Removes oil and dirt. Use it morning and night.',
  },
  {
    tag: 'STEP 02 · TREAT',
    name: 'Treatment serum',
    desc: 'Applied after cleansing, before moisturiser.',
  },
  {
    tag: 'STEP 03 · MOISTURIZE',
    name: 'Moisturiser',
    desc: 'Locks in hydration. Finish with sunscreen in the morning.',
  },
];

export const RecommendationOverviewScreen = () => {
  const { goBack, navigate } = useApp();

  return (
    <main className="rec-screen">
      <header className="rec-header">
        <button type="button" className="rec-icon-button" onClick={goBack} aria-label="Go back">
          <ArrowLeft size={20} strokeWidth={2.2} />
        </button>
        <div className="rec-header-copy">
          <Sparkles size={16} color="var(--primary)" />
          <h1 className="rec-header-title">Routine Recommendations</h1>
        </div>
        <span className="rec-header-spacer" />
      </header>

      <div className="rec-body">
        <section className="rec-hero">
          <span className="rec-kicker">
            <Info size={12} />
            General guidance
          </span>
          <h2 className="rec-headline">Example three-step routine</h2>
          <p className="rec-subtext">
            A sample routine to show how a basic regimen can be structured. It is general guidance, not a personalised
            recommendation, and it does not reflect a skin assessment.
          </p>
        </section>

        <h3 className="rec-label">Routine steps (3 steps)</h3>

        <ol className="rec-steps-list">
          {EXAMPLE_STEPS.map((step) => (
            <li key={step.tag} className="rec-card">
              <div className="rec-card-copy">
                <p className="rec-step-tag">{step.tag}</p>
                <h4 className="rec-card-title">{step.name}</h4>
                <p className="rec-card-desc">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="rec-cta">
          <p className="rec-cta-text">Ready to look at products? Browse the shop and choose what fits your routine.</p>
          <button
            type="button"
            className="commerce-primary rec-cta-btn"
            onClick={() => navigate('shop-browse')}
          >
            <ShoppingBag size={18} />
            Browse products
          </button>
        </div>
      </div>
    </main>
  );
};

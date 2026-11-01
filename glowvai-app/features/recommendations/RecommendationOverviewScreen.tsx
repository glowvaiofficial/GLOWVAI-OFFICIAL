import { ChevronRight, FlaskConical, Info, ListChecks, ShieldCheck, ShoppingBag } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { RecHeader } from './RecHeader';

// General example routine. It is not computed from the user's skin profile, and no product prices or catalogue items are attached.
const EXAMPLE_STEPS = [
  {
    tag: 'Cleanse',
    name: 'Gentle cleanser',
    desc: 'Removes oil and dirt. Use it morning and night.',
  },
  {
    tag: 'Treat',
    name: 'Treatment serum',
    desc: 'Applied after cleansing, before moisturiser.',
  },
  {
    tag: 'Moisturise',
    name: 'Moisturiser',
    desc: 'Helps keep skin hydrated. Finish with sunscreen in the morning.',
  },
];

const GUIDES = [
  { screen: 'recommend-routine', title: 'Morning and evening routine', note: 'The order to apply each step', icon: ListChecks },
  { screen: 'recommend-ingredients', title: 'Ingredient pairings', note: 'Actives that are often layered, and ones to space out', icon: FlaskConical },
  { screen: 'recommend-patch-test', title: 'Patch test guide', note: 'How to try a new product on a small area first', icon: ShieldCheck },
] as const;

export const RecommendationOverviewScreen = () => {
  const { navigate } = useApp();

  return (
    <main className="rec-screen">
      <RecHeader title="Routine guide" eyebrow="Skincare guides" />

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

        <h3 className="rec-label">Routine steps</h3>
        <ol className="rec-steps-list is-three">
          {EXAMPLE_STEPS.map((step, index) => (
            <li key={step.tag} className="rec-card">
              <span className="rec-step-badge">{String(index + 1).padStart(2, '0')}</span>
              <div className="rec-card-copy">
                <p className="rec-step-tag">{step.tag}</p>
                <h4 className="rec-card-title">{step.name}</h4>
                <p className="rec-card-desc">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>

        <h3 className="rec-label">More guides</h3>
        <div className="rec-link-list">
          {GUIDES.map(({ screen, title, note, icon: Icon }) => (
            <button key={screen} type="button" className="rec-link" onClick={() => navigate(screen)}>
              <span className="rec-card-icon"><Icon size={18} /></span>
              <span className="rec-card-copy">
                <span className="rec-card-title">{title}</span>
                <span className="rec-card-desc">{note}</span>
              </span>
              <ChevronRight size={18} className="rec-chevron" />
            </button>
          ))}
        </div>

        <div className="rec-cta">
          <p className="rec-cta-text">Ready to look at products? Browse the shop and choose what fits your routine.</p>
          <button type="button" className="rec-primary rec-cta-btn" onClick={() => navigate('shop-browse')}>
            <ShoppingBag size={18} />
            Browse products
          </button>
        </div>
      </div>
    </main>
  );
};

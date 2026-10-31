import { AlertTriangle, ArrowLeft, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { useApp } from '../../context/useApp';

// General layering reference. These are not checks of any routine, product or skin profile.
const PAIRINGS = [
  {
    title: 'Niacinamide + Hyaluronic Acid',
    status: 'Generally layered together · Barrier repair',
    caution: false,
  },
  {
    title: 'Salicylic Acid + Zinc PCA',
    status: 'Generally layered together · Sebum control',
    caution: false,
  },
  {
    title: 'AHA/BHA + Retinol',
    status: 'Use with care · Often separated into AM vs PM',
    caution: true,
  },
];

export const IngredientAuditScreen = () => {
  const { goBack } = useApp();

  return (
    <main className="rec-screen">
      <header className="rec-header">
        <button type="button" className="rec-icon-button" onClick={goBack} aria-label="Go back">
          <ArrowLeft size={20} strokeWidth={2.2} />
        </button>
        <div className="rec-header-copy">
          <Sparkles size={16} color="var(--primary)" />
          <h1 className="rec-header-title">Ingredient Layering Guide</h1>
        </div>
        <span className="rec-header-spacer" />
      </header>

      <div className="rec-body">
        <section className="rec-hero is-neutral">
          <span className="rec-kicker">
            <ShieldCheck size={14} />
            General guidance
          </span>
          <h2 className="rec-headline">Common ingredient pairings</h2>
          <p className="rec-subtext">
            A general reference for how some common actives are often layered. This page does not check the ingredients
            in any product or routine, so it cannot confirm that a specific combination is safe for you.
          </p>
        </section>

        <h3 className="rec-label">Typical skin pH range</h3>
        <div className="rec-ph-card">
          <div className="rec-ph-head">
            <h4 className="rec-ph-title">Commonly cited healthy skin pH (4.5 – 5.5)</h4>
            <p className="rec-ph-value">Reference value 5.2</p>
          </div>
          <div className="rec-ph-bar" aria-hidden="true" />
          <div className="rec-ph-scale" aria-hidden="true">
            <span>4.5</span>
            <span>5.5</span>
          </div>
          <p className="rec-card-desc">
            This is a general reference range, not a measurement of your skin.
          </p>
        </div>

        <h3 className="rec-label">Active pairing guidance</h3>
        <ul className="rec-pair-list">
          {PAIRINGS.map((pair) => (
            <li key={pair.title} className={pair.caution ? 'rec-card is-warning' : 'rec-card'}>
              <span className={pair.caution ? 'rec-card-icon is-warning' : 'rec-card-icon is-success'}>
                {pair.caution ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
              </span>
              <div className="rec-card-copy">
                <h4 className="rec-card-title">{pair.title}</h4>
                <p className={pair.caution ? 'rec-pair-status is-warning' : 'rec-pair-status'}>{pair.status}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
};

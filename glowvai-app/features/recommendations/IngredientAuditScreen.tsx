import { AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { RecHeader } from './RecHeader';

// General layering reference. These are not checks of any routine, product or skin profile.
const PAIRINGS = [
  {
    title: 'Niacinamide + Hyaluronic acid',
    status: 'Often layered together',
    use: 'A common pairing in hydrating routines.',
    caution: false,
  },
  {
    title: 'Salicylic acid + Zinc PCA',
    status: 'Often layered together',
    use: 'A common pairing in routines for oily skin.',
    caution: false,
  },
  {
    title: 'AHA / BHA + Retinol',
    status: 'Use with care',
    use: 'Often used on different evenings, or one in the morning and one at night.',
    caution: true,
  },
];

// pH scale shown from 3 to 8 so the typical 4.5 – 5.5 band sits in context.
const SCALE_MIN = 3;
const SCALE_MAX = 8;
const BAND_LOW = 4.5;
const BAND_HIGH = 5.5;
const toPercent = (value: number) => `${((value - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100}%`;

export const IngredientAuditScreen = () => (
  <main className="rec-screen">
    <RecHeader title="Ingredient pairings" eyebrow="Skincare guides" />

    <div className="rec-body">
      <section className="rec-hero">
        <span className="rec-kicker">
          <ShieldCheck size={12} />
          General guidance
        </span>
        <h2 className="rec-headline">Common ingredient pairings</h2>
        <p className="rec-subtext">
          A general reference for how some common actives are often layered. This page does not check the ingredients
          in any product or routine, so it cannot confirm that a specific combination is right for you.
        </p>
      </section>

      <h3 className="rec-label">Typical skin pH</h3>
      <div className="rec-ph-card">
        <div className="rec-ph-head">
          <h4 className="rec-ph-title">Skin surface is usually slightly acidic</h4>
          <p className="rec-ph-value">Commonly cited range: pH {BAND_LOW} – {BAND_HIGH}</p>
        </div>
        <div className="rec-ph-scale" role="img" aria-label={`pH scale from ${SCALE_MIN} to ${SCALE_MAX}, with the typical skin range of ${BAND_LOW} to ${BAND_HIGH} highlighted`}>
          <div className="rec-ph-track">
            <span className="rec-ph-band" style={{ left: toPercent(BAND_LOW), width: `calc(${toPercent(BAND_HIGH)} - ${toPercent(BAND_LOW)})` }} />
          </div>
          <div className="rec-ph-ticks" aria-hidden="true">
            {[3, 4, 5, 6, 7, 8].map((tick) => (
              <span key={tick} style={{ left: toPercent(tick) }}>{tick}</span>
            ))}
          </div>
          <div className="rec-ph-ends" aria-hidden="true">
            <span>More acidic</span>
            <span className="rec-ph-legend"><i />Typical skin range</span>
            <span>Less acidic</span>
          </div>
        </div>
        <p className="rec-card-desc">This is a general reference range, not a measurement of your skin.</p>
      </div>

      <h3 className="rec-label">Pairing guidance</h3>
      <ul className="rec-pair-list is-three">
        {PAIRINGS.map((pair) => (
          <li key={pair.title} className={pair.caution ? 'rec-card is-warning' : 'rec-card'}>
            <span className={pair.caution ? 'rec-card-icon is-warning' : 'rec-card-icon is-success'}>
              {pair.caution ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            </span>
            <div className="rec-card-copy">
              <p className={pair.caution ? 'rec-pair-status is-warning' : 'rec-pair-status'}>{pair.status}</p>
              <h4 className="rec-card-title">{pair.title}</h4>
              <p className="rec-card-desc">{pair.use}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  </main>
);

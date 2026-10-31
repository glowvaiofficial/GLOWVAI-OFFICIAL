import { AlertCircle, ArrowLeft, Clock, Sparkles } from 'lucide-react';
import { useApp } from '../../context/useApp';

const STEPS = [
  {
    title: 'Apply a pea-sized drop',
    desc: 'Dab on clean skin on your inner forearm or lower jawline.',
  },
  {
    title: 'Leave undisturbed for 24 Hours',
    desc: 'Do not wash or apply other products over the test area.',
  },
  {
    title: 'Check for redness or itching',
    desc: 'Look out for burning, swelling, or small bumps.',
  },
  {
    title: 'Safe to apply',
    desc: 'If clean after 24h, integrate formula into your routine.',
  },
];

export const PatchTestGuideScreen = () => {
  const { goBack, navigate } = useApp();

  return (
    <main className="rec-screen">
      <header className="rec-header">
        <button type="button" className="rec-icon-button" onClick={goBack} aria-label="Go back">
          <ArrowLeft size={20} strokeWidth={2.2} />
        </button>
        <div className="rec-header-copy">
          <Sparkles size={16} color="var(--primary)" />
          <h1 className="rec-header-title">24-Hour Patch Test Guide</h1>
        </div>
        <span className="rec-header-spacer" />
      </header>

      <div className="rec-body">
        <section className="rec-hero is-neutral">
          <span className="rec-kicker">
            <Clock size={14} />
            SAFETY FIRST
          </span>
          <h2 className="rec-headline">How to Perform a Patch Test</h2>
          <p className="rec-subtext">
            Before applying active formulas to your face, test a small amount on your inner arm or behind your ear.
          </p>
        </section>

        <h3 className="rec-label">4 easy steps</h3>
        <ol className="rec-steps-list">
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

        <div className="rec-card is-warning">
          <span className="rec-card-icon is-error">
            <AlertCircle size={18} />
          </span>
          <p className="rec-card-desc">
            If itching or burning occurs, wash immediately with cool water and discontinue use.
          </p>
        </div>

        <div className="rec-cta">
          <p className="rec-cta-text">Once you have read this guide, you can continue to checkout.</p>
          <button type="button" className="commerce-primary rec-cta-btn" onClick={() => navigate('checkout')}>
            I Understand &amp; Ready to Order
          </button>
        </div>
      </div>
    </main>
  );
};

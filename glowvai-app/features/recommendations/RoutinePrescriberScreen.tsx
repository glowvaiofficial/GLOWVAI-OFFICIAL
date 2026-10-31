import { useState } from 'react';
import { ArrowLeft, Clock, Info, Moon, ShoppingBag, Sparkles, Sun } from 'lucide-react';
import { useApp } from '../../context/useApp';

type Period = 'AM' | 'PM';

interface TimelineStep {
  title: string;
  desc: string;
  note: string;
  noteIcon: 'clock' | 'sun' | 'moon';
}

// General AM / PM sequence. It is not prescribed for an individual user.
const ROUTINES: Record<Period, { heading: string; steps: TimelineStep[] }> = {
  AM: {
    heading: 'MORNING ROUTINE TIMELINE',
    steps: [
      {
        title: 'Gentle cleanser',
        desc: 'Massage 60s with lukewarm water. Rinse thoroughly.',
        note: 'Wait 1 min before serum',
        noteIcon: 'clock',
      },
      {
        title: 'Niacinamide 10% serum',
        desc: 'Pat 3–4 drops gently across T-zone and cheeks.',
        note: 'Wait 2 min to absorb',
        noteIcon: 'clock',
      },
      {
        title: 'SPF 50+ sunscreen gel',
        desc: 'Apply 2 finger lengths generously as final step.',
        note: 'Reapply every 3 hours',
        noteIcon: 'sun',
      },
    ],
  },
  PM: {
    heading: 'EVENING REPAIR TIMELINE',
    steps: [
      {
        title: 'Double cleanse balm',
        desc: 'Remove sunscreen and urban pollutants completely.',
        note: 'Rinse thoroughly',
        noteIcon: 'clock',
      },
      {
        title: 'Ceramide night repair cream',
        desc: 'Seal moisture barrier for overnight cellular recovery.',
        note: 'Overnight action',
        noteIcon: 'moon',
      },
    ],
  },
};

const NOTE_ICONS = {
  clock: Clock,
  sun: Sun,
  moon: Moon,
};

export const RoutinePrescriberScreen = () => {
  const { goBack, navigate } = useApp();
  const [period, setPeriod] = useState<Period>('AM');
  const routine = ROUTINES[period];

  return (
    <main className="rec-screen">
      <header className="rec-header">
        <button type="button" className="rec-icon-button" onClick={goBack} aria-label="Go back">
          <ArrowLeft size={20} strokeWidth={2.2} />
        </button>
        <div className="rec-header-copy">
          <Sparkles size={16} color="var(--primary)" />
          <h1 className="rec-header-title">AM / PM Routine Guide</h1>
        </div>
        <span className="rec-header-spacer" />
      </header>

      <div className="rec-body">
        <p className="rec-note">
          <Info size={16} />
          General morning and evening sequence for reference. It is not a personalised prescription.
        </p>

        <div className="rec-segment" role="group" aria-label="Routine period">
          <button
            type="button"
            className="rec-segment-btn"
            aria-pressed={period === 'AM'}
            onClick={() => setPeriod('AM')}
          >
            <Sun size={16} />
            MORNING (AM)
          </button>
          <button
            type="button"
            className="rec-segment-btn"
            aria-pressed={period === 'PM'}
            onClick={() => setPeriod('PM')}
          >
            <Moon size={16} />
            EVENING (PM)
          </button>
        </div>

        <h3 className="rec-label">{routine.heading}</h3>

        <ol className="rec-timeline">
          {routine.steps.map((step, index) => {
            const NoteIcon = NOTE_ICONS[step.noteIcon];
            return (
              <li key={step.title} className="rec-timeline-item">
                <span className="rec-step-badge">{String(index + 1).padStart(2, '0')}</span>
                <div className="rec-timeline-copy">
                  <h4 className="rec-timeline-title">{step.title}</h4>
                  <p className="rec-timeline-desc">{step.desc}</p>
                  <p className="rec-timeline-note">
                    <NoteIcon size={13} />
                    {step.note}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="rec-cta">
          <p className="rec-cta-text">Ready to look at products? Browse the shop and choose what fits your routine.</p>
          <button
            type="button"
            className="commerce-primary rec-cta-btn"
            onClick={() => navigate('recommend-checkout')}
          >
            <ShoppingBag size={18} />
            Shop this routine
          </button>
        </div>
      </div>
    </main>
  );
};

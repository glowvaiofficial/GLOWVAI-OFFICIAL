import { useState } from 'react';
import { Clock, Info, Moon, ShoppingBag, Sun } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { RecHeader } from './RecHeader';

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
    heading: 'Morning steps',
    steps: [
      {
        title: 'Gentle cleanser',
        desc: 'Massage onto damp skin for about a minute, then rinse with lukewarm water.',
        note: 'Pat dry before the next step',
        noteIcon: 'clock',
      },
      {
        title: 'Niacinamide serum',
        desc: 'Press 3–4 drops across the forehead, nose and cheeks.',
        note: 'Let it absorb for a minute or two',
        noteIcon: 'clock',
      },
      {
        title: 'Sunscreen, SPF 50',
        desc: 'Apply a generous layer as the last step, including the neck.',
        note: 'Reapply when you are outdoors for long',
        noteIcon: 'sun',
      },
    ],
  },
  PM: {
    heading: 'Evening steps',
    steps: [
      {
        title: 'Cleansing balm or micellar water',
        desc: 'Take off sunscreen and make-up first, then follow with your gentle cleanser.',
        note: 'Rinse well',
        noteIcon: 'clock',
      },
      {
        title: 'Night moisturiser',
        desc: 'A cream with ceramides helps keep skin moisturised overnight.',
        note: 'Last step of the night',
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
  const { navigate } = useApp();
  const [period, setPeriod] = useState<Period>('AM');
  const routine = ROUTINES[period];

  return (
    <main className="rec-screen">
      <RecHeader title="Morning and evening routine" eyebrow="Skincare guides" />

      <div className="rec-body">
        <p className="rec-note">
          <Info size={16} />
          General morning and evening order for reference. It is not a personalised prescription.
        </p>

        <div className="rec-segment" role="group" aria-label="Routine period">
          <button
            type="button"
            className="rec-segment-btn"
            aria-pressed={period === 'AM'}
            onClick={() => setPeriod('AM')}
          >
            <Sun size={16} />
            Morning
          </button>
          <button
            type="button"
            className="rec-segment-btn"
            aria-pressed={period === 'PM'}
            onClick={() => setPeriod('PM')}
          >
            <Moon size={16} />
            Evening
          </button>
        </div>

        <h3 className="rec-label">{routine.heading} · {routine.steps.length}</h3>

        <ol className={routine.steps.length === 3 ? 'rec-timeline is-three' : 'rec-timeline'}>
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
          <p className="rec-cta-text">
            See the morning steps as three products from the shop, with prices, and add them to your cart together.
          </p>
          <button type="button" className="rec-primary rec-cta-btn" onClick={() => navigate('recommend-checkout')}>
            <ShoppingBag size={18} />
            Shop the morning routine
          </button>
        </div>
      </div>
    </main>
  );
};

import React from 'react';
import { Check } from 'lucide-react';
import type { LiveStep } from '../../../core/services/shopTracking';

const STATE_TEXT: Record<LiveStep['state'], string> = {
  done: 'done',
  current: 'current step',
  upcoming: 'not yet',
};

// The vertical progress list. The current step carries aria-current; done and upcoming steps are styled apart by more
// than colour (a check mark for done, an outline for upcoming).
export const TrackingStepper: React.FC<{ steps: LiveStep[] }> = ({ steps }) => {
  if (steps.length === 0) return null;
  return (
    <ol className="trk-steps" aria-label="Order progress">
      {steps.map((step) => (
        <li key={step.stage} className={`trk-step is-${step.state}`} aria-current={step.state === 'current' ? 'step' : undefined}>
          <span className="trk-dot" aria-hidden="true">
            {step.state === 'done' && <Check size={12} strokeWidth={3} />}
          </span>
          <span className="trk-step-label">{step.title}</span>
          <span className="trk-sr">, {STATE_TEXT[step.state]}</span>
        </li>
      ))}
    </ol>
  );
};

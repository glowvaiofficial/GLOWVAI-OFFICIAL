import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface ScanHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}

const FLOW_STEPS = ['Get ready', 'Take photo', 'Review'];

// "Step 2 of 3" in the subtitle also draws the stepper shown beside the title on PC.
const stepOf = (subtitle?: string): number => {
  const match = subtitle ? /Step (\d) of 3/.exec(subtitle) : null;
  return match ? Number(match[1]) : 0;
};

export const ScanHeader: React.FC<ScanHeaderProps> = ({ title, subtitle, onBack }) => {
  const step = stepOf(subtitle);
  return (
    <header className="scan-header">
      {onBack && (
        <button type="button" className="scan-icon-button" onClick={onBack} aria-label="Go back">
          <ArrowLeft size={20} strokeWidth={2.2} />
        </button>
      )}
      <div className="scan-header-text">
        <h1 className="scan-header-title">{title}</h1>
        {subtitle && <p className="scan-header-subtitle">{subtitle}</p>}
      </div>
      {step > 0 && (
        <ol className="v5-scan-steps" aria-hidden="true">
          {FLOW_STEPS.map((label, index) => (
            <li key={label} className={index + 1 < step ? 'is-done' : index + 1 === step ? 'is-current' : ''}>
              <span>{index + 1}</span>
              {label}
            </li>
          ))}
        </ol>
      )}
    </header>
  );
};

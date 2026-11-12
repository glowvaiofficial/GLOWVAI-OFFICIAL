import React, { useState } from 'react';
import { Check, CircleDot, Droplets, Flame, Palette, Sparkles, Waves } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { safeHapticImpact } from '../../core/utils/haptics';
import { browserStore, dismissQuiz, saveQuizAnswers } from '../shop/lib/firstVisit';
import { AuthShell } from './components/AuthShell';

const SKIN_CONCERNS = [
  { id: 'ACNE', label: 'Acne & Blemishes', icon: <CircleDot /> },
  { id: 'HYPERPIGMENTATION', label: 'Hyperpigmentation', icon: <Palette /> },
  { id: 'DRYNESS', label: 'Dryness & Dehydration', icon: <Droplets /> },
  { id: 'OILINESS', label: 'Excess Oiliness', icon: <Sparkles /> },
  { id: 'SENSITIVITY', label: 'Sensitivity & Redness', icon: <Flame /> },
  { id: 'FINE_LINES', label: 'Fine Lines & Aging', icon: <Waves /> },
];

export const SkinSurveyScreen: React.FC = () => {
  const { goBack, navigate } = useApp();
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);

  const toggleConcern = (id: string) => {
    safeHapticImpact();
    setSelectedConcerns((current) =>
      current.includes(id) ? current.filter((concern) => concern !== id) : [...current, id]
    );
  };

  // Answers stay on this device and power the skin-matched picks on the shop home. The quiz never opens the
  // "Your details" form: account details are asked at checkout, where they are needed.
  const finish = (answered: boolean) => {
    safeHapticImpact();
    if (answered) saveQuizAnswers(browserStore(), selectedConcerns);
    else dismissQuiz(browserStore());
    navigate('shop-home');
  };

  return (
    <AuthShell
      onBack={goBack}
      footer={
        <button type="button" className="auth-primary-button" onClick={() => finish(true)} disabled={selectedConcerns.length === 0}>
          Get my picks
        </button>
      }
    >
      <div className="auth-step-header">
        <div className="auth-step-track"><span style={{ width: '100%' }} /></div>
        <span className="auth-step-label">Skin quiz (optional)</span>
      </div>

      <h1 className="auth-title">What are your main skin concerns?</h1>
      <p className="auth-subtitle">
        Select all that apply. Pick a few and we show skin-matched products on the shop home. You can skip this.
      </p>

      <div className="auth-concern-grid">
        {SKIN_CONCERNS.map((item) => {
          const isSelected = selectedConcerns.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              className={`auth-concern${isSelected ? ' is-selected' : ''}`}
              aria-pressed={isSelected}
              onClick={() => toggleConcern(item.id)}
            >
              <span className="auth-concern-top">
                <span className="auth-concern-icon" aria-hidden="true">{item.icon}</span>
                {isSelected && (
                  <span className="auth-concern-check" aria-hidden="true"><Check /></span>
                )}
              </span>
              <span className="auth-concern-label">{item.label}</span>
            </button>
          );
        })}
      </div>

      <button type="button" className="auth-text-button auth-skip-link" onClick={() => finish(false)}>
        Skip for now
      </button>
    </AuthShell>
  );
};

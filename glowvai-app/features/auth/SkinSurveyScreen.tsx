import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { syncUserOnboardingData } from '../../core/services/userSyncService';
import { safeHapticImpact } from '../../core/utils/haptics';
import { AuthShell } from './components/AuthShell';

const SKIN_CONCERNS = [
  { id: 'ACNE', label: 'Acne & Blemishes', emoji: '🔴' },
  { id: 'HYPERPIGMENTATION', label: 'Hyperpigmentation', emoji: '🟤' },
  { id: 'DRYNESS', label: 'Dryness & Dehydration', emoji: '💧' },
  { id: 'OILINESS', label: 'Excess Oiliness', emoji: '✨' },
  { id: 'SENSITIVITY', label: 'Sensitivity & Redness', emoji: '⚡' },
  { id: 'FINE_LINES', label: 'Fine Lines & Aging', emoji: '🕰️' },
];

export const SkinSurveyScreen: React.FC = () => {
  const { navigate, goBack } = useApp();
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>(['ACNE']);
  const [isLoading, setIsLoading] = useState(false);

  const toggleConcern = (id: string) => {
    safeHapticImpact();
    setSelectedConcerns((current) =>
      current.includes(id) ? current.filter((concern) => concern !== id) : [...current, id]
    );
  };

  // Mirrors the mobile app: concerns are shown but only the consent timestamp is synced
  const handleSaveAndContinue = async () => {
    if (isLoading) return;
    safeHapticImpact();
    setIsLoading(true);
    try {
      await syncUserOnboardingData({ consentTimestamp: Date.now() });
    } catch {
      // continue even if sync fails, as in the mobile app
    } finally {
      setIsLoading(false);
    }
    navigate('auth-onboarding-success');
  };

  return (
    <AuthShell
      onBack={goBack}
      footer={
        <button type="button" className="auth-primary-button" onClick={handleSaveAndContinue} disabled={isLoading}>
          {isLoading ? <span className="auth-spinner" aria-label="Saving" /> : 'Save & Finish Setup'}
        </button>
      }
    >
      <div className="auth-step-header">
        <div className="auth-step-track"><span style={{ width: '100%' }} /></div>
        <span className="auth-step-label">Step 2 of 2: Skin Survey</span>
      </div>

      <h1 className="auth-title">What are your main skin concerns?</h1>
      <p className="auth-subtitle">
        Select all that apply. This helps us personalize your initial routine and diagnostic report.
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
                <span className="auth-concern-emoji" aria-hidden="true">{item.emoji}</span>
                {isSelected && (
                  <span className="auth-concern-check" aria-hidden="true"><Check /></span>
                )}
              </span>
              <span className="auth-concern-label">{item.label}</span>
            </button>
          );
        })}
      </div>

      <button type="button" className="auth-text-button auth-skip-link" onClick={handleSaveAndContinue}>
        Skip for now
      </button>
    </AuthShell>
  );
};

export default SkinSurveyScreen;

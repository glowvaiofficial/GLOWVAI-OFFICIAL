import React, { useState } from 'react';
import { Check, CircleDot, Droplets, Flame, Palette, Sparkles, Waves } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { syncUserOnboardingData } from '../../core/services/userSyncService';
import { safeHapticImpact } from '../../core/utils/haptics';
import { storage } from '../../core/utils/storage';
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
  const { navigate, goBack } = useApp();
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const toggleConcern = (id: string) => {
    safeHapticImpact();
    setSelectedConcerns((current) =>
      current.includes(id) ? current.filter((concern) => concern !== id) : [...current, id]
    );
  };

  // Concerns are not part of the account sync yet, so they are kept on this device; only the consent time is synced.
  const handleSaveAndContinue = async (saveAnswers = true) => {
    if (isLoading) return;
    safeHapticImpact();
    setIsLoading(true);
    try {
      if (saveAnswers) await storage.setItem('glowvai_skin_concerns', JSON.stringify(selectedConcerns));
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
        <button type="button" className="auth-primary-button" onClick={() => void handleSaveAndContinue()} disabled={isLoading}>
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
        Select all that apply. This helps us personalize your first routine and skin report.
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

      <button type="button" className="auth-text-button auth-skip-link" onClick={() => void handleSaveAndContinue(false)}>
        Skip for now
      </button>
    </AuthShell>
  );
};

export default SkinSurveyScreen;

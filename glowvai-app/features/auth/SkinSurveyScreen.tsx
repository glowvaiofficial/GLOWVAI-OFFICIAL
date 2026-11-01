import React, { useState } from 'react';
import { Check, CircleDot, Droplet, Droplets, Flame, Hourglass, SunMedium } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { syncUserOnboardingData } from '../../core/services/userSyncService';
import { safeHapticImpact } from '../../core/utils/haptics';
import { storage } from '../../core/utils/storage';
import { AuthShell } from './components/AuthShell';

// Concerns are kept on this device; the sync below only records the consent timestamp, as in the mobile app.
const SKIN_CONCERNS_KEY = 'glowvai:skin-concerns';

const SKIN_CONCERNS = [
  { id: 'ACNE', label: 'Acne and blemishes', icon: <CircleDot /> },
  { id: 'HYPERPIGMENTATION', label: 'Dark spots and pigmentation', icon: <SunMedium /> },
  { id: 'DRYNESS', label: 'Dryness', icon: <Droplet /> },
  { id: 'OILINESS', label: 'Excess oil', icon: <Droplets /> },
  { id: 'SENSITIVITY', label: 'Sensitivity and redness', icon: <Flame /> },
  { id: 'FINE_LINES', label: 'Fine lines', icon: <Hourglass /> },
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

  const handleFinish = async () => {
    if (isLoading) return;
    safeHapticImpact();
    setIsLoading(true);
    if (selectedConcerns.length > 0) {
      await storage.setItem(SKIN_CONCERNS_KEY, JSON.stringify(selectedConcerns));
    }
    try {
      await syncUserOnboardingData({ consentTimestamp: Date.now() });
    } catch {
      // continue even if sync fails, as in the mobile app
    } finally {
      setIsLoading(false);
    }
    navigate('auth-onboarding-success');
  };

  const hasSelection = selectedConcerns.length > 0;

  return (
    <AuthShell
      onBack={goBack}
      footer={
        <button type="button" className="auth-primary-button" onClick={handleFinish} disabled={isLoading}>
          {isLoading ? <span className="auth-spinner" aria-label="Saving" /> : hasSelection ? 'Save and finish' : 'Skip for now'}
        </button>
      }
    >
      <div className="auth-step-header">
        <div className="auth-step-track"><span style={{ width: '100%' }} /></div>
        <span className="auth-step-label">Step 2 of 2 · Your skin</span>
      </div>

      <h1 className="auth-title">What would you like help with?</h1>
      <p className="auth-subtitle">Pick any that apply, or skip. A skin scan gives you a full report later.</p>

      <div className="auth-concern-grid" role="group" aria-label="Skin concerns">
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
                <span className="auth-concern-check" aria-hidden="true">{isSelected && <Check />}</span>
              </span>
              <span className="auth-concern-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </AuthShell>
  );
};

export default SkinSurveyScreen;

import React, { useState } from 'react';
import { ArrowRight, Camera, Lock, MapPin } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { safeHapticImpact } from '../../core/utils/haptics';
import { AuthShell } from './components/AuthShell';
import { requestCameraPermission, requestLocationPermission } from './authUtils';

interface PermissionToggleProps {
  icon: React.ReactNode;
  title: string;
  benefit: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const PermissionToggle: React.FC<PermissionToggleProps> = ({ icon, title, benefit, checked, onChange }) => (
  <div className="auth-permission-row">
    <span className="auth-permission-icon" aria-hidden="true">{icon}</span>
    <div className="auth-permission-text">
      <strong>{title}</strong>
      <p>{benefit}</p>
    </div>
    <label className="auth-switch">
      <input type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} aria-label={title} />
      <span aria-hidden="true" />
    </label>
  </div>
);

export const PermissionsScreen: React.FC = () => {
  const { navigate, goBack, showToast } = useApp();
  const [isLoading, setIsLoading] = useState(false);

  const [isCameraGranted, setIsCameraGranted] = useState(true);
  const [isLocationGranted, setIsLocationGranted] = useState(true);

  const handleAllowAndContinue = async () => {
    setIsLoading(true);
    safeHapticImpact();
    const denied: string[] = [];
    try {
      if (isLocationGranted && !(await requestLocationPermission())) denied.push('location');
      const cameraAllowed = isCameraGranted ? await requestCameraPermission() : false;
      if (isCameraGranted && !cameraAllowed) denied.push('camera');
      if (denied.length) {
        showToast(`Not allowed: ${denied.join(', ')}. You can change this in your browser settings.`);
      }
      navigate(cameraAllowed ? 'scan-camera' : 'shop-home');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('shop-home');
  };

  return (
    <AuthShell
      onBack={goBack}
      footer={
        <>
          <button type="button" className="auth-primary-button" onClick={handleAllowAndContinue} disabled={isLoading}>
            {isLoading ? (
              <span className="auth-spinner" aria-label="Asking for permissions" />
            ) : (
              <>
                {isCameraGranted ? 'Allow Access & Start Skin Scan' : 'Save & Continue'}
                <ArrowRight aria-hidden="true" />
              </>
            )}
          </button>
          <button type="button" className="auth-text-button auth-footer-link" onClick={handleSkip}>
            Skip for now and browse products
          </button>
        </>
      }
    >
      <h1 className="auth-title">Unlock Personalized Skincare</h1>
      <p className="auth-subtitle">
        GlowVAI asks your browser for a few permissions so the AI skin check and delivery features work. Turn off any you
        do not want.
      </p>

      <section className="auth-card">
        <h2 className="auth-card-title">Why We Ask for Permissions</h2>
        <PermissionToggle
          icon={<Camera />}
          title="Camera Access"
          benefit="Takes the photo for your AI skin check of hydration, acne and other skin signals."
          checked={isCameraGranted}
          onChange={setIsCameraGranted}
        />
        <PermissionToggle
          icon={<MapPin />}
          title="Precise Location"
          benefit="Helps check whether we deliver to your area."
          checked={isLocationGranted}
          onChange={setIsLocationGranted}
        />
      </section>

      <section className="auth-privacy-card">
        <Lock aria-hidden="true" />
        <div>
          <strong>Your skin photo</strong>
          <p>
            Your photo is sent securely to our server for analysis and is not shared. You can change these permissions any
            time in your browser settings.
          </p>
        </div>
      </section>
    </AuthShell>
  );
};

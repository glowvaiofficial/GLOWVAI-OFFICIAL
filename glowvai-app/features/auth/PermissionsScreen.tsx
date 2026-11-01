import React, { useState } from 'react';
import { ArrowRight, Camera, Lock, MapPin } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { safeHapticImpact } from '../../core/utils/haptics';
import { AuthShell } from './components/AuthShell';
import { requestCameraPermission, requestLocationPermission } from './authUtils';

interface PermissionToggleProps {
  id: string;
  icon: React.ReactNode;
  title: string;
  benefit: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const PermissionToggle: React.FC<PermissionToggleProps> = ({ id, icon, title, benefit, checked, onChange }) => (
  <div className="auth-permission-row">
    <span className="auth-permission-icon" aria-hidden="true">{icon}</span>
    <div className="auth-permission-text">
      <strong id={`${id}-title`}>{title}</strong>
      <p id={`${id}-desc`}>{benefit}</p>
    </div>
    <label className="auth-switch">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-desc`}
      />
      <span aria-hidden="true" />
    </label>
  </div>
);

// Each switch decides whether the browser's own permission prompt is shown when the user continues.
// Nothing is granted by this screen; the browser asks, and the user can still say no there.
export const PermissionsScreen: React.FC = () => {
  const { navigate, goBack, showToast } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [askCamera, setAskCamera] = useState(true);
  const [askLocation, setAskLocation] = useState(true);

  const handleContinue = async () => {
    if (isLoading) return;
    setIsLoading(true);
    safeHapticImpact();
    try {
      if (askLocation) {
        const granted = await requestLocationPermission();
        if (!granted) showToast('Location is off. You can enter your delivery address by hand.');
      }
      if (askCamera) {
        const granted = await requestCameraPermission();
        if (granted) {
          navigate('scan-camera');
          return;
        }
        showToast('Camera is off. You can allow it later from your browser settings.');
      }
      navigate('shop-home');
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
          <button type="button" className="auth-primary-button" onClick={handleContinue} disabled={isLoading}>
            {isLoading ? (
              <span className="auth-spinner" aria-label="Waiting for the browser" />
            ) : (
              <>
                {askCamera ? 'Continue to skin scan' : 'Continue to shop'}
                <ArrowRight aria-hidden="true" />
              </>
            )}
          </button>
          <button type="button" className="auth-secondary-button" onClick={handleSkip}>
            Not now
          </button>
        </>
      }
    >
      <h1 className="auth-title">Camera and location</h1>
      <p className="auth-subtitle">
        Both are optional. Your browser will ask before anything is turned on, and you can change it later in your
        browser settings.
      </p>

      <section className="auth-card">
        <PermissionToggle
          id="auth-permission-camera"
          icon={<Camera />}
          title="Camera"
          benefit="Used only while you take a skin scan photo."
          checked={askCamera}
          onChange={setAskCamera}
        />
        <PermissionToggle
          id="auth-permission-location"
          icon={<MapPin />}
          title="Location"
          benefit="Finds your area so we can check delivery to you."
          checked={askLocation}
          onChange={setAskLocation}
        />
      </section>

      <section className="auth-privacy-card">
        <Lock aria-hidden="true" />
        <div>
          <strong>Your scan photos</strong>
          <p>
            How we use and keep scan photos is explained in our{' '}
            <a className="auth-link" href="/privacy" target="_blank" rel="noopener noreferrer">privacy policy</a>.
          </p>
        </div>
      </section>
    </AuthShell>
  );
};

export default PermissionsScreen;

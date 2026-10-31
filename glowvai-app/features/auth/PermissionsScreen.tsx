import React, { useState } from 'react';
import { Bell, Camera, Lock, MapPin, Navigation, ShieldCheck, UserRound, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { getDeviceCurrentLocation } from '../../core/services/locationService';
import { safeHapticImpact } from '../../core/utils/haptics';
import { AuthShell } from './components/AuthShell';
import { errorMessageOf, requestCameraPermission, requestLocationPermission } from './authUtils';

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

  const [displayName, setDisplayName] = useState('');
  const [cityArea, setCityArea] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [isCameraGranted, setIsCameraGranted] = useState(true);
  const [isLocationGranted, setIsLocationGranted] = useState(true);
  const [isNotificationsGranted, setIsNotificationsGranted] = useState(true);

  const handleAutoDetectLocation = async () => {
    setIsLocating(true);
    try {
      const granted = await requestLocationPermission();
      if (granted) {
        const location = await getDeviceCurrentLocation();
        if (location) {
          setCityArea(`${location.city || 'Bengaluru'}, ${location.state || 'Karnataka'}`);
          setIsLocationGranted(true);
        }
      } else {
        showToast('Location permission was not granted. You can enter your delivery address manually.');
      }
    } catch {
      setCityArea('Koramangala, Bengaluru');
    } finally {
      setIsLocating(false);
    }
  };

  const handleAllowAndContinue = async () => {
    setIsLoading(true);
    safeHapticImpact();
    try {
      if (isLocationGranted) {
        await requestLocationPermission();
      }
      if (isCameraGranted) {
        await requestCameraPermission();
        navigate('scan-camera');
      } else {
        navigate('shop-home');
      }
    } catch (err: unknown) {
      showToast(errorMessageOf(err, 'Notice: Proceeding with default setup.'));
      navigate('scan-camera');
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
      topRight={
        <button type="button" className="auth-skip-pill auth-skip-pill-light" onClick={handleSkip}>
          Skip to Home
        </button>
      }
      footer={
        <>
          <button type="button" className="auth-primary-button" onClick={handleAllowAndContinue} disabled={isLoading}>
            {isLoading ? (
              <span className="auth-spinner" aria-label="Saving" />
            ) : (
              <>
                {isCameraGranted ? 'Allow Access & Start Skin Scan' : 'Save & Continue'}
                <ArrowRight aria-hidden="true" />
              </>
            )}
          </button>
          <button type="button" className="auth-text-button auth-footer-link" onClick={handleSkip}>
            Skip for now (Browse Products Directly) →
          </button>
        </>
      }
    >
      <div className="auth-trust-badge">
        <ShieldCheck aria-hidden="true" />
        <span>100% PRIVATE &amp; ENCRYPTED</span>
      </div>
      <h1 className="auth-title">Unlock Personalized Skincare</h1>
      <p className="auth-subtitle">
        To deliver clinical AI skin diagnostics and guarantee express deliveries, GlowVAI needs a few quick permissions.
      </p>

      <section className="auth-card">
        <div className="auth-card-header">
          <span className="auth-card-icon" aria-hidden="true"><UserRound /></span>
          <div>
            <h2 className="auth-card-title">Your Delivery Profile</h2>
            <p className="auth-card-subtitle">Helps us tailor routines and address shipping</p>
          </div>
        </div>

        <label className="auth-label" htmlFor="auth-permissions-name">Full Name</label>
        <div className="auth-field">
          <UserRound aria-hidden="true" />
          <input
            id="auth-permissions-name"
            placeholder="e.g. Alex Sharma"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </div>

        <div className="auth-label-row">
          <label className="auth-label" htmlFor="auth-permissions-area">Delivery Address / Area</label>
          <button type="button" className="auth-text-button" onClick={handleAutoDetectLocation} disabled={isLocating}>
            {isLocating ? <span className="auth-spinner auth-spinner-dark" aria-label="Detecting" /> : (
              <>
                <Navigation aria-hidden="true" />
                Auto-Detect GPS
              </>
            )}
          </button>
        </div>
        <div className="auth-field">
          <MapPin aria-hidden="true" />
          <input
            id="auth-permissions-area"
            placeholder="e.g. Indiranagar, Bengaluru"
            value={cityArea}
            onChange={(event) => setCityArea(event.target.value)}
          />
        </div>
      </section>

      <section className="auth-card">
        <h2 className="auth-card-title">Why We Ask for Permissions</h2>
        <PermissionToggle
          icon={<Camera />}
          title="Camera Access"
          benefit="Enables clinical AI face diagnostics for measuring hydration, acne, and barrier score."
          checked={isCameraGranted}
          onChange={setIsCameraGranted}
        />
        <PermissionToggle
          icon={<MapPin />}
          title="Precise Location"
          benefit="Locates your nearest dark store for express doorstep drops."
          checked={isLocationGranted}
          onChange={setIsLocationGranted}
        />
        <PermissionToggle
          icon={<Bell />}
          title="Live Delivery Alerts"
          benefit="Real-time rider tracking notifications and customized routine alerts."
          checked={isNotificationsGranted}
          onChange={setIsNotificationsGranted}
        />
      </section>

      <section className="auth-privacy-card">
        <Lock aria-hidden="true" />
        <div>
          <strong>Clinical Biometric Privacy</strong>
          <p>
            Your facial scan is processed on-device and securely encrypted. GlowVAI never sells or shares your personal
            biometric data.
          </p>
        </div>
      </section>
    </AuthShell>
  );
};

export default PermissionsScreen;

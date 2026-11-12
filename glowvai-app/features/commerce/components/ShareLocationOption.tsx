import React, { useState } from 'react';
import { MapPin } from 'lucide-react';
import { useCheckoutSession } from '../lib/checkoutSession';

// Optional: lets the customer share their position so the live tracking map can show their door. The browser's
// permission prompt opens only when the customer taps the button. Nothing is requested on load, and the order works
// without it.
export const ShareLocationOption: React.FC = () => {
  const location = useCheckoutSession((s) => s.customerLocation);
  const setLocation = useCheckoutSession((s) => s.setCustomerLocation);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const share = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setMessage('Location is not available on this device. Your order will still be tracked by its status.');
      return;
    }
    setBusy(true);
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        setLocation({ lat: Math.round(pos.coords.latitude * 1e6) / 1e6, lng: Math.round(pos.coords.longitude * 1e6) / 1e6 });
        setMessage('Location shared. It is used only for your live delivery map.');
      },
      () => {
        setBusy(false);
        setLocation(null);
        setMessage('Location was not shared. Your order will still be tracked by its status.');
      },
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 300_000 },
    );
  };

  return (
    <div className="share-location">
      {location ? (
        <p className="commerce-note">Location shared for your live delivery map.</p>
      ) : (
        <button type="button" className="commerce-secondary-button" onClick={share} disabled={busy} style={{ minHeight: 44 }}>
          <MapPin size={16} aria-hidden="true" /> {busy ? 'Getting your location...' : 'Share my location for the live map (optional)'}
        </button>
      )}
      {message && (
        <p className="commerce-note" role="status">
          {message}
        </p>
      )}
    </div>
  );
};

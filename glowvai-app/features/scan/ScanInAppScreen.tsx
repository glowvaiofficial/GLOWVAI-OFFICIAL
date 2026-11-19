import React from 'react';
import { ScanFace, ShoppingBag, Smartphone } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { useHomeDevice, useHomeLayout } from '../shop/lib/useHomeLayout';

// Skin scanning happens only in the GlowVai app. Every website scan entry (header, home, bottom bar, old scan and face
// routes) opens this one screen. It never touches the camera or photo files. Store links come from the admin footer
// settings; none are invented, and with no link set the screen says where to search.
export const ScanInAppScreen: React.FC = () => {
  const { navigate } = useApp();
  const footer = useHomeLayout(useHomeDevice()).footer;
  const stores = [
    { label: 'Google Play', sub: 'Get it on', url: footer.playStoreUrl },
    { label: 'App Store', sub: 'Download on the', url: footer.appStoreUrl },
  ].filter((s) => s.url !== '');

  return (
    <main className="gv7sa" aria-labelledby="gv7sa-title">
      <section className="gv7sa-card">
        <span className="gv7sa-icon" aria-hidden="true"><ScanFace size={32} /></span>
        <h1 id="gv7sa-title" className="gv7sa-title">Skin scan is in the GlowVai app</h1>
        <p className="gv7sa-text">Scan your face with your phone camera for a personalised routine.</p>

        {stores.length > 0 ? (
          <ul className="gv7sa-stores" aria-label="Get the GlowVai app">
            {stores.map((s) => (
              <li key={s.label}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  <small>{s.sub}</small>
                  <strong>{s.label}</strong>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="gv7sa-notice" role="note">
            <Smartphone size={18} aria-hidden="true" />
            <span><strong>Get the GlowVai app</strong>Search GlowVai on Google Play</span>
          </p>
        )}

        <div className="gv7sa-actions">
          <button type="button" className="gv7sa-primary" onClick={() => navigate('shop-home')}>
            <ShoppingBag size={18} aria-hidden="true" />
            Continue shopping
          </button>
          <button type="button" className="gv7sa-secondary" onClick={() => navigate('shop-browse')}>
            Browse products
          </button>
        </div>
      </section>
    </main>
  );
};

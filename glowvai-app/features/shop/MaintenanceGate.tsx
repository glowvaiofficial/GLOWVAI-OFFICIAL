'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { BrandLogo } from '../../shared/BrandLogo';
import { homeLayoutUrl } from './lib/homeDevice';
import { readLayoutResponse } from './lib/useHomeLayout';
import { backAtLabel, currentMaintenance, isPreviewRequest, maintenanceActive, publishMaintenance, subscribeMaintenance, type MaintenanceInfo } from './lib/maintenance';
import './styles/maintenance.css';

// Wraps the whole shop. Checks the layout when the shop loads and when the tab regains focus (never on a timer), and shows
// the maintenance page instead of the app while maintenance is on. A failed check never blocks the shop.
export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const [info, setInfo] = useState<MaintenanceInfo>(currentMaintenance);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [previewing] = useState(() => (typeof window === 'undefined' ? false : isPreviewRequest(window.location.search)));

  const check = useCallback(async () => {
    if (previewing) return;
    setBusy(true);
    try {
      const token = null;
      const r = await fetch(homeLayoutUrl('mobile', token), { credentials: 'same-origin', cache: 'no-store' });
      if (r.ok) {
        const view = readLayoutResponse(await r.json());
        publishMaintenance(view.maintenance, view.preview);
      }
    } catch {
      // Offline or failed: the shop stays as it is.
    } finally {
      setNow(Date.now());
      setBusy(false);
    }
  }, [previewing]);

  useEffect(() => subscribeMaintenance((s) => { setInfo(s); setNow(Date.now()); }), []);
  useEffect(() => {
    void check();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [check]);

  if (!maintenanceActive(info, now, previewing)) return <>{children}</>;
  const back = backAtLabel(info.until, now);
  return (
    <main className="gv-maint" role="alert" aria-live="polite">
      <div className="gv-maint-card">
        <BrandLogo height={36} />
        <h1>We are back soon</h1>
        <p>{info.message || 'GlowVai is being updated. Please check back in a little while.'}</p>
        {back && <p className="gv-maint-back">{back}</p>}
        <button type="button" className="gv-maint-btn" onClick={() => void check()} disabled={busy} aria-label="Try again">
          <RefreshCw size={16} aria-hidden="true" />
          {busy ? 'Checking' : 'Try again'}
        </button>
      </div>
    </main>
  );
}

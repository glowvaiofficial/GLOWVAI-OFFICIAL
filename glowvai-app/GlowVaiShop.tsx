'use client';

import dynamic from 'next/dynamic';
import './glowvai.css';
import './responsive/shell.css';

// The NOV FINAL app is client-only: it relies on browser APIs and keeps all screen state in the browser.
const GlowVaiApp = dynamic(() => import('./App').then((m) => m.App), {
  ssr: false,
  loading: () => <div className="glowvai-root glowvai-boot" aria-busy="true" />,
});

export function GlowVaiShop() {
  return (
    <div className="glowvai-root">
      <GlowVaiApp />
    </div>
  );
}

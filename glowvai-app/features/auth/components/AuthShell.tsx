import React from 'react';
import { ArrowLeft, PackageCheck, ScanFace, ShoppingBag } from 'lucide-react';

interface AuthShellProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  onBack?: () => void;
  topRight?: React.ReactNode;
}

const BRAND_POINTS = [
  { icon: <ScanFace />, text: 'Skin scan with a plain-language report' },
  { icon: <ShoppingBag />, text: 'Skincare and cosmetics matched to you' },
  { icon: <PackageCheck />, text: 'Local delivery you can track' },
];

/** Shared frame for auth screens: optional top bar, scrolling body, sticky footer. Brand panel shows at 1024px+. */
export const AuthShell: React.FC<AuthShellProps> = ({ children, footer, onBack, topRight }) => (
  <section className="auth-screen">
    <aside className="auth-brand-panel" aria-hidden="true" hidden>
      <span className="auth-brand-wordmark">glowvai</span>
      <p className="auth-brand-copy">Skin analysis, cosmetics and delivery in one place.</p>
      <ul className="auth-brand-points">
        {BRAND_POINTS.map((point) => (
          <li key={point.text}>
            <span>{point.icon}</span>
            {point.text}
          </li>
        ))}
      </ul>
    </aside>
    {(onBack || topRight) && (
      <header className="auth-topbar">
        {onBack ? (
          <button type="button" className="auth-icon-button" onClick={onBack} aria-label="Go back">
            <ArrowLeft aria-hidden="true" />
          </button>
        ) : (
          <span />
        )}
        {topRight}
      </header>
    )}
    <div className="auth-body">{children}</div>
    {footer && <footer className="auth-footer">{footer}</footer>}
  </section>
);

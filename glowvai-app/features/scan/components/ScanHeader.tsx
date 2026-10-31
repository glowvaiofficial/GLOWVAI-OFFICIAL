import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface ScanHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}

export const ScanHeader: React.FC<ScanHeaderProps> = ({ title, subtitle, onBack }) => (
  <header className="scan-header">
    {onBack && (
      <button type="button" className="scan-icon-button" onClick={onBack} aria-label="Go back">
        <ArrowLeft size={20} strokeWidth={2.2} />
      </button>
    )}
    <div className="scan-header-text">
      <h1 className="scan-header-title">{title}</h1>
      {subtitle && <p className="scan-header-subtitle">{subtitle}</p>}
    </div>
  </header>
);

import React, { useEffect, useState } from 'react';
import { Camera, FileText, ScanFace } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { loadLatestScanResult } from './services/scanHistory';

const METRICS = [
  'Acne & blemishes',
  'Hydration level',
  'Pore density',
  'Melanin index',
  'Sebum output',
  'Barrier strength',
];

export const ScanTabScreen: React.FC = () => {
  const { navigate } = useApp();
  const [hasPreviousReport, setHasPreviousReport] = useState(false);

  useEffect(() => {
    let active = true;
    loadLatestScanResult().then((result) => {
      if (active && result) setHasPreviousReport(true);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="scan-screen">
      <div className="scan-body scan-tab-body">
        <div className="scan-split">
          <div className="scan-split-main">
            <div className="scan-tab-header">
              <span className="scan-badge">Biometric AI engine</span>
              <h1 className="scan-tab-title">Clinical face scan</h1>
              <p className="scan-tab-subtitle">
                Compute your skin pulse across six dimensions using multi-task CNN analysis.
              </p>
            </div>

            <div className="scan-target-card">
              <div className="scan-target-icon">
                <ScanFace size={56} strokeWidth={1.6} />
              </div>
              <h2 className="scan-target-heading">8 skin metrics analysed</h2>
              <div className="scan-metric-grid">
                {METRICS.map((name) => (
                  <span key={name} className="scan-metric-pill">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="scan-split-side">
            <button type="button" className="scan-primary-button" onClick={() => navigate('scan-camera')}>
              <Camera size={20} />
              Launch AI viewfinder
            </button>

            {hasPreviousReport && (
              <button type="button" className="scan-secondary-button" onClick={() => navigate('scan-report')}>
                <FileText size={18} />
                View latest skin report
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { DISCLAIMER, type ConcernKey, type SkinAnalysisResult } from '../../core/services/skinModelService';
import { CONCERN_GUIDANCE } from './concernGuidance';
import { ScanHeader } from './components/ScanHeader';
import { loadLatestScanResult } from './services/scanHistory';

const SEVERITY_LABEL: Record<SkinAnalysisResult['concerns'][number]['severity'], string> = {
  mild: 'Mild',
  moderate: 'Moderate',
  pronounced: 'Pronounced',
};

// One detail view for any concern in the saved scan. It reads the same result as the report, so every
// number and label comes from the user's own scan, not from fixed sample values.
export const ScanConcernDetailScreen: React.FC = () => {
  const { navigate, goBack, activeParams } = useApp();
  const passedResult = activeParams?.result as SkinAnalysisResult | undefined;
  const concernKey = activeParams?.concern as ConcernKey | undefined;
  const [stored, setStored] = useState<SkinAnalysisResult | null>(null);
  const [loaded, setLoaded] = useState(Boolean(passedResult));

  useEffect(() => {
    if (passedResult) return;
    let active = true;
    loadLatestScanResult().then((result) => {
      if (!active) return;
      setStored(result);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [passedResult]);

  const result = passedResult ?? stored;
  const concern = result?.concerns.find((c) => c.key === concernKey);
  const guidance = concernKey ? CONCERN_GUIDANCE[concernKey] : undefined;

  if (!loaded) {
    return (
      <div className="scan-screen">
        <ScanHeader title="Skin detail" onBack={goBack} />
      </div>
    );
  }

  if (!result || !concern) {
    return (
      <div className="scan-screen">
        <ScanHeader title="Skin detail" subtitle="No scan found for this concern" onBack={goBack} />
        <div className="scan-body scan-empty">
          <p className="scan-lead">Take a scan to see how this concern looks on your skin.</p>
          <button type="button" className="scan-primary-button" onClick={() => navigate('scan-camera')}>
            Start scan
          </button>
        </div>
      </div>
    );
  }

  const percent = Math.round(concern.score * 100);

  return (
    <div className="scan-screen scan-concern-screen">
      <ScanHeader title={concern.label} subtitle="From your latest scan" onBack={goBack} />

      <div className="scan-body">
        <section className="scan-card scan-concern-summary" aria-label="Result">
          <div>
            <span className="scan-concern-kicker">Result</span>
            <b>{concern.present ? SEVERITY_LABEL[concern.severity] : 'Not detected'}</b>
          </div>
          <div className="scan-meter" aria-hidden="true">
            <span className="scan-meter-fill" style={{ width: `${percent}%` }} />
          </div>
          <p className="scan-concern-note">Cosmetic estimate from your photo. Lighting and angle can change it.</p>
        </section>

        {guidance && concern.present && (
          <section className="scan-card">
            <h2 className="scan-section-title">What it means</h2>
            <p>{guidance.meaning}</p>
            <h2 className="scan-section-title">What may help</h2>
            <ul className="scan-concern-tips">
              {guidance.helps.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="scan-card scan-concern-actions">
          <button type="button" className="scan-primary-button" onClick={() => navigate('recommend-routine')}>
            View routine guide
            <ArrowRight size={16} />
          </button>
          <button type="button" className="scan-secondary-button" onClick={() => navigate('shop-browse')}>
            <ShoppingBag size={16} />
            Browse products
          </button>
        </section>

        <p className="scan-disclaimer">{DISCLAIMER}</p>
      </div>
    </div>
  );
};

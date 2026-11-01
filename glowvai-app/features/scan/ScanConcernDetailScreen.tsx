import React, { useEffect, useState } from 'react';
import { ArrowRight, Camera, ShoppingBag } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { DISCLAIMER, type ConcernKey, type SkinAnalysisResult } from '../../core/services/skinModelService';
import { CONCERN_GUIDANCE } from './concernGuidance';
import { ScanHeader } from './components/ScanHeader';
import { ConcernChip, ConcernLevel } from './components/ConcernLevel';
import { loadLatestScanResult } from './services/scanHistory';

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
        <ScanHeader title="Skin detail" onBack={goBack} />
        <div className="scan-body scan-empty">
          <h2 className="scan-headline">No scan for this concern</h2>
          <p className="scan-lead">Take a scan to see how this concern looks on your skin today.</p>
          <button type="button" className="scan-primary-button" onClick={() => navigate('scan-intro')}>
            <Camera size={18} />
            Start a scan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="scan-screen scan-concern-screen">
      <ScanHeader title={concern.label} subtitle="From your latest scan" onBack={goBack} />

      <div className="scan-body">
        <section className="scan-card scan-concern-summary" aria-label="Result">
          <div className="scan-concern-head">
            <span className="scan-concern-kicker">Result</span>
            <ConcernChip concern={concern} />
          </div>
          <ConcernLevel concern={concern} />
          <p className="scan-concern-note">Cosmetic estimate from your photo. Lighting and angle can change it.</p>
        </section>

        {guidance && concern.present ? (
          <>
            <section className="scan-card">
              <h2 className="scan-section-title">What it means</h2>
              <p>{guidance.meaning}</p>
            </section>
            <section className="scan-card scan-card-helps">
              <h2 className="scan-section-title">What helps</h2>
              <ul className="scan-concern-tips">
                {guidance.helps.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </section>
          </>
        ) : (
          <section className="scan-card">
            <p>This concern was not clearly visible in your photo, so there is nothing specific to change for it right now.</p>
          </section>
        )}

        <div className="scan-concern-actions">
          <button type="button" className="scan-primary-button" onClick={() => navigate('recommend-routine')}>
            View routine guide
            <ArrowRight size={16} />
          </button>
          <button type="button" className="scan-secondary-button" onClick={() => navigate('shop-browse')}>
            <ShoppingBag size={16} />
            Browse products
          </button>
        </div>

        <p className="scan-disclaimer">{DISCLAIMER}</p>
      </div>
    </div>
  );
};

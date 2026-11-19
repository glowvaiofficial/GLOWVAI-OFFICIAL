import React, { useEffect, useState } from 'react';
import { Camera, ScanFace } from 'lucide-react';
import { useApp } from '../../context/useApp';
import type { SkinAnalysisResult } from '../../core/services/skinModelService';
import { ScanHeader } from './components/ScanHeader';
import { ScanResultView } from './components/ScanResultView';
import { loadLatestScanResult } from './services/scanHistory';

/** Loads the result passed from the analysis, or the latest one saved in this browser. */
export const useLatestScanResult = (passed?: SkinAnalysisResult) => {
  const [stored, setStored] = useState<SkinAnalysisResult | null>(null);
  const [loaded, setLoaded] = useState(Boolean(passed));

  useEffect(() => {
    if (passed) return;
    let active = true;
    loadLatestScanResult().then((result) => {
      if (!active) return;
      setStored(result);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [passed]);

  return { result: passed ?? stored, loaded };
};

/** Shown when no real analysis exists yet. No sample or placeholder scores. */
export const ScanReportEmpty: React.FC = () => {
  const { navigate } = useApp();
  return (
    <div className="scan-empty-panel">
      <span className="scan-permission-icon">
        <ScanFace size={36} />
      </span>
      <h2 className="scan-headline">No skin report yet</h2>
      <p className="scan-lead">
        Skin scans are done in the GlowVai app. Scan your face with your phone camera and your report will show up here to read.
      </p>
      <div className="scan-empty-actions">
        <button type="button" className="scan-primary-button" onClick={() => navigate('scan-tab')}>
          <Camera size={18} />
          Get the GlowVai app
        </button>
      </div>
    </div>
  );
};

export const ScanReportScreen: React.FC = () => {
  const { navigate, goBack, activeParams } = useApp();
  const { result, loaded } = useLatestScanResult(activeParams?.result as SkinAnalysisResult | undefined);

  return (
    <div className="scan-screen scan-report-screen">
      <ScanHeader title="Your skin report" subtitle="Cosmetic skin assessment" onBack={goBack} />
      {loaded && (
        <div className={`scan-body scan-report-body${result ? '' : ' scan-empty'}`}>
          {result ? <ScanResultView result={result} onRetake={() => navigate('scan-tab')} /> : <ScanReportEmpty />}
        </div>
      )}
    </div>
  );
};

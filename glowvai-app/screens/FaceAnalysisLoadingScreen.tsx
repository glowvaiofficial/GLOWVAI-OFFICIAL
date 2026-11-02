import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ScanAnalyzingScreen } from '../features/scan/ScanAnalyzingScreen';
import '../responsive/entry-scan.css';

/** Turns a captured data URL back into a file for the analysis service. */
const dataUrlToBlob = (dataUrl: string): Blob | undefined => {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/.exec(dataUrl);
  if (!match) return undefined;
  try {
    const type = match[1] || 'image/jpeg';
    const raw = match[2] ? atob(match[3]) : decodeURIComponent(match[3]);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
    return new Blob([bytes], { type });
  } catch {
    return undefined;
  }
};

// The face-loading route runs the same real analysis as the scan flow. No sample scores are shown;
// without a photo it goes to the scan-failed screen.
export const FaceAnalysisLoadingScreen: React.FC = () => {
  const { activeParams } = useApp();
  const image: string = typeof activeParams?.image === 'string' ? activeParams.image : '';
  const file = useMemo(() => (image ? dataUrlToBlob(image) : undefined), [image]);
  return <ScanAnalyzingScreen file={file} />;
};

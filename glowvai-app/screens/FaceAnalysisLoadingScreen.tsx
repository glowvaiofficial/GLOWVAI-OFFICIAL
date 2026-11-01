import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ScanAnalyzingScreen } from '../features/scan/ScanAnalyzingScreen';

/** Turns a captured data URL back into an image file without any network request. */
const dataUrlToBlob = (dataUrl: unknown): Blob | undefined => {
  if (typeof dataUrl !== 'string') return undefined;
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/.exec(dataUrl);
  if (!match || !match[2]) return undefined;
  try {
    const binary = window.atob(match[3]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: match[1] || 'image/jpeg' });
  } catch {
    return undefined;
  }
};

// The older "face-loading" screen name runs the same real analysis as the scan flow. Without a photo the
// analysis screen sends the customer to the "photo not found" state instead of showing a sample report.
export const FaceAnalysisLoadingScreen: React.FC = () => {
  const { activeParams } = useApp();
  const file = useMemo(() => dataUrlToBlob(activeParams?.image), [activeParams?.image]);
  return <ScanAnalyzingScreen file={file} />;
};

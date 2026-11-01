import React from 'react';
import { ScanIntroScreen } from '../features/scan/ScanIntroScreen';

// "face-prep" is routed to the scan tab in routes.tsx. If this component is rendered directly it shows
// the current scan preparation step, so there is one scan flow with one design.
export const FaceAnalysisPrepScreen: React.FC = () => <ScanIntroScreen />;

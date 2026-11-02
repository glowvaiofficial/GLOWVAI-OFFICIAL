import React from 'react';
import { ScanCameraScreen } from '../features/scan/ScanCameraScreen';
import '../responsive/entry-scan.css';

// The face-capture route uses the same camera as the scan flow: live lighting check, then the real analysis.
export const FaceAnalysisCameraScreen: React.FC = () => <ScanCameraScreen />;

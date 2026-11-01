import React from 'react';
import { ScanCameraScreen } from '../features/scan/ScanCameraScreen';

// The older "face-capture" screen name opens the current camera step. A capture continues to the photo
// review and the real skin analysis, so no sample report can come out of this path.
export const FaceAnalysisCameraScreen: React.FC = () => <ScanCameraScreen />;

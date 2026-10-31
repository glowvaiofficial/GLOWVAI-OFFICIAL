import type { ComponentType } from 'react';
import type { PortedScreenName } from '../../core/routes/names';
import './scan.css';
import '../../responsive/scan-ported.css';
import { ScanTabScreen } from './ScanTabScreen';
import { ScanIntroScreen } from './ScanIntroScreen';
import { ScanCameraScreen } from './ScanCameraScreen';
import { ScanGalleryScreen } from './ScanGalleryScreen';
import { ScanPreviewScreen } from './ScanPreviewScreen';
import { ScanAnalyzingScreen } from './ScanAnalyzingScreen';
import { ScanConcernDetailScreen } from './ScanConcernDetailScreen';
import { ScanReportScreen } from './ScanReportScreen';
import { ScanFailedScreen } from './ScanFailedScreen';

export const routes: Partial<Record<PortedScreenName, ComponentType>> = {
  'scan-tab': ScanTabScreen,
  'scan-intro': ScanIntroScreen,
  'scan-camera': ScanCameraScreen,
  'scan-gallery': ScanGalleryScreen,
  'scan-preview': ScanPreviewScreen,
  'scan-analyzing': ScanAnalyzingScreen,
  'scan-report': ScanReportScreen,
  'scan-concern': ScanConcernDetailScreen,
  'scan-failed': ScanFailedScreen,
};

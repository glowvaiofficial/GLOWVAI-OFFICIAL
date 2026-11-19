import type { ComponentType } from 'react';
import type { PortedScreenName } from '../../core/routes/names';
import './scan.css';
import '../../responsive/scan-ported.css';
import { ScanInAppScreen } from './ScanInAppScreen';
import { ScanReportScreen } from './ScanReportScreen';

// Scanning is app-only. Every old scan route opens the "Skin scan is in the GlowVai app" screen; the report is view only.
export const routes: Partial<Record<PortedScreenName, ComponentType>> = {
  'scan-tab': ScanInAppScreen,
  'scan-intro': ScanInAppScreen,
  'scan-camera': ScanInAppScreen,
  'scan-gallery': ScanInAppScreen,
  'scan-preview': ScanInAppScreen,
  'scan-analyzing': ScanInAppScreen,
  'scan-report': ScanReportScreen,
  'scan-failed': ScanInAppScreen,
};

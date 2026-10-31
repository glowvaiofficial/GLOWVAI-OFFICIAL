import type { ComponentType } from 'react';
import '../../responsive/profile-admin.css';
import type { PortedScreenName } from '../../core/routes/names';
import { AdminPortalScreen } from './AdminPortalScreen';
import { AdminClaimsPortalScreen } from './AdminClaimsPortalScreen';
import { AdminDarkstoreOperationsScreen } from './AdminDarkstoreOperationsScreen';
import { VendorAdminPortalScreen } from './VendorAdminPortalScreen';
import { VendorHomeScreen } from './vendor/VendorHomeScreen';

export const routes: Partial<Record<PortedScreenName, ComponentType>> = {
  'admin-portal': AdminPortalScreen,
  'admin-claims': AdminClaimsPortalScreen,
  'admin-darkstore': AdminDarkstoreOperationsScreen,
  'admin-vendor-portal': VendorAdminPortalScreen,
  'vendor-home': VendorHomeScreen,
};

import type { ComponentType } from 'react';
import type { PortedScreenName } from './core/routes/names';
import { routes as authRoutes } from './features/auth/routes';
import { routes as shopRoutes } from './features/shop/routes';
import { routes as commerceRoutes } from './features/commerce/routes';
import { routes as ordersRoutes } from './features/orders/routes';
import { routes as scanRoutes } from './features/scan/routes';
import { routes as profileRoutes } from './features/profile/routes';
import { routes as recommendationRoutes } from './features/recommendations/routes';
import { routes as notificationRoutes } from './features/notifications/routes';

// Every customer-facing mobile-app screen, keyed by its PortedScreenName.
export const portedRoutes: Partial<Record<PortedScreenName, ComponentType>> = {
  ...authRoutes,
  ...shopRoutes,
  ...commerceRoutes,
  ...ordersRoutes,
  ...scanRoutes,
  ...profileRoutes,
  ...recommendationRoutes,
  ...notificationRoutes,
};

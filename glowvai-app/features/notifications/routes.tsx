import type { ComponentType } from 'react';
import type { PortedScreenName } from '../../core/routes/names';
import { NotificationsScreen } from './NotificationsScreen';
import './notifications.css';

export const routes: Partial<Record<PortedScreenName, ComponentType>> = {
  'notifications-list': NotificationsScreen,
};

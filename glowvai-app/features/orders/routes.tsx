import type { ComponentType } from 'react';
import type { PortedScreenName } from '../../core/routes/names';
import { OrdersListScreen } from './OrdersListScreen';
import { OrderDetailsScreen } from './OrderDetailsScreen';
import { LiveRiderTrackingScreen } from './LiveRiderTrackingScreen';
import { RateOrderDeliveryScreen } from './RateOrderDeliveryScreen';
import './orders.css';
import '../../responsive/orders-ported.css';

export const routes: Partial<Record<PortedScreenName, ComponentType>> = {
  'orders-list': OrdersListScreen,
  'orders-detail': OrderDetailsScreen,
  'orders-tracking': LiveRiderTrackingScreen,
  'orders-rate': RateOrderDeliveryScreen,
};

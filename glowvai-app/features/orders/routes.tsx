import type { ComponentType } from 'react';
import type { PortedScreenName } from '../../core/routes/names';
import { OrdersListScreen } from './OrdersListScreen';
import { OrderDetailsScreen } from './OrderDetailsScreen';
import { OrderTrackingScreen } from './OrderTrackingScreen';
import { ReturnRequestScreen } from '../returns/ReturnRequestScreen';
import { RateOrderDeliveryScreen } from './RateOrderDeliveryScreen';
import { SharedTrackingScreen } from './SharedTrackingScreen';
import './orders.css';
import '../../responsive/orders-ported.css';

export const routes: Partial<Record<PortedScreenName, ComponentType>> = {
  'orders-list': OrdersListScreen,
  'orders-detail': OrderDetailsScreen,
  'orders-tracking': OrderTrackingScreen,
  'returns-request': ReturnRequestScreen,
  'orders-rate': RateOrderDeliveryScreen,
  'orders-shared-tracking': SharedTrackingScreen,
};

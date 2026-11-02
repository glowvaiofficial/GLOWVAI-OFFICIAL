import React from 'react';
import { LiveRiderTrackingScreen } from '../features/orders/LiveRiderTrackingScreen';

// The legacy order-tracking route shows the same tracking screen as orders-tracking (real order data, cancel before dispatch).
export const OrderTrackingScreen: React.FC = () => <LiveRiderTrackingScreen />;

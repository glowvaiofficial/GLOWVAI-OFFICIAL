import React from 'react';
import { LiveRiderTrackingScreen } from '../features/orders/LiveRiderTrackingScreen';

// The older "order-tracking" screen name (used after checkout) shows the same tracking page as
// "orders-tracking": one real order from app state, its delivery address, progress and cancel option.
export const OrderTrackingScreen: React.FC = () => <LiveRiderTrackingScreen />;

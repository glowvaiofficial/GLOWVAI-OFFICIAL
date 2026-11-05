import React from 'react';
import { OrderDetailsScreen } from './OrderDetailsScreen';

// "Track order" shows the order's status as the GlowVai team records it. There is no live rider location, rider
// name or delivery time estimate yet, so nothing of the kind is shown.
export const LiveRiderTrackingScreen: React.FC = () => <OrderDetailsScreen />;

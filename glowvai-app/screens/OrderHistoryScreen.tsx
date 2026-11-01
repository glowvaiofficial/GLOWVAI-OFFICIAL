import React from 'react';
import { OrdersListScreen } from '../features/orders/OrdersListScreen';

// "order-history" is routed to the orders list in routes.tsx; this keeps the direct component in step.
export const OrderHistoryScreen: React.FC = () => <OrdersListScreen />;

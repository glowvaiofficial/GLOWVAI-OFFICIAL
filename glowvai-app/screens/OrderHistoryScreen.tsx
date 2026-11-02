import React from 'react';
import { OrdersListScreen } from '../features/orders/OrdersListScreen';

// The legacy order-history route shows the same real order list as orders-list, so both entry points match.
export const OrderHistoryScreen: React.FC = () => <OrdersListScreen />;

import React from 'react';
import { HelpAndSupportScreen } from '../features/profile/HelpAndSupportScreen';

// The legacy 'support' route (opened from order details and order tracking with an orderId) shows the redesigned
// Help & support screen. That screen reads activeParams.orderId and opens a pre-filled ticket form.
export const SupportScreen: React.FC = () => <HelpAndSupportScreen />;
